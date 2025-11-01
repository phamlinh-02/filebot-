module.exports.config = {
    name: "rule",
    version: "1.0.5",
    hasPermssion: 0,
    credits: "CatalizCS,Dgk",
    description: "Tùy biến luật cho từng group và quản lý thành viên",
    commandCategory: "Quản Trị Viên",
    usages: "[add/remove/all] [content/ID]",
    cooldowns: 5,
    dependencies: {
        "fs-extra": "",
        "path": ""
    }
}


function getCurrentDateTime() {
    const date = new Date();
    const options = { timeZone: "Asia/Ho_Chi_Minh", hour12: false };
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const time = date.toLocaleTimeString("vi-VN", options);
    return `${day}/${month}/${year} ${time}`;
}

// Hướng dẫn sử dụng
const usageInstructions = () => {
    return `🎉 Hướng dẫn sử dụng module rule 🎉\n\n` +
           `-📝 Thêm luật: \n` +
           `  \`/rule add [nội dung luật]\` - Thêm một luật mới vào nhóm.\n\n` +
           `-✒ Danh sách luật : \n` +
           `  \`/rule list\` hoặc \`/rule all\` - Hiển thị danh sách luật hiện tại của nhóm.\n\n` +
           `- 💔 Xóa luật: \n` +
           `  \`/rule remove [số thứ tự]\` - Xóa luật theo số thứ tự.\n` +
           `  \`/rule remove all\` - Xóa toàn bộ luật trong nhóm.\n\n` +
           `🔏 Lưu ý: Chỉ những người có quyền hạn mới có thể thêm hoặc xóa luật.`;
};

module.exports.onLoad = () => {
    const { existsSync, writeFileSync } = require("fs-extra");
    const { join } = require("path");
    const pathData = join(__dirname, "data", "rule.json");
    if (!existsSync(pathData)) return writeFileSync(pathData, "[]", "utf-8");
}

module.exports.run = ({ event, api, args, permssion }) => {
    const { threadID, messageID, senderID } = event;
    const { readFileSync, writeFileSync } = require("fs-extra");
    const { join } = require("path");
    const pathData = join(__dirname, "data", "rule.json");
    const content = (args.slice(1, args.length)).join(" ");
    var dataJson = JSON.parse(readFileSync(pathData, "utf-8"));
    var thisThread = dataJson.find(item => item.threadID == threadID) || { threadID, listRule: [] };

 
    const currentDateTime = getCurrentDateTime();

    api.getUserInfo(senderID, (err, result) => {
        if (err) return console.error(err);
        const userName = result[senderID].name;

        switch (args[0]) {
            case "add": {
                if (permssion == 0) return api.sendMessage("❎ Bạn không đủ quyền hạn để sử dụng thêm luật!", threadID, messageID);
                if (content.length == 0) return api.sendMessage("⚠️ Phần thông tin không được để trống", threadID, messageID);

                if (content.indexOf("\n") != -1) {
                    const contentSplit = content.split("\n");
                    for (const item of contentSplit) thisThread.listRule.push(item);
                } else {
                    thisThread.listRule.push(content);
                }

                writeFileSync(pathData, JSON.stringify(dataJson, null, 4), "utf-8");
                api.sendMessage({
                    body: `✅ Đã thêm luật mới cho nhóm thành công bởi ${userName}!\n🕒 ${currentDateTime}`,
                    mentions: [{ tag: userName, id: senderID }]
                }, threadID, messageID);
                break;
            }
            case "list":
            case "all": {
                var msg = "", index = 0;
                for (const item of thisThread.listRule) msg += `${index += 1}. ${item}\n`;
                if (msg.length == 0) return api.sendMessage("⚠️ Hiện không có luật nào để hiển thị qtv vui lòng dùng rule add để thêm luật.", threadID, messageID);
                api.sendMessage(`[ LUẬT CỦA NHÓM - CẬP NHẬT bởi ${userName} ]\n\n${msg}\n🕒 ${currentDateTime}`, threadID, messageID);
                break;
            }
            case "rm":
            case "remove":
            case "del": {
                if (!isNaN(content) && content > 0) {
                    if (permssion == 0) return api.sendMessage("❎ Bạn không đủ quyền hạn để có thể sử dụng xóa luật!", threadID, messageID);
                    if (thisThread.listRule.length == 0) return api.sendMessage("⚠️ Nhóm của bạn chưa có danh sách luật để có thể xóa!", threadID, messageID);
                    thisThread.listRule.splice(content - 1, 1);
                    api.sendMessage(`✅ Đã xóa thành công luật có số thứ tự thứ ${content} bởi ${userName}\n🕒 ${currentDateTime}`, threadID, messageID);
                    break;
                } else if (content == "all") {
                    if (permssion == 0) return api.sendMessage("❎ Bạn không đủ quyền hạn để có thể sử dụng xóa luật!", threadID, messageID);
                    if (thisThread.listRule.length == 0) return api.sendMessage("⚠️ Nhóm của bạn chưa có danh sách luật để có thể xóa!", threadID, messageID);
                    thisThread.listRule = [];
                    api.sendMessage(`✅ Đã xóa thành công toàn bộ luật của nhóm bởi ${userName}!\n🕒 ${currentDateTime}`, threadID, messageID);
                    break;
                }
            }
            default: {
                
                api.sendMessage(usageInstructions(), threadID, messageID);
                break;
            }
        }

        if (!dataJson.some(item => item.threadID == threadID)) dataJson.push(thisThread);
        return writeFileSync(pathData, JSON.stringify(dataJson, null, 4), "utf-8");
    });
}

module.exports.handleEvent = ({ event, api }) => {
    
    if (event.logMessageType === "log:subscribe") {
        const newMemberID = event.logMessageData.addedParticipants[0].userFbId;
        const newMemberName = event.logMessageData.addedParticipants[0].fullName;
        const { readFileSync } = require("fs-extra");
        const { join } = require("path");
        const pathData = join(__dirname, "data", "rule.json");

        const dataJson = JSON.parse(readFileSync(pathData, "utf-8"));
        const thisThread = dataJson.find(item => item.threadID == event.threadID) || { listRule: [] };

       
        const currentDateTime = getCurrentDateTime();

        
        let msg = `[ LUẬT CỦA NHÓM ]\n`;
        if (thisThread.listRule.length > 0) {
            thisThread.listRule.forEach((rule, index) => {
                msg += `${index + 1}. ${rule}\n`;
            });
        } else {
            msg += "Hiện tại chưa có luật nào trong nhóm.";
        }

        
        api.sendMessage({
            body: `${msg}\n🕒 ${currentDateTime}`,
            mentions: [{ tag: newMemberName, id: newMemberID }]
        }, event.threadID);
    }
};