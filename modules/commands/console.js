const chalk = require("chalk");

module.exports.config = {
  name: "console",
  version: "4.2.0",
  hasPermssion: 3,
  credits: "Niiozic & roasted (RGB mod by ChatGPT)",
  description: "Làm cho console đẹp hơn với gradient + chống spam log + RGB chạy",
  commandCategory: "Admin",
  usages: "console",
  cooldowns: 30
};

let isConsoleDisabled = false, num = 0, max = 25, timeStamp = 0;
const userCache = new Map();

// Hàm tạo màu RGB ngẫu nhiên cho hiệu ứng chạy
function randomRGB(text) {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return chalk.rgb(r, g, b)(text);
}

// Hàm chuyển đổi hex sang RGB
function hexToRgb(hex) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  return [bigint >> 16, (bigint >> 8) & 255, bigint & 255];
}

// Hàm chuyển đổi RGB sang hex
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join("");
}

// Hàm trộn màu gradient
function interpolateColor(color1, color2, factor) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const result = c1.map((c, i) => Math.round(c + factor * (c2[i] - c)));
  return rgbToHex(...result);
}

// Hàm tạo text gradient
function gradientText(text, color1 = "#00FF00", color2 = "#32CD32") {
  const len = text.length;
  return text.split("").map((char, i) => {
    const ratio = i / (len - 1 || 1);
    const color = interpolateColor(color1, color2, ratio);
    return chalk.hex(color)(char);
  }).join("");
}

// Chuỗi màu cho hiệu ứng cầu vồng
const colorSequence = [
  "#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", 
  "#4B0082", "#9400D3", "#FF0000", "#FF7F00", "#FFFF00",
  "#00FF00", "#0000FF", "#4B0082", "#9400D3"
];

// Hàm tạo text cầu vồng
function rainbowText(text) {
  return text.split("").map((char, i) => {
    const color = colorSequence[i % colorSequence.length];
    return chalk.hex(color)(char);
  }).join("");
}

// Hàm lấy tên người dùng với cache
async function getUserName(api, userID, Users) {
  if (userCache.has(userID)) return userCache.get(userID);
  
  try {
    const name = await Users.getNameUser(userID);
    userCache.set(userID, name);
    return name;
  } catch (e) {
    return "Không xác định";
  }
}

// Hàm lấy thông tin nhóm an toàn
async function getThreadInfoSafe(api, threadID) {
  try {
    return await api.getThreadInfo(threadID);
  } catch (e) {
    return { threadName: "Không thể lấy tên nhóm" };
  }
}

// Hàm tắt console tạm thời để chống spam
function disableConsole(cooldowns) {
  console.log(rainbowText("╔═══════════════════════════════════════════╗"));
  console.log(rainbowText("║   Bật Chế Độ Chống Lag Console Trong 30s  ║"));
  console.log(rainbowText("╚═══════════════════════════════════════════╝"));
  isConsoleDisabled = true;
  setTimeout(() => {
    isConsoleDisabled = false;
    console.log(gradientText("╔═══════════════════════════════════════════╗"));
    console.log(gradientText("║      Đã Tắt Chế Độ Chống Lag Console      ║"));
    console.log(gradientText("╚═══════════════════════════════════════════╝"));
  }, cooldowns * 1000);
}

module.exports.handleEvent = async function({ api, event, Users }) {
  try {
    const dateNow = Date.now();
    if (isConsoleDisabled) return;

    const moment = require("moment-timezone");
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const isGroup = event.isGroup;
    const threadInfo = isGroup ? await getThreadInfoSafe(api, event.threadID) : null;
    const groupName = isGroup ? threadInfo.threadName || "Unnamed" : null;
    const userName = await getUserName(api, event.senderID, Users);
    const content = event.body || "Ảnh, video hoặc kí tự đặc biệt";
    const hasAttachment = event.attachments?.length > 0;

    if (event.senderID === global.data.botID) return;
    if ((global.data.threadData.get(event.threadID) || {}).console === true) return;

    num++;

    if (isGroup) {
      console.log(randomRGB("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"));
      console.log(randomRGB(`┣[🌸]➤ Tên nhóm: ${groupName}`));
      console.log(randomRGB(`┣[🔰]➤ ID nhóm: ${event.threadID}`));
      console.log(randomRGB(`┣[👤]➤ Tên người dùng: ${userName}`));
      console.log(randomRGB(`┣[🌐]➤ ID người dùng: ${event.senderID}`));
      console.log(randomRGB(`┣[💬]➤ Nội dung: ${content}`));
      if (hasAttachment) {
        const type = event.attachments[0].type;
        const map = {
          sticker: "Nhãn dán",
          animated_image: "Gif",
          video: "Video",
          photo: "Ảnh",
          audio: "Âm thanh"
        };
        console.log(randomRGB(`┣[📎]➤ Đính kèm: ${map[type] || "Không xác định"}`));
      }
      console.log(randomRGB(`┣[⏰]➤ Thời gian: ${time}`));
      console.log(randomRGB(`┣[⏳]➤ Bot online: ${hours} giờ ${minutes} phút ${seconds} giây`));
      console.log(randomRGB("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));
      console.log(rainbowText("《▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱ 502 ▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱》"));
    } else {
      console.log(rainbowText("┏━━━━━━━━━━━━━━ [TIN NHẮN RIÊNG] ━━━━━━━━━━━━━━┓"));
      console.log(rainbowText(`┣ Người gửi: ${userName} (${event.senderID})`));
      console.log(rainbowText(`┣ Nội dung: ${content}`));
      if (hasAttachment) {
        const type = event.attachments[0].type;
        const map = {
          sticker: "Nhãn dán",
          animated_image: "Gif",
          video: "Video",
          photo: "Ảnh",
          audio: "Âm thanh"
        };
        console.log(rainbowText(`┣ Đính kèm: ${map[type] || "Không xác định"}`));
      }
      console.log(rainbowText(`┣ Thời gian: ${time}`));
      console.log(rainbowText("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));
      console.log(gradientText("《▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱ 502 ▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱》"));
    }

    if (Date.now() - timeStamp > 1000) num = 0;
    if (Date.now() - timeStamp < 1000 && num >= max) {
      num = 0;
      disableConsole(this.config.cooldowns);
    }
    timeStamp = dateNow;
  } catch (e) {
    console.log("Lỗi xử lý sự kiện console:", e);
  }
};

module.exports.run = async function ({ api, event }) {
  return api.sendMessage("✅ Module console đang hoạt động với màu RGB chạy và gradient!", event.threadID, event.messageID);
};