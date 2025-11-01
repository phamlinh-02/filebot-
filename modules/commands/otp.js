const axios = require("axios");

module.exports.config = {
  name: "otp",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "N.Trung",
  description: "Gửi yêu cầu spam SMS thông qua API",
  commandCategory: "Tiện ích",
  usages: "sms <số_điện_thoại> <số_lần>",
  cooldowns: 5,
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  if (args.length < 2) {
    return api.sendMessage("❌ Dùng sai!\n→ sms <số_điện_thoại> <số_lần>", threadID, messageID);
  }

  const phone = args[0];
  const count = parseInt(args[1]);

  if (!/^0\d{9}$/.test(phone)) {
    return api.sendMessage("❌ Số điện thoại không hợp lệ!", threadID, messageID);
  }

  if (isNaN(count) || count <= 0 || count > 20) {
    return api.sendMessage("❌ Số lần phải là số hợp lệ (1 - 20)", threadID, messageID);
  }

  const apiUrl = `http://160.30.21.71:5000/api/spam?phone=${phone}&count=${count}`;

  try {
    const res = await axios.get(apiUrl);
    api.sendMessage(`✅ Đã gửi yêu cầu spam ${count} SMS đến số ${phone}.\nPhản hồi: ${res.data.message || JSON.stringify(res.data)}`, threadID, messageID);
  } catch (err) {
    api.sendMessage(`❌ Lỗi khi gửi yêu cầu: ${err.message}`, threadID, messageID);
  }
};