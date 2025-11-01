module.exports.config = {
    name: 'listbox',
    version: '1.0.0',
    credits: 'ManhG',
    hasPermssion: 2,
    description: '[Ban/Unban/Remove/Addme] List thread bot đã tham gia',
    commandCategory: 'Admin',
    usages: '[số trang/all]',
    cooldowns: 5
};

module.exports.handleReply = async function({ api, event, args, Threads, handleReply }) {
    const { threadID, messageID } = event;
    if (parseInt(event.senderID) !== parseInt(handleReply.author)) return;
    const moment = require("moment-timezone");
    const time = moment.tz("Asia/Ho_Chi_minh").format("HH:MM:ss L");
    var arg = event.body.split(" ");

    switch (handleReply.type) {
        case "reply":
            {
                if (arg[0] == "ban" || arg[0] == "Ban") {
                    var nums = arg.slice(1).map(n => parseInt(n)); // Lấy danh sách số thứ tự
                    for (let num of nums) {
                        var idgr = handleReply.groupid[num - 1];
                        var groupName = handleReply.groupName[num - 1];
                        const data = (await Threads.getData(idgr)).data || {};
                        data.banned = true;
                        data.dateAdded = time;
                        await Threads.setData(idgr, { data });
                        global.data.threadBanned.set(idgr, { dateAdded: data.dateAdded });
                        api.sendMessage(`Nhóm ${groupName} (TID: ${idgr}) đã bị ban.`, threadID);
                    }
                    api.unsendMessage(handleReply.messageID);
                }

                if (arg[0] == "unban" || arg[0] == "Unban") {
                    var nums = arg.slice(1).map(n => parseInt(n));
                    for (let num of nums) {
                        var idgr = handleReply.groupid[num - 1];
                        var groupName = handleReply.groupName[num - 1];
                        const data = (await Threads.getData(idgr)).data || {};
                        data.banned = false;
                        data.dateAdded = null;
                        await Threads.setData(idgr, { data });
                        global.data.threadBanned.delete(idgr);
                        api.sendMessage(`Nhóm ${groupName} (TID: ${idgr}) đã được unban.`, threadID);
                    }
                    api.unsendMessage(handleReply.messageID);
                }

                if (arg[0] == "out" || arg[0] == "Out") {
                    var nums = arg.slice(1).map(n => parseInt(n));
                    for (let num of nums) {
                        var idgr = handleReply.groupid[num - 1];
                        var groupName = handleReply.groupName[num - 1];
                        api.removeUserFromGroup(`${api.getCurrentUserID()}`, idgr);
                        api.sendMessage(`Đã rời khỏi nhóm ${groupName} (TID: ${idgr}).`, threadID);
                    }
                    api.unsendMessage(handleReply.messageID);
                }

                if (arg[0] == "Join" || arg[0] == "Join") {
                    var nums = arg.slice(1).map(n => parseInt(n));
                    var msg = "";
                    for (let num of nums) {
                        var idgr = handleReply.groupid[num - 1];
                        var groupName = handleReply.groupName[num - 1];
                        try {
                            api.addUserToGroup(parseInt(event.senderID), idgr);
                            msg += `Đã thêm bạn vào nhóm ${groupName} (TID: ${idgr})\n`;
                        } catch (error) {
                            msg += `Không thể thêm vào nhóm ${groupName} (TID: ${idgr}) do lỗi: ${error.message}\n`;
                        }
                    }
                    api.sendMessage(msg, threadID);
                    api.unsendMessage(handleReply.messageID);
                }
                break;
            }
    }
};

module.exports.run = async function({ api, event, args }) {
    const permission = ["100083174347639"];
    if (!permission.includes(event.senderID)) return api.sendMessage("Bạn không có quyền sử dụng lệnh này.", event.threadID, event.messageID);

    try {
        var inbox = await api.getThreadList(100, null, ['INBOX']);
        let list = [...inbox].filter(group => group.isSubscribed && group.isGroup);
        var listthread = [];
        
        for (var groupInfo of list) {
            const threadInfo = await api.getThreadInfo(groupInfo.threadID);
            listthread.push({
                id: groupInfo.threadID,
                name: groupInfo.name || "Chưa đặt tên",
                participants: groupInfo.participants.length,
                inviteLinkEnabled: groupInfo.inviteLinkEnabled || false, // Kiểm tra trạng thái liên kết lời mời
                messageCount: threadInfo.messageCount || 0, // Lấy tổng số tin nhắn
                inviteLink: threadInfo.inviteLink || (threadInfo.inviteLinkEnabled ? "Có liên kết lời mời" : "Không có liên kết"), // Lấy liên kết lời mời
                approvalStatus: threadInfo.approvalEnabled || false // Kiểm tra trạng thái phê duyệt
            });
        }

        listthread.sort((a, b) => b.participants - a.participants);
        
        var groupid = [];
        var groupName = [];
        var page = parseInt(args[0]) || 1;
        var limit = 10; // Giới hạn số nhóm hiển thị mỗi trang
        var msg = `====『 𝗟𝗜𝗦𝗧 𝗡𝗛𝗢́𝗠 』====\n\n`;
        var numPage = Math.ceil(listthread.length / limit);

        for (var i = limit * (page - 1); i < limit * page; i++) {
            if (i >= listthread.length) break;
            let group = listthread[i];
            msg += `${i + 1}. ${group.name}\n💌 TID: ${group.id}\n👤 Số thành viên: ${group.participants}\n🔗 Liên kết lời mời: ${group.inviteLinkEnabled ? "Bật" : "Tắt"}\n📩 Tổng số tin nhắn: ${group.messageCount}\n🔗 Liên kết: ${group.inviteLink}\n📝 Trạng thái phê duyệt: ${group.approvalStatus ? "Bật" : "Tắt"}\n\n`;
            groupid.push(group.id);
            groupName.push(group.name);
        }

        msg += `Trang ${page}/${numPage}\nDùng lệnh ${global.config.PREFIX}listbox + số trang/all\n`;

        api.sendMessage(msg + "Reply với các lệnh: Out, Ban, Unban, join + số thứ tự để thực hiện hành động.", event.threadID, (e, data) =>
            global.client.handleReply.push({
                name: this.config.name,
                author: event.senderID,
                messageID: data.messageID,
                groupid,
                groupName,
                type: 'reply'
            })
        );
    } catch (e) {
        console.log(e);
        api.sendMessage("Có lỗi xảy ra, vui lòng thử lại sau.", event.threadID);
    }
};