const fs = require('fs');

module.exports.config = {
  name: 'setname',
  version: '2.4.0',
  hasPermssion: 0,
  credits: 'DC-Nam & ChatGPT',
  description: 'Thay đổi, kiểm tra, xử lý biệt danh trong nhóm hoặc tên nhóm (box)',
  commandCategory: 'Quản Trị Viên',
  usages: '[biệt danh mới|check|box tên nhóm mới]',
  cooldowns: 0,
};

// Lưu trữ dữ liệu check theo threadID
const pendingChecks = new Map();

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageReply, mentions, type, messageID } = event;

  // CHẾ ĐỘ ĐỔI TÊN NHÓM (BOX)
  if (args[0] && args[0].toLowerCase() === 'box') {
    const threadInfo = await api.getThreadInfo(threadID);
    const isSenderAdmin = threadInfo.adminIDs.some(e => e.id == senderID);

    if (!isSenderAdmin) {
      return api.sendMessage('⚠️ Chỉ quản trị viên mới được đổi tên nhóm.', threadID, messageID);
    }

    const newName = args.slice(1).join(' ').trim();
    if (!newName) return api.sendMessage('⚠️ Vui lòng nhập tên nhóm mới.', threadID, messageID);

    try {
      await api.setTitle(newName, threadID);
      return api.sendMessage(`✅ Đã đổi tên nhóm thành: ${newName}`, threadID, messageID);
    } catch (err) {
      return api.sendMessage('❌ Không thể đổi tên nhóm.', threadID, messageID);
    }
  }

  // CHẾ ĐỘ CHECK
  if (args[0] && args[0].toLowerCase() === 'check') {
    const threadInfo = await api.getThreadInfo(threadID);
    const allMembers = threadInfo.participantIDs;
    const nicknames = threadInfo.nicknames || {};

    // 1. CHECK BIỆT DANH NGƯỜI BỊ REPLY
    if (type === 'message_reply') {
      const targetID = messageReply.senderID;
      const nick = nicknames[targetID] || null;
      return api.sendMessage(nick
        ? `💻 Biệt danh của người này là: "${nick}"`
        : `⚠️ Người này chưa có biệt danh trong nhóm.`, threadID, messageID);
    }

    // 2. CHECK BIỆT DANH NGƯỜI ĐƯỢC TAG
    if (Object.keys(mentions).length > 0) {
      const targetID = Object.keys(mentions)[0];
      const nick = nicknames[targetID] || null;
      return api.sendMessage(nick
        ? `💳 Biệt danh của người được tag là: "${nick}"`
        : `⚠️ Người được tag chưa có biệt danh trong nhóm.`, threadID, messageID);
    }

    // 3. DANH SÁCH THÀNH VIÊN CHƯA CÓ BIỆT DANH
    const threadUsers = threadInfo.userInfo.filter(u => allMembers.includes(u.id) && u.type === 'User');
    const noNick = threadUsers.filter(u => !nicknames[u.id]);

    if (noNick.length === 0) {
      return api.sendMessage('✅ Tất cả thành viên đều đã có biệt danh.', threadID);
    }

    const list = noNick.map((user, i) => `${i + 1}. ${user.name} (${user.id})`).join('\n');
    
    // Lưu thông tin vào Map
    pendingChecks.set(threadID, {
      users: noNick.map(user => user.id),
      names: noNick.map(user => user.name),
      timestamp: Date.now()
    });

    return api.sendMessage(
      `📋 Danh sách thành viên chưa có biệt danh:\n✅ ${threadUsers.length - noNick.length}/${threadUsers.length} đã có biệt danh\n❌ ${noNick.length} chưa có:\n${list}`,
      threadID, (err, info) => {
        if (!err) {
          pendingChecks.set(`${threadID}_msg`, info.messageID);
        }
      }
    );
  }

  // CHẾ ĐỘ SET BIỆT DANH
  const rawInput = args.join(' ');
  let targetID = senderID;
  let targetName = '';
  let isSelf = true;

  // Xác định người đặt biệt danh
  if (type === 'message_reply') {
    targetID = messageReply.senderID;
    targetName = messageReply.senderName;
    isSelf = false;
  } else if (Object.keys(mentions).length > 0) {
    targetID = Object.keys(mentions)[0];
    targetName = mentions[targetID];
    isSelf = false;
  }

  // Loại bỏ tên người bị tag/reply khỏi chuỗi biệt danh
  const newName = isSelf ? rawInput : rawInput.replace(targetName, '').trim();

  api.changeNickname(
    newName,
    threadID,
    targetID,
    async (err) => {
      if (err) {
        return api.sendMessage('❌ Không thể đổi biệt danh. Nhóm có thể đang bật liên kết.', threadID);
      } else {
        let message = '';
        if (isSelf) {
          message = `${newName ? '✅ Đã đổi biệt danh của bạn thành: ' + newName : '🔄 Đã gỡ biệt danh của bạn'}`;
        } else {
          // Lấy thông tin người dùng để hiển thị tên
          const userInfo = await api.getUserInfo(targetID);
          const userName = userInfo[targetID]?.name || targetName;
          message = `${newName ? `✅ Đã đổi biệt danh của ${userName} thành: ${newName}` : `🔄 Đã gỡ biệt danh của ${userName}`}`;
        }
        return api.sendMessage(message, threadID);
      }
    }
  );
};

