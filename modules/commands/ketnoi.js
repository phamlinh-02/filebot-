const moment = require("moment-timezone");
const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports.config = {
    name: "ketnoi",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Dũngkon",
    description: "Kết nối nhiều nhóm chat với nhau qua bot, hỗ trợ gửi file/ảnh/âm thanh, phân trang danh sách nhóm",
    commandCategory: "Tiện ích",
    usages: "ketnoi",
    cooldowns: 10
};

const ketNoiData = new Map();
const ketNoiRooms = new Map();

async function downloadAttachment(url, ext) {
    const fileName = `${Date.now()}_${Math.floor(Math.random()*9999)}.${ext}`;
    const filePath = path.join(__dirname, "cache", fileName);
    const res = await axios.get(url, { responseType: "arraybuffer" });
    await fs.writeFile(filePath, res.data);
    return filePath;
}

function renderGroupList(groupThreads) {
    let msg = `🌐 Danh sách nhóm có thể kết nối:\n`;
    for (let i = 0; i < groupThreads.length; i++) {
        const g = groupThreads[i];
        msg += ` ${i + 1}. ${g.name || "Không tên"}\n`;
    }
    msg += "\n👉 Reply số hoặc nhiều số (cách nhau bởi dấu cách) để chọn nhiều nhóm muốn kết nối.";
    return msg;
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, senderID } = event;

    if (args[0] && args[0].toLowerCase() === "ketthuc") {
        for (const [roomID, room] of ketNoiRooms.entries()) {
            if (room.members.includes(threadID)) {
                for (const tid of room.members) {
                    ketNoiData.delete(tid);
                    api.sendMessage("🔌 Kết nối liên nhóm đã được kết thúc!", tid);
                }
                ketNoiRooms.delete(roomID);
                return;
            }
        }
        api.sendMessage("❌ Nhóm này không có kết nối nào đang hoạt động!", threadID);
        return;
    }

    let groupThreads = [];
    let allThreadID = global.data.allThreadID || [];
    for (const tid of allThreadID) {
        if (tid == threadID) continue;
        try {
            const info = await api.getThreadInfo(tid);
            if (!info || !info.threadName) continue;
            groupThreads.push({
                name: info.threadName,
                threadID: tid
            });
        } catch (e) {
            continue;
        }
    }

    if (groupThreads.length === 0)
        return api.sendMessage("❌ Bot không còn nhóm nào khác để kết nối!", threadID);

    ketNoiData.set(threadID, {
        step: "choose_group",
        groupThreads,
        requester: senderID
    });

    const msg = renderGroupList(groupThreads);

    return api.sendMessage(msg, threadID, (err, info) => {
        ketNoiData.get(threadID).messageID = info.messageID;
        global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID,
            type: "choose_group"
        });
    });
};

