const alarms = new Map();
const pendingCancel = new Map();
const spamIntervals = new Map();

module.exports.config = {
    name: "baothuc",
    version: "3.2.0",
    hasPermssion: 0,
    credits: "ChatGPT",
    description: "Báo thức nhóm theo giờ hoặc phút, có thể spam nội dung, tag ẩn",
    commandCategory: "Tiện ích",
    usages: "baothuc [hh:mm|phút|all|dừng] [nội dung]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID, body, type } = event;
    const key = `${threadID}_${senderID}`;

    // Lệnh dừng spam
    if (args[0] === "dừng") {
        if (spamIntervals.has(threadID)) {
            clearInterval(spamIntervals.get(threadID));
            spamIntervals.delete(threadID);
            return api.sendMessage("🔕 Đã dừng tất cả báo thức đang spam trong nhóm này", threadID, messageID);
        }
        return api.sendMessage("🤷‍♂️ Hiện không có báo thức nào đang spam trong nhóm", threadID, messageID);
    }

    // Lệnh xem danh sách báo thức
    if (args[0] === "all") {
        if (!alarms.has(key)) alarms.set(key, []);
        const userAlarms = alarms.get(key);
        
        if (!userAlarms.length)
            return api.sendMessage("📭 Bạn chưa có báo thức nào được đặt", threadID, messageID);
        
        const list = userAlarms.map((item, i) => `${i + 1}. ${item.label}`).join("\n");
        pendingCancel.set(key, true);
        
        return api.sendMessage(`📋 Danh sách báo thức của bạn:\n${list}\n→ Reply số thứ tự để hủy`, threadID, (err, info) => {
            if (!err) pendingCancel.set(`${key}_msg`, info.messageID);
        });
    }

    // Xử lý reply hủy báo thức
    if (pendingCancel.has(key) && type === "message_reply") {
        const replyMsgID = pendingCancel.get(`${key}_msg`);
        if (event.messageReply.messageID !== replyMsgID) return;
        
        const index = parseInt(body);
        if (isNaN(index) || index < 1)
            return api.sendMessage("🔢 Vui lòng reply bằng số thứ tự trong danh sách", threadID, messageID);
        
        const userAlarms = alarms.get(key);
        if (index > userAlarms.length)
            return api.sendMessage("🔍 Không tìm thấy báo thức với số thứ tự này", threadID, messageID);
        
        const alarm = userAlarms.splice(index - 1, 1)[0];
        clearTimeout(alarm.timer);
        
        if (userAlarms.length === 0) {
            alarms.delete(key);
            pendingCancel.delete(key);
            pendingCancel.delete(`${key}_msg`);
        }
        
        return api.sendMessage(`🗑️ Đã hủy thành công:\n${alarm.label}`, threadID, messageID);
    }

    // Tạo báo thức mới
    const raw = args.join(" ");
    const timeRegex = /^(\d{1,2}:\d{2})(?:\s+(.*))?$/;
    const minuteRegex = /^(\d+)(?:\s+(.*))?$/;

    const now = new Date();
    const defaultContent = "Đã đến giờ báo thức!";
    let customContent = defaultContent;
    let targetTime = null;
    let label = null;
    let initialMessage = "";

    if (timeRegex.test(raw)) {
        const match = raw.match(timeRegex);
        const timeStr = match[1];
        customContent = match[2] ? match[2].trim() : defaultContent;

        const [h, m] = timeStr.split(":").map(Number);
        const target = new Date(now);
        target.setHours(h, m, 0, 0);

        if (target < now) target.setDate(target.getDate() + 1);
        
        targetTime = target;
        label = `🕒 Báo lúc ${timeStr} - ${customContent}`;
        initialMessage = `🕒 Bây giờ là ${timeStr} rồi!\n⏰ Nội dung: ${customContent}`;

    } else if (minuteRegex.test(raw)) {
        const match = raw.match(minuteRegex);
        const minutes = parseInt(match[1]);
        customContent = match[2] ? match[2].trim() : defaultContent;
        
        targetTime = new Date(now.getTime() + minutes * 60000);
        
        const targetHour = targetTime.getHours().toString().padStart(2, '0');
        const targetMinute = targetTime.getMinutes().toString().padStart(2, '0');
        
        label = `⏳ Sau ${minutes} phút (lúc ${targetHour}:${targetMinute}) - ${customContent}`;
        initialMessage = `⏰ Đã đếm ngược ${minutes} phút!\n📢 Nội dung: ${customContent}`;
    
    } else {
        return api.sendMessage("ℹ️ Cách dùng:\n→ baothuc hh:mm [nội dung]\n→ baothuc phút [nội dung]\n→ baothuc all (xem danh sách)\n→ baothuc dừng (tắt spam)", threadID, messageID);
    }

    const timeout = targetTime.getTime() - now.getTime();

    if (!alarms.has(key)) alarms.set(key, []);
    const userAlarms = alarms.get(key);

    const timer = setTimeout(async () => {
        const threadInfo = await api.getThreadInfo(threadID);
        const mentions = threadInfo.participantIDs.map(id => ({ id, tag: "" }));

        api.sendMessage({
            body: initialMessage,
            mentions
        }, threadID);

        const interval = setInterval(() => {
            api.sendMessage({ 
                body: `🔔 Nhắc lại: ${customContent}`,
                mentions 
            }, threadID);
        }, 10000);

        spamIntervals.set(threadID, interval);

    }, timeout);

    userAlarms.push({ timer, label });
    return api.sendMessage(
        `✅ Đã đặt báo thức thành công!\n${label}\n\n` +
        `📌 Sẽ spam 10 giây/lần\n` +
        `👉 Gõ "baothuc all" để xem danh sách\n` +
        `👉 Gõ "baothuc dừng" để tắt spam`,
        threadID,
        messageID
    );
};