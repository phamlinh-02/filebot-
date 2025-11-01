const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "global",
  version: "12.0.0", // Phiên bản Dọn dẹp An toàn
  credits: "Vtan & Gemini",
  description: "Worker chỉ dọn dẹp file tạm ngay sau khi upload xong.",
  usages: ["global check", "global stop"],
  commandCategory: "Admin",
  cooldowns: 10,
  dependencies: { "fs-extra": "", "path": "", "axios": "" },
  usePrefix: true,
};

// --- KHU VỰC TÙY CHỈNH ---
const TARGET_COUNT_ALL = 6;
const CONCURRENT_WORKERS = 7; 
const DELAY_BETWEEN_REQUESTS = 2000;
const CHECK_INTERVAL_MINUTES = 10; 
const ADMIN_GROUP_IDS = [ "", "" ];
const MAX_CONSECUTIVE_ERRORS = 3;
// -------------------------

const videoSources = {
  vdgai: require("./../../includes/datajson/vdgai.json"),
  vdanime: require("./../../includes/datajson/vdcos.json"),
};

class GlobalAutoFiller {
  constructor() {
    for (const type of Object.keys(videoSources)) {
      if (!global[type]) global[type] = [];
    }
    this.is_running = false;
    this.is_paused = false;
    this.api = null;
    this.error_count = 0;
    this.autoCheckInterval = null;
  }
  
  async downloadFile(url) {
    const filePath = path.join(__dirname, "cache", `${Date.now()}_${Math.random()}.mp4`);
    try {
      await fs.ensureDir(path.dirname(filePath));
      const response = await axios.get(url, { responseType: "arraybuffer", timeout: 25000 });
      await fs.writeFile(filePath, response.data);
      return filePath;
    } catch (error) {
      if (fs.existsSync(filePath)) await fs.unlink(filePath);
      throw error; 
    }
  }
  
  async uploadToFacebook(filePath, api) {
    try {
      if (!fs.existsSync(filePath)) return null;
      const stream = fs.createReadStream(filePath);
      const response = await api.httpPostFormData("https://upload.facebook.com/ajax/mercury/upload.php", { upload_1024: stream });
      const json = JSON.parse(response.replace("for (;;);", ""));
      const metadata = json?.payload?.metadata?.[0];
      return metadata ? Object.entries(metadata)[0] : null;
    } catch (error) {
      console.error(`[UPLOAD ERROR] - Lỗi với file ${path.basename(filePath)}: ${error.message}`);
      throw error;
    } finally {
      // ✅ CƠ CHẾ DỌN DẸP AN TOÀN MÀ BẠN CẦN NẰM Ở ĐÂY
      // Nó chỉ xóa duy nhất file mà nó vừa xử lý xong.
      if (fs.existsSync(filePath)) {
        try {
            await fs.unlink(filePath);
            console.log(`[CLEANUP] - Đã dọn dẹp file tạm: ${path.basename(filePath)}`);
        } catch (e) {
            console.error(`[CLEANUP ERROR] - Không thể xóa file ${path.basename(filePath)}`);
        }
      }
    }
  }

  async processSingleVideo(api, type) {
    let filePath = null;
    try {
      if (!this.is_running || this.is_paused) return;
      const sourceArray = videoSources[type];
      if (!sourceArray || !Array.isArray(sourceArray) || sourceArray.length === 0) return;
      const randomVideoUrl = sourceArray[Math.floor(Math.random() * sourceArray.length)];
      if (!randomVideoUrl) return;
      filePath = await this.downloadFile(randomVideoUrl);
      if (!filePath) return;
      if (!this.is_running || this.is_paused) return;
      const attachment = await this.uploadToFacebook(filePath, api);
      if (attachment) {
        if (!this.is_running || this.is_paused) return;
        if (global[type].length < TARGET_COUNT_ALL) {
            global[type].push(attachment);
            console.log(`[➕ ADDED] - Kho '${type}'. Hiện có: ${global[type].length}/${TARGET_COUNT_ALL}`);
        }
        this.error_count = 0;
      }
    } catch (e) {
      this.error_count++;
      console.log(`[ERROR COUNT] - Lỗi liên tiếp: ${this.error_count}/${MAX_CONSECUTIVE_ERRORS}.`);
      if (this.error_count >= MAX_CONSECUTIVE_ERRORS) {
          if (!this.is_paused) {
              this.is_running = false;
              this.is_paused = true;
              if (this.autoCheckInterval) clearInterval(this.autoCheckInterval);
              const pauseMessage = `🔴 [GLOBAL WORKER] - Phát hiện ${MAX_CONSECUTIVE_ERRORS} lỗi tải link liên tiếp. Lịch kiểm tra tự động sẽ tạm dừng trong ${CHECK_INTERVAL_MINUTES} phút.`;
              for (const groupID of ADMIN_GROUP_IDS) {
                  if (groupID) api.sendMessage(pauseMessage, groupID);
              }
              setTimeout(() => {
                  this.is_paused = false;
                  this.error_count = 0;
                  this.startAutoCheckInterval({ api: api });
              }, CHECK_INTERVAL_MINUTES * 60 * 1000);
          }
      }
    }
  }
  
