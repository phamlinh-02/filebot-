const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');

module.exports.config = {
  name: "chonggotinnhan",
  version: "3.0.0",
  hasPermssion: 1,
  credits: "Rewritten & Upgraded by ChatGPT",
  description: "Khôi phục tin nhắn đã gỡ (văn bản và file đính kèm)",
  commandCategory: "Quản Trị Viên",
  usages: "",
  cooldowns: 0,
  hide: true,
  dependencies: {
    "request": "",
    "fs-extra": "",
    "axios": ""
  }
};

// Dùng để lưu trữ tin nhắn
const messageStore = new Map();

module.exports.handleEvent = async function ({ event, api, Users, Threads }) {
  const { threadID, messageID, senderID, body, type, attachments, timestamp } = event;

  if (type !== "message_unsend") {
    // Lưu tin nhắn vào bộ nhớ tạm nếu resend đang bật
    const threadData = global.data.threadData.get(threadID) || {};
    if (threadData.resend) {
      messageStore.set(messageID, {
        body,
        attachments,
        senderID,
        timestamp,
        threadID
      });
    }
    return;
  }

  const unsent = messageStore.get(messageID);
  if (!unsent || senderID === api.getCurrentUserID()) return;

  const senderName = await Users.getNameUser(senderID);
  const timeSent = new Date(unsent.timestamp).toLocaleString("vi-VN");
  const timeUnsent = new Date().toLocaleString("vi-VN");

  let messageText = `⚠️ ${senderName} đã gỡ một tin nhắn!\n`;
  messageText += `⏰ Gửi lúc: ${timeSent}\n🗑️ Gỡ lúc: ${timeUnsent}\n`;

  if (unsent.body) {
    messageText += `\n💬 Nội dung:\n${unsent.body}`;
  }

  let msgData = {
    body: messageText,
    attachment: []
  };

  if (unsent.attachments?.length) {
    for (let i = 0; i < unsent.attachments.length; i++) {
      const file = unsent.attachments[i];
      try {
        const ext = path.extname(file.url.split('?')[0]) || ".dat";
        const filePath = path.join(__dirname, `/cache/resend_${Date.now()}_${i}${ext}`);
        const res = await axios.get(file.url, { responseType: 'arraybuffer' });
        fs.writeFileSync(filePath, Buffer.from(res.data));
        msgData.attachment.push(fs.createReadStream(filePath));

        // Xoá sau 60s
        setTimeout(() => fs.unlink(filePath, () => {}), 60000);
      } catch (err) {
        console.error("Lỗi tải file đính kèm:", err);
      }
    }
  }

  api.sendMessage(msgData, unsent.threadID);
};

module.exports.languages = {
  vi: {
    on: "Đã bật",
    off: "Đã tắt",
    successText: "chế độ khôi phục tin nhắn!"
  },
  en: {
    on: "Enabled",
    off: "Disabled",
    successText: "resend feature!"
  }
};

module.exports.run = async function ({ api, event, Threads, getText }) {
  const { threadID, messageID } = event;
  let data = (await Threads.getData(threadID)).data || {};

  data.resend = !data.resend;
  await Threads.setData(threadID, { data });
  global.data.threadData.set(threadID, data);

  return api.sendMessage(`${data.resend ? getText("on") : getText("off")} ${getText("successText")}`, threadID, messageID);
};
