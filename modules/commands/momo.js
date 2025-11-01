const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');

module.exports.config = {
  name: "tbot",
  version: "2.3.0",
  hasPermssion: 0,
  credits: "TuanDz - Modified by Minh",
  description: "Hệ thống thuê bot bằng reply với hình ảnh",
  commandCategory: "Tiện ích",
  usages: "momo",
  cooldowns: 5,
  dependencies: {
    "fs-extra": "",
    "axios": ""
  }
};

// Hàm tải ảnh, đảm bảo thư mục cache tồn tại
async function downloadImage(url, filePath) {
  await fs.ensureDir(path.dirname(filePath)); // Đảm bảo thư mục cache tồn tại
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  });
  
  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

module.exports.handleReply = async ({ api, event, handleReply }) => {
  const { threadID, messageID, senderID, body } = event;
  
  // ĐÃ BỎ HÀNG NÀY ĐỂ BẤT KỲ AI CŨNG CÓ THỂ REPLY
  // if (handleReply.author != senderID) return; 
  
  const packages = {
    "1": {
      text: `💎 === [ 𝗧𝗵𝘂𝗲̂ 𝗕𝗼𝘁 ] === 💎
💰 𝗚𝗶𝗮́: 40.000 VND
💳 𝗦𝗧𝗞: 0382360792
📌 𝗖𝗵𝘂̉ 𝗧𝗞: Dang Thanh Danh
✨ 𝗧𝗵𝗼̛̀𝗶 𝗚𝗶𝗮𝗻 𝗧𝗵𝘂𝗲̂: 1 tháng 
[📌] → 𝗕𝗮𝗻𝗸 𝗻𝗵𝗼̛́ 𝗸𝗲̀𝗺 𝗯𝗶𝗹𝗹, 𝐛𝐚̣𝐧 𝐧𝐚̀𝐨 𝐜𝐨́ 𝗹𝗼̀𝗻𝗴 𝐭𝐨̂́𝐭 𝐭𝗵𝗶̀ 𝐭𝗵𝗶̉𝗻𝗵 𝐭𝗵𝗼̂̉𝗻𝗴 𝐛𝗮𝗻𝗸 𝐢́𝘁 𝗺𝘂𝗮 𝗺𝗶̀ 𝐠𝗼́𝗶, 𝗺𝗮̃𝗶 𝗶𝘂𝘂𝘂 ❤️`
    },
    "2": {
      text: `💎 === [ 𝗧𝗵𝘂𝗲̂ 𝗕𝗼𝘁 ] === 💎
💰 𝗚𝗶𝗮́: 70.000 VND
💳 𝗦𝗧𝗞: 0382360792
📌 𝗖𝗵𝘂̉ 𝗧𝗞: Dang Thanh Danh
✨𝗧𝗵𝗼̛̀𝗶 𝗚𝗶𝗮𝗻 𝗧𝗵𝘂𝗲̂: 2 tháng
[📌] → 𝗕𝗮𝗻𝗸 𝗻𝗵𝗼̛́ 𝗸𝗲̀𝗺 𝗯𝗶𝗹𝗹, 𝐛𝗮̣𝗻 𝐧𝐚̀𝗼 𝐜𝗼́ 𝗹𝗼̀𝗻𝗴 𝘁𝗼̂́𝘁 𝘁𝗵𝗶̀ 𝘁𝗵𝗶̉𝗻𝗵 𝘁𝗵𝗼̂̉𝗻𝗴 𝐛𝗮𝗻𝗸 𝐢́𝘁 𝗺𝘂𝗮 𝗺𝗶̀ 𝐠𝗼́𝗶, 𝗺𝗮̃𝗶 𝗶𝘂𝘂𝘂 ❤️`
    },
    "3": {
      text: `💎 === [ 𝗧𝗵𝘂𝗲̂ 𝗕𝗼𝘁 ] === 💎
💰 𝗚𝗶𝗮́: 110.000 VND
💳 𝗦𝗧𝗞: 0382360792
📌 𝗖𝗵𝘂̉ 𝗧𝗞: Dang Thanh Danh
✨𝗧𝗵𝗼̛̀𝗶 𝗚𝗶𝗮𝗻 𝗧𝗵𝘂𝗲̂: 3 tháng
[📌] → 𝗕𝗮𝗻𝗸 𝗻𝗵𝗼̛́ 𝗸𝗲̀𝗺 𝗯𝗶𝗹𝗹, 𝐛𝗮̣𝗻 𝗻𝗮̀𝗼 𝐜𝗼́ 𝗹𝗼̀𝗻𝗴 𝘁𝗼̂́𝘁 𝘁𝗵𝗶̀ 𝘁𝗵𝗶̉𝗻𝗵 𝘁𝗵𝗼̂̉𝗻𝗴 𝐛𝗮𝗻𝗸 𝐢́𝘁 𝗺𝘂𝗮 𝗺𝗶̀ 𝐠𝗼́𝗶, 𝗺𝗮̃𝗶 𝗶𝘂𝘂𝘂 ❤️`
    },
    "4": {
      text: `💎 === [ 𝗧𝗵𝘂𝗲̂ 𝗕𝗼𝘁 ] === 💎
💰 𝗚𝗶𝗮́: 180.000 VND
💳 𝗦𝗧𝗞: 0382360792
📌 𝗖𝗵𝘂̉ 𝗧𝗞: Dang Thanh Danh
✨𝗧𝗵𝗼̛̀𝗶 𝗚𝗶𝗮𝗻 𝗧𝗵𝘂𝗲̂: 6 tháng + tặng kèm 1 tháng
[📌] → 𝗕𝗮𝗻𝗸 𝗻𝗵𝗼̛́ 𝗸𝗲̀𝗺 𝗯𝗶𝗹𝗹, 𝐛𝗮̣𝗻 𝗻𝗮̀𝗼 𝐜𝗼́ 𝗹𝗼̀𝗻𝗴 𝘁𝗼̂́𝘁 𝘁𝗵𝗶̀ 𝘁𝗵𝗶̉𝗻𝗵 𝘁𝗵𝗼̂̉𝗻𝗴 𝐛𝗮𝗻𝗸 𝐢́𝘁 𝗺𝘂𝗮 𝗺𝗶̀ 𝐠𝗼́𝗶, 𝗺𝗮̃𝗶 𝗶𝘂𝘂𝘂 ❤️`
    },
    "5": {
      text: `💎 === [ 𝗧𝗵𝘂𝗲̂ 𝗕𝗼𝘁 ] === 💎
💰 𝗚𝗶𝗮́: 360.000 VND
💳 𝗦𝗧𝗞: 0382360792
📌 𝗖𝗵𝘂̉ 𝗧𝗞: Dang Thanh Danh
✨ 𝗧𝗵𝗼̛̀𝗶 𝗚𝗶𝗮𝗻 𝗧𝗵𝘂ê: 12 tháng + tặng kèm 2 tháng
[📌] → 𝗕𝗮𝗻𝗸 𝗻𝗵𝗼̛́ 𝗸𝗲̀𝗺 𝗯𝗶𝗹𝗹, 𝐛𝗮̣𝗻 𝗻𝗮̀𝗼 𝐜𝗼́ 𝗹𝗼̀𝗻𝗴 𝘁𝗼̂́𝘁 𝘁𝗵𝗶̀ 𝘁𝗵𝗶̉𝗻𝗵 𝘁𝗵𝗼̂̉𝗻𝗴 𝐛𝗮𝗻𝗸 𝐢́𝘁 𝗺𝘂𝗮 𝗺𝗶̀ 𝐠𝗼́𝗶, 𝗺𝗮̃𝗶 𝗶𝘂𝘂𝘂 ❤️`
    }
  };

  const choice = body.trim();
  
  if (packages[choice]) {
    try {
      api.unsendMessage(handleReply.messageID); // Xóa tin nhắn menu
      
      const packageInfo = packages[choice];
      // Gửi tin nhắn chỉ với văn bản, không gửi kèm ảnh khi reply
      return api.sendMessage(packageInfo.text, threadID, messageID);
      
    } catch (error) {
      console.error("Lỗi tổng quát trong handleReply:", error);
      return api.sendMessage("❎ Đã xảy ra lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.", threadID, messageID);
    }
  } else {
    // Nếu lựa chọn không hợp lệ, thông báo số gói hợp lệ là 1 đến 5
    return api.sendMessage("⚠️ Lựa chọn không hợp lệ! Vui lòng reply 1, 2, 3, 4 hoặc 5.", threadID, messageID);
  }
};

