const games = {};

function getDiceResult() {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const dice3 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2 + dice3;
    
    let result;
    if (dice1 === dice2 && dice2 === dice3) {
        result = "bão";
    } else {
        result = total >= 11 ? "tài" : "xỉu";
    }
    
    return { dice1, dice2, dice3, total, result };
}

function parseMoney(moneyValue) {
    if (typeof moneyValue === 'string') {
        return parseFloat(moneyValue.replace(/\./g, '').replace(',', '.'));
    }
    return moneyValue;
}

module.exports.config = {
    name: "tx",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Ngọc Nhi x GPT",
    description: "Game tài xỉu multiplayer",
    commandCategory: "Game",
    usages: "create [số_tiền] / tài / xỉu / rời / xổ / hủy / xem",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args, Currencies, Users }) {
    const { threadID, senderID, messageID } = event;
    const name = await Users.getNameUser(senderID);

    if (!args[0]) {
        return api.sendMessage(
`🎲 TÀI XỈU MULTIPLAYER - 

📌 Cách chơi:
• /tx create [số tiền] - Tạo bàn
• tài - Tham gia cửa TÀI
• xỉu - Tham gia cửa XỈU
• rời - Rời bàn
• xổ - Xổ số (chủ bàn)
• hủy - Hủy bàn (chủ bàn)   
• xem - Xem thông tin bàn

🎯 Luật chơi:
- Tổng 3 xúc xắc 11-17: TÀI
- Tổng 3 xúc xắc 4-10: XỈU  
- 3 mặt giống nhau: BÃO (hòa tiền)

💰 Chủ bàn phải chọn cửa bằng cách gõ "tài" hoặc "xỉu" sau khi tạo bàn
⏰ Xổ sau 10s khi chủ bàn gõ "xổ"`,
            threadID,
            messageID
        );
    }

    const command = args[0].toLowerCase();

    // Tạo bàn tài xỉu
    if (command === "create") {
        if (games[threadID]) {
            return api.sendMessage("❌ Đã có bàn tài xỉu trong nhóm này!", threadID, messageID);
        }

        if (args.length < 2) {
            return api.sendMessage("⚠️ Thiếu số tiền cược!", threadID, messageID);
        }

        const bet = parseInt(args[1]);
        if (!bet || bet < 1000) {
            return api.sendMessage("⚠️ Số tiền cược tối thiểu là 1,000 VNĐ", threadID, messageID);
        }

        const userData = await Currencies.getData(senderID);
        const userMoney = parseMoney(userData.money);
        if (userMoney < bet) {
            return api.sendMessage(`❌ Bạn không đủ tiền! Số dư: ${userMoney.toLocaleString('vi-VN')} VNĐ`, threadID, messageID);
        }

        // Trừ tiền chủ bàn
        await Currencies.decreaseMoney(senderID, bet);

        // Tạo bàn
        games[threadID] = {
            bet: bet,
            host: senderID,
            hostName: name,
            hostChoice: null, // Chủ bàn chưa chọn cửa
            players: {
                tài: [],
                xỉu: []
            },
            totalPot: bet,
            started: false
        };

        return api.sendMessage(
`🎲 BÀN TÀI XỈU ĐÃ ĐƯỢC TẠO
👤 Chủ bàn: ${name}
💰 Mức cược: ${bet.toLocaleString('vi-VN')} VNĐ`,
            threadID,
            messageID
        );
    }

    // Xem thông tin bàn
    if (command === "xem") {
        const game = games[threadID];
        if (!game) {
            return api.sendMessage("❌ Hiện không có bàn tài xỉu nào trong nhóm!", threadID, messageID);
        }

        let msg = `🎲 THÔNG TIN BÀN TÀI XỈU\n`;
        msg += `👤 Chủ bàn: ${game.hostName}${game.hostChoice ? ` (${game.hostChoice.toUpperCase()})` : " (Chưa chọn cửa)"}\n`;
        msg += `💰 Mức cược: ${game.bet.toLocaleString('vi-VN')} VNĐ\n`;
        msg += `👥 Tổng số người: ${game.players.tài.length + game.players.xỉu.length}\n\n`;

        msg += `🎯 CỬA TÀI (${game.players.tài.length} người):\n`;
        game.players.tài.forEach((player, index) => {
            msg += `${index + 1}. ${player.name}\n`;
        });

        msg += `\n🎯 CỬA XỈU (${game.players.xỉu.length} người):\n`;
        game.players.xỉu.forEach((player, index) => {
            msg += `${index + 1}. ${player.name}\n`;
        });

        if (!game.started) {
            msg += `\n⏳ Chờ chủ bàn gõ "xổ" để xổ số...`;
        }

        return api.sendMessage(msg, threadID, messageID);
    }

    // Hủy bàn
    if (command === "hủy") {
        const game = games[threadID];
        if (!game) {
            return api.sendMessage("❌ Không có bàn nào để hủy!", threadID, messageID);
        }

        if (game.host !== senderID) {
            return api.sendMessage("❌ Chỉ chủ bàn mới được hủy!", threadID, messageID);
        }

        // Hoàn tiền cho tất cả người chơi
        for (const side of ['tài', 'xỉu']) {
            for (const player of game.players[side]) {
                await Currencies.increaseMoney(player.id, player.bet);
            }
        }

        delete games[threadID];
        return api.sendMessage("✅ Bàn tài xỉu đã được hủy, tiền đã được hoàn trả!", threadID, messageID);
    }

    return api.sendMessage("❌ Lệnh không hợp lệ! Gõ '/tx' để xem hướng dẫn", threadID, messageID);
};