module.exports.handleReply = async function ({ api, event }) {
  const { threadID, body, senderID } = event;
  const checkData = pendingChecks.get(threadID);
  
  if (!checkData) return;
  
  // Kiểm tra quyền admin nếu có lệnh kick
  const threadInfo = await api.getThreadInfo(threadID);
  const isAdmin = threadInfo.adminIDs.some(e => e.id == senderID);

  // Xử lý lệnh tag all
  if (body.toLowerCase() === 'tag all') {
    const mentions = checkData.users.map((id, index) => ({ 
      id, 
      tag: `${index + 1}. ${checkData.names[index]}` 
    }));
    return api.sendMessage({ 
      body: `📌 Tag toàn bộ ${checkData.users.length} thành viên chưa có biệt danh:`, 
      mentions 
    }, threadID);
  }

  // Xử lý lệnh kick all
  if (body.toLowerCase() === 'kick all') {
    if (!isAdmin) {
      return api.sendMessage('❌ Chỉ quản trị viên mới có thể kick thành viên.', threadID);
    }
    
    let kickCount = 0;
    for (const uid of checkData.users) {
      try {
        await api.removeUserFromGroup(uid, threadID);
        kickCount++;
      } catch (e) {
        console.log(`Không thể kick: ${uid}`);
      }
    }
    pendingChecks.delete(threadID);
    return api.sendMessage(`🚫 Đã kick ${kickCount}/${checkData.users.length} thành viên chưa có biệt danh.`, threadID);
  }

  // Xử lý lệnh kick + số
  if (body.toLowerCase().startsWith('kick ')) {
    if (!isAdmin) {
      return api.sendMessage('❌ Chỉ quản trị viên mới có thể kick thành viên.', threadID);
    }
    
    const index = parseInt(body.substring(5));
    if (!isNaN(index) && index > 0 && index <= checkData.users.length) {
      const kickID = checkData.users[index - 1];
      const kickName = checkData.names[index - 1];
      
      try {
        await api.removeUserFromGroup(kickID, threadID);
        return api.sendMessage(`🚫 Đã kick thành viên số ${index} (${kickName}) khỏi nhóm.`, threadID);
      } catch (e) {
        return api.sendMessage(`❌ Không thể kick thành viên số ${index} (${kickName}).`, threadID);
      }
    } else {
      return api.sendMessage('⚠️ Sai cú pháp. Vui lòng reply "kick + số" (ví dụ: kick 1).', threadID);
    }
  }

  // Xử lý tag theo số
  const index = parseInt(body);
  if (!isNaN(index) && index > 0 && index <= checkData.users.length) {
    const tagID = checkData.users[index - 1];
    const tagName = checkData.names[index - 1];
    return api.sendMessage({ 
      body: `🔔 Thành viên số ${index}: ${tagName}`, 
      mentions: [{ id: tagID, tag: tagName }] 
    }, threadID);
  }

  return api.sendMessage('⚠️ Sai cú pháp. Vui lòng reply:\n- Số để tag thành viên\n- "tag all" để tag toàn bộ\n- "kick + số" để kick thành viên\n- "kick all" để kick toàn bộ', threadID);
};

// Xóa dữ liệu cũ sau 10 phút
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingChecks.entries()) {
    if (value.timestamp && now - value.timestamp > 10 * 60 * 1000) {
      pendingChecks.delete(key);
    }
  }
}, 60 * 1000);