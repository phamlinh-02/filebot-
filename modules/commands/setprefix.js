const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "setprefix",
    version: "1.0.1",
    hasPermssion: 1,
    credits: "Mirai Team",
    description: "Đặt lại prefix của nhóm",
    commandCategory: "Tiện ích",
    usages: "[prefix/reset]",
    cooldowns: 1,
    usePrefix: true,
    images: [],
};

const prefixPath = path.resolve(__dirname, 'cache', 'threadPrefix.json');

async function savePrefixesToFile() {
    const prefixesToSave = {};
    for (const [threadID, data] of global.data.threadData.entries()) {
        if (data.PREFIX !== undefined) {
            prefixesToSave[threadID] = data.PREFIX;
        }
    }
    await fs.writeJson(prefixPath, prefixesToSave, { spaces: 4 });
}

module.exports.onLoad = async function () {
    const cacheDir = path.dirname(prefixPath);
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    let threadPrefixData = {};
    if (fs.existsSync(prefixPath)) {
        try {
            threadPrefixData = await fs.readJson(prefixPath);
        } catch (e) {
            console.error("Error reading threadPrefix.json, reinitializing:", e);
            threadPrefixData = {};
            await fs.writeJson(prefixPath, threadPrefixData, { spaces: 4 });
        }
    }

    for (const threadID in threadPrefixData) {
        let threadData = global.data.threadData.get(threadID) || {};
        threadData.PREFIX = threadPrefixData[threadID];
        global.data.threadData.set(threadID, threadData);
    }
};


module.exports.handleReaction = async function ({ api, event, Threads, handleReaction }) {
    try {
        if (event.userID != handleReaction.author) return;
        const { threadID } = event;
        var data = (await Threads.getData(String(threadID))).data || {};
        const prefix = handleReaction.PREFIX;
        data["PREFIX"] = prefix;
        await Threads.setData(threadID, { data });

        let threadData = global.data.threadData.get(String(threadID)) || {};
        threadData.PREFIX = prefix;
        global.data.threadData.set(String(threadID), threadData);
        await savePrefixesToFile();

        api.unsendMessage(handleReaction.messageID);
        api.changeNickname(`${prefix}┊${global.config.BOTNAME}`, threadID, api.getCurrentUserID());
        return api.sendMessage(
            `☑️ Đã thay đổi prefix của nhóm thành: ${prefix}`,
            threadID,
            event.messageID
        );
    } catch (e) {
        console.error("Error in handleReaction:", e);
        return api.sendMessage("Đã xảy ra lỗi khi thay đổi prefix.", event.threadID, event.messageID);
    }
};

module.exports.run = async ({ api, event, args, Threads }) => {
    if (!args[0])
        return api.sendMessage(
            `⚠️ Vui lòng nhập prefix mới để thay đổi prefix của nhóm`,
            event.threadID,
            event.messageID
        );

    const prefix = args[0].trim();
    if (prefix === "reset") {
        var data = (await Threads.getData(event.threadID)).data || {};
        data["PREFIX"] = global.config.PREFIX;
        await Threads.setData(event.threadID, { data });

        let threadData = global.data.threadData.get(String(event.threadID)) || {};
        threadData.PREFIX = global.config.PREFIX;
        global.data.threadData.set(String(event.threadID), threadData);
        await savePrefixesToFile();

        var uid = api.getCurrentUserID();
        api.changeNickname(`${global.config.PREFIX}┊${global.config.BOTNAME}`, event.threadID, uid);
        return api.sendMessage(
            `☑️ Đã reset prefix về mặc định: ${global.config.PREFIX}`,
            event.threadID,
            event.messageID
        );
    } else {
        api.sendMessage(
            `📝 Bạn đang yêu cầu set prefix mới: ${prefix}\n👉 Reaction tin nhắn này để xác nhận`,
            event.threadID,
            (error, info) => {
                global.client.handleReaction.push({
                    name: "setprefix",
                    messageID: info.messageID,
                    author: event.senderID,
                    PREFIX: prefix,
                });
            }
        );
    }
};