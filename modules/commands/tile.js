module.exports.config = {
  name: "tile",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Jukie~",
  description: "Xem tỉ lệ hợp đôi giữa 2 người",
  commandCategory: "Tình Yêu",
  usages: "[tag1] [tag2]",
  cooldowns: 6,
  dependencies: {
      "fs-extra": "",
      "axios": ""
  }
}

module.exports.run = async function({ api, args, Users, event }) {
  const axios = global["nodemodule"]["axios"];
  const fs = global["nodemodule"]["fs-extra"];
  const mentions = Object.keys(event["mentions"]);

  if (mentions.length < 1) {
      return api["sendMessage"]("[👉]➜ Cần phải tag ít nhất 1 người để xem tỉ lệ hợp nhau", event["threadID"]);
  }

  let namee = (await Users["getData"](event["senderID"]))["name"];
  let arraytag = [{ id: event["senderID"], tag: namee }];

  if (mentions.length === 1) {
      const mention = mentions[0];
      const name = (await Users["getData"](mention))["name"];
      const tle = Math.floor(Math.random() * 101);
      arraytag.push({ id: mention, tag: name });

      let Avatar = (await axios.get(`https://graph.facebook.com/${mention}/picture?height=1500&width=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" }))["data"];
      fs.writeFileSync(__dirname + "/cache/avt.png", Buffer.from(Avatar, "utf-8"));
      let Avatar2 = (await axios.get(`https://graph.facebook.com/${event["senderID"]}/picture?height=1500&width=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" }))["data"];
      fs.writeFileSync(__dirname + "/cache/avt2.png", Buffer.from(Avatar2, "utf-8"));

      var imglove = [fs.createReadStream(__dirname + "/cache/avt2.png"), fs.createReadStream(__dirname + "/cache/avt.png")];
      var msg = { body: `[❤️]➜ Tỉ lệ hợp đôi giữa\n${namee} và ${name} \n => ${tle}%`, mentions: arraytag, attachment: imglove };
      return api["sendMessage"](msg, event["threadID"], event["messageID"]);
  }

  if (mentions.length === 2) {
      const mention1 = mentions[0];
      const mention2 = mentions[1];
      const name1 = (await Users["getData"](mention1))["name"];
      const name2 = (await Users["getData"](mention2))["name"];
      const tle = Math.floor(Math.random() * 101);
      arraytag.push({ id: mention1, tag: name1 });
      arraytag.push({ id: mention2, tag: name2 });

      let Avatar1 = (await axios.get(`https://graph.facebook.com/${mention1}/picture?height=1500&width=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" }))["data"];
      let Avatar2 = (await axios.get(`https://graph.facebook.com/${mention2}/picture?height=1500&width=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" }))["data"];
      fs.writeFileSync(__dirname + "/cache/avt1.png", Buffer.from(Avatar1, "utf-8"));
      fs.writeFileSync(__dirname + "/cache/avt2.png", Buffer.from(Avatar2, "utf-8"));

      var imglove = [fs.createReadStream(__dirname + "/cache/avt1.png"), fs.createReadStream(__dirname + "/cache/avt2.png")];
      var msg = { body: `[❤️]➜ Tỉ lệ hợp đôi giữa\n${name1} và ${name2} \n => ${tle}%`, mentions: arraytag, attachment: imglove };
      return api["sendMessage"](msg, event["threadID"], event["messageID"]);
  }

  return api["sendMessage"]("[👉]➜ Bạn chỉ có thể tag tối đa 2 người để xem tỉ lệ hợp nhau", event["threadID"]);
}