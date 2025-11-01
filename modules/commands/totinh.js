module.exports.config = {
  name: "totinh",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Vdang",
  description: "",
  commandCategory: "Tình Yêu",
  usages: "[tag]",
  cooldowns: 5,
  dependencies: {
      "axios": "",
      "fs-extra": "",
      "path": "",
      "jimp": ""
  }
};

module.exports.onLoad = async() => {
  const { resolve } = global.nodemodule["path"];
  const { existsSync, mkdirSync } = global.nodemodule["fs-extra"];
  const { downloadFile } = global.utils;
  const dirMaterial = __dirname + `/cache/canvas/`;
  const path = resolve(__dirname, 'cache/canvas', 'totinh.jpg');
  if (!existsSync(dirMaterial + "canvas")) mkdirSync(dirMaterial, { recursive: true });
  if (!existsSync(path)) await downloadFile("https://i.postimg.cc/tJ2Qjsdv/anh-to-tinh-800x590.jpg", path);
}

async function makeImage({ one, two }) {
  const fs = global.nodemodule["fs-extra"];
  const path = global.nodemodule["path"];
  const axios = global.nodemodule["axios"]; 
  const jimp = global.nodemodule["jimp"];
  const __root = path.resolve(__dirname, "cache", "canvas");

  let baseImage = await jimp.read(__root + "/totinh.jpg");
  let pathImg = __root + `/love_${one}_${two}.png`;
  let avatarOnePath = __root + `/avt_${one}.png`;
  let avatarTwoPath = __root + `/avt_${two}.png`;

  // Tải avatar từ Facebook
  const avatarUrlOne = `https://graph.facebook.com/${one}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
  const avatarUrlTwo = `https://graph.facebook.com/${two}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

  let avatarOneData = (await axios.get(avatarUrlOne, { responseType: 'arraybuffer' })).data;
  let avatarTwoData = (await axios.get(avatarUrlTwo, { responseType: 'arraybuffer' })).data;
  fs.writeFileSync(avatarOnePath, Buffer.from(avatarOneData, 'utf-8'));
  fs.writeFileSync(avatarTwoPath, Buffer.from(avatarTwoData, 'utf-8'));

  // Xử lý ảnh tròn
  let avatarOne = await jimp.read(await circle(avatarOnePath));
  let avatarTwo = await jimp.read(await circle(avatarTwoPath));

  // Resize và chèn vào đúng vị trí đầu nhân vật (theo ảnh mẫu bạn gửi)
  avatarOne.resize(70, 70); // Nam (bên trái)
  avatarTwo.resize(70, 70); // Nữ (bên phải)
  baseImage.composite(avatarOne, 76, 178); // đầu nữ
  baseImage.composite(avatarTwo, 215, 177); // đầu nam

  // Xuất ảnh
  let finalBuffer = await baseImage.getBufferAsync("image/png");
  fs.writeFileSync(pathImg, finalBuffer);
  fs.unlinkSync(avatarOnePath);
  fs.unlinkSync(avatarTwoPath);

  return pathImg;
}

async function circle(image) {
  const jimp = require("jimp");
  image = await jimp.read(image);
  image.circle();
  return await image.getBufferAsync("image/png");
}

module.exports.run = async function ({ event, api, args }) {
  const fs = global.nodemodule["fs-extra"];
  const { threadID, messageID, senderID } = event;
  var mention = Object.keys(event.mentions)[0]
  let tag = event.mentions[mention].replace("@", "");
  if (!mention) return api.sendMessage("Vui lòng tag 1 người", threadID, messageID);
  else {
      var one = senderID, two = mention;
      return makeImage({ one, two }).then(path => api.sendMessage({ body: "Này "  +  tag + 'Làm người yêu tớ nhéee💗',
          mentions: [{
        tag: tag,
        id: mention
      }],
   attachment: fs.createReadStream(path) }, threadID, () => fs.unlinkSync(path), messageID));
  }
}