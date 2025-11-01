const cooldownTime = 30000; // 1 phút = 60 * 1000 ms.
const minBet = 50000; // 50.000 VNĐ
const cooldowns = new Map();

module.exports.config = {
    name: "taixiu",
    version: "1.1.5", 
    hasPermssion: 0,
    credits: "Developer",
    description: "Chơi game tài xỉu có cược xu",
    commandCategory: "Game",
    usages: "[tài/xỉu] [số tiền/all]",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args, Currencies }) {
    const { threadID, messageID, senderID } = event;
    
    try {
        console.log("Bắt đầu game tài xỉu với args:", args);
        
        // Kiểm tra nếu không có đối số
        if (args.length === 0) {
            return api.sendMessage(
                "🎲 Cú pháp chơi Tài Xỉu:\n\n" +
                "Dùng: taixiu [tài/xỉu] [số tiền cược]\n" +
                "Ví dụ:\n" +
                "• taixiu tài 100000\n" +
                "• taixiu tài 100k\n" +
                "• taixiu xỉu 1m\n" +
                "• taixiu tài 1b\n" +
                "• taixiu xỉu all\n\n" +
                "💰 Mức cược tối thiểu: 50,000 xu",
                threadID,
                messageID
            );
        }

        const choice = args[0]?.toLowerCase();
        console.log("Lựa chọn:", choice);

        // --- Bắt đầu logic chơi game ---
        if (!["tài", "xỉu"].includes(choice)) {
            return api.sendMessage(
                "⚠️ Lựa chọn không hợp lệ!\nVui lòng chọn 'tài' hoặc 'xỉu'\nVí dụ: taixiu tài 100000",
                threadID,
                messageID
            );
        }

        // Kiểm tra nếu có đủ tham số
        if (args.length < 2) {
            return api.sendMessage(
                "⚠️ Thiếu số tiền cược!\nVui lòng nhập số tiền bạn muốn cược\nVí dụ: taixiu tài 100000",
                threadID,
                messageID
            );
        }

        // Lấy thông tin tiền
        let moneyData;
        try {
            moneyData = await Currencies.getData(senderID);
            console.log("Money data:", moneyData);
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu tiền:", error);
            return api.sendMessage("❌ Lỗi hệ thống tiền tệ. Vui lòng thử lại sau.", threadID, messageID);
        }

        if (!moneyData) {
            return api.sendMessage("❌ Không thể lấy thông tin số dư của bạn.", threadID, messageID);
        }
        
        // Chuyển đổi BigInt sang Number nếu cần
        const money = Number(moneyData.money) || 0;
        console.log("Số dư hiện tại:", money);

        // Lấy thông tin người dùng
        let userName = "Người chơi";
        try {
            const userInfo = await api.getUserInfo(senderID);
            userName = userInfo[senderID]?.name || "Người chơi";
        } catch (error) {
            console.error("Lỗi khi lấy thông tin user:", error);
        }

        let bet;
        const betInput = args[1]?.toLowerCase();

        if (betInput === "all") {
            if (money < minBet) {
                return api.sendMessage(`⚠️ Bạn cần ít nhất ${minBet.toLocaleString('vi-VN')} xu để cược all`, threadID, messageID);
            }
            bet = money;
        } else {
            // Xử lý các định dạng tiền
            let numericValue;
            
            if (betInput.includes('k') || betInput.includes('K')) {
                numericValue = parseFloat(betInput.replace(/[kK]/, '')) * 1000;
            } else if (betInput.includes('m') || betInput.includes('M')) {
                numericValue = parseFloat(betInput.replace(/[mM]/, '')) * 1000000;
            } else if (betInput.includes('b') || betInput.includes('B')) {
                numericValue = parseFloat(betInput.replace(/[bB]/, '')) * 1000000000;
            } else {
                numericValue = parseInt(betInput.replace(/[.,]/g, ''));
            }

            if (isNaN(numericValue) || numericValue <= 0) {
                return api.sendMessage(
                    "⚠️ Số tiền cược không hợp lệ!\nVui lòng nhập số tiền hợp lệ\nVí dụ: 100000, 100k, 1m, 1b",
                    threadID,
                    messageID
                );
            }
            
            bet = numericValue;
            
            if (bet < minBet) {
                return api.sendMessage(`⚠️ Mức cược tối thiểu là ${minBet.toLocaleString('vi-VN')} xu`, threadID, messageID);
            }
            if (money < bet) {
                return api.sendMessage(`💸 Bạn không đủ tiền. Hiện có: ${money.toLocaleString('vi-VN')} xu`, threadID, messageID);
            }
        }

        console.log("Tiền cược:", bet);

        // Kiểm tra cooldown
        const now = Date.now();
        const lastPlayed = cooldowns.get(senderID) || 0;
        if (now - lastPlayed < cooldownTime) {
            const timeLeft = cooldownTime - (now - lastPlayed);
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);

            let timeString = "";
            if (minutes > 0) {
                timeString += `${minutes} phút `;
            }
            timeString += `${seconds} giây`;

            return api.sendMessage(`🕒 Bạn cần đợi ${timeString} nữa mới được chơi tiếp.`, threadID, messageID);
        }

        // Tung xúc xắc
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const dice3 = Math.floor(Math.random() * 6) + 1;
        const total = dice1 + dice2 + dice3;

        let actualResult;
        if (dice1 === dice2 && dice2 === dice3) {
            actualResult = "bão";
        } else {
            actualResult = total >= 11 ? "tài" : "xỉu";
        }

        console.log("Kết quả xúc xắc:", dice1, dice2, dice3, "Tổng:", total, "Kết quả:", actualResult);

        // Xử lý kết quả
        let finalMessage = `👤 Người chơi: ${userName}\n`;
        finalMessage += `🎲 Kết quả: ${dice1} + ${dice2} + ${dice3} = ${total}\n`;
        finalMessage += `🎉 Bạn đã chọn: ${choice.toUpperCase()}\n`;

        let newBalance = money;
        let statusMessage = "";

        if (actualResult === "bão") {
            finalMessage += `🚨 Kết quả: BÃO ${dice1} NÚT!\n`;
            // Chuyển đổi bet thành number trước khi trừ
            await Currencies.decreaseMoney(senderID, Number(bet));
            newBalance -= Number(bet);
            statusMessage = "❌ Bạn đoán sai!";
            finalMessage += `💔 Mất: ${Number(bet).toLocaleString('vi-VN')}đ\n`;
        } else {
            finalMessage += `📢 Kết quả: ${actualResult.toUpperCase()}\n`;
            if (choice === actualResult) {
                // Chuyển đổi bet thành number trước khi cộng
                await Currencies.increaseMoney(senderID, Number(bet));
                newBalance += Number(bet);
                statusMessage = "✅ Bạn đoán đúng!";
                finalMessage += `💰 Nhận: +${Number(bet).toLocaleString('vi-VN')}đ\n`;
            } else {
                // Chuyển đổi bet thành number trước khi trừ
                await Currencies.decreaseMoney(senderID, Number(bet));
                newBalance -= Number(bet);
                statusMessage = "❌ Bạn đoán sai!";
                finalMessage += `💔 Mất: ${Number(bet).toLocaleString('vi-VN')}đ\n`;
            }
        }

        finalMessage += `${statusMessage}\n`;
        finalMessage += `💵 Số dư còn lại: ${Number(newBalance).toLocaleString('vi-VN')}đ`;

        cooldowns.set(senderID, now);
        return api.sendMessage(finalMessage, threadID, messageID);

    } catch (error) {
        console.error("Lỗi trong game tài xỉu:", error);
        return api.sendMessage("❌ Đã có lỗi xảy ra khi chơi game. Vui lòng thử lại sau.", threadID, messageID);
    }
};