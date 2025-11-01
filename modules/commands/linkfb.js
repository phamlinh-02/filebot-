const axios = require("axios");

// Token bạn cung cấp
const ACCESS_TOKEN = "EAAD6V7os0gcBPdcP76hlVLYH8HreyCPmRfTKyDuLbynpBLkdRrrKqo1QqPfB11oDaHgav545B23oWbWk33ZBYsIUIavRpNKD6Krm14ALrz1wXpYUjzLbq72KUKZAfcurB2sAOY6vZCeJmSpr9v2qo3GK3gnA0smkvrm0EtxiV7PQfuRH3SdZBYCytf9aDcDinAZDZD";

module.exports.config = {
  name: "linkfb",
  version: "1.2.2",
  hasPermssion: 0,
  credits: "ThanhTùngGPT & Modified by DuyVuong",
  description: "Lấy link Facebook, UID và ngày tạo tài khoản",
  commandCategory: "Tiện ích",
  usages: "[uid | link] hoặc reply tin nhắn hoặc tag",
  cooldowns: 5
};

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function getUserData(uid, api) {
  try {
    const [userInfo, creationInfo] = await Promise.all([
      api.getUserInfo(uid),
      axios.get(`https://graph.facebook.com/${uid}?fields=name,created_time&access_token=${ACCESS_TOKEN}`)
    ]);
    const name = userInfo[uid]?.name || creationInfo.data.name || "Không xác định";
    const creationDate = creationInfo.data.created_time ? formatDate(creationInfo.data.created_time) : "Không xác định";
    return { name, uid, creationDate };
  } catch (error) {
    return { name: "Không xác định", uid, creationDate: "Không xác định" };
  }
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, messageReply, mentions } = event;
  let input = args[0];
  let uid;

  // Xử lý khi tag người dùng
  if (Object.keys(mentions).length > 0) {
    uid = Object.keys(mentions)[0];
    const name = mentions[uid].replace("@", "");
    const data = await getUserData(uid, api);
    return api.sendMessage(
      `👤 Tên: ${data.name}\n🔗 Link FB: https://facebook.com/${uid}\n🆔 UID: ${uid}\n📅 Ngày tạo: ${data.creationDate}`,
      threadID,
      messageID
    );
  }

  // Xử lý khi reply tin nhắn
  if (messageReply) {
    uid = messageReply.senderID;
    const data = await getUserData(uid, api);
    return api.sendMessage(
      `👤 Tên: ${data.name}\n🔗 Link FB: https://facebook.com/${uid}\n🆔 UID: ${uid}\n📅 Ngày tạo: ${data.creationDate}`,
      threadID,
      messageID
    );
  }

  // Xử lý khi nhập UID hoặc link
  if (input) {
    // Nếu là link Facebook
    if (input.includes("facebook.com")) {
      try {
        const res = await axios.get(`https://graph.facebook.com/v17.0/?id=${encodeURIComponent(input)}&access_token=${ACCESS_TOKEN}`);
        uid = res.data.id;
        if (!uid) throw new Error("Không tìm thấy UID");
        const data = await getUserData(uid, api);
        return api.sendMessage(
          `👤 Tên: ${data.name}\n🔗 Link FB: https://facebook.com/${uid}\n🆔 UID: ${uid}\n📅 Ngày tạo: ${data.creationDate}`,
          threadID,
          messageID
        );
      } catch (error) {
        return api.sendMessage("❌ Không thể lấy thông tin từ link này. Link có thể không hợp lệ hoặc bị chặn.", threadID, messageID);
      }
    } 
    // Nếu là UID (bất kỳ chuỗi số nào)
    else if (/^\d+$/.test(input)) {
      uid = input;
      const data = await getUserData(uid, api);
      return api.sendMessage(
        `👤 Tên: ${data.name}\n🔗 Link FB: https://facebook.com/${uid}\n🆔 UID: ${uid}\n📅 Ngày tạo: ${data.creationDate}`,
        threadID,
        messageID
      );
    } else {
      return api.sendMessage("❌ Đầu vào không hợp lệ. Vui lòng nhập UID (chuỗi số) hoặc link Facebook hợp lệ.", threadID, messageID);
    }
  }

  // Nếu không có tham số, lấy thông tin của chính mình
  uid = event.senderID;
  const data = await getUserData(uid, api);
  return api.sendMessage(
    `👤 Tên: ${data.name}\n🔗 Link FB: https://facebook.com/${uid}\n🆔 UID: ${uid}\n📅 Ngày tạo: ${data.creationDate}`,
    threadID,
    messageID
  );
};