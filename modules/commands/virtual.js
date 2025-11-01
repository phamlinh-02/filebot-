const fs = require("fs");
const path = __dirname + "/data/antiChange.json";
if (!fs.existsSync(path)) fs.writeFileSync(path, "{}");

module.exports.config = {
  name: "anti",
  version: "4.1.5",
  hasPermssion: 1,
  credits: "TùngGPT (rút gọn & thêm event)",
  description: "Bật/tắt chống đổi theme và emoji",
  commandCategory: "Nhóm",
  usages: "[emoji/theme/on/off] hoặc [anti theme]",
  cooldowns: 3,
};

module.exports.handleEvent = async ({ api, event }) => {
  const { threadID, logMessageType, logMessageData } = event;
  const data = JSON.parse(fs.readFileSync(path));

  if (!data[threadID] || !data[threadID].theme) return; // Chỉ xử lý nếu chế độ theme được bật

  if (logMessageType === "log:thread-color") {
    const oldTheme = data[threadID].lastTheme || "default";
    try {
      await api.changeThreadColor(oldTheme, threadID);
      api.sendMessage("🚫 Theme nhóm đã bị thay đổi! Đã khôi phục theme cũ.", threadID);
    } catch (err) {
      api.sendMessage("⚠️ Có lỗi khi khôi phục theme, vui lòng thử lại!", threadID);
    }
    fs.writeFileSync(path, JSON.stringify(data, null, 4), "utf-8");
  }
};

module.exports.run = async ({ api, event, args }) => {
  const threadID = event.threadID;
  const data = JSON.parse(fs.readFileSync(path));
  if (!data[threadID]) data[threadID] = { emoji: false, theme: false, lastEmoji: "👍", lastTheme: "default" };

  const on = "✅";
  const off = "❎";

  const save = () =>
    fs.writeFileSync(path, JSON.stringify(data, null, 4), "utf-8");

  const types = ["emoji", "theme"];
  const input = args[0]?.toLowerCase();

  // Lưu lại theme và icon hiện tại khi bật chế độ chống đổi
  if (input === "emoji" && !data[threadID].emoji) {
    const currentEmoji = await api.getThreadInfo(threadID).then(info => info.emoji || "👍");
    data[threadID].lastEmoji = currentEmoji;
    api.sendMessage("📌 Đã lưu emoji hiện tại để khôi phục khi cần!", threadID);
  } else if (input === "theme" && !data[threadID].theme) {
    const currentTheme = await api.getThreadInfo(threadID).then(info => info.color || "default");
    data[threadID].lastTheme = currentTheme;
    api.sendMessage("📌 Đã lưu theme hiện tại để khôi phục khi cần!", threadID);
  }

  // Xử lý lệnh "anti theme" hoặc "anti emoji"
  if (input === "anti" && args[1]?.toLowerCase() === "theme") {
    if (!data[threadID].theme) {
      const currentTheme = await api.getThreadInfo(threadID).then(info => info.color || "default");
      data[threadID].lastTheme = currentTheme;
      api.sendMessage("📌 Đã lưu theme hiện tại để khôi phục khi cần!", threadID);
    }
    data[threadID].theme = !data[threadID].theme;
    save();
    return api.sendMessage(
      `✅ Đã ${data[threadID].theme ? "bật" : "tắt"} chế độ chống đổi theme`,
      threadID
    );
  }

  if (!input || !types.includes(input)) {
    const msg = `🛡️ Trạng thái chống thay đổi:\n` +
      `• Emoji: ${data[threadID].emoji ? on : off}\n` +
      `• Theme: ${data[threadID].theme ? on : off}\n\n` +
      `📌 Dùng: ${global.config.PREFIX}anti [emoji/theme] hoặc ${global.config.PREFIX}anti theme để bật/tắt`;
    return api.sendMessage(msg, threadID);
  }

  data[threadID][input] = !data[threadID][input];
  save();
  return api.sendMessage(
    `✅ Đã ${data[threadID][input] ? "bật" : "tắt"} chế độ chống đổi ${input}`,
    threadID
  );
};