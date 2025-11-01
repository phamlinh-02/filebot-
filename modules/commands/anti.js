module.exports.config = {
  name: "anti",
  version: "4.1.6", // Cập nhật version
  hasPermssion: 1,
  credits: "BraSL & Grok (xAI)", // Thêm credits cho antilink
  description: "Anti change Box chat vip pro + Anti link + Anti spam",
  commandCategory: "Quản Trị Viên",
  usages: "anti dùng để bật tắt",
  cooldowns: 5,
  images: [],
  dependencies: {
    "fs-extra": "",
    "request": "",
    "axios": "",
    "form-data": ""
  },
};

const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } = require("fs-extra");
const path = require('path');
const fs = require('fs');
const request = require('request');
const axios = require('axios');
const FormData = require('form-data');

module.exports.handleReply = async function ({ api, event, args, handleReply, Threads, Users }) {
  const { senderID, threadID, messageID } = event;
  const { author, permssion } = handleReply;
  const Tm = (require('moment-timezone')).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss || DD/MM/YYYY');
  const pathData = global.anti || path.join(__dirname, 'data', 'anti.json');
  const dataAnti = JSON.parse(readFileSync(pathData, "utf8"));

  if (author !== senderID) return api.sendMessage(`❎ Bạn không phải người dùng lệnh`, threadID);

  var number = event.args.filter(i => !isNaN(i));
  for (const num of number) {
    switch (num) {
      case "1": {
        if (permssion < 1)
          return api.sendMessage("⚠️ Bạn không đủ quyền hạn để sử dụng lệnh này", threadID, messageID);
        var NameBox = dataAnti.boxname;
        const antiImage = NameBox.find(item => item.threadID === threadID);
        if (antiImage) {
          dataAnti.boxname = dataAnti.boxname.filter(item => item.threadID !== threadID);
          api.sendMessage("☑️ Tắt thành công chế độ anti đổi tên box", threadID, messageID);
        } else {
          var threadName = (await api.getThreadInfo(threadID)).threadName;
          dataAnti.boxname.push({ threadID, name: threadName });
          api.sendMessage("☑️ Bật thành công chế độ anti đổi tên box", threadID, messageID);
        }
        writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
        break;
      }
      case "2": {
        if (permssion < 1)
          return api.sendMessage("⚠️ Bạn không đủ quyền hạn để sử dụng lệnh này", threadID, messageID);
        const index = dataAnti.boximage.findIndex(i => i.threadID === threadID);
        if (index !== -1) {
          dataAnti.boximage.splice(index, 1);
          api.sendMessage("✅ Tắt thành công chế độ anti đổi ảnh box", threadID, messageID);
        } else {
          try {
            const { imageSrc } = await api.getThreadInfo(threadID);
            if (!imageSrc)
              return api.sendMessage("❌ Nhóm chưa có ảnh đại diện!", threadID, messageID);
            const dir = path.join(__dirname, 'cache');
            const imgPath = path.join(dir, `${threadID}_boximage.jpg`);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir);
            fs.writeFileSync(imgPath, (await axios.get(imageSrc, { responseType: 'arraybuffer' })).data);
            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', fs.createReadStream(imgPath));
            const { data: url } = await axios.post('https://catbox.moe/user/api.php', form, {
              headers: form.getHeaders()
            });
            fs.unlinkSync(imgPath);
            dataAnti.boximage.push({ threadID, url });
            api.sendMessage("✅ Bật thành công chế độ anti đổi ảnh box", threadID, messageID);
          } catch {
            api.sendMessage("Đã xảy ra lỗi!", threadID, messageID);
          }
        }
        fs.writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
        break;
      }
      case "3": {
        if (permssion < 1)
          return api.sendMessage("⚠️ Bạn không đủ quyền hạn để sử dụng lệnh này", threadID, messageID);
        const NickName = dataAnti.antiNickname.find(item => item.threadID === threadID);
        if (NickName) {
          dataAnti.antiNickname = dataAnti.antiNickname.filter(item => item.threadID !== threadID);
          api.sendMessage("☑️ Tắt thành công chế độ anti đổi biệt danh", threadID, messageID);
        } else {
          const nickName = (await api.getThreadInfo(threadID)).nicknames;
          dataAnti.antiNickname.push({ threadID, data: nickName });
          api.sendMessage("☑️ Bật thành công chế độ anti đổi biệt danh", threadID, messageID);
        }
        writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
        break;
      }
      case "4": {
        if (permssion < 1)
          return api.sendMessage("⚠️ Bạn không đủ quyền hạn để sử dụng lệnh này", threadID, messageID);
        const antiout = dataAnti.antiout;
        if (antiout[threadID] == true) {
          antiout[threadID] = false;
          api.sendMessage("☑️ Tắt thành công chế độ anti out", threadID, messageID);
        } else {
          antiout[threadID] = true;
          api.sendMessage("☑️ Bật thành công chế độ anti out", threadID, messageID);
        }
        writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
        break;
      }
      case "5": {
        const filepath = path.join(__dirname, 'data', 'antiemoji.json');
        let data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        if (!data.hasOwnProperty(threadID)) {
          data[threadID] = { emojiEnabled: true };
        } else {
          data[threadID].emojiEnabled = !data[threadID].emojiEnabled;
        }
        let emoji = "";
        try {
          let threadInfo = await api.getThreadInfo(threadID);
          emoji = threadInfo.emoji;
        } catch (error) {
          console.error("Error fetching thread emoji status:", error);
        }
        if (data[threadID].emojiEnabled) {
          data[threadID].emoji = emoji;
        }
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
        const statusMessage = data[threadID].emojiEnabled ? "Bật" : "Tắt";
        api.sendMessage(`☑️ ${statusMessage} thành công chế độ anti emoji`, threadID, messageID);
        break;
      }
      case "6": {
        const filepath = path.join(__dirname, 'data', 'antitheme.json');
        let data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        let theme = "";
        try {
          const threadInfo = await api.getThreadInfo(threadID);
          theme = threadInfo.threadTheme.id;
        } catch (error) {
          console.error("Error fetching thread theme:", error);
        }
        if (!data.hasOwnProperty(threadID)) {
          data[threadID] = { themeid: theme || "", themeEnabled: true };
          fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
        } else {
          data[threadID].themeEnabled = !data[threadID].themeEnabled;
          if (data[threadID].themeEnabled) {
            data[threadID].themeid = theme || "";
          }
          fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
        }
        const statusMessage = data[threadID].themeEnabled ? "Bật" : "Tắt";
        api.sendMessage(`☑️ ${statusMessage} thành công chế độ anti theme`, threadID, messageID);
        break;
      }
      case "7": {
        const dataAnti = path.join(__dirname, 'data', 'antiqtv.json');
        const info = await api.getThreadInfo(threadID);
        if (!info.adminIDs.some(item => item.id == api.getCurrentUserID()))
          return api.sendMessage('❎ Bot cần quyền quản trị viên để có thể thực thi lệnh', threadID, messageID);
        let data = JSON.parse(fs.readFileSync(dataAnti));
        if (!data[threadID]) {
          data[threadID] = true;
          api.sendMessage(`☑️ Bật thành công chế độ anti qtv`, threadID, messageID);
        } else {
          data[threadID] = false;
          api.sendMessage(`☑️ Tắt thành công chế độ anti qtv`, threadID, messageID);
        }
        fs.writeFileSync(dataAnti, JSON.stringify(data, null, 4));
        break;
      }
      case "8": {
        const dataAnti = path.join(__dirname, 'data', 'antijoin.json');
        const info = await api.getThreadInfo(threadID);
        const { threadID, messageID } = event;
        let data = JSON.parse(fs.readFileSync(dataAnti));
        if (!data[threadID]) {
          data[threadID] = true;
          api.sendMessage(`☑️ Bật thành công chế độ anti thêm thành viên vào nhóm`, threadID, messageID);
        } else {
          data[threadID] = false;
          api.sendMessage(`☑️ Tắt thành công chế độ anti thêm thành viên vào nhóm`, threadID, messageID);
        }
        fs.writeFileSync(dataAnti, JSON.stringify(data, null, 4));
        break;
      }
      case "9": {
        if (permssion < 1) {
          return api.sendMessage("⚠️ Bạn không đủ quyền hạn để sử dụng lệnh này", threadID, messageID);
        }
        const pathResendData = path.join(__dirname, 'data', 'resend.json');
        let resendConfig = {};
        try {
          if (fs.existsSync(pathResendData)) {
            const fileContent = fs.readFileSync(pathResendData, 'utf8');
            if (fileContent && fileContent.trim()) {
              resendConfig = JSON.parse(fileContent);
            }
          }
        } catch (err) {
          console.error("❌ Lỗi đọc file resend.json:", err.message);
          resendConfig = {};
        }
        var threadName = (await api.getThreadInfo(threadID)).threadName || "Không xác định";
        if (!resendConfig[threadID]) {
          resendConfig[threadID] = { unsendLog: true };
          api.sendMessage(`☑️ Đã bật chống gỡ tin nhắn cho nhóm: ${threadName}`, threadID, messageID);
        } else {
          resendConfig[threadID].unsendLog = !resendConfig[threadID].unsendLog;
          const status = resendConfig[threadID].unsendLog ? "bật" : "tắt";
          api.sendMessage(`☑️ Đã ${status} chống gỡ tin nhắn cho nhóm: ${threadName}`, threadID, messageID);
        }
        try {
          fs.writeFileSync(pathResendData, JSON.stringify(resendConfig, null, 4), 'utf8');
        } catch (err) {
          console.error("❌ Lỗi ghi file resend.json:", err.message);
          return api.sendMessage("❌ Đã xảy ra lỗi khi lưu cấu hình", threadID, messageID);
        }
        break;
      }
      case "10": {
        const info = await api.getThreadInfo(threadID);
        if (!info.adminIDs.some(item => item.id == api.getCurrentUserID()))
          return api.sendMessage('⚠️ Bot cần quyền quản trị viên nhóm', threadID, messageID);
        const dataDir = path.join(__dirname, 'data');
        const antiSpamPath = path.join(dataDir, 'antispam.json');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        if (!fs.existsSync(antiSpamPath)) fs.writeFileSync(antiSpamPath, JSON.stringify([], null, 4), 'utf-8');
        let antiData = [];
        try {
          const fileContent = fs.readFileSync(antiSpamPath, 'utf-8');
          if (fileContent) antiData = JSON.parse(fileContent);
        } catch (err) {
          console.error('Lỗi đọc file antispam.json:', err.message);
          return api.sendMessage('❌ Đã xảy ra lỗi khi đọc file cấu hình anti spam', threadID, messageID);
        }
        let threadEntry = antiData.find(entry => entry.threadID === threadID);
        if (threadEntry) {
          antiData = antiData.filter(entry => entry.threadID !== threadID);
          try {
            fs.writeFileSync(antiSpamPath, JSON.stringify(antiData, null, 4), 'utf-8');
            api.sendMessage('✅ Đã tắt chế độ chống spam', threadID, messageID);
          } catch (err) {
            console.error('Lỗi ghi file antispam.json:', err.message);
            return api.sendMessage('❌ Đã xảy ra lỗi khi lưu cấu hình anti spam', threadID, messageID);
          }
        } else {
          antiData.push({
            threadID: threadID,
            status: true,
            usersSpam: {},
            config: {
              maxMessages: 3, // 3 tin nhắn giống nhau
              timeWindow: 10000 // 10 giây
            }
          });
          try {
            fs.writeFileSync(antiSpamPath, JSON.stringify(antiData, null, 4), 'utf-8');
            api.sendMessage('✅ Đã bật chế độ chống SPAM', threadID, messageID);
          } catch (err) {
            console.error('Lỗi ghi file antispam.json:', err.message);
            return api.sendMessage('❌ Đã xảy ra lỗi khi lưu cấu hình anti spam', threadID, messageID);
          }
        }
        break;
      }
      case "11": {
        const info = await api.getThreadInfo(threadID);
        if (!info.adminIDs.some(item => item.id == api.getCurrentUserID()))
          return api.sendMessage('⚠️ Bot cần quyền quản trị viên nhóm', threadID, messageID);
        const dataDir = path.join(__dirname, 'data');
        const antiTagAllPath = path.join(dataDir, 'antiTagAll.json');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        if (!fs.existsSync(antiTagAllPath)) fs.writeFileSync(antiTagAllPath, JSON.stringify([], null, 4), 'utf-8');
        let antiTagAllData = [];
        try {
          const fileContent = fs.readFileSync(antiTagAllPath, 'utf-8');
          if (fileContent) antiTagAllData = JSON.parse(fileContent);
        } catch (err) {
          console.error('Lỗi đọc file antiTagAll.json:', err.message);
          return api.sendMessage('❌ Đã xảy ra lỗi khi đọc file cấu hình chống tag all', threadID, messageID);
        }
        let threadEntry = antiTagAllData.find(entry => entry.threadID === threadID);
        if (threadEntry) {
          antiTagAllData = antiTagAllData.filter(entry => entry.threadID !== threadID);
          try {
            fs.writeFileSync(antiTagAllPath, JSON.stringify(antiTagAllData, null, 4), 'utf-8');
            api.sendMessage('✅ Đã tắt chế độ chống tag all', threadID, messageID);
          } catch (err) {
            console.error('Lỗi ghi file antiTagAll.json:', err.message);
            return api.sendMessage('❌ Đã xảy ra lỗi khi lưu cấu hình chống tag all', threadID, messageID);
          }
        } else {
          antiTagAllData.push({ threadID: threadID, status: true });
          try {
            fs.writeFileSync(antiTagAllPath, JSON.stringify(antiTagAllData, null, 4), 'utf-8');
            api.sendMessage('✅ Đã bật chế độ chống tag all', threadID, messageID);
          } catch (err) {
            console.error('Lỗi ghi file antiTagAll.json:', err.message);
            return api.sendMessage('❌ Đã xảy ra lỗi khi lưu cấu hình chống tag all', threadID, messageID);
          }
        }
        break;
      }
      case "12": {
        if (permssion < 1)
          return api.sendMessage("⚠️ Bạn không đủ quyền hạn để sử dụng lệnh này", threadID, messageID);
        const dataAnti = path.join(__dirname, 'data', 'anti.json');
        let data = JSON.parse(fs.readFileSync(dataAnti));
        if (!data.antilink) data.antilink = {};
        if (!data.antilink[threadID]) {
          data.antilink[threadID] = true;
          api.sendMessage(`☑️ Bật thành công chế độ anti link`, threadID, messageID);
        } else {
          data.antilink[threadID] = false;
          api.sendMessage(`☑️ Tắt thành công chế độ anti link`, threadID, messageID);
        }
        fs.writeFileSync(dataAnti, JSON.stringify(data, null, 4));
        break;
      }
      case "13": {
        const antiImage = dataAnti.boximage.find(item => item.threadID === threadID);
        const antiBoxname = dataAnti.boxname.find(item => item.threadID === threadID);
        const antiNickname = dataAnti.antiNickname.find(item => item.threadID === threadID);
        return api.sendMessage(
          `[ CHECK ANTI BOX ]\n────────────────────\n` +
          `|› 1. anti namebox: ${antiBoxname ? "bật" : "tắt"}\n` +
          `|› 2. anti imagebox: ${antiImage ? "bật" : "tắt"}\n` +
          `|› 3. anti nickname: ${antiNickname ? "bật" : "tắt"}\n` +
          `|› 4. anti out: ${dataAnti.antiout[threadID] ? "bật" : "tắt"}\n` +
          `|› 5. anti emoji: ${data.emoji?.[threadID]?.emojiEnabled ? "bật" : "tắt"}\n` +
          `|› 6. anti theme: ${data.theme?.[threadID]?.themeEnabled ? "bật" : "tắt"}\n` +
          `|› 7. anti qtv: ${data.qtv?.[threadID] ? "bật" : "tắt"}\n` +
          `|› 8. anti join: ${data.join?.[threadID] ? "bật" : "tắt"}\n` +
          `|› 9. anti unsend: ${data.resend?.[threadID]?.unsendLog ? "bật" : "tắt"}\n` +
          `|› 10. anti spam: ${data.spam?.find(item => item.threadID == threadID)?.status ? "bật" : "tắt"}\n` +
          `|› 11. anti tag all: ${data.tagall?.find(item => item.threadID == threadID)?.status ? "bật" : "tắt"}\n` +
          `|› 12. anti link: ${dataAnti.antilink?.[threadID] ? "bật" : "tắt"}\n` +
          `────────────────────\n|› Trên kia là các trạng thái của từng anti`,
          threadID
        );
        break;
      }
      default: {
        return api.sendMessage(`❎ Số bạn chọn không có trong lệnh`, threadID);
      }
    }
  }
};