module.exports.handleEvent = async function ({ api, event, Currencies, Users }) {
    const { threadID, senderID, body } = event;
    if (!body) return;

    const text = body.toLowerCase().trim();
    const name = await Users.getNameUser(senderID);
    const game = games[threadID];

    // Tham gia cửa TÀI
    if (text === "tài") {
        if (!game) {
            return api.sendMessage("❌ Hiện không có bàn tài xỉu nào trong nhóm!", threadID);
        }

        if (game.started) {
            return api.sendMessage("❌ Bàn đã bắt đầu, không thể tham gia!", threadID);
        }

        // Kiểm tra đã tham gia chưa
        const alreadyJoined = game.players.tài.find(p => p.id === senderID) || game.players.xỉu.find(p => p.id === senderID);
        if (alreadyJoined) {
            return api.sendMessage("❌ Bạn đã tham gia bàn này rồi!", threadID);
        }

        // Nếu là chủ bàn
        if (senderID === game.host) {
            if (game.hostChoice === "tài") {
                return api.sendMessage("❌ Bạn đã chọn TÀI rồi!", threadID);
            }
            // Chuyển từ cửa XỈU sang TÀI (nếu có)
            const hostIndex = game.players.xỉu.findIndex(p => p.id === senderID);
            if (hostIndex !== -1) {
                game.players.xỉu.splice(hostIndex, 1);
            }
            game.players.tài.push({
                id: senderID,
                name: name + ' 👑',
                bet: game.bet
            });
            game.hostChoice = "tài";
            return api.sendMessage(`✅ ${name} đã tham gia cửa TÀI!`, threadID);
        }

        // Người chơi bình thường - trừ tiền
        const userData = await Currencies.getData(senderID);
        const userMoney = parseMoney(userData.money);
        if (userMoney < game.bet) {
            return api.sendMessage(`❌ Bạn không đủ tiền! Cần ${game.bet.toLocaleString('vi-VN')} VNĐ, số dư: ${userMoney.toLocaleString('vi-VN')} VNĐ`, threadID);
        }

        await Currencies.decreaseMoney(senderID, game.bet);

        game.players.tài.push({
            id: senderID,
            name: name,
            bet: game.bet
        });
        game.totalPot += game.bet;

        return api.sendMessage(
            `✅ ${name} đã tham gia cửa TÀI: ${game.bet.toLocaleString('vi-VN')} VNĐ`,
            threadID
        );
    }

    // Tham gia cửa XỈU
    if (text === "xỉu") {
        if (!game) {
            return api.sendMessage("❌ Hiện không có bàn tài xỉu nào trong nhóm!", threadID);
        }

        if (game.started) {
            return api.sendMessage("❌ Bàn đã bắt đầu, không thể tham gia!", threadID);
        }

        const alreadyJoined = game.players.tài.find(p => p.id === senderID) || game.players.xỉu.find(p => p.id === senderID);
        if (alreadyJoined) {
            return api.sendMessage("❌ Bạn đã tham gia bàn này rồi!", threadID);
        }

        // Nếu là chủ bàn
        if (senderID === game.host) {
            if (game.hostChoice === "xỉu") {
                return api.sendMessage("❌ Bạn đã chọn XỈU rồi!", threadID);
            }
            // Chuyển từ cửa TÀI sang XỈU (nếu có)
            const hostIndex = game.players.tài.findIndex(p => p.id === senderID);
            if (hostIndex !== -1) {
                game.players.tài.splice(hostIndex, 1);
            }
            game.players.xỉu.push({
                id: senderID,
                name: name + ' 👑',
                bet: game.bet
            });
            game.hostChoice = "xỉu";
            return api.sendMessage(`✅ ${name} đã tham gia cửa XỈU!`, threadID);
        }

        const userData = await Currencies.getData(senderID);
        const userMoney = parseMoney(userData.money);
        if (userMoney < game.bet) {
            return api.sendMessage(`❌ Bạn không đủ tiền! Cần ${game.bet.toLocaleString('vi-VN')} VNĐ, số dư: ${userMoney.toLocaleString('vi-VN')} VNĐ`, threadID);
        }

        await Currencies.decreaseMoney(senderID, game.bet);

        game.players.xỉu.push({
            id: senderID,
            name: name,
            bet: game.bet
        });
        game.totalPot += game.bet;

        return api.sendMessage(
            `✅ ${name} đã tham gia cửa XỈU: ${game.bet.toLocaleString('vi-VN')} VNĐ`,
            threadID
        );
    }

    // Rời bàn
    if (text === "rời") {
        if (!game) {
            return api.sendMessage("❌ Hiện không có bàn tài xỉu nào trong nhóm!", threadID);
        }

        if (game.started) {
            return api.sendMessage("❌ Bàn đã bắt đầu, không thể rời!", threadID);
        }

        if (game.host === senderID) {
            return api.sendMessage("❌ Chủ bàn không thể rời! Hãy dùng 'hủy' để hủy bàn.", threadID);
        }

        let playerSide = null;
        let playerIndex = -1;

        playerIndex = game.players.tài.findIndex(p => p.id === senderID);
        if (playerIndex !== -1) {
            playerSide = "tài";
        } else {
            playerIndex = game.players.xỉu.findIndex(p => p.id === senderID);
            if (playerIndex !== -1) {
                playerSide = "xỉu";
            }
        }

        if (playerIndex === -1) {
            return api.sendMessage("❌ Bạn chưa tham gia bàn này!", threadID);
        }

        const player = game.players[playerSide][playerIndex];
        await Currencies.increaseMoney(senderID, game.bet);
        game.players[playerSide].splice(playerIndex, 1);
        game.totalPot -= game.bet;

        return api.sendMessage(
            `✅ ${name} đã rời khỏi bàn, tiền đã được hoàn trả!\n🎯 Tổng pot: ${game.totalPot.toLocaleString('vi-VN')} VNĐ`,
            threadID
        );
    }

    // Xổ số (chủ bàn)
    if (text === "xổ") {
        if (!game) {
            return api.sendMessage("❌ Hiện không có bàn tài xỉu nào trong nhóm!", threadID);
        }

        if (game.host !== senderID) {
            return api.sendMessage("❌ Chỉ chủ bàn mới được xổ số!", threadID);
        }

        if (game.started) {
            return api.sendMessage("❌ Bàn đã được xổ số rồi!", threadID);
        }

        if (!game.hostChoice) {
            return api.sendMessage("❌ Chủ bàn phải chọn cửa (tài hoặc xỉu) trước khi xổ số!", threadID);
        }

        if (game.players.tài.length === 0 || game.players.xỉu.length === 0) {
            return api.sendMessage("❌ Cần có ít nhất 1 người chơi mỗi cửa để xổ số!", threadID);
        }

        game.started = true;
        
        api.sendMessage("🎲 Chủ bàn đã bấm xổ, đang xổ số trong 10 giây...", threadID);

        setTimeout(async () => {
            const result = getDiceResult();
            
            let resultMessage = `🎲 KẾT QUẢ TÀI XỈU\n`;
            resultMessage += `────────────────────\n`;
            resultMessage += `⚄ ${result.dice1} + ${result.dice2} + ${result.dice3} = ${result.total} ⚄\n`;
            resultMessage += `🎯 Kết quả: ${result.result.toUpperCase()}\n`;
            
            if (result.result === "bão") {
                resultMessage += `💥 BÃO ${result.dice1} NÚT!\n`;
            }
            resultMessage += `────────────────────\n\n`;

            if (result.result === "bão") {
                resultMessage += `💥 BÃO - HÒA TIỀN!\n`;
                for (const side of ['tài', 'xỉu']) {
                    for (const player of game.players[side]) {
                        await Currencies.increaseMoney(player.id, player.bet);
                    }
                }
                resultMessage += `💵 Đã hoàn tiền cho tất cả người chơi\n`;
            } else {
                let winners = [];
                let losers = [];

                if (result.result === "tài") {
                    winners = game.players.tài;
                    losers = game.players.xỉu;
                    resultMessage += `🏆 NGƯỜI THẮNG (CỬA TÀI):\n`;
                } else {
                    winners = game.players.xỉu;
                    losers = game.players.tài;
                    resultMessage += `🏆 NGƯỜI THẮNG (CỬA XỈU):\n`;
                }

                const totalLost = losers.reduce((sum, player) => sum + player.bet, 0);
                const totalWinners = winners.length;
                
                if (totalWinners > 0) {
                    const rewardPerWinner = Math.floor(totalLost / totalWinners);
                    
                    for (const winner of winners) {
                        await Currencies.increaseMoney(winner.id, winner.bet + rewardPerWinner);
                        resultMessage += `✅ ${winner.name}: +${(winner.bet + rewardPerWinner).toLocaleString('vi-VN')} VNĐ\n`;
                    }
                    
                    resultMessage += `\n💸 NGƯỜI THUA:\n`;
                    for (const loser of losers) {
                        resultMessage += `❌ ${loser.name}: -${loser.bet.toLocaleString('vi-VN')} VNĐ\n`;
                    }
                }
            }

            resultMessage += `\n💰 Tổng pot: ${game.totalPot.toLocaleString('vi-VN')} VNĐ`;

            delete games[threadID];
            api.sendMessage(resultMessage, threadID);
        }, 10000);

        return;
    }

    // Hủy bàn (chủ bàn)
    if (text === "hủy") {
        if (!game) {
            return api.sendMessage("❌ Không có bàn nào để hủy!", threadID);
        }

        if (game.host !== senderID) {
            return api.sendMessage("❌ Chỉ chủ bàn mới được hủy!", threadID);
        }

        for (const side of ['tài', 'xỉu']) {
            for (const player of game.players[side]) {
                await Currencies.increaseMoney(player.id, player.bet);
            }
        }

        delete games[threadID];
        return api.sendMessage("✅ Bàn tài xỉu đã được hủy, tiền đã được hoàn trả!", threadID);
    }

    // Xem thông tin bàn
    if (text === "xem") {
        if (!game) {
            return api.sendMessage("❌ Hiện không có bàn tài xỉu nào trong nhóm!", threadID);
        }

        let msg = `🎲 THÔNG TIN BÀN TÀI XỈU\n`;
        msg += `👤 Chủ bàn: ${game.hostName}${game.hostChoice ? ` (${game.hostChoice.toUpperCase()})` : " (Chưa chọn cửa)"}\n`;
        msg += `💰 Mức cược: ${game.bet.toLocaleString('vi-VN')} VNĐ\n`;
        msg += `👥 Tổng số người: ${game.players.tài.length + game.players.xỉu.length}\n\n`;

        msg += `🎯 CỬA TÀI (${game.players.tài.length} người):\n`;
        game.players.tài.forEach((player, index) => {
            msg += `${index + 1}. ${player.name}\n`;
        });

        msg += `\n🎯 CỬA XỈU (${game.players.xỉu.length} người):\n`;
        game.players.xỉu.forEach((player, index) => {
            msg += `${index + 1}. ${player.name}\n`;
        });

        if (!game.started) {
            msg += `\n⏳ Chờ chủ bàn gõ "xổ" để xổ số...`;
        }

        return api.sendMessage(msg, threadID);
    }
};