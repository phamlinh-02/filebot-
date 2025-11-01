const os = require('os');
const moment = require('moment-timezone');
const process = require('process');

module.exports = {
  config: {
    name: "uptime", // Tên lệnh đã đổi thành "uptime"
    version: "1.0.0",
    credits: "tkhanh",
    hasPermssion: 0,
    description: "Hiển thị thời gian hoạt động và thông tin hệ thống",
    commandCategory: "Admin",
    usages: "uptime",
    cooldowns: 5,
    usePrefix: false
  },
  run: async ({ event, api, userData }) => {
    const ping = Date.now() - event.timestamp;
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600).toString().padStart(2, '0');
    const m = Math.floor((uptime % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(uptime % 60).toString().padStart(2, '0');
    const ram = os.totalmem() / (1024 ** 3); // Tổng RAM tính bằng GB
    const freeMem = os.freemem() / (1024 ** 3); // RAM trống tính bằng GB
    const usedRam = (ram - freeMem).toFixed(2); // RAM đã dùng tính bằng GB
    const ramUsage = ((usedRam / ram) * 100).toFixed(1); // Phần trăm sử dụng RAM
    const cpus = os.cpus();
    const cpuCores = cpus.length; // Số lõi CPU
    const platform = os.platform();
    const arch = os.arch();
    const osVersion = os.release(); // Phiên bản hệ điều hành
    const memUsage = process.memoryUsage(); // Sử dụng bộ nhớ của tiến trình
    const rss = (memUsage.rss / (1024 ** 2)).toFixed(2); // RSS tính bằng MB
    const heapUsed = (memUsage.heapUsed / (1024 ** 2)).toFixed(2); // Heap đã dùng tính bằng MB
    const heapTotal = (memUsage.heapTotal / (1024 ** 2)).toFixed(2); // Tổng Heap tính bằng MB
    const botStatus = ping < 100 ? "mượt" : "lag"; // Trạng thái bot dựa trên ping

    // Lấy tên người dùng từ API
    let requester = "Khách"; // Giá trị mặc định nếu không lấy được tên
    try {
      const userInfo = await api.getUserInfo(event.senderID);
      requester = userInfo[event.senderID]?.name || "Khách"; // Lấy tên từ userInfo
    } catch (error) {
      console.error("Lỗi khi lấy thông tin người dùng:", error);
    }

    api.sendMessage({
      body: `⏰ Bây giờ là: ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss | DD/MM/YYYY')}
⏱️ Uptime: ${h}:${m}:${s}
🔣 Tình trạng bot: ${botStatus}
🛜 Ping: ${ping}ms

📋 Hệ điều hành: ${platform} ${osVersion} (${arch})
💾 CPU: ${cpuCores} core(s) - ${cpus[0].model} @ ${(cpus[0].speed / 1000).toFixed(2)}GHz
📊 RAM: ${usedRam}/${ram.toFixed(2)}GB (đã dùng)
🛢️ RAM trống: ${freeMem.toFixed(2)}GB

📌 RSS: ${rss}MB
📌 Heap: ${heapUsed}/${heapTotal}MB

👤 Yêu cầu bởi: ${requester}`
    }, event.threadID, event.messageID);
  }
};