  async checkAndRefill(o, isManualTrigger = false) {
    if (this.is_paused || this.is_running) {
        if(isManualTrigger) o.api.sendMessage("⚠️ Worker đang bận hoặc đang tạm dừng, không thể bắt đầu tác vụ mới.", o.event.threadID, o.event.messageID);
        return;
    }
    const categoriesToFill = Object.keys(videoSources).filter(type => (global[type]?.length || 0) < TARGET_COUNT_ALL);
    if(categoriesToFill.length == 0) {
        if (isManualTrigger) o.api.sendMessage("✅ Tất cả các kho đều đã đầy.", o.event.threadID, o.event.messageID);
        return;
    }
    this.is_running = true;
    if (isManualTrigger) o.api.sendMessage(`[GLOBAL WORKER]\nBắt đầu làm đầy các kho:\n- ${categoriesToFill.join('\n- ')}`, o.event.threadID, o.event.messageID);
    else console.log(`[AUTO CHECK] - Bắt đầu làm đầy các kho: ${categoriesToFill.join(', ')}`);
    const mainLoop = async (o_loop) => {
        if (!this.is_running) return;
        const currentCategoriesToFill = categoriesToFill.filter(type => (global[type]?.length || 0) < TARGET_COUNT_ALL);
        if (currentCategoriesToFill.length === 0) {
            this.is_running = false;
            const completionMessage = `✅ ĐÃ HOÀN TẤT UPLOAD ✅\n\nĐã bổ sung đầy đủ dữ liệu cho các kho:\n- ${categoriesToFill.join('\n- ')}`;
            for (const groupID of ADMIN_GROUP_IDS) {
                if(groupID) o_loop.api.sendMessage(completionMessage, groupID);
            }
            return;
        }
        const tasks = [];
        for (let i = 0; i < CONCURRENT_WORKERS; i++) {
            if (!this.is_running) break;
            const randomNeedyCategory = currentCategoriesToFill[Math.floor(Math.random() * currentCategoriesToFill.length)];
            tasks.push(this.processSingleVideo(o_loop.api, randomNeedyCategory));
            if (i < CONCURRENT_WORKERS - 1) await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
        }
        await Promise.allSettled(tasks);
        if (this.is_running) setTimeout(() => mainLoop(o_loop), 5000);
    };
    mainLoop(o);
  }
    
  stop(o) {
    this.is_running = false;
    this.is_paused = false;
    this.error_count = 0;
    if (this.autoCheckInterval) {
        clearInterval(this.autoCheckInterval);
        this.autoCheckInterval = null;
        console.log("[AUTO CHECK] - Lịch kiểm tra tự động đã được tắt.");
    }
    console.log("[🛑 STOPPED] - Worker đã được dừng thủ công.");
    o.api.sendMessage("✅ Worker và lịch kiểm tra tự động đã được dừng.", o.event.threadID, o.event.messageID);
  }

  run(o) {
    const command = o.args[0]?.toLowerCase();
    if (command === 'stop') {
        this.stop(o);
    } else if (command === 'check') {
        this.checkAndRefill({ ...o, event: o.event }, true);
    } else {
        o.api.sendMessage(`Sử dụng 'global check' hoặc 'global stop'.`, o.event.threadID, o.event.messageID);
    }
  }

  startAutoCheckInterval(o) {
      console.log("[AUTO CHECK] - Đã bật/khởi động lại lịch kiểm tra kho mỗi " + CHECK_INTERVAL_MINUTES + " phút.");
      this.autoCheckInterval = setInterval(() => {
        this.checkAndRefill({ api: o.api }, false);
      }, CHECK_INTERVAL_MINUTES * 60 * 1000);
  }
  
  onLoad(o) {
  this.api = o.api;
  // Bắt đầu kiểm tra và làm đầy kho ngay khi bot khởi động
  this.checkAndRefill({ api: o.api }, false);
  // Sau đó, bắt đầu lịch kiểm tra tự động định kỳ
  this.startAutoCheckInterval(o);
}

}
const filler = new GlobalAutoFiller();
module.exports.run = (o) => filler.run(o);
module.exports.onLoad = (o) => filler.onLoad(o);