module.exports.run = async ({ api, event, Threads, Users }) => {
  const { threadID, messageID, senderID } = event;
  const { PREFIX = global.config.PREFIX } = (await Threads.getData(threadID)).data || {};

  // Đường dẫn file
  const dataDir = path.join(__dirname, 'data');
  const files = {
    anti: global.anti || path.join(__dirname, 'data', 'anti.json'),
    emoji: path.join(dataDir, 'antiemoji.json'),
    theme: path.join(dataDir, 'antitheme.json'),
    qtv: path.join(dataDir, 'antiqtv.json'),
    join: path.join(dataDir, 'antijoin.json'),
    resend: path.join(dataDir, 'resend.json'),
    spam: path.join(dataDir, 'antispam.json'),
    tagall: path.join(dataDir, 'antiTagAll.json')
  };

  // Tạo thư mục và file
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  Object.values(files).forEach(file => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, file === files.spam || file === files.tagall ? JSON.stringify([], null, 2) : JSON.stringify({}, null, 2));
  });

  // Đọc dữ liệu
  const data = {};
  Object.entries(files).forEach(([key, file]) => {
    try {
      data[key] = JSON.parse(fs.readFileSync(file));
    } catch {
      data[key] = {};
    }
  });

  // Trạng thái
  const s = {
    boxname: data.anti?.boxname?.some(item => item.threadID === threadID) || false,
    boximage: data.anti?.boximage?.some(item => item.threadID === threadID) || false,
    nickname: data.anti?.antiNickname?.some(item => item.threadID === threadID) || false,
    out: data.anti?.antiout?.[threadID] || false,
    emoji: data.emoji?.[threadID]?.emojiEnabled || false,
    theme: data.theme?.[threadID]?.themeEnabled || false,
    qtv: data.qtv?.[threadID] || false,
    join: data.join?.[threadID] || false,
    unsend: data.resend?.[threadID]?.unsendLog || false,
    spam: data.spam?.find(item => item.threadID == threadID)?.status || false,
    tagall: data.tagall?.find(item => item.threadID == threadID)?.status || false,
    antilink: data.anti?.antilink?.[threadID] || false
  };

  // Gửi menu
  api.sendMessage(
    `📍ANTI\n` +
    `▸ 1. Namebox: ${s.boxname ? "✅" : "❎"} Cấm đổi tên\n` +
    `▸ 2. Image: ${s.boximage ? "✅" : "❎"} Cấm đổi ảnh\n` +
    `▸ 3. Nick: ${s.nickname ? "✅" : "❎"} Cấm đổi nick\n` +
    `▸ 4. Out: ${s.out ? "✅" : "❎"} Cấm rời nhóm\n` +
    `▸ 5. Emoji: ${s.emoji ? "✅" : "❎"} Cấm đổi emoji\n` +
    `▸ 6. Theme: ${s.theme ? "✅" : "❎"} Cấm đổi theme\n` +
    `▸ 7. Qtv: ${s.qtv ? "✅" : "❎"} Cấm đổi QTV\n` +
    `▸ 8. Join: ${s.join ? "✅" : "❎"} Cấm thêm người\n` +
    `▸ 9. Unsend: ${s.unsend ? "✅" : "❎"} Gửi tin gỡ\n` +
    `▸ 10. Spam: ${s.spam ? "✅" : "❎"} Cấm spam\n` +
    `▸ 11. Tag all: ${s.tagall ? "✅" : "❎"} Cấm tag @all\n` +
    `▸ 12. Link: ${s.antilink ? "✅" : "❎"} Cấm gửi link\n` +
    `👉🏼 Reply 1-12 bật/tắt`,
    threadID,
    (error, info) => {
      if (!error) global.client.handleReply.push({
        name: this.config.name,
        messageID: info.messageID,
        author: senderID
      });
    },
    messageID
  );
};

