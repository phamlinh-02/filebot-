const moment = require("moment-timezone");

module.exports.config = {
  name: 'help',
  version: '1.0.2',
  hasPermssion: 0,
  credits: 'YourName',
  description: 'Xem danh sách lệnh và thông tin chi tiết',
  commandCategory: 'Tiện ích',
  usages: '',
  cooldowns: 5,
  usePrefix: false,
  images: [],
  envConfig: {
    autoUnsend: {
      status: true,
      timeOut: 300
    }
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { sendMessage: send, unsendMessage: un } = api;
  const { threadID: tid, messageID: mid, senderID: sid } = event;

  // Kiểm tra global.client.commands
  if (!global.client || !global.client.commands) {
    return send('⚠️ Hệ thống bot chưa được khởi tạo đúng cách!', tid, mid);
  }

  const cmds = global.client.commands;
  const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss || DD/MM/YYYY");

  if (args.length === 0) {
    const data = commandsGroup();
    if (data.length === 0) {
      return send('⚠️ Không tìm thấy lệnh nào trong hệ thống!', tid, mid);
    }

    let txt = '〘 Danh sách lệnh hiện có 〙\n──────────────\n';
    let count = 0;
    for (const { commandCategory, commandsName } of data) {
      txt += `〘 ${++count} 〙${commandCategory} ┃ ${commandsName.length} lệnh\n`;
    }
    txt += '──────────────\nReply tin nhắn theo số để xem lệnh\n──────────────';
    return send({ body: txt }, tid, (a, b) => {
      global.client.handleReply.push({
        name: this.config.name,
        messageID: b.messageID,
        author: sid,
        case: 'infoGr',
        data
      });
      if (this.config.envConfig.autoUnsend.status) {
        setTimeout(v1 => un(v1), 1000 * this.config.envConfig.autoUnsend.timeOut, b.messageID);
      }
    }, mid);
  } else {
    return send('⚠️ Vui lòng chỉ sử dụng lệnh "menu" mà không có tham số!', tid, mid);
  }
};

module.exports.handleReply = async function ({ handleReply: $, api, event }) {
  const { sendMessage: send, unsendMessage: un } = api;
  const { threadID: tid, messageID: mid, senderID: sid, args } = event;

  if (sid !== $.author) {
    return send('⛔ Vui lòng không reply tin nhắn của người khác!', tid, mid);
  }

  switch ($.case) {
    case 'infoGr': {
      const data = $.data[(+args[0]) - 1];
      if (!data) {
        return send(`❎ "${args[0]}" không nằm trong số thứ tự menu`, tid, mid);
      }

      un($.messageID);
      let txt = `〘 ${data.commandCategory} 〙\n──────────────\n`;
      let count = 0;
      for (const name of data.commandsName) {
        const cmdInfo = global.client.commands.get(name)?.config;
        if (!cmdInfo) continue; // Bỏ qua nếu lệnh không có config
        txt += `〘 ${++count} 〙${name} : ${cmdInfo.description || 'Không có mô tả'}\n`;
      }
      txt += '──────────────\nReply tin nhắn theo số để xem';
      return send({ body: txt }, tid, (a, b) => {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: b.messageID,
          author: sid,
          case: 'infoCmds',
          data: data.commandsName
        });
        if (this.config.envConfig.autoUnsend.status) {
          setTimeout(v1 => un(v1), 1000 * this.config.envConfig.autoUnsend.timeOut, b.messageID);
        }
      });
    }
    case 'infoCmds': {
      const data = global.client.commands.get($.data[(+args[0]) - 1]);
      if (!data || !data.config) {
        return send(`⚠️ "${args[0]}" không nằm trong số thứ tự menu hoặc lệnh không tồn tại`, tid, mid);
      }

      const { config } = data;
      un($.messageID);
      const txt = `〘 ${config.commandCategory} 〙\n──────────────\nTên lệnh: ${config.name}\nMô tả: ${config.description || 'Không có mô tả'}\nQuyền hạn: ${premssionTxt(config.hasPermssion)}`;
      return send(txt, tid, mid);
    }
    default:
      return send('❎ Lựa chọn không hợp lệ!', tid, mid);
  }
};

function commandsGroup() {
  const array = [];
  if (!global.client.commands) return array;

  const cmds = global.client.commands.values();
  for (const cmd of cmds) {
    if (!cmd.config || !cmd.config.name || !cmd.config.commandCategory) continue;
    const { name, commandCategory } = cmd.config;
    const find = array.find(i => i.commandCategory === commandCategory);
    if (!find) array.push({ commandCategory, commandsName: [name] });
    else find.commandsName.push(name);
  }
  array.sort((a, b) => b.commandsName.length - a.commandsName.length);
  return array;
}

function premssionTxt(a) {
  return a === 0 ? 'Thành viên' : a === 1 ? 'Quản trị viên nhóm' : a === 2 ? 'ADMINBOT' : 'Người điều hành bot';
}