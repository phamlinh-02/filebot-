const fs = require("fs-extra");
const moment = require("moment-timezone");
const axios = require("axios");
const path = require("path");
const FormData = require("form-data");
const DATA_PATH = __dirname + "/data/dataEvent.json";
const CACHE_DIR = __dirname + "/cache/";
module.exports.config = {
    name: "leave",
    version: "2.2.0",
    hasPermssion: 1,
    credits: "Phạm Thanh Tùng",
    description: "Cấu hình thông báo rời nhóm, hỗ trợ reply ảnh/video upload catbox",
    commandCategory: "Quản Trị Viên",
    usages: "leave [on/off/check/set/media/reset]",
    cooldowns: 5,
};
function getTimeInfo() {
    const uptime = process.uptime();
    const uptimeStr = [Math.floor(uptime / 3600), Math.floor((uptime % 3600) / 60), Math.floor(uptime % 60)].map(v => v.toString().padStart(2, "0")).join(":");
    const currentTime = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss || DD/MM/YYYY");
    return { uptimeStr, currentTime };
}
function readData() {
    try {
        return fs.readJSONSync(DATA_PATH);
    } catch (e) {
        console.error("Lỗi đọc dataEvent.json:", e);
        return { leave: [] };
    }
}
function writeData(data) {
    try {
        fs.writeJSONSync(DATA_PATH, data, { spaces: 4 });
    } catch (e) {
        console.error("Lỗi ghi file:", e);
    }
}
function getLeaveConfig(data, threadID) {
    return data.leave.find(i => i.threadID === threadID);
}
function ensureLeaveConfig(data, threadID) {
    let config = getLeaveConfig(data, threadID);
    if (!config) {
        config = { threadID, status: false, message: "", media: "" };
        data.leave.push(config);
    }
    return config;
}

async function uploadToCatbox(filePath) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', fs.createReadStream(filePath));
  try {
    const res = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity, 
      maxContentLength: Infinity,
      responseType: 'text'
    });
    return res.data;
  } catch (error) {
    throw new Error('Upload failed: ' + error.message);
  }
}

module.exports.run = async function ({ api, event, args, permission }) {
    const threadID = event.threadID;
    const data = readData();
    const config = ensureLeaveConfig(data, threadID);
    const subcmd = args[0]?.toLowerCase();
    if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments.length > 0) {
        async function getAttachmentExt(attach) {
            try {
                const url = attach.url || (attach.media && attach.media.url);
                if (!url) return "";
                const res = await axios.head(url);
                const contentType = res.headers["content-type"];
                if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) return ".jpg";
                if (contentType.includes("image/png")) return ".png";
                if (contentType.includes("video/mp4")) return ".mp4";
                return "";
            } catch (error) {
                return "";
            }
        }
        const attach = event.messageReply?.attachments?.[0];
        if (!attach) return api.sendMessage("❎ Vui lòng reply một ảnh hoặc video.", threadID);
        const ext = await getAttachmentExt(attach);
        if (![".jpg", ".jpeg", ".png", ".mp4"].includes(ext)) {
            return api.sendMessage("❎ Vui lòng reply đúng file ảnh (jpeg, jpg, png) hoặc video (mp4).", threadID);
        }
        let fileUrl = "";
        if (attach.url) {
            fileUrl = attach.url;
        } else if (attach.media && attach.media.url) {
            fileUrl = attach.media.url;
        } else {
            return api.sendMessage("❎ Không tìm thấy link ảnh/video để tải.", threadID);
        }
        if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
        const filePath = path.join(CACHE_DIR, `leave_media_${Date.now()}${ext}`);
        const writer = fs.createWriteStream(filePath);
        try {
            const response = await axios.get(fileUrl, {
                responseType: "stream",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                }
            });
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });
            const catboxUrl = await uploadToCatbox(filePath);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            config.media = catboxUrl;
            writeData(data);
            return api.sendMessage("✅ Đã upload media leave và lưu thành công!", threadID);
        } catch (error) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return api.sendMessage("❎ Lỗi khi tải hoặc upload file. Vui lòng thử lại.", threadID);
        }
    }
    if (!subcmd) {
    return api.sendMessage(
        `===「 HƯỚNG DẪN SỬ DỤNG 」===\n` +
        `• leave on: Bật thông báo\n` +
        `• leave off: Tắt thông báo\n` +
        `• leave check: Kiểm tra cấu hình\n` +
        `• leave set <nội dung>: Cập nhật nội dung\n` +
        `• leave media [reply]: Đặt media (ảnh/video)\n` +
        `• leave reset: Xóa cấu hình về mặc định\n\n` +
        `• {name} => Tên thành viên rời nhóm\n` +
        `• {iduser} => Uid thành viên rời nhóm\n` +
        `• {type} => Qtv kick, tự rời nhóm\n` +
        `• {author} => Tên qtv kick người dùng\n` +
        `• {time} => Thời gian rời nhóm`,
        threadID
    );
}

    switch (subcmd) {
        case "on":
        case "off": {
            config.status = subcmd === "on";
            writeData(data);
            return api.sendMessage(`Đã ${config.status ? "bật" : "tắt"} thông báo rời nhóm.`, threadID);
        }
        case "check": {
            const { uptimeStr, currentTime } = getTimeInfo();
            return api.sendMessage(
                `Trạng thái: ${config.status ? "Bật" : "Tắt"}\nNội dung: ${config.message || "Mặc định"}\nMedia: ${config.media || "Không có"}\n────────────\n⏳ Uptime: ${uptimeStr}\n⏰ Time: ${currentTime}`,
                threadID
            );
        }
        case "reset": {
            const index = data.leave.findIndex(i => i.threadID === threadID);
            if (index !== -1) {
                data.leave.splice(index, 1);
                writeData(data);
                return api.sendMessage("✅ Đã đặt lại cấu hình leave về mặc định.", threadID);
            } else {
                return api.sendMessage("❎ Nhóm này chưa có cấu hình leave để đặt lại.", threadID);
            }
        }
        case "set": {
            const content = args.slice(1).join(" ");
            if (!content) return api.sendMessage("Vui lòng nhập nội dung tin nhắn.", threadID);
            config.message = content;
            writeData(data);
            return api.sendMessage("✅ Đã cập nhật nội dung tin nhắn leave.", threadID);
        }
        case "media": {
            const link = args[1];
            if (!link) return api.sendMessage("Vui lòng nhập link media.", threadID);
            if (!/^https:\/\/files\.catbox\.moe\//.test(link))
                return api.sendMessage("❎ Link không hợp lệ! Chỉ hỗ trợ catbox.moe", threadID);
            config.media = link;
            writeData(data);
            return api.sendMessage("✅ Đã cập nhật media leave.", threadID);
        }
        default: return api.sendMessage("Lệnh không hợp lệ. Dùng: on, off, check, text, media", threadID);
    }
};