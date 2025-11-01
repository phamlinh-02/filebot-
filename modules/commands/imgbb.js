const axios = require("axios");
const fs = require("fs-extra");
const FormData = require("form-data");

module.exports = {
  config: {
    name: "imgbb",
    version: "1.1",
    hasPermission: 0,
    credits: "Thanh x GPT",
    description: "Upload nhiều ảnh hoặc video lên imgbb",
    commandCategory: "Tiện ích",
    usages: "[reply hoặc đính kèm ảnh/video]",
    cooldowns: 5,
  },

  run: async function({ api, event }) {
    const API_KEY = "7af6424e2fa3a2187b85115a5e14b843"; // API key imgbb của bạn

    const attachments = event.messageReply?.attachments || event.attachments;

    if (!attachments || attachments.length === 0) {
      return api.sendMessage("❌ Vui lòng reply hoặc đính kèm ảnh/video để upload.", event.threadID, event.messageID);
    }
    let resultMessage = "";

    for (const [index, attachment] of attachments.entries()) {
      const ext = attachment.type === "video" ? ".mp4" : ".jpg";
      const filePath = `${__dirname}/cache/imgbb_temp_${Date.now()}_${index}${ext}`;

      try {
        // Tải file về
        const res = await axios.get(attachment.url, { responseType: "arraybuffer" });
        await fs.writeFile(filePath, Buffer.from(res.data));

        // Chuẩn bị form
        const form = new FormData();
        form.append("key", API_KEY);
        form.append("image", fs.createReadStream(filePath));

        // Upload lên imgbb
        const uploadRes = await axios.post("https://api.imgbb.com/1/upload", form, {
          headers: form.getHeaders()
        });

        const data = uploadRes.data.data;
        resultMessage += `"${data.url}",\n`;

      } catch (err) {
        console.error(`❌ Lỗi khi upload file ${index + 1}:`, err.message);
        resultMessage += `⚠️ File ${index + 1} upload thất bại.\n`;
      } finally {
        // Xoá file
        if (fs.existsSync(filePath)) {
          await fs.unlink(filePath);
        }
      }
    }

    api.sendMessage(resultMessage.trim(), event.threadID, event.messageID);
  }
};