module.exports.handleReply = async function({ api, event, handleReply }) {
    const { threadID, senderID, body, messageID, attachments } = event;
    const data = ketNoiData.get(threadID);

    if (!data) return;

    if (data.step === "choose_group") {
        if (senderID !== handleReply.author) return;
        const groupThreads = data.groupThreads;

        const nums = body.split(/\s+/).map(x => parseInt(x)).filter(x => !isNaN(x));
        const validNums = nums.filter(num => num >= 1 && num <= groupThreads.length);
        if (validNums.length === 0)
            return api.sendMessage("❌ Số không hợp lệ!", threadID, messageID);

        const selectedGroups = validNums.map(num => groupThreads[num - 1]);

        const roomID = `${Date.now()}_${Math.floor(Math.random()*9999)}`;
        const allThreadIDs = [threadID, ...selectedGroups.map(g => g.threadID)];
        const groupNames = [ (await api.getThreadInfo(threadID)).threadName, ...selectedGroups.map(g => g.name) ];
        ketNoiRooms.set(roomID, {
            members: [threadID],
            waiting: selectedGroups.map(g => g.threadID),
            all: allThreadIDs,
            groupNames
        });
        ketNoiData.set(threadID, { step: "wait_accept_multi", roomID });

        for (const g of selectedGroups) {
            ketNoiData.set(g.threadID, { step: "wait_accept_multi", roomID });
            api.sendMessage(
                `🔔 Nhóm "${groupNames[0]}" muốn kết nối trò chuyện liên nhóm với nhóm bạn và các nhóm: ${groupNames.slice(1).filter(x => x !== g.name).map(x => `"${x}"`).join(", ")}.\nReply 'y' để đồng ý, 'n' để từ chối.`,
                g.threadID,
                (err, info) => {
                    ketNoiData.get(g.threadID).messageID = info.messageID;
                    global.client.handleReply.push({
                        name: module.exports.config.name,
                        messageID: info.messageID,
                        author: null,
                        type: "wait_accept_multi"
                    });
                }
            );
        }

        api.sendMessage(
            `Đã gửi yêu cầu kết nối tới các nhóm:\n${selectedGroups.map(g => `- ${g.name}`).join("\n")}\nChờ các nhóm đồng ý...`,
            threadID
        );
        return;
    }

    if (data.step === "wait_accept_multi" && data.roomID) {
        const room = ketNoiRooms.get(data.roomID);
        if (!room) return;
        if (!["y", "n"].includes(body.toLowerCase())) return;

        room.waiting = room.waiting.filter(tid => tid !== threadID);

        if (body.toLowerCase() === "y") {
            if (!room.members.includes(threadID)) room.members.push(threadID);
            api.sendMessage("✅ Nhóm bạn đã đồng ý kết nối!", threadID);

            if (!room.timerStarted) {
                room.timerStarted = true;

                const groupNames = room.groupNames;
                const agreedName = groupNames[room.members.length - 1] || "Một nhóm";
                const waitingNames = room.waiting.map(tid => {
                    const idx = room.all.indexOf(tid);
                    return groupNames[idx] || "Nhóm";
                });

                api.sendMessage(
                    `✅ ${agreedName} đã đồng ý kết nối.\nCòn lại: ${waitingNames.join(", ") || "không còn nhóm nào"} chưa trả lời.`,
                    room.all[0]
                );

                for (const tid of room.waiting) {
                    api.sendMessage(
                        `✅ ${agreedName} đã đồng ý kết nối.\nCòn lại: ${waitingNames.join(", ") || "không còn nhóm nào"} chưa trả lời.\nBạn còn 60 giây để trả lời, nếu không trả lời bot sẽ tự động hủy.`,
                        tid
                    );
                }

                room.timer = setTimeout(() => {
                    if (!ketNoiRooms.has(data.roomID)) return;
                    const updatedRoom = ketNoiRooms.get(data.roomID);
                    if (!updatedRoom) return;
                    const notAccepted = updatedRoom.waiting;
                    for (const tid of notAccepted) {
                        ketNoiData.delete(tid);
                        api.sendMessage("❌ Bạn đã không phản hồi, kết nối liên nhóm bị hủy cho nhóm bạn.", tid);
                    }
                    updatedRoom.waiting = [];
                    if (updatedRoom.members.length <= 1) {
                        for (const tid of updatedRoom.members) {
                            ketNoiData.delete(tid);
                            api.sendMessage("❌ Không đủ nhóm đồng ý để kết nối!", tid);
                        }
                        ketNoiRooms.delete(data.roomID);
                    } else {
                        for (const tid of updatedRoom.members) {
                            ketNoiData.set(tid, { step: "connected_multi", roomID: data.roomID });
                            api.sendMessage(
                                `✅ Đã kết nối liên nhóm!\nReply vào tin nhắn này để gửi tới các nhóm còn lại.`,
                                tid,
                                (err, info) => {
                                    ketNoiData.get(tid).messageID = info.messageID;
                                    global.client.handleReply.push({
                                        name: module.exports.config.name,
                                        messageID: info.messageID,
                                        author: null,
                                        type: "connected_multi"
                                    });
                                }
                            );
                        }
                        ketNoiRooms.set(data.roomID, updatedRoom);
                    }
                }, 60000); 
            }
        } else if (body.toLowerCase() === "n") {
            const groupNames = room.groupNames;
            const deniedIdx = room.all.indexOf(threadID);
            const deniedName = groupNames[deniedIdx] || "Một nhóm";
            const waitingNames = room.waiting.map(tid => {
                const idx = room.all.indexOf(tid);
                return groupNames[idx] || "Nhóm";
            });

            api.sendMessage("❌ Nhóm bạn đã từ chối kết nối!", threadID);

            api.sendMessage(
                `❌ ${deniedName} đã từ chối kết nối.\nCòn lại: ${waitingNames.join(", ") || "không còn nhóm nào"} chưa trả lời.`,
                room.all[0]
            );

            for (const tid of room.waiting) {
                api.sendMessage(
                    `❌ ${deniedName} đã từ chối kết nối.\nCòn lại: ${waitingNames.join(", ") || "không còn nhóm nào"} chưa trả lời.\nBạn còn 60 giây để trả lời, nếu không trả lời bot sẽ tự động hủy.`,
                    tid
                );
            }
        }

        if (room.waiting.length === 0) {
            if (room.timer) clearTimeout(room.timer);
            if (room.members.length <= 1) {
                for (const tid of room.members) {
                    ketNoiData.delete(tid);
                    api.sendMessage("❌ Không đủ nhóm đồng ý để kết nối!", tid);
                }
                ketNoiRooms.delete(data.roomID);
            } else {
                for (const tid of room.members) {
                    ketNoiData.set(tid, { step: "connected_multi", roomID: data.roomID });
                    api.sendMessage(
                        `✅ Đã kết nối liên nhóm!\nReply vào tin nhắn này để gửi tới các nhóm còn lại.`,
                        tid,
                        (err, info) => {
                            ketNoiData.get(tid).messageID = info.messageID;
                            global.client.handleReply.push({
                                name: module.exports.config.name,
                                messageID: info.messageID,
                                author: null,
                                type: "connected_multi"
                            });
                        }
                    );
                }
                ketNoiRooms.set(data.roomID, room);
            }
        } else {
            ketNoiRooms.set(data.roomID, room);
        }
        return;
    }

    if (data.step === "connected_multi" && data.roomID) {
        const room = ketNoiRooms.get(data.roomID);
        if (!room) return;
        if (event.messageReply) {
            const info = await api.getThreadInfo(threadID);
            const senderName = (await api.getUserInfo(senderID))[senderID].name;
            const now = moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
            let msg = `💬 TIN NHẮN LIÊN NHÓM 💬\n`;
            msg += `👥 Nhóm: ${info.threadName}\n👤 Người gửi: ${senderName}\n🕒 Thời gian: ${now}\n`;
            msg += `────────────────────\n${body || "[File/ảnh/âm thanh]"}`;

            let files = [];
            if (attachments && attachments.length > 0) {
                for (const att of attachments) {
                    let ext = "dat";
                    if (att.type === "photo") ext = "jpg";
                    else if (att.type === "video") ext = "mp4";
                    else if (att.type === "audio") ext = "mp3";
                    else if (att.type === "animated_image") ext = "gif";
                    else if (att.type === "file" && att.name) ext = att.name.split(".").pop();
                    try {
                        const filePath = await downloadAttachment(att.url, ext);
                        files.push(fs.createReadStream(filePath));
                    } catch (e) {}
                }
            }

            for (const tid of room.members) {
                if (tid !== threadID) {
                    api.sendMessage({
                        body: msg,
                        attachment: files.length > 0 ? files : undefined
                    }, tid, async (err, info2) => {
                        ketNoiData.get(tid).messageID = info2.messageID;
                        global.client.handleReply.push({
                            name: module.exports.config.name,
                            messageID: info2.messageID,
                            author: null,
                            type: "connected_multi"
                        });
                        if (files.length > 0) {
                            for (const f of files) {
                                try { f.close(); await fs.unlink(f.path); } catch (e) {}
                            }
                        }
                    });
                }
            }
        }
    }
};

module.exports.handleEvent = async function({ api, event }) {
    const { threadID, body } = event;
    if (!body) return;
    if (body.toLowerCase().trim() === "ketnoi ketthuc") {
        // Tìm phòng mà nhóm này đang tham gia
        for (const [roomID, room] of ketNoiRooms.entries()) {
            if (room.members.includes(threadID)) {
                for (const tid of room.members) {
                    ketNoiData.delete(tid);
                    api.sendMessage("🔌 Kết nối liên nhóm đã được kết thúc!", tid);
                }
                ketNoiRooms.delete(roomID);
                return;
            }
        }
    }
};