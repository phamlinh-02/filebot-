const cooldownTime = 30000; // Cooldown 30 giây
const betAmount = 5000;     // Số tiền cược/thắng cố định: 5.000 VNĐ
const minMoneyRequired = betAmount; // Số tiền tối thiểu cần có để chơi

const cooldowns = new Map();

module.exports.config = {
    name: "lucky",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Em bé chỉnh sửa (chuyển đổi bởi Gemini)",
    description: "Dự đoán số từ 0 đến 5, thắng/thua 5000 xu.",
    commandCategory: "Game",
    usages: "[số từ 0-5]", // Cập nhật usages
    cooldowns: 5 // Cooldown cho người dùng trong từng thread
};

module.exports.run = async function ({ api, event, args, Currencies }) {
    const { threadID, messageID, senderID } = event;
    const guess = parseInt(args[0]); // Số người chơi dự đoán

    // Kiểm tra số dự đoán: phải là số nguyên và nằm trong khoảng từ 0 đến 5
    if (isNaN(guess) || guess < 0 || guess > 5) {
        return api.sendMessage(
            "⚠️ Cú pháp sai hoặc số không hợp lệ!\nBạn chỉ có thể đoán số từ **0 đến 5**.\nVí dụ: lucky 3",
            threadID,
            messageID
        );
    }

    const moneyData = await Currencies.getData(senderID);
    const userMoney = moneyData.money;

    // Kiểm tra số tiền tối thiểu
    if (userMoney < minMoneyRequired) {
        return api.sendMessage(`💸 Bạn cần ít nhất ${minMoneyRequired} xu để chơi lucky. Hiện có: ${userMoney} xu.`, threadID, messageID);
    }

    // Kiểm tra cooldown
    const now = Date.now();
    const lastPlayed = cooldowns.get(senderID) || 0;
    if (now - lastPlayed < cooldownTime) {
        const remainingSeconds = Math.ceil((cooldownTime - (now - lastPlayed)) / 1000);
        return api.sendMessage(`🕒 Bạn cần đợi ${remainingSeconds} giây nữa mới được chơi tiếp lệnh lucky.`, threadID, messageID);
    }

    // Bot chọn ngẫu nhiên một số từ 0 đến 5
    const botNumber = Math.floor(Math.random() * 6); // Số ngẫu nhiên từ 0 đến 5 (0, 1, 2, 3, 4, 5)

    let resultMsg = `🍀 Bạn đã đoán số: **${guess}**\n`; // Thông báo số bạn đoán
    
    if (guess === botNumber) {
        await Currencies.increaseMoney(senderID, betAmount);
        resultMsg += `Con số may mắn là **${botNumber}**\n`; // Số may mắn
        resultMsg += `🎉 Chúc mừng bạn đã đoán đúng! Bạn nhận được +${betAmount} xu.`;
    } else {
        await Currencies.decreaseMoney(senderID, betAmount);
        resultMsg += `Con số may mắn là **${botNumber}**\n`; // Số may mắn
        resultMsg += `💔 Tiếc quá, bạn đã đoán sai rồi!\nChúc bạn may mắn lần sau nhaaa !\n`;
        resultMsg += `====Lưu ý====\nSau mỗi lần đoán sai, bạn sẽ bị trừ ${betAmount}đ, nếu bạn đúng bạn sẽ nhận lại ${betAmount}đ.`;
    }

    cooldowns.set(senderID, now); // Cập nhật thời gian chơi gần nhất

    return api.sendMessage(resultMsg, threadID, messageID);
};