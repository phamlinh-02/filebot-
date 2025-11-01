module.exports.config = {
  name: 'coduyen',//mod by Vdang
  version: '1.0.0',
  hasPermssion: 0,
  credits: 'VAZTEAM',
  description: 'Kiếm cơ duyên',
  commandCategory: 'Tình Yêu',
  usages: '[]',
  cooldowns: 3,
  usePrefix: false
};

let random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

module.exports.run = async ({ api, event, Users }) => {
  const axios = require('axios');
  const request = require('request');
  const url = 'https://i.imgur.com/vRn8Ohs.jpeg';
  const img = (await axios.get(url, { responseType: "stream"})).data;

  const options = [
    { name: 'Xâm nhập bí cảnh', message: 'bạn thành công xâm nhập bí cảnh đạt được vô thượng cơ duyên tu vi bạo tăng {years} năm tu vi' },
    { name: 'Đào mộ', message: 'bạn xâm nhập mộ địa của vô thượng cường giả đạt được vô thượng tâm pháp tu vi bạo tăng {years} năm tu vi' },
    { name: 'Luận bàn võ đạo', message: 'bạn hành tẩu khắp nơi luận bàn chư phương cường giả thành công tích lũy kinh nghiệm tu vi bạo tăng {years} năm tu vi' },
    { name: 'Đấu giá', message: 'tại phòng đấu giá bạn đấu giá được thần cấp đan dược tu vi bạo tăng {years} năm tu vi' },
    { name: 'Lễ bái Thần Đế', message: 'bạn đạt được Vô Thượng Thần Đế chiếu cố ban tặng {years} năm tu vi' }
  ];

  const replyOptions = options.map((opt, i) => `[${i + 1}] ${opt.name}`).join('\n');
  api.sendMessage({
    body: `==== [ 𝗖𝗢̛ 𝗗𝗨𝗬𝗘̂𝗡 𝗞𝗜𝗘̂́𝗠 𝗧𝗨 𝗩𝗜 ] ====\n━━━━━━━━━━\n\n${replyOptions}\n\n➩ Reply theo số thứ tự hoặc thả cảm xúc tương ứng vào tin nhắn này để chọn cơ duyên`,
    attachment: img
  }, event.threadID, (error, info) => {
    global.client.handleReaction.push({
      name: this.config.name,
      messageID: info.messageID,
      author: event.senderID
    });
    global.client.handleReply.push({
      name: this.config.name,
      messageID: info.messageID,
      author: event.senderID,
      options
    });
  });
};

module.exports.handleReaction = async ({ api, event, handleReaction, Users, Currencies }) => {
  if (event.userID !== handleReaction.author) return;

  const { options } = handleReaction;
  const chosenOption = options[parseInt(event.body) - 1];
  const tuvi = random(10000, 9999999);

  if (chosenOption) {
    api.sendMessage(chosenOption.message.replace('{years}', tuvi), event.threadID, () => {
      Currencies.increaseMoney(event.userID, tuvi);
    });
  } else {
    api.sendMessage(`Cơ duyên không có trong danh sách`, event.threadID);
  }
};

module.exports.handleReply = async ({ api, event, handleReply, Users, Currencies }) => {
  if (event.senderID !== handleReply.author) return;

  const { options } = handleReply;
  const chosenOption = options[parseInt(event.body) - 1];
  const tuvi = random(10000, 9999999);

  if (chosenOption) {
    api.sendMessage(chosenOption.message.replace('{years}', tuvi), event.threadID, () => {
      Currencies.increaseMoney(event.senderID, tuvi);
    });
  } else {
    api.sendMessage(`Cơ duyên không có trong danh sách`, event.threadID);
  }
};
