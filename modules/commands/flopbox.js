module.exports.config = {
    name: "flopbox",
    version: "1.1.0",
    hasPermssion: 1,
    credits: "D-Jukie fix by NTKhang & Minh",
    description: "chỉ nên dùng khi rã box =))",
    commandCategory: "Quản Trị Viên",
    usages: "[flopbox | flopbox hủy]",
    cooldowns: 5
};

// Biến toàn cục để lưu trạng thái
global.flopbox = global.flopbox || {
    isRunning: false,
    cancelRequested: false
};

module.exports.handleReply = async function({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    const { author, confirmationMsgID } = handleReply;

    // Thu hồi tin nhắn xác nhận
    await api.unsendMessage(confirmationMsgID).catch(() => {});

    if (senderID != author) 
        return api.sendMessage("⚠️ Bạn không phải người dùng lệnh!", threadID, messageID);

    const reply = body.toLowerCase();
    
    if (['có', 'co', 'yes', 'y', 'ok'].includes(reply)) {
        if (global.flopbox.cancelRequested) {
            global.flopbox.cancelRequested = false;
            return api.sendMessage("🛑 Đã hủy lệnh flopbox trước đó!", threadID, messageID);
        }

        global.flopbox.isRunning = true;
        
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            const botID = api.getCurrentUserID();
            
            if (!threadInfo.adminIDs.some(admin => admin.id == botID)) 
                return api.sendMessage("❌ Bot đã mất quyền QTV!", threadID, messageID);

            const members = threadInfo.participantIDs.filter(id => id != botID && id != senderID);
            
            if (members.length == 0)
                return api.sendMessage("🤖 Nhóm chỉ còn bot và bạn!", threadID, messageID);

            let processingMsg = await api.sendMessage(`⚡ Đang kick ${members.length} thành viên (gõ "flopbox hủy" để dừng)...`, threadID);
            
            let successCount = 0;
            let failedCount = 0;
            
            for (const member of members) {
                if (global.flopbox.cancelRequested) break;
                
                try {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await api.removeUserFromGroup(member, threadID);
                    successCount++;
                } catch (e) {
                    failedCount++;
                    console.error("Lỗi kick thành viên:", e);
                }
            }
            
            let msg = "";
            if (global.flopbox.cancelRequested) {
                msg = `🛑 Đã dừng flopbox giữa chừng!\n`;
                msg += `• Đã kick: ${successCount}\n`;
                msg += `• Chưa xử lý: ${members.length - successCount - failedCount}`;
                global.flopbox.cancelRequested = false;
            } else {
                msg = `✅ Đã hoàn thành!\n`;
                msg += `• Thành công: ${successCount}\n`;
                if (failedCount > 0) msg += `• Thất bại: ${failedCount} (có thể là QTV)`;
            }
            
            global.flopbox.isRunning = false;
            return api.sendMessage(msg, threadID, messageID);
            
        } catch (err) {
            global.flopbox.isRunning = false;
            console.error("Lỗi chính:", err);
            return api.sendMessage("❌ Đã xảy ra lỗi nghiêm trọng!", threadID, messageID);
        }
    }
    else if (['không', 'khong', 'no', 'n'].includes(reply)) {
        return api.sendMessage("🛑 Đã hủy thao tác!", threadID, messageID);
    }
    else {
        return api.sendMessage("⚠️ Vui lòng reply 'có' hoặc 'không'!", threadID, messageID);
    }
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const botID = api.getCurrentUserID();

    // Xử lý lệnh hủy
    if (args[0]?.toLowerCase() === 'hủy' || args[0]?.toLowerCase() === 'huỷ') {
        if (global.flopbox.isRunning) {
            global.flopbox.cancelRequested = true;
            return api.sendMessage("⏳ Đang yêu cầu dừng flopbox...", threadID, messageID);
        }
        return api.sendMessage("ℹ️ Hiện không có flopbox nào đang chạy để hủy.", threadID, messageID);
    }

    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const isBotAdmin = threadInfo.adminIDs.some(admin => admin.id == botID);
        
        if (!isBotAdmin)
            return api.sendMessage("❌ Bot cần là QTV mới dùng được lệnh này!", threadID, messageID);

        const members = threadInfo.participantIDs.filter(id => id != botID && id != senderID);
        
        if (members.length === 0)
            return api.sendMessage("🤖 Nhóm chỉ còn bot và bạn, không có ai để kick!", threadID, messageID);

        const confirmationMsg = await api.sendMessage(
            `⚠️ Bạn có chắc muốn rã nhóm? (${members.length} thành viên sẽ bị kick)\n\n` +
            `Reply "có" để xác nhận hoặc "không" để hủy.\n` +
            `Chỉ người dùng lệnh mới được xác nhận.\n\n` +
            `Gõ "flopbox hủy" nếu cần dừng khi đang chạy.`,
            threadID,
            (err, info) => {
                if (err) return console.error(err);
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    confirmationMsgID: info.messageID
                });
            },
            messageID
        );

    } catch (err) {
        console.error("Lỗi khi chạy lệnh:", err);
        return api.sendMessage("❌ Đã xảy ra lỗi khi kiểm tra quyền bot!", threadID, messageID);
    }
};