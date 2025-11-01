const fs = require('fs');
const path = require('path');

module.exports.config = {
    name: "lixi",
    version: "1.0.2",
    hasPermssion: 0,
    credits: "YourName",
    description: "Nhận lì xì mỗi ngày!",
    commandCategory: "Tài Chính",
    cooldowns: 5,
    images: []
};

module.exports.languages = {
    "vi": {
        "cooldown": "🧧 Bạn đã nhận lì xì rồi, vui lòng quay lại vào ngày mai 🎋.",
        "notAuthor": "❌ Chỉ người gửi lệnh mới được chọn phong bao lì xì!",
        "invalidChoice": "Vui lòng nhập một số từ 1 đến 14!",
        "success": "🌸🧧 Chúc mừng năm mới 2026 🧧🌸\n🧧 Bạn nhận được %1 VNĐ\n\n%2\n\n» Chúc bạn năm mới an khang!"
    },
    "en": {
        "cooldown": "🧧 You've already received lucky money, please come back tomorrow 🎋.",
        "notAuthor": "❌ Only command sender can choose lucky envelope!",
        "invalidChoice": "Please enter a number from 1 to 14!",
        "success": "🌸🧧 Happy New Year 2026 🧧🌸\n🧧 You received %1 VNĐ\n\n%2\n\n» Wishing you a prosperous new year!"
    }
};

module.exports.handleReply = async ({ event, api, handleReply, Currencies, getText }) => {
    const { threadID, messageID, senderID } = event;

    // Kiểm tra người reply có phải là người gửi lệnh ban đầu không
    if (senderID !== handleReply.author) {
        return api.sendMessage(getText("notAuthor"), threadID, messageID);
    }

    const lixiAmount = Math.floor(Math.random() * 300001) + 200000; // Số tiền ngẫu nhiên từ 200,000 đến 500,000
    const wishes = [
        "Mùng 3 Tết bạn sẽ gặp được một đại gia giàu có đã phá sản 🎐",
        "Chúc bạn một năm mới an khang thịnh vượng!",
        "Năm 2026: Đánh đâu thắng đó, làm gì cũng thành công! 🌟"
    ];
    const randomWish = wishes[Math.floor(Math.random() * wishes.length)];

    if (handleReply.type === "chooseLixi") {
        const choose = parseInt(event.body);

        if (isNaN(choose) || choose < 1 || choose > 14) {
            return api.sendMessage(getText("invalidChoice"), threadID, messageID);
        }

        // Cộng tiền vào tài khoản
        await Currencies.increaseMoney(senderID, lixiAmount);

        // Lưu dữ liệu người dùng
        let data = (await Currencies.getData(senderID)).data || {};
        data.totalLixiReceived = (data.totalLixiReceived || 0) + lixiAmount;
        data.lixiTime = Date.now();
        await Currencies.setData(senderID, { data });

        const formattedLixiAmount = lixiAmount.toLocaleString('vi-VN') + ' VNĐ';
        const msg = getText("success", formattedLixiAmount, randomWish);

        api.unsendMessage(handleReply.messageID);
        return api.sendMessage(msg, threadID, messageID);
    }
};

module.exports.run = async ({ event, api, Currencies, getText }) => {
    const { threadID, messageID, senderID } = event;

    // Lấy dữ liệu người dùng
    let data = (await Currencies.getData(senderID)).data || {};

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Đặt giờ về 00:00:00 để so sánh ngày

    const lastLixiTime = data.lixiTime ? new Date(data.lixiTime) : null;
    let canReceive = true;

    if (lastLixiTime) {
        lastLixiTime.setHours(0, 0, 0, 0); // Đặt giờ của lần nhận trước về 00:00:00
        if (lastLixiTime.getTime() === today.getTime()) {
            canReceive = false;
        }
    }

    if (!canReceive) {
        return api.sendMessage(getText("cooldown"), threadID, messageID);
    } else {
        const lixiOptions = Array.from({ length: 14 }, (_, i) => `${i + 1}. Bao lì xì ${i + 1} 🧧`).join('\n');
        return api.sendMessage(
            `🎋 Phong bao lì xì 🎋\n🌸🧧 Chúc mừng năm mới 2026 🧧🌸\n\n${lixiOptions}\n\nReply số tương ứng để nhận lì xì`,
            threadID,
            (error, info) => {
                global.client.handleReply.push({
                    type: "chooseLixi",
                    name: this.config.name,
                    author: senderID,
                    messageID: info.messageID
                });
            },
            messageID
        );
    }
};