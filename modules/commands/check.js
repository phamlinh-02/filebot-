const fs = require("fs-extra");
const path = __dirname + '/tt/';
const configPath = __dirname + '/tt-config.json';
const moment = require('moment-timezone');
const axios = require("axios");
const downloader = require('image-downloader');

async function streamURL(url, mime = 'jpg') {
  const dest = `${__dirname}/cache/${Date.now()}.${mime}`;
  try { console.log('[check] streamURL start', { url, dest }); } catch {}
  try {
    await downloader.image({ url, dest });
    try { console.log('[check] streamURL download success', { dest }); } catch {}
  } catch (err) {
    try { console.error('[check] streamURL download error', { url, dest, error: err && err.message ? err.message : err }); } catch {}
    throw err;
  }
  setTimeout(() => fs.unlinkSync(dest), 60 * 1000);
  return fs.createReadStream(dest);
}

module.exports.config = {
  name: "check",
  version: "2.2.0",
  hasPermssion: 0,
  credits: "PTT & Modified by Grok (Fix map error)",
  description: "Check tương tác + lọc, reset, auto lọc tuần",
  commandCategory: "Tiện ích",
  usages: "[all/week/day/reset/loc <số>/auto-loc <số>]",
  cooldowns: 0,
  dependencies: {
    "fs-extra": "",
    "moment-timezone": "",
    "axios": "",
    "image-downloader": ""
  }
};

function ensureDataStructure(data, today) {
  if (!Array.isArray(data.day)) data.day = [];
  if (!Array.isArray(data.week)) data.week = [];
  if (!Array.isArray(data.total)) data.total = [];
  if (typeof data.time !== 'number') data.time = today;
  return data;
}

module.exports.onLoad = () => {
  if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
  if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, JSON.stringify({}, null, 4));
  global.checkttConfig = JSON.parse(fs.readFileSync(configPath));

  setInterval(() => {
    const today = moment.tz("Asia/Ho_Chi_Minh").day();
    const files = fs.readdirSync(path);
    files.forEach(file => {
      try {
        let data = JSON.parse(fs.readFileSync(path + file));
        data = ensureDataStructure(data, today);

        if (data.time !== today) {
          data.day = data.day.map(u => ({ ...u, count: 0 }));
          data.time = today;
          fs.writeFileSync(path + file, JSON.stringify(data, null, 4));
        }

        const threadID = file.replace('.json', '');
        const threshold = global.checkttConfig[threadID];
        if (today === 1 && threshold !== undefined) {
          const toRemove = data.total.filter(u => u.count <= threshold && u.id != global.data.botID);
          let removed = toRemove.length;
          data.total = data.total.filter(u => u.count > threshold || u.id == global.data.botID);
          fs.writeFileSync(path + file, JSON.stringify(data, null, 4));
          if (removed > 0) {
            global.api.sendMessage(`🔔 Auto lọc: Đã loại bỏ ${removed} thành viên có số tin nhắn dưới ${threshold}`, threadID);
          }
        }
      } catch (err) {
        console.error(`Lỗi khi xử lý file ${file}:`, err);
      }
    });
  }, 60000);
};

