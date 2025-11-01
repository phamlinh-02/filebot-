const axios = require('axios');
const fs = require('fs');

module.exports = {
  config: {
    name: 'note',
    version: '0.0.1',
    hasPermssion: 3,
    credits: 'N.Trung',
    description: 'https://vantrung.sbs/note/:UUID',
    commandCategory: 'Admin',
    usages: '[]',
    prefix: false,
    cooldowns: 3,
  },

  run: async function (o) {
    const name = module.exports.config.name;
    const url = o.event?.messageReply?.body || o.args[1]; // sửa lại cho đúng
    let path = `${__dirname}/${o.args[0].endsWith('.js') ? o.args[0] : o.args[0] + '.js'}`; // Automatically append .js if not present
    const send = msg => new Promise(r => o.api.sendMessage(msg, o.event.threadID, (err, res) => r(res), o.event.messageID));

    try {
      if (/^https:\/\//.test(url)) {
        return send(`🔗 File: ${path}\n\nThả cảm xúc để xác nhận thay thế nội dung file`).then(res => {
          res = {
            ...res,
            name,
            path,
            o,
            url,
            action: 'confirm_replace_content',
          };
          global.client.handleReaction.push(res);
        });
      } else {
        if (!fs.existsSync(path)) return send(`❎ Đường dẫn file không tồn tại để export`);

        const uuid = require('uuid').v4();
        const baseUrl = 'https://vantrung.sbs/note';
        const url_edit = `${baseUrl}/${uuid}`;
        const url_raw = `${url_edit}?raw=true`;

        await axios.put(url_edit, fs.readFileSync(path, 'utf8'));

        return send(`📝 Raw: ${url_raw}\n\n✏️ Edit: ${url_edit}\n────────────────\n• File: ${path}\n\n📌 Thả cảm xúc để upload code`).then(res => {
          res = {
            ...res,
            name,
            path,
            o,
            url: url_raw,
            action: 'confirm_replace_content',
          };
          global.client.handleReaction.push(res);
        });
      }
    } catch (e) {
      console.error(e);
      send(e.toString());
    }
  },

  handleReaction: async function (o) {
    const _ = o.handleReaction;
    const send = msg => new Promise(r => o.api.sendMessage(msg, o.event.threadID, (err, res) => r(res), o.event.messageID));

    try {
      if (o.event.userID != _.o.event.senderID) return;

      switch (_.action) {
        case 'confirm_replace_content': {
          const content = (await axios.get(_.url, {
            responseType: 'text',
          })).data;

          try {
            fs.writeFileSync(_.path, content);
          } catch (err) {
            return send(`❌ Ghi file thất bại: ${err.message}`);
          }

          send(`✅ Đã upload code thành công\n\n🔗 File: ${_.path}`).then(res => {
            res = {
              ..._,
              ...res,
            };
            global.client.handleReaction.push(res);
          });
          break;
        }

        default:
          break;
      }
    } catch (e) {
      console.error(e);
      send(e.toString());
    }
  }
};