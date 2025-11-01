const fs = require("fs");
const path = require("path");
const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
  name: "welcomeEvent",
  eventType: ["log:subscribe"],
  version: "1.3.5",
  credits: "Thanhtung, modified by Grok",
  description: "Gửi lời chào khi có thành viên mới, kèm danh sách luật nhóm trong cùng một tin nhắn, không thêm thời gian vào phần luật"
};

module.exports.run = async function ({ api, event, Users, Threads }) {
  const { threadID } = event;

  // Nếu bot được thêm vào nhóm
  if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
    const threadInfo = await api.getThreadInfo(threadID);
    const prefix = (await Threads.getData(String(threadID))).data?.PREFIX || global.config.PREFIX;
    const threadMem = threadInfo.participantIDs.length;
    const threadName = threadInfo.threadName || "Không rõ";
    const icon = threadInfo.emoji || "👍";
    const id = threadInfo.threadID;

    const gendernam = [];
    const gendernu = [];

    for (const u of threadInfo.userInfo) {
      if (u.gender == "MALE") gendernam.push(u.name);
      else if (u.gender == "FEMALE") gendernu.push(u.name);
    }

    const nam = gendernam.length;
    const nu = gendernu.length;
    const qtv = threadInfo.adminIDs.length;

    let listad_msg = '';
    for (const admin of threadInfo.adminIDs) {
      try {
        const infoUsers = await Users.getInfo(admin.id);
        listad_msg += `• ${infoUsers.name},\n`;
      } catch {
        listad_msg += `• ${admin.id},\n`;
      }
    }

    api.changeNickname(`『 ${prefix} 』 ⪼ ${global.config.BOTNAME || "Bé Ly"}`, threadID, api.getCurrentUserID());

    api.sendMessage("🔄 Đang kết nối...", threadID, async (err, info) => {
      if (!err) {
        await new Promise(r => setTimeout(r, 9000));
        await api.unsendMessage(info.messageID);
      }
    });

    setTimeout(() => {
      api.sendMessage("✅ Kết nối tới nhóm thành công", threadID, async (err, info) => {
        if (!err) {
          await new Promise(r => setTimeout(r, 30000));
          await api.unsendMessage(info.messageID);
        }
      });
    }, 10000);

    setTimeout(async () => {
      const timeNow = moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY | HH:mm:ss");
      const message = `𝐋𝐨𝐚𝐝 𝐓𝐡𝐚̀𝐧𝐡 𝐂𝐨̂𝐧𝐠 𝐓𝐨à𝐧 𝐁𝐨̣̂ 𝐃𝐚𝐭𝐚 𝐂𝐡𝐨 𝐍𝐡𝐨́𝐦\n\n` +
                      `𝐓𝐞̂𝐧 𝐧𝐡𝐨́𝐦: ${threadName},\n𝐔𝐈𝐃 𝐧𝐡𝐨́𝐦: ${id},\n𝐄𝐦𝐨𝐣𝐢 𝐧𝐡𝐨́𝐦: ${icon},\n` +
                      `𝐓𝐨̂̉𝐧𝐠 𝐭𝐡𝐚̀𝐧𝐡 𝐯𝐢𝐞̂𝐧: ${threadMem},\n𝐍𝐚𝐦: ${nam}, 𝐍𝐮̛̃: ${nu}, 𝐐𝐓𝐕: ${qtv},\n` +
                      `𝐃𝐚𝐧𝐡 𝐬𝐚́𝐜𝐡 𝐐𝐓𝐕:\n${listad_msg}────────────────────\n⏰ Bây giờ là: ${timeNow}\n` +
                      `⚠️ Tin nhắn sẽ tự động gỡ sau 60 giây`;

      const sent = await api.sendMessage(message, threadID);
      setTimeout(() => api.unsendMessage(sent.messageID), 60000);
    }, 12000);

    return;
  }

  // Nếu người khác được thêm vào nhóm
  const newUsers = event.logMessageData.addedParticipants || [];
  const now = new Date();
  const time = now.toTimeString().slice(0, 5);
  const date = now.toLocaleDateString("vi-VN");

  const dataPath = path.join(__dirname, "../../modules/commands/data/welcomeData.json");
  const rulePath = path.join(__dirname, "../../modules/commands/data/rule.json");
  if (!fs.existsSync(dataPath)) return;

  let data, ruleData;
  try {
    data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    ruleData = fs.existsSync(rulePath) ? JSON.parse(fs.readFileSync(rulePath, "utf8")) : [];
  } catch (e) {
    console.error("Lỗi đọc welcomeData.json hoặc rule.json:", e);
    return;
  }

  // Nếu chưa có config → tạo mặc định
  let config = data[threadID];
  if (!config) {
    config = {
      enabled: true,
      message: "[ 𝐓𝐡𝐚̀𝐧𝐡 𝐯𝐢𝐞̂𝐧 𝐯𝐚̀𝐨 𝐧𝐡𝐨́𝐦 ]\n─────────────────\n🎊Xin chào {name}.\n🎀Chào mừng bạn đã đến với box {box}.\n👤{name} là thành viên thứ {count} của nhóm\n🎀 Bạn được thêm bởi: {add}\n─────────────────\n⏰ Thời gian: {time}\n📆 Ngày: {date}"
    };
    data[threadID] = config;
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  }

  if (!config.enabled) return;
  if (!config.message) config.message = "[ 𝐓𝐡𝐚̀𝐧𝐡 𝐯𝐢𝐞̂𝐧 𝐯𝐚̀𝐨 𝐧𝐡𝐨́𝐦 ]\n─────────────────\n🎊Xin chào {name}.\n🎀Chào mừng bạn đã đến với box {box}.\n👤{name} là thành viên thứ {count} của nhóm\n🎀 Bạn được thêm bởi: {add}\n─────────────────\n⏰ Thời gian: {time}\n📆 Ngày: {date}";

  // Lấy tên người thêm
  const authorID = event.author || null;
  let add = "Không rõ";
  if (authorID) {
    try {
      const info = await api.getUserInfo(authorID);
      add = info[authorID]?.name || "Không rõ";
    } catch {}
  }

  // Lấy tên nhóm và số thành viên
  let threadName = "nhóm";
  let count = "N/A";
  try {
    const info = await api.getThreadInfo(threadID);
    threadName = info.threadName || "nhóm";
    count = info.participantIDs?.length || "N/A";
  } catch {}

  // Lấy danh sách luật từ rule.json
  let ruleMessage = "\n─────────────────\n[ Luật của nhóm ]\n";
  const thisThreadRules = ruleData.find(item => item.threadID == threadID) || { listRule: [] };
  if (thisThreadRules.listRule.length > 0) {
    thisThreadRules.listRule.forEach((rule, index) => {
      ruleMessage += `${index + 1}. ${rule}\n`;
    });
  } else {
    ruleMessage += "Hiện tại nhóm chưa add luật qtv dùng rule add để thêm .\n";
  }

  // Mentions
  const names = [];
  const mentions = [];
  let fromIndex = 0;
  for (const user of newUsers) {
    const name = user.fullName || "Người dùng mới";
    const id = user.userFbId || user.userID;
    mentions.push({ tag: name, id, fromIndex });
    names.push(name);
    fromIndex += name.length + 2;
  }

  // Tạo nội dung tin nhắn chào mừng kèm luật
  const timeNow = moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY | HH:mm:ss");
  const messageText = config.message
    .replace(/{name}/g, names.join(", "))
    .replace(/{box}|{boxName}|{threadName}/g, threadName)
    .replace(/{count}/g, count)
    .replace(/{add}/g, add)
    .replace(/{time}/g, time)
    .replace(/{date}/g, date) + ruleMessage + ``;

  const messageData = { body: messageText, mentions };

  // Gửi kèm ảnh/video nếu có
  if (config.mediaUrl) {
    try {
      const ext = path.extname(config.mediaUrl).split('?')[0] || ".jpg";
      const cachePath = path.join(__dirname, "../../modules/commands/cache");
      if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });

      const tempPath = path.join(cachePath, `temp_welcome_${Date.now()}${ext}`);
      const res = await axios.get(config.mediaUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(tempPath);
      res.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      messageData.attachment = fs.createReadStream(tempPath);
      api.sendMessage(messageData, threadID, () => fs.unlink(tempPath, () => {}));
    } catch (e) {
      console.error("Lỗi tải mediaUrl:", e);
      api.sendMessage(messageData, threadID);
    }
  } else {
    api.sendMessage(messageData, threadID);
  }
};