module.exports.handleEvent = async function({ api, event }) {
  try {
    if (!event.isGroup || global.client.sending_top) return;
    const { threadID, senderID, participantIDs } = event;
    const today = moment.tz("Asia/Ho_Chi_Minh").day();
    const filePath = path + threadID + '.json';
    let data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : { total: [], week: [], day: [], time: today };
    data = ensureDataStructure(data, today);

    const userList = participantIDs || [];
    userList.forEach(user => {
      ['total', 'week', 'day'].forEach(type => {
        if (!data[type].some(e => e.id == user)) data[type].push({ id: user, count: 0 });
      });
    });

    if (data.time !== today) {
      global.client.sending_top = true;
      setTimeout(() => global.client.sending_top = false, 300000);
    }

    ['total', 'week', 'day'].forEach(type => {
      const index = data[type].findIndex(e => e.id == senderID);
      if (index > -1) data[type][index].count++;
    });

    const activeIDs = userList.map(String);
    ['total', 'week', 'day'].forEach(type => {
      data[type] = data[type].filter(e => activeIDs.includes(String(e.id)));
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
  } catch (err) {
    console.error(`Lỗi khi xử lý sự kiện tương tác:`, err);
  }
};

module.exports.run = async function({ api, event, args, Users, Threads }) {
  const { threadID, senderID } = event;
  const filePath = path + threadID + '.json';
  if (!fs.existsSync(filePath)) return api.sendMessage("⚠️ Chưa có dữ liệu", threadID);
  let data = JSON.parse(fs.readFileSync(filePath));
  const query = args[0] ? args[0].toLowerCase() : '';
  let targetID = senderID;
  if (event.type === 'message_reply') {
    targetID = event.messageReply.senderID;
  } else if (event.mentions && Object.keys(event.mentions).length > 0) {
    targetID = Object.keys(event.mentions)[0];
  }

  if (query === 'reset') {
    const threadInfo = await Threads.getData(threadID).then(data => data.threadInfo);
    if (!threadInfo.adminIDs.some(item => item.id == senderID))
      return api.sendMessage('❎️ Bạn không đủ quyền để reset dữ liệu!', threadID);
    fs.unlinkSync(filePath);
    return api.sendMessage('✅ Đã reset dữ liệu tương tác của nhóm!', threadID);
  }

  if (query === 'lọc' || query === 'loc') {
    if (!args[1] || isNaN(args[1]))
      return api.sendMessage('⚠️ Vui lòng nhập số tin nhắn.\nVí dụ: check lọc 10', threadID);
    const threshold = parseInt(args[1]);
    if (threshold < 0 || threshold > 10000)
      return api.sendMessage('⚠️ Ngưỡng phải là số dương và hợp lý!', threadID);
    const threadInfo = await Threads.getData(threadID).then(data => data.threadInfo);
    if (!threadInfo.adminIDs.some(item => item.id == senderID))
      return api.sendMessage('❎️ Bạn không đủ quyền để lọc thành viên!', threadID);
    if (!threadInfo.adminIDs.some(item => item.id == api.getCurrentUserID()))
      return api.sendMessage('⚠️ Bot cần quyền quản trị viên!', threadID);
    const toRemove = data.total.filter(u => u.count <= threshold && u.id != api.getCurrentUserID());
    let removed = 0;
    for (const user of toRemove) {
      try {
        await api.removeUserFromGroup(user.id, threadID);
        removed++;
      } catch {}
    }
    return api.sendMessage(`✅ Đã lọc ${removed} thành viên có số tin nhắn dưới ${threshold}`, threadID);
  }

  if (query === 'autoloc' || query === 'auto-loc') {
    const threadInfo = await Threads.getData(threadID).then(data => data.threadInfo);
    if (!threadInfo.adminIDs.some(item => item.id == senderID))
      return api.sendMessage('❎ Bạn không đủ quyền để thiết lập auto lọc!', threadID);
    if (!args[1])
      return api.sendMessage('⚠️ Vui lòng nhập số tin nhắn hoặc "off" để tắt.\nVí dụ: check autoloc 5 hoặc check autoloc off', threadID);
    if (args[1].toLowerCase() === 'off') {
      delete global.checkttConfig[threadID];
      fs.writeFileSync(configPath, JSON.stringify(global.checkttConfig, null, 4));
      return api.sendMessage('✅ Đã tắt auto lọc.', threadID);
    }
    if (isNaN(args[1]))
      return api.sendMessage('⚠️ Vui lòng nhập số tin nhắn hợp lệ.', threadID);
    const threshold = parseInt(args[1]);
    if (threshold < 0 || threshold > 10000)
      return api.sendMessage('⚠️ Ngưỡng phải là số dương và hợp lý!', threadID);
    global.checkttConfig[threadID] = threshold;
    fs.writeFileSync(configPath, JSON.stringify(global.checkttConfig, null, 4));
    return api.sendMessage(`✅ Đã bật auto lọc với ngưỡng ${threshold} tin nhắn.`, threadID);
  }

  if (['all', 'week', 'day'].includes(query)) {
    let list = [];
    if (query === 'all') list = data.total;
    if (query === 'week') list = data.week;
    if (query === 'day') list = data.day;

    const sorted = list.slice().sort((a, b) => b.count - a.count);
    const totalMessages = sorted.reduce((a, b) => a + b.count, 0);

    const msg = `[ Bảng Xếp Hạng Tin Nhắn - ${query.toUpperCase()} ]\n\n` +
      sorted.map((u, i) => `${i + 1}. ${global.data.userName.get(u.id) || "Người dùng"} - ${u.count.toLocaleString()} Tin.`).join('\n') +
      `\n\n💬 Tổng Tin Nhắn: ${totalMessages.toLocaleString()}\n` +
      `📌 Chỉ QTV được reply số để xóa thành viên (VD: 1 2 3).`;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      try { console.log('[check] getThreadInfo (command flow)', { threadID, imageSrc: threadInfo && threadInfo.imageSrc ? threadInfo.imageSrc : null }); } catch {}
      if (threadInfo.imageSrc) {
        const boxImage = await streamURL(threadInfo.imageSrc);
        return api.sendMessage({ 
          body: msg, 
          attachment: boxImage 
        }, threadID, (err, info) => {
          if (err) {
            try { console.error('[check] Error sending message with image (command flow)', { threadID, error: err && err.message ? err.message : err }); } catch {}
            // Nếu không gửi được ảnh thì gửi text
            return sendRankMessage(api, threadID, msg, senderID, sorted, this.config.name);
          }
          global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            tag: 'locmen',
            thread: threadID,
            author: senderID,
            storage: sorted
          });
        });
      } else {
        try { console.log('[check] No imageSrc (command flow)', { threadID }); } catch {}
        return sendRankMessage(api, threadID, msg, senderID, sorted, this.config.name);
      }
    } catch (err) {
      // Nếu có lỗi khi lấy thông tin nhóm thì chỉ gửi text
      try { console.error('[check] getThreadInfo error (command flow)', { threadID, error: err && err.message ? err.message : err }); } catch {}
      return sendRankMessage(api, threadID, msg, senderID, sorted, this.config.name);
    }
  }

  const threadInfo = await Threads.getData(threadID).then(data => data.threadInfo);
  const nameThread = threadInfo.threadName;
  const nameUID = global.data.userName.get(targetID) || "Người dùng";
  const UID = targetID;
  let permission;
  if (global.config.ADMINBOT.includes(UID.toString())) {
    permission = 'Admin Bot';
  } else if (global.config.NDH && global.config.NDH.includes(UID.toString())) {
    permission = 'Người Thuê Bot';
  } else if (threadInfo.adminIDs.some(i => i.id == UID)) {
    permission = 'Quản Trị Viên';
  } else {
    permission = 'Thành Viên';
  }

  const totalDay = data.day.reduce((a, b) => a + b.count, 0);
  const totalWeek = data.week.reduce((a, b) => a + b.count, 0);
  const totalAll = data.total.reduce((a, b) => a + b.count, 0);

  const userTotalDay = data.day.find(u => u.id == targetID)?.count || 0;
  const userTotalWeek = data.week.find(u => u.id == targetID)?.count || 0;
  const userTotal = data.total.find(u => u.id == targetID)?.count || 0;

  const sortedDay = data.day.slice().sort((a, b) => b.count - a.count);
  const sortedWeek = data.week.slice().sort((a, b) => b.count - a.count);
  const sortedTotal = data.total.slice().sort((a, b) => b.count - a.count);

  const userRankDay = sortedDay.findIndex(u => u.id == targetID);
  const userRankWeek = sortedWeek.findIndex(u => u.id == targetID);
  const userRank = sortedTotal.findIndex(u => u.id == targetID);

  let body = `[ ${nameThread} ]\n\n👤 Tên: ${nameUID}\n🎖️ Chức Vụ: ${permission}\n📝 Profile: https://www.facebook.com/profile.php?id=${UID}\n───────────────\n💬 Tin Nhắn Trong Ngày: ${userTotalDay.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}\n📊 Tỉ Lệ Tương Tác Ngày ${totalDay > 0 ? ((userTotalDay / totalDay) * 100).toFixed(2) : 0}%\n🥇 Hạng Trong Ngày: ${userRankDay + 1}\n───────────────\n💬 Tin Nhắn Trong Tuần: ${userTotalWeek.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}\n📊 Tỉ Lệ Tương Tác Tuần ${totalWeek > 0 ? ((userTotalWeek / totalWeek) * 100).toFixed(2) : 0}%\n🥈 Hạng Trong Tuần: ${userRankWeek + 1}\n───────────────\n💬 Tổng Tin Nhắn: ${userTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}\n📊 Tỉ Lệ Tương Tác Tổng ${totalAll > 0 ? ((userTotal / totalAll) * 100).toFixed(2) : 0}%\n🏆 Hạng Tổng: ${userRank + 1}\n\n📌 Dùng:\n- ${global.config.PREFIX}check day/week/all để xem BXH\n- Thả ❤️ để xem tổng BXH\n- ${global.config.PREFIX}check lọc/reset/autoloc [số] để quản lý nhóm.`;
  api.sendMessage({ body }, threadID, (err, info) => {
    if (err) return api.sendMessage("❌ Không thể gửi thông tin tương tác", threadID);
    global.client.handleReaction.push({
      name: this.config.name,
      messageID: info.messageID,
      author: senderID
    });
  });
};

