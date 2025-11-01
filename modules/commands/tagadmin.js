const fs = require('fs');
const moment = require('moment-timezone');
const path = require('path');

module.exports.config = {
    name: "tagadmin",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "hi<@shibaSama>",
    description: "Tag Admin - Gửi thông báo về 1 box admin duy nhất",
    commandCategory: "Admin",
    usages: "[on/off/status]",
    cooldowns: 5
};

module.exports.onLoad = () => {
    const dirPath = path.join(__dirname, "cache", "data");
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path.join(dirPath, "tagadmin.json");
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({ 
            global: false,
            conversations: {} 
        }, null, 4));
    }
};

module.exports.handleReply = async function ({ api, event, handleReply, Users, Threads }) {
    const { threadID, messageID, body, senderID } = event;
    const adminBoxID = "25913166924997476";

    try {
        const allAdmin = global.config.ADMINBOT || [];
        
        switch (handleReply.type) {
            case "tagadmin": {
                if (!allAdmin.includes(senderID)) {
                    return api.sendMessage("❎ Chỉ admin mới có thể phản hồi", threadID, messageID);
                }

                let name = await Users.getNameUser(senderID);
                
                // Gửi tin nhắn thông thường thay vì reply (tránh lỗi API)
                api.sendMessage({
                    body: `[ ADMIN FEEDBACK ]\n\n💬 Nội dung: ${body}\n👤 Admin: ${name}\n⏰ Thời gian: ${moment().tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY - HH:mm:ss")}\n➤ Reply tin nhắn này để tiếp tục`,
                    mentions: [{ tag: name, id: senderID }]
                }, handleReply.originalThreadID, (error, info) => {
                    if (error) {
                        console.error("Lỗi gửi tin nhắn admin:", error);
                        return;
                    }
                    
                    // Lưu thông tin conversation
                    let dataPath = path.join(__dirname, "cache", "data", "tagadmin.json");
                    let data = JSON.parse(fs.readFileSync(dataPath));
                    
                    if (!data.conversations) data.conversations = {};
                    data.conversations[info.messageID] = {
                        type: "userreply",
                        originalMessageID: handleReply.messID,
                        author: senderID,
                        originalThreadID: handleReply.originalThreadID,
                        adminBoxID: adminBoxID,
                        timestamp: Date.now()
                    };
                    
                    fs.writeFileSync(dataPath, JSON.stringify(data, null, 4));
                    
                    global.client.handleReply.push({
                        name: this.config.name,
                        type: "userreply",
                        messageID: info.messageID,
                        originalMessageID: handleReply.messID,
                        author: senderID,
                        originalThreadID: handleReply.originalThreadID,
                        adminBoxID: adminBoxID
                    });
                });

                break;
            }
            case "userreply": {
                let name = await Users.getNameUser(senderID);
                let threadInfo = await Threads.getInfo(handleReply.originalThreadID);
                
                // Gửi tin nhắn thông thường về box admin
                api.sendMessage({
                    body: `[ USER FEEDBACK ]\n\n💬 Nội dung: ${body}\n👤 Người dùng: ${name}\n🏘️ Box: ${threadInfo.threadName || "Unknow"}\n⏰ Thời gian: ${moment().tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY - HH:mm:ss")}\n➤ Reply tin nhắn này để trả lời`,
                    mentions: [{ tag: name, id: senderID }]
                }, adminBoxID, (error, info) => {
                    if (error) {
                        console.error("Lỗi gửi tin nhắn user:", error);
                        return;
                    }
                    
                    // Lưu thông tin conversation
                    let dataPath = path.join(__dirname, "cache", "data", "tagadmin.json");
                    let data = JSON.parse(fs.readFileSync(dataPath));
                    
                    if (!data.conversations) data.conversations = {};
                    data.conversations[info.messageID] = {
                        type: "tagadmin",
                        messID: handleReply.originalMessageID,
                        author: senderID,
                        originalThreadID: handleReply.originalThreadID,
                        adminBoxID: adminBoxID,
                        timestamp: Date.now()
                    };
                    
                    fs.writeFileSync(dataPath, JSON.stringify(data, null, 4));
                    
                    global.client.handleReply.push({
                        name: this.config.name,
                        type: "tagadmin",
                        messageID: info.messageID,
                        messID: handleReply.originalMessageID,
                        author: senderID,
                        originalThreadID: handleReply.originalThreadID,
                        adminBoxID: adminBoxID
                    });
                });

                break;
            }
        }
    } catch (error) {
        console.error("Lỗi trong handleReply:", error);
    }
};

