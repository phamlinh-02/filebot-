module.exports.config = {
    name: "box",
    version: "2.1.3",
    hasPermssion: 0,
    credits: "không biết, fix lại Tobi, cập nhật bởi Grok",
    description: "Xem thông tin thread/user",
    commandCategory: "Tiện ích",
    usages: "[thread/user]",
    cooldowns: 5,
    images: [],
    dependencies: {
        "axios": "",
        "fs-extra": "",
        "request": "",
        "moment-timezone": ""
    }
};

const totalPath = __dirname + '/data/totalChat.json';
const _24hours = 86400000;
const fs = require("fs-extra");
const request = require("request");
const axios = require("axios");

module.exports.handleEvent = async ({ api, event }) => {
    if (!fs.existsSync(totalPath)) fs.writeFileSync(totalPath, JSON.stringify({}));
    let totalChat = JSON.parse(fs.readFileSync(totalPath));
    if (!totalChat[event.threadID]) return;
    if (Date.now() - totalChat[event.threadID].time > (_24hours * 2)) {
        let sl = (await api.getThreadInfo(event.threadID)).messageCount;
        totalChat[event.threadID] = {
            time: Date.now() - _24hours,
            count: sl,
            ytd: sl - totalChat[event.threadID].count
        };
        fs.writeFileSync(totalPath, JSON.stringify(totalChat, null, 2));
    }
};

