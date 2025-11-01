module.exports.config = {
    name: 'gái',
    version: '1.0.0',
    credits: 'DongDev',
    hasPermission: 0,
    description: 'Xem ảnh gái',
    commandCategory: 'Thư Viện',
    usages: 'gai',
    cooldowns: 10,
    images: [],
};

module.exports.run = async ({ api, event, Users, Currencies }) => {
    try {
        const { threadID } = event;
        const { decreaseMoney } = Currencies;
        const axios = require('axios');
        const name = await Users.getNameUser(event.senderID);

        var dataimg = require('./../../includes/datajson/gaivip.json');
        const img = Math.floor(Math.random() * 10) + 1;
        let image = [];
        for (let i = 0; i < img; i++) {
            const a = dataimg[Math.floor(Math.random() * dataimg.length)];
            const stream = (await axios.get(a, {
                responseType: "stream"
            })).data;
            image.push(stream);
        };
        const cost = 0;
        let money = (await Currencies.getData(event.senderID)).money;

        if (money < cost) {
            return api.sendMessage(`❎ ${name} cần ${cost}$ để xem ảnh, vui lòng thử lại sau!`, threadID, event.messageID);
        }
        decreaseMoney(event.senderID, cost);
        return api.sendMessage({ body: '', attachment: image }, threadID, event.messageID);
    } catch (error) {
        console.log(error);
        return api.sendMessage('❎ Có lỗi xảy ra trong quá trình xử lý, vui lòng thử lại sau!', threadID, event.messageID);
    }
};