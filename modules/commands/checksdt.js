const axios = require('axios');

exports.config = {
  name: 'checksdt',
  version: '1.0.0',
  hasPermssion: 0,
  credits: '',
  description: 'Kiểm tra số điện thoại',
  commandCategory: 'Tiện ích',
  usages: 'checksdt <số điện thoại>',
  cooldowns: 5
};

exports.run = async function({ api, event, args }) {
  const apiKey = '796ab2a4eac24dd8b133a9e49a9a3ecd';
  const phoneNumber = args[0];

  if (!phoneNumber) {
    api.sendMessage('Vui lòng cung cấp số điện thoại.', event.threadID, event.messageID);
    return;
  }

  const url = `https://phonevalidation.abstractapi.com/v1/?api_key=${apiKey}&phone=${phoneNumber}`;

  try {
    const response = await axios.get(url);
    const data = response.data;
    
    let resultMessage = `Thông tin số điện thoại ${phoneNumber}:\n`;
    resultMessage += `- Quốc gia: ${data.country.name}\n`;
    resultMessage += `- Nhà mạng: ${data.carrier}\n`;
    resultMessage += `- Loại điện thoại: ${data.type}\n`;

    api.sendMessage(resultMessage, event.threadID, event.messageID);
  } catch (error) {
    console.error('Error fetching phone validation data:', error);
    api.sendMessage('Có lỗi xảy ra khi kiểm tra số điện thoại. Vui lòng thử lại sau.', event.threadID, event.messageID);
  }
};
