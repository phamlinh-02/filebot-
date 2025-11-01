const moment = require("moment-timezone");

module.exports.config = {
  name: "money",
  version: "1.2.1",
  hasPermssion: 0,
  credits: "Quất - Tối ưu bởi RST",
  description: "Xem số tiền của bạn hoặc người khác",
  commandCategory: "Tài Chính",
  usages: "money [tag/reply]",
  cooldowns: 0,
  usePrefix: false,
};

module.exports.run = async function ({ Currencies, api, event, Users }) {
  const { threadID, senderID, messageReply, type, mentions } = event;

  let targetID = senderID;
  if (type === "message_reply") targetID = messageReply.senderID;
  else if (Object.keys(mentions).length > 0) targetID = Object.keys(mentions)[0];

  try {
    const name = await Users.getNameUser(targetID);
    const userData = await Currencies.getData(targetID);
    if (!userData) return api.sendMessage("Không tìm thấy dữ liệu người dùng.", threadID);
    const money = userData.money;
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");

    const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n);

    if (money === Infinity) return api.sendMessage(`${name} có vô hạn tiền`, threadID);
    return api.sendMessage(
      `💸 Số dư của ${name}: ${formatMoney(money)} VNĐ\n⏰ Time: ${time}`,
      threadID
    );
  } catch (err) {
    console.error(err);
    return api.sendMessage(`Đã xảy ra lỗi: ${err.message}`, threadID);
  }
};
