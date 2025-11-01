module.exports.config = {
  name: "adc",
  version: "5.5.1",
  hasPermssion: 3,
  credits: "Phạm Thanh Tùng",
  description: "Quản lý mã lệnh bot: tạo, xoá, xuất raw link",
  commandCategory: "Admin",
  usages: "[list | delete <tên> | <tên> và reply link]",
  cooldowns: 0,
  usePrefix: false
};

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const moment = require("moment-timezone");

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, messageReply, type } = event;
  const isAdmin = global.config.NDH.includes(senderID);
  const filename = args[0];
  const filepath = path.join(__dirname, `${filename}.js`);
  const replyText = type === "message_reply" ? messageReply.body : null;

  if (!isAdmin) {
    const name = global.data.userName.get(senderID);
    const thread = await api.getThreadInfo(threadID);
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss | DD/MM/YYYY");
    return api.sendMessage(
      `📌 Box: ${thread.threadName}\n👤 ${name}\n📎 Dùng lệnh: adc\n🕒 ${time}\n🔗 https://facebook.com/${senderID}`,
      global.config.NDH
    );
  }

  // LIST
  if (filename === "list") {
    const files = fs.readdirSync(__dirname).filter(f => f.endsWith(".js") && f !== "adc.js");
    const list = files.map((f, i) => `${i + 1}. ${f.replace(".js", "")}`).join("\n") || "Không có lệnh nào.";
    return api.sendMessage("📁 Danh sách lệnh:\n" + list, threadID, messageID);
  }

  // DELETE
  if (filename === "delete" && args[1]) {
    const target = path.join(__dirname, `${args[1]}.js`);
    if (!fs.existsSync(target)) return api.sendMessage(`❎ Không tìm thấy file: ${args[1]}.js`, threadID, messageID);
    fs.unlinkSync(target);
    return api.sendMessage(`✅ Đã xoá: ${args[1]}.js`, threadID, messageID);
  }

  // XUẤT LINK RAW DPASTE
  if (fs.existsSync(filepath) && !replyText) {
    const content = fs.readFileSync(filepath, "utf8");
    if (!content || content.trim().length < 3)
      return api.sendMessage(`⚠️ File "${filename}.js" không có nội dung.`, threadID, messageID);
    try {
      const form = new URLSearchParams();
      form.append("content", content);
      const res = await axios.post("https://dpaste.com/api/v2/", form.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      return api.sendMessage(`${res.data.trim()}.txt`, threadID, messageID);
    } catch (e) {
      const detail = e.response?.data || e.message;
      return api.sendMessage(`❎ Lỗi tạo link dpaste:\n${typeof detail === "object" ? JSON.stringify(detail) : detail}`, threadID, messageID);
    }
  }

  // Sai cách sử dụng nếu không có file và không reply link
  if (!fs.existsSync(filepath) && !replyText) {
    return api.sendMessage(`❎ Sai cách sử dụng.\n👉 Dùng: ${global.config.PREFIX || ''}adc <tên lệnh> (và reply link chứa code)`, threadID, messageID);
  }

  // ÁP DỤNG CODE TỪ DPASTE.COM
  const urlMatch = replyText?.match(/https?:\/\/[^\s]+/g);
  if (!urlMatch) return api.sendMessage("❎ Không tìm thấy link hợp lệ.", threadID, messageID);
  let url = urlMatch[0];
  if (/^https:\/\/dpaste\.com\/[a-zA-Z0-9]+$/.test(url)) url += ".txt";

  if (url.includes("dpaste.com")) {
    try {
      const { data } = await axios.get(url);
      fs.writeFileSync(filepath, data, "utf8");
      delete require.cache[require.resolve(filepath)];
      require(filepath);
      return api.sendMessage(`✅ Đã tải và nạp: ${filename}.js`, threadID, messageID);
    } catch (e) {
      return api.sendMessage("❎ Lỗi tải code từ dpaste:\n" + e.message, threadID, messageID);
    }
  }

  return api.sendMessage("⚠️ Chỉ hỗ trợ link từ dpaste.com", threadID, messageID);
};