module.exports.run = async function({ api, event, args, Users, Threads }) {
    const { threadID, messageID, senderID, type, mentions, messageReply } = event;
    const moment = require("moment-timezone");
    const gio = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss");

    if (args.length === 0) {
        return api.sendMessage(
            `[ BOX SETTINGS - Hướng Dẫn Sử Dụng ]\n───────────────\n` +
            `|› ${global.config.PREFIX}${this.config.name} qtv [@Tag] -> Thêm người được tag trở thành QTV\n` +
            `|› ${global.config.PREFIX}${this.config.name} image [Reply] -> Thay đổi ảnh box\n` +
            `|› ${global.config.PREFIX}${this.config.name} name -> Lấy tên nhóm\n` +
            `|› ${global.config.PREFIX}${this.config.name} id -> Lấy id box\n` +
            `|› ${global.config.PREFIX}${this.config.name} info -> Xem info box\n` +
            `|› ${global.config.PREFIX}${this.config.name} namebox -> Thay đổi tên box\n` +
            `|› ${global.config.PREFIX}${this.config.name} emoji -> Thay đổi emoji của box\n` +
            `|› ${global.config.PREFIX}${this.config.name} user [@tag] -> Lấy thông tin người được tag\n` +
            `|› ${global.config.PREFIX}${this.config.name} new -> Tạo nhóm với người được tag\n` +
            `|› ${global.config.PREFIX}${this.config.name} setnameall -> Đổi tên tất cả thành viên\n` +
            `|› ${global.config.PREFIX}${this.config.name} rdcolor -> Đổi màu tin nhắn nhóm\n` +
            `|› ${global.config.PREFIX}${this.config.name} setname -> Đổi tên thành viên nhóm`,
            threadID,
            messageID
        );
    }

    if (args[0] === "setname") {
        const name = args.slice(1).join(" ");
        if (event.type === "message_reply") {
            return api.changeNickname(name, threadID, messageReply.senderID);
        } else {
            const mention = Object.keys(event.mentions)[0];
            if (!mention) return api.changeNickname(name, threadID, senderID);
            return api.changeNickname(name.replace(event.mentions[mention], ""), threadID, mention);
        }
    }

    if (args[0] === "rdcolor") {
        const color = [
            '196241301102133', '169463077092846', '2442142322678320', '234137870477637',
            '980963458735625', '175615189761153', '2136751179887052', '2058653964378557',
            '2129984390566328', '174636906462322', '1928399724138152', '417639218648241',
            '930060997172551', '164535220883264', '370940413392601', '205488546921017',
            '809305022860427'
        ];
        api.changeThreadColor(color[Math.floor(Math.random() * color.length)], threadID);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return;
    }

    if (args[0] === "setnameall") {
        const threadInfo = await api.getThreadInfo(threadID);
        const idtv = threadInfo.participantIDs;
        const name = args.slice(1).join(" ");
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        for (const setname of idtv) {
            await delay(3000);
            api.changeNickname(name, threadID, setname);
        }
        return;
    }

    if (args[0] === "new") {
        const id = [senderID];
        const main = event.body;
        const groupTitle = main.slice(main.indexOf("|") + 2);
        for (let i = 0; i < Object.keys(event.mentions).length; i++) {
            id.push(Object.keys(event.mentions)[i]);
        }
        api.createNewGroup(id, groupTitle, () => {
            api.sendMessage(`[ MODE ] - Đã tạo nhóm ${groupTitle}`, threadID);
        });
        return;
    }

    if (args[0] === "id") {
        return api.sendMessage(`${threadID}`, threadID, messageID);
    }

    if (args[0] === "name") {
        const nameThread = global.data.threadInfo.get(threadID).threadName || (await Threads.getData(threadID)).threadInfo.threadName;
        return api.sendMessage(nameThread, threadID, messageID);
    }

    if (args[0] === "namebox") {
        const content = args.join(" ");
        const c = content.slice(7, 99) || messageReply?.body;
        api.setTitle(c, threadID);
        return;
    }

    if (args[0] === "emoji") {
        const name = args[1] || messageReply?.body;
        api.changeThreadEmoji(name, threadID);
        return;
    }

    if (args[0] === "me" && args[1] === "qtv") {
        const threadInfo = await api.getThreadInfo(threadID);
        const find = threadInfo.adminIDs.find(el => el.id === api.getCurrentUserID());
        if (!find) return api.sendMessage("[ MODE ] - Bot chưa được cấp QTV", threadID, messageID);
        if (!global.config.ADMINBOT.includes(senderID)) return api.sendMessage("[ MODE ] - Bạn không được phép sử dụng lệnh này", threadID, messageID);
        api.changeAdminStatus(threadID, senderID, true);
        return;
    }

    if (args[0] === "qtv") {
        let namee = args.join().includes('@') ? Object.keys(event.mentions)[0] : args[1];
        if (messageReply) namee = messageReply.senderID;
        const threadInfo = await api.getThreadInfo(threadID);
        const findd = threadInfo.adminIDs.find(el => el.id === namee);
        const find = threadInfo.adminIDs.find(el => el.id === api.getCurrentUserID());
        const finddd = threadInfo.adminIDs.find(el => el.id === senderID);
        if (!finddd) return api.sendMessage("[ MODE ] - Bạn không phải QTV nhóm", threadID, messageID);
        if (!find) return api.sendMessage("[ MODE ] - Bot chưa được cấp QTV", threadID, messageID);
        api.changeAdminStatus(threadID, namee, !findd);
        return;
    }

    if (args[0] === "image") {
        if (event.type !== "message_reply") return api.sendMessage("[ MODE ] - Bạn phải reply một audio, video, ảnh nào đó", threadID, messageID);
        if (!messageReply.attachments || messageReply.attachments.length === 0) return api.sendMessage("[ MODE ] - Bạn phải reply một audio, video, ảnh nào đó", threadID, messageID);
        if (messageReply.attachments.length > 1) return api.sendMessage("[ MODE ] - Bạn phải reply một audio, video, ảnh nào đó", threadID, messageID);
        const callback = () => api.changeGroupImage(fs.createReadStream(__dirname + "/cache/1.png"), threadID, () => fs.unlinkSync(__dirname + "/cache/1.png"));
        return request(encodeURI(messageReply.attachments[0].url)).pipe(fs.createWriteStream(__dirname + '/cache/1.png')).on('close', callback);
    }

    if (args[0] === "info") {
        try {
            if (!fs.existsSync(totalPath)) fs.writeFileSync(totalPath, JSON.stringify({}));
            let totalChat = JSON.parse(fs.readFileSync(totalPath));
            let threadInfo = await api.getThreadInfo(args[1] || threadID);
            let timeByMS = Date.now();
            let threadMem = threadInfo.participantIDs.length;
            let gendernam = [], gendernu = [], bede = [];
            for (let z in threadInfo.userInfo) {
                const gioitinhone = threadInfo.userInfo[z].gender;
                const nName = threadInfo.userInfo[z].name;
                if (gioitinhone === "MALE") gendernam.push(nName);
                else if (gioitinhone === "FEMALE") gendernu.push(nName);
                else bede.push(nName);
            }
            const adminName = [];
            for (const arrayAdmin of threadInfo.adminIDs) {
                const name = await Users.getNameUser(arrayAdmin.id);
                adminName.push(name);
            }
            const nam = gendernam.length;
            const nu = gendernu.length;
            const bedeCount = bede.length;
            const qtv = threadInfo.adminIDs.length;
            const sl = threadInfo.messageCount;
            const icon = threadInfo.emoji;
            const threadName = threadInfo.threadName;
            const id = threadInfo.threadID;
            const sex = threadInfo.approvalMode;
            const pd = sex === false ? 'tắt' : sex === true ? 'bật' : 'kh';

            if (!totalChat[args[1] || threadID]) {
                totalChat[args[1] || threadID] = {
                    time: timeByMS,
                    count: sl,
                    ytd: 0
                };
                fs.writeFileSync(totalPath, JSON.stringify(totalChat, null, 2));
            }

            let mdtt = Math.floor(Math.random() * 101);
            let preCount = totalChat[args[1] || threadID].count || 0;
            let ytd = totalChat[args[1] || threadID].ytd || 0;
            let hnay = (ytd !== 0) ? (sl - preCount) : "chưa có thống kê";
            let hqua = (ytd !== 0) ? ytd : "chưa có thống kê";
            if (timeByMS - totalChat[args[1] || threadID].time > _24hours) {
                if (timeByMS - totalChat[args[1] || threadID].time > (_24hours * 2)) {
                    totalChat[args[1] || threadID].count = sl;
                    totalChat[args[1] || threadID].time = timeByMS - _24hours;
                    totalChat[args[1] || threadID].ytd = sl - preCount;
                    fs.writeFileSync(totalPath, JSON.stringify(totalChat, null, 2));
                }
                const getHour = Math.ceil((timeByMS - totalChat[args[1] || threadID].time - _24hours) / 3600000);
                if (ytd === 0) mdtt = 100;
                else mdtt = ((((hnay) / ((hqua / 24) * getHour))) * 100).toFixed(0);
                mdtt += "%";
            }

            const messageBody = `⭐️ Box: ${threadName || "không có"}\n🎮 ID: ${id}\n📱 Phê duyệt: ${pd}\n🐰 Emoji: ${icon || "👍"}\n📌 Thông tin: ${threadMem} thành viên\nSố tv nam 🧑‍🦰: ${nam} thành viên\nSố tv nữ 👩‍🦰: ${nu} thành viên\nSố tv không xác định: ${bedeCount} thành viên\n🕵️‍♂️ QTV:\n${adminName.join('\n')}\n💬 Tổng: ${sl} tin nhắn\n📈 Mức tương tác: ${mdtt}\n🌟 Tổng tin nhắn hôm qua: ${hqua}\n🌟 Tổng tin nhắn hôm nay: ${hnay}\n⠀⠀⠀ ⠀ ⠀ 『${gio}』`;

            if (threadInfo.imageSrc) {
                return request(encodeURI(threadInfo.imageSrc))
                    .pipe(fs.createWriteStream(__dirname + '/cache/1.png'))
                    .on('close', () =>
                        api.sendMessage({
                            body: messageBody,
                            attachment: fs.createReadStream(__dirname + '/cache/1.png')
                        }, threadID, () => fs.unlinkSync(__dirname + '/cache/1.png'), messageID)
                    );
            } else {
                return api.sendMessage(messageBody, threadID, messageID);
            }
        } catch (e) {
            console.error(e);
            return api.sendMessage(`❎ Không thể lấy thông tin nhóm của bạn!\n${e}`, threadID, messageID);
        }
    }

    if (args[0] === "user") {
        try {
            let uid = type === "message_reply" ? messageReply.senderID : args.join().includes('@') ? Object.keys(mentions)[0] : senderID;
            const { profileUrl, gender, isFriend } = await api.getUserInfo(uid);
            const name = await Users.getNameUser(uid);
            const callback = () =>
                api.sendMessage({
                    body: `👤 Tên: ${name}\n🐧 UID: ${uid}\n🙆‍♀️ Trạng thái: ${isFriend ? "đã kết bạn với bot" : "chưa kết bạn với bot"}\n🦋 Giới tính: ${gender === 2 ? 'nam' : gender === 1 ? 'nữ' : 'không xác định'}\n🏝 Profile:\n${profileUrl}`,
                    attachment: fs.createReadStream(__dirname + "/cache/1.png")
                }, threadID, () => fs.unlinkSync(__dirname + "/cache/1.png"), messageID);
            return request(encodeURI(`https://graph.facebook.com/${uid}/picture?height=750&width=750&access_token=1073911769817594|aa417da57f9e260d1ac1ec4530b417de`))
                .pipe(fs.createWriteStream(__dirname + '/cache/1.png'))
                .on('close', callback);
        } catch (e) {
            console.error(e);
            return api.sendMessage(`❎ Không thể lấy thông tin người dùng!\n${e}`, threadID, messageID);
        }
    }
};