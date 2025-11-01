const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

module.exports.config = {
  name: "stk",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "TuanDz & Minh",
  description: "Quản lý STK ngân hàng cá nhân",
  commandCategory: "Tiện ích",
  usages: [
    "stk → Xem STK của bạn",
    "stk @tag → Xem STK người được tag",
    "stk add [ngân hàng|tên|số tk|link ảnh] → Thêm STK",
    "stk list → Xem tất cả STK (chỉ admin)"
  ],
  cooldowns: 5,
  dependencies: {
    "fs-extra": "",
    "axios": ""
  }
};

// Cấu hình
const ADMIN_UID = "100083174347639"; // Thay bằng UID admin của bạn
const dataPath = path.join(__dirname, 'stk_data.json');

// Khởi tạo dữ liệu
if (!fs.existsSync(dataPath)) {
  fs.writeFileSync(dataPath, JSON.stringify({}));
}

module.exports.run = async ({ api, event, args }) => {
  const { threadID, messageID, senderID, mentions } = event;
  const data = JSON.parse(fs.readFileSync(dataPath));

  // Xử lý khi tag người khác
  if (Object.keys(mentions).length > 0) {
    const targetID = Object.keys(mentions)[0];
    const targetName = mentions[targetID].replace('@', '');
    const targetData = data[targetID];

    if (!targetData?.stk) {
      return api.sendMessage(
        `⛔ ${targetName} chưa có STK trong hệ thống!`,
        threadID, messageID
      );
    }
    return showSTK(api, event, targetData, targetName);
  }

  // Lệnh thông thường
  const userData = data[senderID] || {};

  // Lệnh xem STK cá nhân
  if (args.length === 0) {
    if (!userData.stk) {
      return api.sendMessage(
        "🔍 Bạn chưa có STK nào!\n" +
        "👉 Dùng: stk add [ngân hàng|tên|số tk|link ảnh]",
        threadID, messageID
      );
    }
    return showSTK(api, event, userData, "Bạn");
  }

  // Lệnh thêm STK
  if (args[0].toLowerCase() === "add") {
    const info = args.slice(1).join(" ").split("|").map(i => i.trim());
    if (info.length < 3) {
      return api.sendMessage(
        "⚠️ Thiếu thông tin!\n" +
        "👉 Dùng: stk add [ngân hàng|tên|số tk|link ảnh]\n" +
        "Ví dụ: stk add MB|Nguyễn Văn A|123456789|https://example.com/avatar.jpg",
        threadID, messageID
      );
    }

    data[senderID] = {
      bank: info[0],
      name: info[1],
      stk: info[2],
      imageUrl: info[3] || null,
      dateAdded: new Date().toISOString()
    };

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    return api.sendMessage(
      `✅ Đã thêm STK thành công!\n` +
      `🏦 Ngân hàng: ${info[0]}\n` +
      `👤 Tên tài khoản: ${info[1]}\n` +
      `🔢 Số tài khoản: ${info[2]}` +
      (info[3] ? `\n📸 Đã thêm ảnh đính kèm` : ''),
      threadID, messageID
    );
  }

  // Lệnh list (chỉ admin)
  if (args[0].toLowerCase() === "list") {
    if (senderID !== ADMIN_UID) {
      return api.sendMessage(
        "⛔ Chỉ admin mới được dùng lệnh này!",
        threadID, messageID
      );
    }

    if (Object.keys(data).length === 0) {
      return api.sendMessage("📭 Danh sách STK trống!", threadID, messageID);
    }

    let message = "📋 DANH SÁCH STK (Admin only)\n\n";
    global.stkList = [];

    Object.entries(data).forEach(([uid, info], index) => {
      global.stkList.push({ uid, info });
      message += `${index + 1}. [${info.bank}] ${info.name}\n`;
      message += `🔢 ${info.stk} ${info.imageUrl ? '📸' : '🚫 Không ảnh'}\n`;
      message += `📅 ${new Date(info.dateAdded).toLocaleDateString()}\n`;
      message += `UID: ${uid}\n━━━━━━━━━━━━━\n`;
    });

    message += "\n👉 Reply số thứ tự để xóa STK tương ứng";
    return api.sendMessage(message, threadID, (err, info) => {
      if (!err) global.stkListMsgID = info.messageID;
    }, messageID);
  }

  // Lệnh không hợp lệ
  return api.sendMessage(
    "⚠️ Lệnh không hợp lệ!\n" +
    "👉 stk → Xem STK của bạn\n" +
    "👉 stk @tag → Xem STK người khác\n" +
    "👉 stk add [ngân hàng|tên|số tk|link ảnh] → Thêm STK",
    threadID, messageID
  );
};

// Xử lý reply để xóa STK
module.exports.handleReply = async ({ api, event, handleReply }) => {
  const { threadID, messageID, senderID, body } = event;

  if (senderID !== ADMIN_UID || !global.stkList || messageID !== global.stkListMsgID) {
    return;
  }

  const index = parseInt(body) - 1;
  if (isNaN(index) || index < 0 || index >= global.stkList.length) {
    return api.sendMessage("⚠️ Vui lòng reply số thứ tự hợp lệ!", threadID, messageID);
  }

  const data = JSON.parse(fs.readFileSync(dataPath));
  const { uid, info } = global.stkList[index];
  
  delete data[uid];
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  return api.sendMessage(
    `✅ Đã xóa STK của ${info.name} (${info.bank})`,
    threadID, messageID
  );
};

// Hiển thị STK (dùng chung cho cả bản thân và tag người khác)
async function showSTK(api, event, userData, displayName) {
  const { threadID, messageID } = event;
  const infoText = `💳 THÔNG TIN STK ${displayName}:\n` +
                  `🏦 Ngân hàng: ${userData.bank}\n` +
                  `👤 Tên tài khoản: ${userData.name}\n` +
                  `🔢 Số tài khoản: ${userData.stk}`;

  // Nếu không có ảnh
  if (!userData.imageUrl) {
    return api.sendMessage(infoText, threadID, messageID);
  }

  // Nếu có ảnh
  try {
    const imgPath = await downloadImage(userData.imageUrl);
    await api.sendMessage({
      body: infoText,
      attachment: fs.createReadStream(imgPath)
    }, threadID, () => fs.unlinkSync(imgPath), messageID);
  } catch (e) {
    console.error(e);
    return api.sendMessage(
      `${infoText}\n⚠️ Không thể tải ảnh đính kèm`,
      threadID, messageID
    );
  }
}

// Hàm tải ảnh
async function downloadImage(url) {
  const imgPath = path.join(__dirname, 'cache', `stk_${Date.now()}.jpg`);
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  });

  await new Promise((resolve, reject) => {
    response.data.pipe(fs.createWriteStream(imgPath))
      .on('finish', resolve)
      .on('error', reject);
  });

  return imgPath;
}