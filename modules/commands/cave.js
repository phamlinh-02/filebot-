//---------Danh sách công việc-----------//
const caves = {
    '😆': {
        name: 'Phố Trần Duy Hưng 🎀',
        done: [
            '{name} vừa nhận {money}$ khi buscu anh tây Over Night',
        ]
    },
    '😁': {
        name: 'Cầu Thị Nghe 🌉',
        done: [
            '{name} vừa nhận {money}$ khi doggy cả ngày với cậu học sinh',
        ]
    },
    '❤️': {
        name: 'Hồ Hoàn Kiếm 🍄',
        done: [
            '{name} vừa nhận {money}$ khi 69 tư thế với nyc',
        ]
    },
    '👍': {
        name: 'Tịnh Thất Bồng Lai 🌴',
        done: [
            '{name} vừa nhận {money}$ khi chịch nhau với 3 ông già',
        ],
    },
    '😑': {
        name: 'Phố Tam Trinh 🐥',
        done: [
            '{name} vừa nhận {money}$ khi sóc lọ cho anh công an',
        ],
    },
    '😋': {
        name: 'Khách Sạn Y Nu 💈',
        done: [
            '{name} vừa nhận {money}$ khi quan hệ với thanh niên dính hiv',
        ],
    },
    // thêm tiếp công việc...
};

module.exports.config = {
    name: 'cave',
    version: '0.0.1',
    hasPermssion: 0,
    credits: 'DongDev mod từ code work của DC-Nam',
    description: 'Làm cave phiên bản pro vip',
    commandCategory: 'Tài Chính',
    usages: '[]',
    cooldowns: 3,
    images: [],
};

const _0 = x => x < 10 ? '0' + x : x;
const random = (min, max) => Math.random() * (max - min + 1) + min << 0;

module.exports.run = async ({ api, event, Users, Currencies }) => {
    const axios = require('axios');
    const url = 'https://i.imgur.com/yPlwlWA.jpeg';
    const img = (await axios.get(url, { responseType: "stream" })).data;
    const caveList = Object.entries(caves).map(([key, value], index) => `[ ${index + 1} | ${key} ] ${value.name}`).join('\n');
    api.sendMessage({ body: `==== [ CAVE VIP PRO ] ====\n────────────────────\n\n${caveList}\n\n📌 Hãy reply (phản hồi) or thả cảm xúc STT để chọn khu vực hành nghề`, attachment: (img) }, event.threadID, (err, res) => {
        res.name = exports.config.name;
        res.event = event;
        global.client.handleReaction.push(res);
        global.client.handleReply.push(res);
    }, event.messageID);
};

exports.handleReaction = async o => {
    const _ = o.handleReaction;
    const uid = o.event.userID;
    const user = await o.Users.getData(uid);
    if (!user) return;
    const data = user.data || {};
    const send = (msg, callback) => o.api.sendMessage(msg, o.event.threadID, callback, o.event.messageID);
    if (uid !== _.event.senderID) return;
    if (typeof data.cave !== 'undefined' && data.cave >= Date.now()) return send(`⏳ Bạn vừa phịch rồi, để tránh bị nát lồn hãy phịch sau: ${_0((data.cave - Date.now()) / 1000 / 60 << 0)} phút ${_0((data.cave - Date.now()) / 1000 % 60 << 0)} giây.`);
    const cave = caves[o.event.reaction];
    if (!cave) return send(`❎ Khu vực hành nghề không có trong danh sách`);
    data.cave = Date.now() + (1000 * 60 * 5);
    o.Users.setData(uid, user);
    const wgm = await new Promise(async resolve => send(`🔄 Đang di chuyển đến khu vực hành nghề...`, (err, res) => resolve(res || {})));
    await new Promise(out => setTimeout(out, 1000 * 3.5));
    const done = cave.done[random(0, cave.done.length - 1)];
    const money = random(20000, 100000);
    const msg = done.replace(/{name}/g, user.name).replace(/{money}/g, money);
    send(msg, () => o.api.unsendMessage(wgm.messageID));
    o.Currencies.increaseMoney(uid, money);
};

exports.handleReply = async o => {
    const _ = o.handleReply;
    const uid = o.event.senderID;
    const user = await o.Users.getData(uid);
    if (!user) return;
    const data = user.data || {};
    const send = (msg, callback) => o.api.sendMessage(msg, o.event.threadID, callback, o.event.messageID);
    if (uid !== _.event.senderID) return;
    if (typeof data.cave !== 'undefined' && data.cave >= Date.now()) return send(`⏳ Bạn vừa phịch rồi, để tránh bị nát lồn hãy phịch sau: ${_0((data.cave - Date.now()) / 1000 / 60 << 0)} phút ${_0((data.cave - Date.now()) / 1000 % 60 << 0)} giây.`);
    const caveIndex = parseInt(o.event.body) - 1;
    const cave = Object.values(caves)[caveIndex];
    if (!cave) return send(`❎ Khu vực hành nghề không có trong danh sách`);
    data.cave = Date.now() + (1000 * 60 * 5);
    o.Users.setData(uid, user);
    const wgm = await new Promise(async resolve => send(`🔄 Đang di chuyển đến khu vực hành nghề...`, (err, res) => resolve(res || {})));
    await new Promise(out => setTimeout(out, 1000 * 3.5));
    const done = cave.done[random(0, cave.done.length - 1)];
    const money = random(20000, 100000);
    const msg = done.replace(/{name}/g, user.name).replace(/{money}/g, money);
    send(msg, () => o.api.unsendMessage(wgm.messageID));
    o.Currencies.increaseMoney(uid, money);
};