module.exports.config = {
  name: "ghép",
  version: "1.1.4",
  hasPermssion: 0,
  credits: "M-Drasew + GPT",
  description: "Ghép đôi với lựa chọn giới tính hoặc ngẫu nhiên",
  commandCategory: "Tình Yêu",
  usages: "ghép",
  cooldowns: 600
};

module.exports.run = async ({ api, event }) => {
  const { threadID, messageID, senderID } = event;
  return api.sendMessage(
    `🌸<<「 𝗧𝗜𝗡𝗗𝗘𝗥 」>>🌸\n▱▱▱▱▱▱▱▱▱▱▱▱\n\n🎎 Chuẩn bị mai mối thành công\n👉 Phản hồi tin nhắn này với một trong các lựa chọn:\n- Nam\n- Nữ\n- Random`,
    threadID,
    (err, info) => {
      global.client.handleReply.push({
        type: "tinder",
        name: module.exports.config.name,
        author: senderID,
        messageID: info.messageID
      });
    },
    messageID
  );
};

module.exports.handleReply = async ({ api, event, handleReply, Users }) => {
  const { threadID, messageID, senderID } = event;
  const choice = event.body.toLowerCase();
  const ThreadInfo = await api.getThreadInfo(threadID);
  const all = ThreadInfo.userInfo;
  let data = [];

  let selectedGender;
  if (choice.includes("nam") || choice.includes("trai")) {
    selectedGender = "MALE";
  } else if (choice.includes("nữ") || choice.includes("gái")) {
    selectedGender = "FEMALE";
  } else if (choice.includes("random")) {
    const genderOptions = ["MALE", "FEMALE"];
    selectedGender = genderOptions[Math.floor(Math.random() * genderOptions.length)];
  } else {
    return api.sendMessage("⚠️ Bạn phải chọn 'Nam', 'Nữ' hoặc 'Random' để ghép đôi!", threadID, messageID);
  }

  for (let u of all) {
    if (u.gender === selectedGender && u.id !== senderID) data.push(u.id);
  }

  if (!data.length) {
    api.unsendMessage(handleReply.messageID);
    return api.sendMessage(`❌ Không tìm thấy người ${selectedGender === "MALE" ? "nam" : "nữ"} phù hợp để ghép!`, threadID, messageID);
  }

  api.unsendMessage(handleReply.messageID);

  // Gửi tin nhắn "Đang tìm người phù hợp..." và thu hồi sau 10 giây
  api.sendMessage("🔍 Đang tìm người phù hợp...", threadID, (err, info) => {
    setTimeout(async () => {
      api.unsendMessage(info.messageID);

      const partnerID = data[Math.floor(Math.random() * data.length)];
      const partnerName = await Users.getNameUser(partnerID);
      const userName = await Users.getNameUser(senderID);

      const tle = (Math.random() * 50 + 50).toFixed(2);
      const emojis = ["💘", "❤️", "💝", "💖", "💗", "💞", "😍", "🥰", "💑", "👩‍❤️‍👨"];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      const quotes = [
        "Tình yêu đâu cần lý do, chỉ cần đúng người là đủ.",
        "Yêu nhau từ cái nhìn đầu tiên là thật!",
        "Chúc hai bạn sớm về chung một nhà 💍",
        "Tình yêu là khi 2 người cùng nhìn về một hướng 🌅",
        "Ghép đôi xong rồi, cưới đi thôi 💒"
      ];

      const msg = {
        body: `===     Ghép đôi thành công     ===\n━━━━━━━━━━━━━━━━━━━━━━\n${partnerName} ${randomEmoji} ${userName}\n━━━━━━━━━━━━━━━━━━━━━━\n➝ Tỉ lệ hợp đôi: ${tle}%\n➝ ${quotes[Math.floor(Math.random() * quotes.length)]}`,
        mentions: [
          { tag: partnerName, id: partnerID },
          { tag: userName, id: senderID }
        ]
      };

      api.sendMessage(msg, threadID, messageID);
    }, 10000); // Chờ 10 giây
  });
};