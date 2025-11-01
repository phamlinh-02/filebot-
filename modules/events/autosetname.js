const { join } = require("path");
const { readFileSync } = require("fs-extra");
const moment = require("moment-timezone");

module.exports.config = {
    name: "autosetname",
    eventType: ["log:subscribe"],
    version: "1.0.4",
    credits: "D-Jukie, fixed by Grok",
    description: "Tự động đặt biệt danh cho thành viên mới"
};

module.exports.run = async function ({ api, event, Users }) {
    const { threadID, logMessageData } = event;
    if (!logMessageData.addedParticipants) return;

    const pathData = join("./modules/commands", "data", "autosetname.json");
    if (!readFileSync(pathData, { throws: false })) return;

    const dataJson = JSON.parse(readFileSync(pathData, "utf-8"));
    const thisThread = dataJson.find(item => item.threadID == threadID);
    if (!thisThread || thisThread.nameUser.length === 0) return;

    const nameTemplate = thisThread.nameUser[0];
    const memJoin = logMessageData.addedParticipants.map(info => info.userFbId);

    for (let idUser of memJoin) {
        try {
            const userInfo = await api.getUserInfo(idUser);
            const userName = userInfo[idUser]?.name || "Người dùng";
            const formattedTime = moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss | DD/MM/YYYY");
            const newNickname = nameTemplate
                .replace(/{name}/g, userName)
                .replace(/{time}/g, formattedTime);

            await api.changeNickname(newNickname, threadID, idUser);
            await api.sendMessage(`Đã đặt biệt danh cho ${userName} thành: ${newNickname}`, threadID);
        } catch (error) {
            await api.sendMessage(`Lỗi khi đặt biệt danh cho thành viên mới: ${error.message}`, threadID);
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Giữ độ trễ để tránh spam API
    }
}