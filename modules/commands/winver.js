const si = require("systeminformation");
const { execSync } = require("child_process");

module.exports.config = {
  name: "winver",
  version: "1.3.1",
  hasPermssion: 2,
  credits: "ChatGPT tối ưu",
  description: "Xem thông tin hệ điều hành Windows",
  commandCategory: "Admin",
  cooldowns: 3,
  usePrefix: false,
  dependencies: {
    "systeminformation": ""
  }
};

// Lấy bản quyền Windows (edition)
function getWindowsEdition() {
  try {
    const output = execSync(`powershell -Command "(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion').EditionID"`).toString().trim();
    return `Windows(R), ${output} edition`;
  } catch {
    return "Không xác định";
  }
}

// Lấy phiên bản Windows (22H2, 21H1...)
function getWindowsDisplayVersion() {
  try {
    const version = execSync(`powershell -Command "(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion').DisplayVersion"`).toString().trim();
    return version || "Không xác định";
  } catch {
    return "Không xác định";
  }
}

module.exports.run = async ({ api, event }) => {
  const start = Date.now(); // đo ping

  // Gửi thông báo đang lấy thông tin
  api.sendMessage("⏳ Đang lấy thông tin cấu hình hệ thống, vui lòng chờ...", event.threadID, event.messageID);

  try {
    const [os, time, users, nets, battery] = await Promise.all([
      si.osInfo(),
      si.time(),
      si.users(),
      si.networkInterfaces(),
      si.battery()
    ]);

    const now = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Không rõ";
    const offset = -now.getTimezoneOffset() / 60;
    const timeStr = now.toLocaleString("vi-VN");
    const uptimeH = Math.floor(time.uptime / 3600);
    const uptimeM = Math.floor((time.uptime % 3600) / 60);
    const ip = nets.find(net => net.ip4 && !net.virtual)?.ip4 || "Không rõ";
    const pin = battery.hasBattery ? `${battery.percent}% ${battery.isCharging ? "(Đang sạc)" : ""}` : "Không có pin";
    const user = users[0]?.user || "Không xác định";
    const edition = getWindowsEdition();
    const displayVersion = getWindowsDisplayVersion();
    const ping = Date.now() - start;

    const msg = `
🖥️ ==== THÔNG TIN WINDOWS ====

📌 Hệ điều hành: ${os.distro} ${os.release} – Phiên bản: ${displayVersion}
🧱 Kiến trúc: ${os.arch}
🗄️ Hostname: ${os.hostname}
👤 Người dùng: ${user}

🕰️ Múi giờ: ${tz} (UTC${offset >= 0 ? "+" : ""}${offset})
📅 Thời gian hiện tại: ${timeStr}
⏱️ Uptime: ${uptimeH} giờ ${uptimeM} phút

🌐 IP nội bộ: ${ip}
🔋 Pin: ${pin}

🔑 Trạng thái bản quyền: ${edition}
📶 Ping bot: ${ping}ms
    `.trim();

    api.sendMessage(msg, event.threadID, event.messageID);
  } catch (err) {
    console.error(err);
    api.sendMessage("❌ Lỗi khi lấy thông tin hệ thống.", event.threadID, event.messageID);
  }
};