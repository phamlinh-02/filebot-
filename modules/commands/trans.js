module.exports.config = {
    name: "trans",
    version: "1.0.1",
    hasPermssion: 0,
    credits: "MiraiTeam & mod by DongDev",
    description: "Dịch văn bản",
    commandCategory: "Tiện ích",
    usages: "[en/ko/ja/vi] [Text]",
    cooldowns: 5,
    usePrefix: false,
    dependencies: {
        "request": ""
    }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const axios = require('axios');
    const request = require('request');
    const fs = require("fs");
    const moment = require("moment-timezone");
    var time = moment.tz('Asia/Ho_Chi_Minh').format('HH:mm:ss || DD/MM/YYYY');
  const img = (await axios.get(`https://i.postimg.cc/J0Yc8x9D/wpJDaQW.jpg`, { responseType: "stream"})).data
  var content = args.join(" ");
  if (content.length == 0 && event.type != "message_reply") return global.utils.throwError(this.config.name, event.threadID,event.messageID);
  var translateThis = content.slice(0, content.indexOf(" ->"));
  var lang = content.substring(content.indexOf(" -> ") + 4);
  if (event.type == "message_reply") {
    translateThis = event.messageReply.body
    if (content.indexOf("-> ") !== -1) lang = content.substring(content.indexOf("-> ") + 3);
    else lang = global.config.language;
  }
  else if (content.indexOf(" -> ") == -1) {
    translateThis = content.slice(0, content.length)
    lang = global.config.language;
  }
  return  request(encodeURI(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${translateThis}`), async (err, response, body) => {
    if (err) return api.sendMessage("Đã có lỗi xảy ra!", event.threadID, event.messageID);
    var retrieve = JSON.parse(body);
    var text = '';
    retrieve[0].forEach(item => (item[0]) ? text += item[0] : '');
    var fromLang = (retrieve[2] === retrieve[8][0][0]) ? retrieve[2] : retrieve[8][0][0]
    api.sendMessage({body: `➩ 𝗕𝗮̉𝗻 𝗱𝗶̣𝗰𝗵: ${text}\n➩ Đ𝘂̛𝗼̛̣𝗰 𝗱𝗶̣𝗰𝗵 𝘁𝘂̛̀: ${fromLang} 𝘀𝗮𝗻𝗴 ${lang}\n━━━━━━━━━━━━━━━━━━\n⏰=『${time}』=⏰`, attachment: (img) }, event.threadID, event.messageID);
  });
}