module.exports.handleReply = async function({ api, event, handleReply, Threads }) {
  try {
    const { senderID, threadID, messageID, body } = event;
    const dataThread = (await Threads.getData(threadID)).threadInfo;

    if (!dataThread.adminIDs.some(item => item.id == senderID))
      return api.sendMessage('❎ Chỉ quản trị viên mới được phép kick thành viên!', threadID, messageID);

    if (!dataThread.adminIDs.some(item => item.id == api.getCurrentUserID()))
      return api.sendMessage('❎ Bot cần quyền quản trị viên để kick!', threadID, messageID);

    const isValidInput = body.trim().match(/^\d+(\s+\d+)*$/);
    if (!isValidInput)
      return api.sendMessage('⚠️ Vui lòng chỉ reply số (VD: 1, 2 3) để kick thành viên!', threadID, messageID);

    const indexes = body.split(" ").map(i => parseInt(i)).filter(i => !isNaN(i));
    if (indexes.length === 0)
      return api.sendMessage(`⚠️ Dữ liệu không hợp lệ`, threadID, messageID);

    let success = 0, fail = 0, msg = '', botBlocked = false;
    for (let index of indexes) {
      const user = handleReply.storage[index - 1];
      if (user) {
        if (user.id == api.getCurrentUserID()) {
          botBlocked = true;
          continue;
        }
        try {
          await api.removeUserFromGroup(user.id, threadID);
          success++;
          msg += `${index}. ${global.data.userName.get(user.id) || "Người dùng"}\n`;
        } catch {
          fail++;
        }
      }
    }
    let resultMsg = `✅ Đã xóa ${success} thành viên thành công\n❎ Thất bại ${fail}\n\n${msg}`;
    api.sendMessage(resultMsg, threadID, () => {
      if (botBlocked) {
        api.sendMessage(`Kick em làm gì vậy!`, threadID);
      }
    });
  } catch (err) {
    console.error(`Lỗi khi xử lý reply:`, err);
    return api.sendMessage("❌ Lỗi khi xóa thành viên", threadID);
  }
};

