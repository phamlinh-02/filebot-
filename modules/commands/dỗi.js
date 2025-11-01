const request = require("request");
const fs = require("fs");

module.exports.config = {
  name: "dỗi",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "Vdang",
  description: "ngỏ lời",
  commandCategory: "Hành Động",
  usages: "[tag]",
  cooldowns: 5,
};

module.exports.run = async ({ api, event }) => {
  var link = [
    "https://i.imgur.com/NU14OKp.jpeg?_nc_cat=101&ccb=1-7&_nc_sid=5f2048&_nc_ohc=CcF_SnzoRpoQ7kNvgGbWJ1Y&_nc_ht=scontent.fhan3-3.fna&oh=03_Q7cD1QGcEeL9NWoqG7PI9wMye2ePKzA0WARI68bSwblI6o1mYQ&oe=6690AF3E",
     "https://th.bing.com/th/id/OIP.QFL9teunjBYG2XMAvuXfBQHaHa?rs=1&pid=ImgDetMain",
     "https://symbols.vn/wp-content/uploads/2023/10/Nhung-hinh-anh-meo-gian-doi-de-thuong.jpg"         
  ];
  
  var mention = Object.keys(event.mentions);
  if (mention.length === 0) return api.sendMessage("Vui lòng tag 1 người", event.threadID, event.messageID);

  let tag = event.mentions[mention[0]].replace("@", "");
  let userID = mention[0];
  
  var callback = () => {
    api.changeNickname(`Đồ khốn`, event.threadID, userID, (err) => {
      if (err) return api.sendMessage("Không thể đổi biệt danh.", event.threadID);
     
      api.sendMessage({
        body: `Dỗi ${tag} rồi ToT`,
        mentions: [{ tag: tag, id: userID }],
        attachment: fs.createReadStream(__dirname + "/cache/doi.png")
      }, event.threadID, () => {
        fs.unlinkSync(__dirname + "/cache/doi.png");
        api.shareContact("Đồ tồi!", userID, event.threadID);
      });
    });
  };

  return request(encodeURI(link[Math.floor(Math.random() * link.length)]))
    .pipe(fs.createWriteStream(__dirname + "/cache/doi.png"))
    .on("close", callback);
};