module.exports.run = async ({ api, event }) => {
  const { threadID, messageID } = event;
  
  const menuMessage = `💸 === [ THUÊ BOT ] === 💸
1. Gói 1 tháng - 40.000 VND
2. Gói 2 tháng - 70.000 VND
3. Gói 3 tháng - 110.000 VND
4. Gói 6 tháng(+1) - 180.000 VND
5. Gói 12 tháng(+2) - 360.000 VND
👉 Giá áp dụng cho khách mới 
👉 Reply số tương ứng để chọn gói`;

  try {
    // Tải hình ảnh menu (chỉ khi gọi lệnh momo lần đầu)
    const menuImagePath = path.join(__dirname, 'cache', 'momo_menu.jpeg');
    await downloadImage("https://files.catbox.moe/ry33x9.jpeg", menuImagePath);
    
    return api.sendMessage({ 
      body: menuMessage,
      attachment: fs.createReadStream(menuImagePath)
    }, threadID, (err, info) => {
      if (fs.existsSync(menuImagePath)) { 
        fs.unlinkSync(menuImagePath); // Xóa ảnh tạm sau khi gửi
      }
      if (!err) {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: event.senderID // Vẫn lưu senderID để bot biết tin nhắn reply nào của lệnh này
        });
      } else {
        console.error("Lỗi khi gửi menu kèm ảnh:", err);
        // Nếu không gửi được ảnh, gửi chỉ văn bản và vẫn tạo handleReply
        api.sendMessage(menuMessage, threadID, (errInfo, infoMessage) => {
          if (!errInfo) {
            global.client.handleReply.push({
              name: this.config.name,
              messageID: infoMessage.messageID,
              author: event.senderID
            });
          }
        }, messageID);
      }
    }, messageID);
    
  } catch (error) {
    console.error("Lỗi trong run function (momo):", error);
    // Nếu có lỗi, gửi menu chỉ với văn bản và vẫn tạo handleReply
    return api.sendMessage(menuMessage, threadID, (err, info) => {
      if (!err) {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: event.senderID
        });
      }
    }, messageID);
  }
};