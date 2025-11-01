module.exports.config = {
  name: "work",
  version: "2.1.0",
  hasPermssion: 0,
  credits: "D-Jukie (Remix: Em Bé)",
  description: "Làm việc random cực mặn và nhận tiền",
  commandCategory: "Tiện ích",
  cooldowns: 5,
  envConfig: {
    cooldownTime: 1000 * 60 * 60 * 1// 1 tiếng cooldown
  }
};

module.exports.languages = {
  "vi": {
    "cooldown": "%3 làm việc rồi!\nQuay lại sau: %1 phút %2 giây."
  }
};

module.exports.run = async ({ api, event, Currencies, getText }) => {
  const { threadID, senderID } = event;

    // Lấy tên người dùng, nếu không lấy được sẽ mặc định là "Bạn"
    let userName = "Bạn";
    try {
        const userInfo = await api.getUserInfo(senderID);
        if (userInfo && userInfo[senderID]) {
            userName = userInfo[senderID].name;
        }
    } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng:", error);
    }

  const cooldownTime = this.config.envConfig.cooldownTime;
  const cooldown = global.client.cooldowns.get(`${this.config.name}-${senderID}`) || 0;
  const now = Date.now();

  if (now - cooldown < cooldownTime) {
    const timeLeft = cooldownTime - (now - cooldown);
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    return api.sendMessage(getText("cooldown", minutes, seconds, userName), threadID);
  }

  global.client.cooldowns.set(`${this.config.name}-${senderID}`, now);

  // Danh sách công việc độc lạ
  const jobs = [
    "đấm nhau với cá mập giành thùng mì",
    "hóa thân thành gà trống đi gáy thuê",
    "cào phím chửi anti hộ idol",
    "múa lửa giữa đường để kiếm donate",
    "hack não con cá vàng để dạy bơi",
    "dắt bò đi dạo vòng quanh hồ Tây",
    "bán muối ngoài vũ trụ",
    "thuyết trình với con mèo về định luật Newton",
    "hát ru cho admin group ngủ",
    "làm trọng tài đánh nhau giữa nyc và nyhiện tại",
    "đi thu thuế trái tim crush",
    "múa bụng trong đám cưới hàng xóm",
    "hộ tống vịt qua đường đông xe",
    "nằm mơ thấy làm tỷ phú và tỉnh dậy đi làm tiếp",
    "dạy cá sấu chơi đàn ukulele"
  ];

  const job = jobs[Math.floor(Math.random() * jobs.length)];
  const reward = Math.floor(Math.random() * (200000 - 100000 + 1)) + 100000;

  await Currencies.increaseMoney(senderID, reward);

  return api.sendMessage(
    `📌 ${userName} vừa ${job} và nhận được ${reward.toLocaleString()} VNĐ 💸`,
    threadID
  );
};