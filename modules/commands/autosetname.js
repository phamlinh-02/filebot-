const { join } = require("path"); // Chỉ khai báo một lần
const { existsSync, writeFileSync, readFileSync } = require("fs-extra");
const moment = require("moment-timezone");

module.exports.config = {
    name: "autosetname",
    version: "1.0.9",
    hasPermission: 1,
    credits: "Niiozic, fixed and enhanced by Grok",
    description: "Tự động đặt biệt danh cho thành viên mới",
    commandCategory: "Quản Trị Viên",
    usages: "[add <name> /remove /check]",
    cooldowns: 5
};

module.exports.onLoad = () => {
    const pathData = join(__dirname, "data", "autosetname.json");
    if (!existsSync(pathData)) writeFileSync(pathData, "[]", "utf-8");
};

module.exports.run = async function ({ event, api, args }) {
    const { threadID, messageID, senderID } = event;
    const pathData = join(__dirname, "data", "autosetname.json"); // Đường dẫn thống nhất
    let dataJson = JSON.parse(readFileSync(pathData, "utf-8")); // Đọc file mới mỗi lần
    let thisThread = dataJson.find(item => item.threadID == threadID) || { threadID, nameUser: [] };
    const content = args.slice(1).join(" "); // Định nghĩa content

    switch (args[0]) {
        case "add": {
            if (content.length === 0) {
                return api.sendMessage("⚠️ Phần cấu hình tên thành viên mới không được bỏ trống!", threadID, messageID);
            }
            if (thisThread.nameUser.length > 0) {
                return api.sendMessage("⚠️ Vui lòng xóa cấu hình tên cũ trước khi đặt tên mới! Sử dụng /autosetname remove để xóa.", threadID, messageID);
            }
            thisThread.nameUser = [content];
            if (!dataJson.some(item => item.threadID == threadID)) {
                dataJson.push(thisThread);
            }
            try {
                const userInfo = await api.getUserInfo(senderID);
                const userName = userInfo[senderID]?.name || "Người dùng";
                writeFileSync(pathData, JSON.stringify(dataJson, null, 4), "utf-8");
                api.sendMessage(`✅ Đặt cấu hình tên thành viên mới thành công\n📝 Preview: ${
                    content
                        .replace(/{name}/g, userName)
                        .replace(/{time}/g, moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss | DD/MM/YYYY"))
                }`, threadID, messageID);
            } catch (error) {
                api.sendMessage(`❌ Lỗi khi lưu cấu hình: ${error.message}`, threadID, messageID);
            }
            break;
        }
        case "rm":
        case "remove": {
            if (thisThread.nameUser.length === 0) {
                return api.sendMessage("❎ Nhóm bạn chưa đặt cấu hình tên thành viên mới!", threadID, messageID);
            }
            thisThread.nameUser = [];
            if (!dataJson.some(item => item.threadID == threadID)) {
                dataJson.push(thisThread);
            }
            try {
                writeFileSync(pathData, JSON.stringify(dataJson, null, 4), "utf-8");
                // Làm mới dữ liệu sau khi ghi
                dataJson = JSON.parse(readFileSync(pathData, "utf-8"));
                thisThread = dataJson.find(item => item.threadID == threadID) || { threadID, nameUser: [] };
                api.sendMessage(`✅ Xóa thành công phần cấu hình tên thành viên mới`, threadID, messageID);
            } catch (error) {
                api.sendMessage(`❌ Lỗi khi xóa cấu hình: ${error.message}`, threadID, messageID);
            }
            break;
        }
        case "check": {
            if (thisThread.nameUser.length === 0) {
                return api.sendMessage("❎ Nhóm bạn chưa đặt cấu hình tên thành viên mới!", threadID, messageID);
            }
            const nameTemplate = thisThread.nameUser[0];
            const userInfo = await api.getUserInfo(senderID);
            const userName = userInfo[senderID]?.name || "Người dùng";
            api.sendMessage(`📋 Cấu hình biệt danh hiện tại: ${nameTemplate}\n📝 Preview: ${
                nameTemplate
                    .replace(/{name}/g, userName)
                    .replace(/{time}/g, moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss | DD/MM/YYYY"))
            }`, threadID, messageID);
            break;
        }
        default: {
            return api.sendMessage(`📝 Dùng:\n- autosetname add TVM {name} {time} để cấu hình biệt danh cho thành viên mới\n- autosetname remove để xóa cấu hình\n- autosetname check để xem cấu hình hiện tại\n{name} -> lấy tên người dùng\n{time} -> thời gian vào nhóm`, threadID, messageID);
        }
    }
};