module.exports.handleReaction = async function({ api, event, handleReaction }) {
  if (event.userID !== handleReaction.author || event.reaction !== '❤') return;

  api.unsendMessage(handleReaction.messageID);
  const filePath = path + event.threadID + '.json';
  if (!fs.existsSync(filePath)) return api.sendMessage("⚠️ Chưa có dữ liệu", event.threadID);

  const data = JSON.parse(fs.readFileSync(filePath));
  const sorted = data.total.sort((a, b) => b.count - a.count);
  const totalMessages = sorted.reduce((a, b) => a + b.count, 0);
  const rank = sorted.findIndex(u => u.id == event.userID) + 1;

  const msg = `[ Tất Cả Tin Nhắn ]\n\n` +
    sorted.map((u, i) => `${i + 1}. ${global.data.userName.get(u.id) || "Người dùng"} - ${u.count.toLocaleString()} Tin.`).join('\n') +
    `\n\n💬 Tổng Tin Nhắn: ${totalMessages.toLocaleString()}\n` +
    `📊 Bạn hiện đang đứng ở hạng: ${rank}\n\n` +
    `📌 Chỉ QTV được reply số để xóa thành viên (VD: 1 2 3).\n` +
    `${global.config.PREFIX}check lọc [số] để lọc thành viên.\n` +
    `${global.config.PREFIX}check autoloc [số] để tự lọc.\n` +
    `${global.config.PREFIX}check reset để reset dữ liệu.\n` +
    `${global.config.PREFIX}kickndfb để xóa người dùng fb.`;

  try {
    const threadInfo = await api.getThreadInfo(event.threadID);
    try { console.log('[check] getThreadInfo (reaction flow)', { threadID: event.threadID, imageSrc: threadInfo && threadInfo.imageSrc ? threadInfo.imageSrc : null }); } catch {}
    if (threadInfo.imageSrc) {
      const boxImage = await streamURL(threadInfo.imageSrc);
      return api.sendMessage({ 
        body: msg, 
        attachment: boxImage 
      }, event.threadID, (err, info) => {
        if (err) {
          try { console.error('[check] Error sending message with image (reaction flow)', { threadID: event.threadID, error: err && err.message ? err.message : err }); } catch {}
          // Nếu không gửi được ảnh thì gửi text
          return sendRankMessage(api, event.threadID, msg, event.userID, sorted, this.config.name);
        }
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          tag: 'locmen',
          thread: event.threadID,
          author: event.userID,
          storage: sorted
        });
      });
    } else {
      try { console.log('[check] No imageSrc (reaction flow)', { threadID: event.threadID }); } catch {}
      return sendRankMessage(api, event.threadID, msg, event.userID, sorted, this.config.name);
    }
  } catch (err) {
    // Nếu có lỗi thì chỉ gửi text
    try { console.error('[check] getThreadInfo error (reaction flow)', { threadID: event.threadID, error: err && err.message ? err.message : err }); } catch {}
    return sendRankMessage(api, event.threadID, msg, event.userID, sorted, this.config.name);
  }
};

function sendRankMessage(api, threadID, msg, senderID, sorted, configName) {
  api.sendMessage(msg, threadID, (err, info) => {
    if (err) return api.sendMessage("❌ Không thể gửi bảng xếp hạng", threadID);
    global.client.handleReply.push({
      name: configName,
      messageID: info.messageID,
      tag: 'locmen',
      thread: threadID,
      author: senderID,
      storage: sorted
    });
  });
}