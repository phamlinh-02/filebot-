const request = require("request");
const fs = require("fs")
const axios = require("axios")
module.exports.config = {
  name: "dauan",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Vdang",
  description: "ngỏ lời",
  commandCategory: "Hành Động",
  usages: "[tag]",
  cooldowns: 5,
};

module.exports.run = async({ api, event, Threads, global }) => {
  var link = [    
"https://scontent.fsgn10-1.fna.fbcdn.net/v/t1.15752-9/407081372_1324633414916076_905643466227847356_n.jpg?_nc_cat=111&ccb=1-7&_nc_sid=5f2048&_nc_ohc=DsGXCYT9vSYQ7kNvgEf4Of8&_nc_ht=scontent.fsgn10-1.fna&oh=03_Q7cD1QEojeLApBMzHFOcsqNcWkTpwxRMSTyMMn4YXyoVUbBezg&oe=669211CF",
   ];
   var mention = Object.keys(event.mentions);
     let tag = event.mentions[mention].replace("@", "");
    if (!mention) return api.sendMessage("Vui lòng tag 1 người", threadID, messageID);
   var callback = () => api.sendMessage({body: `Tặng chai dầu ăn nè ${tag} 👉👈`,mentions: [{tag: tag,id: Object.keys(event.mentions)[0]}],attachment: fs.createReadStream(__dirname + "/cache/dầu ăn.png")}, event.threadID, () => fs.unlinkSync(__dirname + "/cache/dầu ăn.png"));  
      return request(encodeURI(link[Math.floor(Math.random() * link.length)])).pipe(fs.createWriteStream(__dirname+"/cache/dầu ăn.png")).on("close",() => callback());
   }