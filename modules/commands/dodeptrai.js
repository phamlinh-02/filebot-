module.exports.config = {
    name: "dodeptrai",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Dũngkon",
    description: "Đánh giá độ đẹp trai",
    commandCategory: "Tiện ích",
    usages: "dodeptrai [reply/@tag]",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args, Users }) {
  const fs = require("fs-extra");
  const request = require("request");
  
  const percent = Math.floor(Math.random() * 101);
  
  if (Object.keys(event.mentions).length == 1) {
    const mentions = Object.keys(event.mentions)[0];
    const name = (await Users.getData(mentions)).name;
    
    const callback = () => api.sendMessage({
      body: `🌸 ĐỘ ĐẸP TRAI 🌸\n\n👤 Tên: ${name}\n💯 Độ đẹp trai: ${percent}%`,
      attachment: fs.createReadStream(__dirname + "/cache/dodeptrai.png")
    }, event.threadID, () => fs.unlinkSync(__dirname + "/cache/dodeptrai.png"), event.messageID);
    
    return request(encodeURI(`https://graph.facebook.com/${mentions}/picture?height=1500&width=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`))
      .pipe(fs.createWriteStream(__dirname + '/cache/dodeptrai.png'))
      .on('close', () => callback());
  } 
  else {
    let idmen;
    if (event.type == "message_reply") {
      idmen = event.messageReply.senderID;
    } else {
      idmen = event.senderID;
    }
    
    const name = (await Users.getData(idmen)).name;
    const callback = () => api.sendMessage({
      body: `🌸 ĐỘ ĐẸP TRAI 🌸\n\n👤 Tên: ${name}\n💯 Độ đẹp trai: ${percent}%`,
      attachment: fs.createReadStream(__dirname + "/cache/dodeptrai.png")
    }, event.threadID, () => fs.unlinkSync(__dirname + "/cache/dodeptrai.png"), event.messageID);
    
    return request(encodeURI(`https://graph.facebook.com/${idmen}/picture?height=1500&width=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`))
      .pipe(fs.createWriteStream(__dirname + '/cache/dodeptrai.png'))
      .on('close', () => callback());
  }
};