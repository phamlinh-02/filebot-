const games = {};

function getCard() {
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const suits = ["♠", "♥", "♦", "♣"];
  return ranks[Math.floor(Math.random() * ranks.length)] + suits[Math.floor(Math.random() * suits.length)];
}

function calcPoints(cards) {
  let points = 0;
  const ranks = { "A": 1, "J": 10, "Q": 10, "K": 10 };
  for (let c of cards) {
    let rank = c.slice(0, -1);
    points += ranks[rank] || parseInt(rank);
  }
  return points % 10;
}

function compareHands(a, b) {
  if (a.points > b.points) return 1;
  if (a.points < b.points) return -1;
  
  // Nếu bằng điểm thì so chất bài: Cơ ♥ > Rô ♦ > Tép ♣ > Bích ♠
  const suitOrder = { "♥": 4, "♦": 3, "♣": 2, "♠": 1 };
  const maxSuitA = Math.max(...a.cards.map(c => suitOrder[c.slice(-1)]));
  const maxSuitB = Math.max(...b.cards.map(c => suitOrder[c.slice(-1)]));
  
  if (maxSuitA > maxSuitB) return 1;
  if (maxSuitA < maxSuitB) return -1;
  
  // Nếu cùng chất thì so lá bài cao nhất
  const order = { "A": 14, "K": 13, "Q": 12, "J": 11, "10": 10, "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2 };
  const maxA = Math.max(...a.cards.map(c => order[c.slice(0, -1)]));
  const maxB = Math.max(...b.cards.map(c => order[c.slice(0, -1)]));
  
  if (maxA > maxB) return 1;
  if (maxA < maxB) return -1;
  
  return 0;
}

// Hàm chuyển đổi định dạng tiền tệ
function parseMoney(moneyValue) {
  if (typeof moneyValue === 'string') {
    return parseFloat(moneyValue.replace(/\./g, '').replace(',', '.'));
  }
  return moneyValue;
}

// Hàm tính phần thưởng theo số lượng người chơi và tổng tiền
function calculateReward(pot, playerCount) {
  if (pot >= 3000000 && playerCount < 5) {
    return Math.floor(pot * 0.3);
  }
  if (playerCount > 8) {
    return Math.floor(pot * 0.3);
  } else if (playerCount > 5) {
    return Math.floor(pot * 0.5);
  }
  return pot;
}

module.exports.config = {
  name: "baicao",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Ngọc Nhi x GPT",
  description: "Game bài cào",
  commandCategory: "Game",
  usages: "[create số tiền | thamgia | roi | huy | chia]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args, Currencies, Users }) {
  const { threadID, senderID } = event;
  const name = await Users.getNameUser(senderID);

  if (!args[0]) {
    return api.sendMessage(
`🎴 Luật Bài Cào 3 lá:
- Mỗi người được chia 3 lá, tính nút (A=1, J/Q/K=10).
- Tổng điểm % 10 là số nút. Cao nhất: 9 nút.
- Nếu cùng nút → so chất bài (Cơ ♥ > Rô ♦ > Tép ♣ > Bích ♠)
- Nếu vẫn hòa → so lá bài cao nhất

📌 Cách chơi:
/baicao create [số tiền] → tạo bàn
thamgia → tham gia
roi → rời bàn
huy → hủy (chủ bàn)
/baicao chia → chia bài khi đủ >=3 người

`,
      threadID
    );
  }

  const choice = args[0].toLowerCase();

  // tạo bàn
  if (choice === "create") {
    if (games[threadID]) return api.sendMessage("❌ Hiện đã có bàn, hãy tham gia hoặc chờ hủy.", threadID);

    const bet = parseInt(args[1]);
    if (!bet || bet < 1000) return api.sendMessage("⚠️ Cược tối thiểu là 1,000 VNĐ.", threadID);

    const userData = await Currencies.getData(senderID);
    const userMoney = parseMoney(userData.money);
    if (userMoney < bet) return api.sendMessage(`⚠️ Bạn không đủ tiền để tạo bàn. Số dư: ${userData.money} VNĐ.`, threadID);

    await Currencies.decreaseMoney(senderID, bet);

    games[threadID] = {
      bet,
      host: senderID,
      players: [{ id: senderID, name, bet }],
      started: false
    };
    return api.sendMessage(`🎴 ${name} đã tạo bàn với cược ${bet.toLocaleString()} VNĐ.\nGõ 'thamgia' để tham gia! (Tối đa 14 người)`, threadID);
  }

  // hủy bàn
  if (choice === "huy") {
    const game = games[threadID];
    if (!game) return api.sendMessage("❌ Chưa có bàn nào.", threadID);
    if (game.host !== senderID) return api.sendMessage("❌ Chỉ chủ bàn được hủy.", threadID);

    for (let p of game.players) {
      await Currencies.increaseMoney(p.id, game.bet);
    }
    delete games[threadID];
    return api.sendMessage("🛑 Bàn đã bị hủy.", threadID);
  }

  // chia bài
  if (choice === "chia") {
    const game = games[threadID];
    if (!game) return api.sendMessage("❌ Không có bàn.", threadID);
    if (game.host !== senderID) return api.sendMessage("❌ Chỉ chủ bàn được chia.", threadID);
    if (game.players.length < 3) return api.sendMessage("❌ Cần ít nhất 3 người để chia.", threadID);
    if (game.started) return api.sendMessage("❌ Bàn đã được chia.", threadID);

    game.started = true;
    
    // Gửi ảnh GIF khi chia bài
 
    api.sendMessage("🎴 Chủ bàn đã bấm chia, đợi 30s để chia bài...", threadID);
	

    setTimeout(async () => {
      let results = [];
      for (let p of game.players) {
        const cards = [getCard(), getCard(), getCard()];
        const points = calcPoints(cards);
        results.push({ id: p.id, name: p.name, cards, points });
      }

      // Lấy thời gian hiện tại
      const now = new Date();
      const Tm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

      // Sắp xếp kết quả
      results.sort((a, b) => compareHands(b, a));
      const winner = results[0];
      const winners = results.filter(r => compareHands(r, winner) === 0);

      // Tạo message với format mới
      let msg = `[ KẾT QUẢ BÀI CÀO ]\n────────────────────\n⏰ Time: ${Tm}\n💰 Mức cược: ${game.bet.toLocaleString()} VNĐ\n\n`;
      
      // Hiển thị bài của từng người
      for (let r of results) {
        const cardsStr = r.cards.join(" | ");
        const isHost = r.id === game.host;
        msg += `👤 ${r.name}${isHost ? ' (Chủ bàn)' : ''}:\n🃏 ${cardsStr}\n⭐ Điểm: ${r.points}\n────────────────────\n\n`;
      }

      if (winners.length === 1) {
        const pot = game.bet * game.players.length;
        const reward = calculateReward(pot, game.players.length);
        
        await Currencies.increaseMoney(winner.id, reward);
        
        msg += `🏆 NGƯỜI THẮNG (${winners.length} người):\n\n`;
        msg += `- ${winner.name} (+${reward.toLocaleString()} VNĐ)\n`;
        
        // Hiển thị thông tin tỷ lệ
        if (pot >= 3000000 && game.players.length < 5) {
          msg += ``;
        } else if (game.players.length > 8) {
          msg += ``;
        } else if (game.players.length > 5) {
          msg += ``;
        }
      } else {
        msg += `⚠️ Không có người thắng (tất cả bằng điểm thấp nhất hoặc không có người thua).\n`;
        for (let p of game.players) {
          await Currencies.increaseMoney(p.id, game.bet);
        }
        msg += `💵 Đã hoàn tiền cho tất cả người chơi.\n`;
      }

      delete games[threadID];
      api.sendMessage(msg, threadID);
    }, 30000);
  }
};

// xử lý chat thamgia/roi
module.exports.handleEvent = async function ({ api, event, Users, Currencies }) {
  const { threadID, senderID, body } = event;
  if (!body) return;
  const text = body.toLowerCase();
  const name = await Users.getNameUser(senderID);

  if (text === "thamgia") {
    const game = games[threadID];
    if (!game || game.started) return;
    if (game.players.find(p => p.id === senderID)) return api.sendMessage("❌ Bạn đã tham gia.", threadID);
    
    if (game.players.length >= 14) return api.sendMessage("❌ Bàn đã đầy (tối đa 14 người).", threadID);

    const userData = await Currencies.getData(senderID);
    const userMoney = parseMoney(userData.money);
    if (userMoney < game.bet) return api.sendMessage(`⚠️ Bạn không đủ tiền để tham gia. Số dư: ${userData.money} VNĐ.`, threadID);

    await Currencies.decreaseMoney(senderID, game.bet);
    game.players.push({ id: senderID, name, bet: game.bet });
    
    const currentPot = game.bet * game.players.length;
    
    let rewardInfo = "";
    if (game.players.length > 8) {
      rewardInfo = " (Thưởng 30% tổng tiền)";
    } else if (game.players.length > 5) {
      rewardInfo = " (Thưởng 50% tổng tiền)";
    } else if (currentPot >= 3000000) {
      rewardInfo = " (Thưởng 30% - nhà cái ăn 70%)";
    }
    
    return api.sendMessage(`✅ ${name} đã tham gia với ${game.bet.toLocaleString()} VNĐ. Hiện có ${game.players.length}/14 người. Tổng: ${currentPot.toLocaleString()} VNĐ${rewardInfo}`, threadID);
  }

  if (text === "roi") {
    const game = games[threadID];
    if (!game || game.started) return;
    if (game.host === senderID) return api.sendMessage("❌ Chủ bàn không thể rời.", threadID);

    const index = game.players.findIndex(p => p.id === senderID);
    if (index !== -1) {
      await Currencies.increaseMoney(senderID, game.bet);
      game.players.splice(index, 1);
      
      const currentPot = game.bet * game.players.length;
      return api.sendMessage(`🚪 ${name} đã rời bàn. Hiện có ${game.players.length}/14 người. Tổng: ${currentPot.toLocaleString()} VNĐ`, threadID);
    }
  }
};