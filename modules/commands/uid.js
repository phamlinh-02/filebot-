module.exports.config = {
  name: "uid",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Mirai Team",
  description: "Lấy ID người dùng hoặc ID nhóm.",
  commandCategory: "Tiện ích",
  usePrefix: false,
  cooldowns: 0
};

const axios = require("axios");
const downloader = require('image-downloader');
const fse = require('fs-extra');

async function streamURL(url, mime = 'jpg') {
  const dest = `${__dirname}/cache/${Date.now()}.${mime}`;
  await downloader.image({ url, dest });
  setTimeout(() => fse.unlinkSync(dest), 60 * 1000);
  return fse.createReadStream(dest);
}

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  if (args[0] === "box") { // Lấy ID và avatar của box
    const boxID = event.threadID;
    const threadInfo = await api.getThreadInfo(boxID);

    if (threadInfo.imageSrc) { // Kiểm tra nếu box có ảnh đại diện
      const boxImage = await streamURL(threadInfo.imageSrc);
      return api.sendMessage({ body: `ID của box này là: ${boxID}`, attachment: boxImage }, threadID, messageID);
    } else {
      return api.sendMessage(`ID của box là: ${boxID}`, threadID, messageID);
    }
  }

  if (event.type === "message_reply") {
    const uid = event.messageReply.senderID;
    const userImage = await streamURL(`https://graph.facebook.com/${uid}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
    return api.sendMessage({ body: `${uid}`, attachment: userImage }, threadID, messageID);
  }

  if (!args[0]) {
    const userID = event.senderID;
    const userImage = await streamURL(`https://graph.facebook.com/${userID}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
    return api.sendMessage({ body: `${userID}`, attachment: userImage }, threadID, messageID);
  }

  if (args[0].indexOf(".com/") !== -1) {
    try {
      const link = args[0]; // Lấy link từ tham số
      const response = await axios.get(`https://ffb.vn/api/tool/get-id-fb?idfb=${encodeURIComponent(link)}`);
      
      // Kiểm tra phản hồi từ API
      if (response.data.error === 0) {
        const uid = response.data.id;
        const name = response.data.name;

        // Gửi ID và ảnh người dùng
        const userImage = await streamURL(`https://graph.facebook.com/${uid}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
        return api.sendMessage({ body: `ID: ${uid}\nTên: ${name}`, attachment: userImage }, threadID, messageID);
      } else {
        return api.sendMessage("⚠️ Không thể lấy ID từ liên kết này: " + response.data.msg, threadID, messageID);
      }
      
    } catch (error) {
      console.error(error);
      return api.sendMessage("⚠️ Đã xảy ra lỗi trong quá trình lấy ID.", threadID, messageID);
    }
  }

  for (const [id, name] of Object.entries(event.mentions)) {
    const userImage = await streamURL(`https://graph.facebook.com/${id}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
    await api.sendMessage({ body: `${name.replace('@', '')}: ${id}`, attachment: userImage }, threadID);
  }
};