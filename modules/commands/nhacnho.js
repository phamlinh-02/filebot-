module.exports.config = {
    name: "nhacnho",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Your Name",
    description: "Hệ thống nhắc nhở cho người được tag, 3 lần kick",
    commandCategory: "Tiện ích",
    usages: "[tag/reply/unban]",
    cooldowns: 5
};

// Database lưu trữ số lần nhắc nhở
global.userReminders = {};

// Ký tự prefix của bot
const botPrefix = "/";

module.exports.run = async ({ api, event, Users, args }) => {
    const { threadID, messageID, mentions, type, messageReply } = event;

    // Kiểm tra lệnh
    const command = args[0]?.toLowerCase();

    if (command === "unban") {
        let targetID;
        if (type === "message_reply") {
            targetID = messageReply.senderID;
        } else if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
        } else {
            return api.sendMessage("Vui lòng tag hoặc reply người cần gỡ nhắc nhở", threadID, messageID);
        }

        const userInfo = await Users.getData(targetID);
        const userName = userInfo.name;

        if (!global.userReminders[targetID] || global.userReminders[targetID] === 0) {
            return api.sendMessage({
                body: `${userName} không có nhắc nhở!`,
                mentions: [{ id: targetID, tag: userName }]
            }, threadID, messageID);
        }

        global.userReminders[targetID] = 0;
        return api.sendMessage({
            body: `Đã gỡ nhắc nhở của ${userName}!`,
            mentions: [{ id: targetID, tag: userName }]
        }, threadID, messageID);
    }

    let targetID;
    if (type === "message_reply") {
        targetID = messageReply.senderID;
    } else if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
    } else {
        return api.sendMessage("Vui lòng tag hoặc reply người cần nhắc nhở", threadID, messageID);
    }

    const userInfo = await Users.getData(targetID);
    const userName = userInfo.name;

    // Khởi tạo hoặc tăng số lần nhắc nhở
    global.userReminders[targetID] = (global.userReminders[targetID] || 0) + 1;
    const remindCount = global.userReminders[targetID];

    if (remindCount >= 3) {
        global.userReminders[targetID] = 0;
        return api.sendMessage({
            body: `${userName} bị kick do nhận 3 lần nhắc nhở!`,
            mentions: [{ id: targetID, tag: userName }]
        }, threadID, () => {
            api.removeUserFromGroup(targetID, threadID);
        });
    }

    return api.sendMessage({
        body: `Nhắc nhở ${userName} lần ${remindCount}/3!`,
        mentions: [{ id: targetID, tag: userName }]
    }, threadID, messageID);
};

module.exports.handleEvent = async ({ api, event, Users }) => {
    const { threadID, senderID, body } = event;

    if (!body || senderID === api.getCurrentUserID()) return;

    // Chỉ xử lý cho người đã được kích hoạt nhắc nhở
    if (body.startsWith(botPrefix) && global.userReminders[senderID] > 0) {
        global.userReminders[senderID]++;
        const remindCount = global.userReminders[senderID];
        const userInfo = await Users.getData(senderID);
        const userName = userInfo.name;

        if (remindCount >= 3) {
            global.userReminders[senderID] = 0;
            return api.sendMessage({
                body: `${userName} bị kick do sử dụng bot lần thứ 3!`,
                mentions: [{ id: senderID, tag: userName }]
            }, threadID, () => {
                api.removeUserFromGroup(senderID, threadID);
            });
        }

        api.sendMessage({
            body: `Nhắc nhở ${userName} lần ${remindCount}/3 vì dùng lệnh bot!`,
            mentions: [{ id: senderID, tag: userName }]
        }, threadID);
    }
};