module.exports.handleEvent = async function ({ api, event, Threads, Users }) {
  const { threadID, senderID, messageID, type, body, attachments } = event;
  if (senderID === api.getCurrentUserID()) return;

  const dataDir = path.join(__dirname, 'data');
  const cacheDir = path.join(__dirname, 'cache');
  const antiSpamPath = path.join(dataDir, 'antispam.json');
  const resendPath = path.join(dataDir, 'resend.json');
  const antiTagAllPath = path.join(dataDir, 'antiTagAll.json');
  const antiPath = path.join(dataDir, 'anti.json');

  // Đảm bảo thư mục và file tồn tại
  for (const dir of [dataDir, cacheDir]) if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  for (const file of [antiSpamPath, resendPath, antiTagAllPath, antiPath]) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, file.includes('resend') || file.includes('anti.json') ? '{}' : '[]', 'utf-8');
  }

  // Đọc dữ liệu
  let antiData = JSON.parse(fs.readFileSync(antiSpamPath, 'utf-8'));
  let resendData = JSON.parse(fs.readFileSync(resendPath, 'utf-8'));
  let antiTagAllData = JSON.parse(fs.readFileSync(antiTagAllPath, 'utf-8'));
  let dataAnti = JSON.parse(fs.readFileSync(antiPath, 'utf-8'));

  const isAdmin = async () => {
    const adminIDs = (await api.getThreadInfo(threadID)).adminIDs.map(e => e.id);
    const adminBot = global.config.ADMINBOT || [];
    return adminBot.includes(senderID) || adminIDs.includes(senderID);
  };

  // --- Anti Link ---
  if (dataAnti.antilink?.[threadID] && body) {
    const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|net|org|vn|io|tk|ga|cf|ml))|(bit\.ly|goo\.gl|tinyurl|youtu\.be|facebook\.com|fb\.me|tiktok\.com|instagram\.com)/gi;
    const hasLink = linkRegex.test(body);
    if (hasLink && !(await isAdmin())) {
      const botIsAdmin = (await api.getThreadInfo(threadID)).adminIDs.some(e => e.id === api.getCurrentUserID());
      if (!botIsAdmin) {
        return api.sendMessage('⚠️ Bot cần quyền quản trị viên để kick người dùng', threadID);
      }
      const name = await Users.getNameUser(senderID);
      const links = body.match(linkRegex) || [];
      api.sendMessage(`🚨 Phát hiện ${name} gửi link (${links[0] || 'link'})! Tiến hành kick sau 5 giây.`, threadID);
      setTimeout(async () => {
        try {
          await api.removeUserFromGroup(senderID, threadID);
          api.sendMessage(`✅ Đã kick ${name} vì gửi link.`, threadID);
        } catch (e) {
          api.sendMessage(`❌ Không thể kick ${name}. Lỗi: ${e.message}`, threadID);
        }
      }, 5000);
    }
  }

  // --- Anti Spam ---
  const spamEntry = antiData.find(e => e.threadID === threadID);
  if (spamEntry?.status && !(await isAdmin())) {
    const maxMessages = 3; // 3 tin nhắn giống nhau
    const timeWindow = 10000; // 10 giây
    spamEntry.usersSpam = spamEntry.usersSpam || {};
    const user = spamEntry.usersSpam[senderID] || { messages: [], start: Date.now() };
    const isSticker = attachments.some(att => att.type === 'sticker');
    const currentMessage = body || (isSticker ? 'sticker' : '');

    if (currentMessage) {
      user.messages.push({ content: currentMessage, timestamp: Date.now() });
      user.messages = user.messages.filter(msg => Date.now() - msg.timestamp < timeWindow);
      const sameMessages = user.messages.filter(msg => msg.content === currentMessage).length;

      if (sameMessages >= maxMessages) {
        const botIsAdmin = (await api.getThreadInfo(threadID)).adminIDs.some(e => e.id === api.getCurrentUserID());
        if (!botIsAdmin) {
          return api.sendMessage('⚠️ Bot cần quyền quản trị viên để kick người dùng', threadID);
        }
        const { name } = await Users.getData(senderID);
        api.removeUserFromGroup(senderID, threadID);
        api.sendMessage(`Đã kick ${name} vì SPAM`, threadID);
        user.messages = [];
        user.start = Date.now();
      }
      spamEntry.usersSpam[senderID] = user;
      fs.writeFileSync(antiSpamPath, JSON.stringify(antiData, null, 2), 'utf-8');
    }
  }

  // --- Anti Tag All ---
  const tagEntry = antiTagAllData.find(e => e.threadID === threadID);
  const tagAllRegex = /@moinguoi|@mọi người|@all/i;
  if (tagEntry?.status && type === 'message' && body && tagAllRegex.test(body) && !(await isAdmin())) {
    const botIsAdmin = (await api.getThreadInfo(threadID)).adminIDs.some(e => e.id === api.getCurrentUserID());
    if (!botIsAdmin) return api.sendMessage('⚠️ Bot cần quyền quản trị viên để kick người dùng', threadID);
    const { name } = await Users.getData(senderID);
    api.removeUserFromGroup(senderID, threadID);
    api.sendMessage(`Đã kick ${name} vì tag all (@moinguoi)`, threadID);
  }

  // --- Resend (gỡ tin nhắn) ---
  if (resendData[threadID]?.unsendLog) {
    global.logMessage = global.logMessage || new Map();
    if (type !== 'message_unsend') {
      global.logMessage.set(messageID, { msgBody: body || '', attachment: attachments || [] });
    } else {
      const message = global.logMessage.get(messageID);
      if (!message) return;
      const userName = await Users.getNameUser(senderID);
      const msg = {
        body: `${userName} vừa gỡ ${message.attachment.length || '1'} nội dung.${message.msgBody ? `\nNội dung: ${message.msgBody}` : ''}`,
        attachment: [],
        mentions: [{ tag: userName, id: senderID }]
      };
      let index = 0;
      for (const att of message.attachment) {
        index++;
        let ext = 'bin';
        if (att.type === 'photo') ext = 'jpg';
        else if (att.type === 'video') ext = 'mp4';
        else if (att.type === 'audio') ext = 'mp3';
        else if (att.type === 'file') {
          const parts = att.url.split('.');
          ext = parts[parts.length - 1] || 'bin';
        }
        const filePath = path.join(cacheDir, `${index}_${Date.now()}.${ext}`);
        try {
          const res = await axios.get(att.url, { responseType: 'arraybuffer' });
          fs.writeFileSync(filePath, res.data);
          msg.attachment.push(fs.createReadStream(filePath));
        } catch {
          msg.body += `\n⚠️ Không tải được tệp ${index}`;
        }
      }
      api.sendMessage(msg, threadID, (err) => {
        if (err) return console.error('Lỗi resend:', err.message);
        for (const file of msg.attachment) {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            console.error('Lỗi xóa file:', e.message);
          }
        }
      });
    }
  }
};