module.exports.handleEvent = async ({ api, event, Users, Threads }) => {
    const { threadID, messageID, body, mentions, senderID } = event;
    const adminBoxID = "25913166924997476";
    
    try {
        // Kiểm tra trạng thái toàn cục
        let dataPath = path.join(__dirname, "cache", "data", "tagadmin.json");
        if (!fs.existsSync(dataPath)) {
            fs.writeFileSync(dataPath, JSON.stringify({ 
                global: false,
                conversations: {} 
            }, null, 4));
        }
        
        let data = JSON.parse(fs.readFileSync(dataPath));
        if (!data.global || data.global !== true) return;
        if (!mentions) return;

        let mentionsKey = Object.keys(mentions);
        let allAdmin = global.config.ADMINBOT || [];

        for (let each of mentionsKey) {
            if (each === api.getCurrentUserID()) continue;
            
            if (allAdmin.includes(each)) {
                let userName = await Users.getNameUser(senderID);
                let threadInfo = await Threads.getInfo(threadID);
                let adminName = await Users.getNameUser(each);
                
                // Gửi thông báo về box admin
                api.sendMessage({
                    body: `🔔 TAG ADMIN NOTIFICATION\n\n👤 Người tag: ${userName}\n🏘️ Box: ${threadInfo.threadName || "Unknow"}\n💬 Nội dung: ${body}\n🎯 Admin được tag: ${adminName}\n⏰ Thời gian: ${moment().tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY - HH:mm:ss")}\n➤ Reply tin nhắn này để trả lời`,
                    mentions: [
                        { tag: userName, id: senderID },
                        { tag: adminName, id: each }
                    ]
                }, adminBoxID, (error, info) => {
                    if (error) {
                        console.error("Lỗi gửi thông báo tag:", error);
                        return;
                    }
                    
                    // Lưu thông tin conversation
                    if (!data.conversations) data.conversations = {};
                    data.conversations[info.messageID] = {
                        type: "tagadmin",
                        messID: messageID,
                        author: each,
                        originalThreadID: threadID,
                        adminBoxID: adminBoxID,
                        timestamp: Date.now()
                    };
                    
                    fs.writeFileSync(dataPath, JSON.stringify(data, null, 4));
                    
                    global.client.handleReply.push({
                        name: this.config.name,
                        type: "tagadmin",
                        messageID: info.messageID,
                        messID: messageID,
                        author: each,
                        originalThreadID: threadID,
                        adminBoxID: adminBoxID
                    });
                });

                break;
            }
        }
    } catch (error) {
        console.error("Lỗi trong handleEvent:", error);
    }
};

module.exports.run = async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    
    try {
        const allAdmin = global.config.ADMINBOT || [];
        if (!allAdmin.includes(senderID)) {
            return api.sendMessage("❎ Chỉ admin bot mới có thể sử dụng lệnh này", threadID, messageID);
        }

        let dataPath = path.join(__dirname, "cache", "data", "tagadmin.json");
        if (!fs.existsSync(dataPath)) {
            fs.writeFileSync(dataPath, JSON.stringify({ 
                global: false,
                conversations: {} 
            }, null, 4));
        }
        
        let data = JSON.parse(fs.readFileSync(dataPath));

        if (args[0] === "off") {
            data.global = false;
            api.sendMessage("✅ Đã tắt tính năng Tag Admin toàn cục", threadID, messageID);
        } else if (args[0] === "on") {
            data.global = true;
            api.sendMessage("✅ Đã bật tính năng Tag Admin toàn cục", threadID, messageID);
        } else if (args[0] === "status") {
            const status = data.global ? "🟢 ĐANG BẬT" : "🔴 ĐANG TẮT";
            api.sendMessage(`📊 Trạng thái Tag Admin: ${status}`, threadID, messageID);
        } else if (args[0] === "clean") {
            // Dọn dẹp conversations cũ
            const now = Date.now();
            let cleaned = 0;
            if (data.conversations) {
                for (let msgID in data.conversations) {
                    if (now - data.conversations[msgID].timestamp > 24 * 60 * 60 * 1000) {
                        delete data.conversations[msgID];
                        cleaned++;
                    }
                }
            }
            api.sendMessage(`✅ Đã dọn dẹp ${cleaned} conversations cũ`, threadID, messageID);
        } else {
            return api.sendMessage(`❎ Sai cú pháp! Sử dụng:\ntagadmin on - Bật toàn cục\ntagadmin off - Tắt toàn cục\ntagadmin status - Xem trạng thái\ntagadmin clean - Dọn dẹp dữ liệu cũ`, threadID, messageID);
        }

        fs.writeFileSync(dataPath, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error("Lỗi trong run:", error);
        api.sendMessage("❎ Đã xảy ra lỗi khi thực hiện lệnh", threadID, messageID);
    }
};