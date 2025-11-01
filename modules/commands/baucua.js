const cooldownTime = 30000; // 3 phút
const minBet = 50000; // 50.000 VNĐ
const cooldowns = new Map();

module.exports.config = {
  name: "baucua",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Fix by em bé của anh bé",
  description: "Game bầu cua có đặt cược",
  commandCategory: "Game",
  usages: "<bầu/cua/tôm/cá/gà/nai> <số tiền>",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args, Currencies }) {
  const { threadID, messageID, senderID } = event;
  const list = ["bầu", "cua", "tôm", "cá", "gà", "nai"];

  if (args.length < 2)
    return api.sendMessage("💬 Cú pháp: baucua <chọn> <số tiền>\n📌 Ví dụ: baucua cá 50000", threadID, messageID);

  const choose = args[0].toLowerCase();
  const moneyBet = parseInt(args[1]);

  if (!list.includes(choose))
    return api.sendMessage("❌ Bạn chỉ được chọn: bầu, cua, tôm, cá, gà, nai!", threadID, messageID);

  if (isNaN(moneyBet) || moneyBet <= 0)
    return api.sendMessage("❌ Số tiền cược không hợp lệ.", threadID, messageID);

  // Đảm bảo minBet cũng có dấu phẩy
  if (moneyBet < minBet)
    return api.sendMessage(`⚠️ Mức cược tối thiểu là **${minBet.toLocaleString('vi-VN')}** xu (${minBet.toLocaleString('vi-VN')} VNĐ).`, threadID, messageID);

  // Check cooldown
  const now = Date.now();
  const lastPlayed = cooldowns.get(senderID) || 0;
  if (now - lastPlayed < cooldownTime) {
    const remaining = Math.ceil((cooldownTime - (now - lastPlayed)) / 1000);
    return api.sendMessage(`🕒 Bạn cần đợi ${remaining} giây nữa mới được chơi tiếp.`, threadID, messageID);
  }

  const userMoney = (await Currencies.getData(senderID)).money;
  // Đảm bảo số tiền hiện có của user cũng có dấu phẩy
  if (moneyBet > userMoney)
    return api.sendMessage(`❌ Bạn không đủ tiền để cược! Bạn hiện có **${userMoney.toLocaleString('vi-VN')}** xu.`, threadID, messageID);

  // Quay ra 3 con ngẫu nhiên
  const result = [];
  for (let i = 0; i < 3; i++) {
    result.push(list[Math.floor(Math.random() * list.length)]);
  }

  // Đếm số lần trúng
  const count = result.filter(item => item === choose).length;

  let text = `🎲 Kết quả: ${result.join(" | ")}\n`;
  if (count === 0) {
    await Currencies.decreaseMoney(senderID, moneyBet);
    // Số tiền mất cũng có dấu phẩy
    text += `😢 Bạn không trúng ô nào.\n💸 Mất **${moneyBet.toLocaleString('vi-VN')}** xu.`;
  } else {
    const reward = moneyBet * count;
    await Currencies.increaseMoney(senderID, reward);
    // Số tiền thưởng cũng có dấu phẩy
    text += `🎉 Bạn trúng ${count} lần "${choose}".\n💰 Nhận được **${reward.toLocaleString('vi-VN')}** xu.`;
  }

  cooldowns.set(senderID, now); // Lưu thời gian cooldown
  return api.sendMessage(text, threadID, messageID);
};