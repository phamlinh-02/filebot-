const bannedUsers = {}; // Global object to store banned users
const IMMUNE_UIDS = ['100083174347639']; // Add your UID here to make it completely immune

module.exports.config = {
    name: "camchat",
    version: "1.8.0",
    hasPermssion: 1,
    credits: "ChatGPT & Modified by DuyVuong",
    description: "Cấm/hủy cấm chat với đầy đủ tính năng: UID miễn nhiễm, cấm QTV khi tag, cấm all bao gồm QTV",
    commandCategory: "Quản Trị Viên",
    usages: "[thời gian] @tag | [thời gian] all | [thời gian] qtv | huy @tag | huy all | huy qtv",
    cooldowns: 5
};

function formatRemainingTime(ms) {
    if (ms <= 0) return 'hết thời gian';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let parts = [];
    if (days > 0) parts.push(`${days} ngày`);
    if (hours > 0) parts.push(`${hours} giờ`);
    if (minutes > 0) parts.push(`${minutes} phút`);
    if (parts.length === 0 && seconds > 0) parts.push(`${seconds} giây`);

    return parts.length > 0 ? parts.join(' ') : 'ít hơn 1 phút';
}

function parseTime(input) {
    // Parse time input like 30p, 1h, 2d, etc.
    const timeUnits = {
        'p': 60 * 1000,        // phút
        'phut': 60 * 1000,     // phút
        'h': 60 * 60 * 1000,   // giờ
        'gio': 60 * 60 * 1000, // giờ
        'd': 24 * 60 * 60 * 1000, // ngày
        'ngay': 24 * 60 * 60 * 1000 // ngày
    };

    const match = input.match(/^(\d+)([a-zA-Z]+)?$/);
    if (!match) return null;

    const num = parseInt(match[1]);
    const unit = match[2] ? match[2].toLowerCase() : 'p'; // Default to minutes

    if (!timeUnits[unit]) return null;

    return {
        value: num,
        unit: unit,
        ms: num * timeUnits[unit],
        display: `${num} ${unit}`
    };
}

module.exports.run = async function({ api, event, args, Threads }) {
    const { threadID, senderID, messageID, mentions } = event;

    const threadInfo = await api.getThreadInfo(threadID);
    const botID = api.getCurrentUserID();
    const isBotAdmin = threadInfo.adminIDs.some(e => e.id == botID);
    const isUserAdmin = threadInfo.adminIDs.some(e => e.id == senderID);

    // Check permissions
    if (!isBotAdmin) return api.sendMessage("❌ Bot cần quyền QTV để thực hiện lệnh này", threadID, messageID);
    if (!isUserAdmin) return api.sendMessage("❌ Chỉ QTV mới được dùng lệnh này", threadID, messageID);

    // --- HỦY CẤM ---
    if (args[0] && (args[0].toLowerCase() === "huy" || args[0].toLowerCase() === "gỡ")) {
        // Hủy cấm all
        if (args[1] && args[1].toLowerCase() === "all") {
            if (!bannedUsers[threadID]?.ALL_MEMBERS) 
                return api.sendMessage("ℹ️ Nhóm không bị cấm chat toàn bộ", threadID, messageID);
            
            delete bannedUsers[threadID].ALL_MEMBERS;
            return api.sendMessage("✅ Đã gỡ cấm chat toàn bộ thành viên", threadID, messageID);
        }

        // Hủy cấm qtv
        if (args[1] && args[1].toLowerCase() === "qtv") {
            if (!bannedUsers[threadID]?.ADMINS) 
                return api.sendMessage("ℹ️ QTV không bị cấm chat", threadID, messageID);
            
            delete bannedUsers[threadID].ADMINS;
            return api.sendMessage("✅ Đã gỡ cấm chat cho QTV", threadID, messageID);
        }

        // Hủy cấm cá nhân
        if (Object.keys(mentions).length === 0)
            return api.sendMessage("⚠️ Vui lòng tag người cần gỡ cấm hoặc dùng 'huy all'/'huy qtv'", threadID, messageID);

        const targetID = Object.keys(mentions)[0];
        const name = mentions[targetID].replace("@", "");

        if (!bannedUsers[threadID]?.[targetID])
            return api.sendMessage(`ℹ️ ${name} không bị cấm chat`, threadID, messageID);

        delete bannedUsers[threadID][targetID];
        return api.sendMessage(`✅ Đã gỡ cấm chat cho ${name}`, threadID, messageID);
    }

    // --- XỬ LÝ LỆNH CẤM ---
    const timeInput = parseTime(args[0]);
    if (!timeInput) {
        return api.sendMessage(`📌 Cách sử dụng:
- Cấm thành viên: "camchat [thời gian] @tag" (VD: camchat 30p @A)
- Cấm toàn bộ: "camchat [thời gian] all" (VD: camchat 1h all)
- Cấm QTV: "camchat [thời gian] qtv" (VD: camchat 1d qtv)
- Gỡ cấm: "camchat huy @tag" hoặc "camchat huy all" hoặc "camchat huy qtv"`, 
        threadID, messageID);
    }

    // --- CẤM QTV ---
    if (args[1] && args[1].toLowerCase() === "qtv") {
        if (bannedUsers[threadID]?.ADMINS) {
            const remaining = bannedUsers[threadID].ADMINS.until - Date.now();
            return api.sendMessage(`⏳ QTV đang bị cấm chat, còn ${formatRemainingTime(remaining)} nữa sẽ tự động gỡ`, threadID, messageID);
        }

        if (!bannedUsers[threadID]) bannedUsers[threadID] = {};
        bannedUsers[threadID].ADMINS = { 
            until: Date.now() + timeInput.ms,
            name: "ADMINS",
            bannedBy: senderID
        };

        api.sendMessage(`⛔ Đã cấm tất cả QTV nhắn tin trong ${timeInput.display}\n🕒 Nếu vi phạm sẽ bị kick`, threadID, messageID);

        setTimeout(() => {
            if (bannedUsers[threadID]?.ADMINS) {
                delete bannedUsers[threadID].ADMINS;
                api.sendMessage(`✅ Đã hết thời gian cấm chat QTV (${timeInput.display})`, threadID);
            }
        }, timeInput.ms);
        return;
    }

    // --- CẤM TOÀN BỘ ---
    if (args[1] && args[1].toLowerCase() === "all") {
        if (bannedUsers[threadID]?.ALL_MEMBERS) {
            const remaining = bannedUsers[threadID].ALL_MEMBERS.until - Date.now();
            return api.sendMessage(`⏳ Nhóm đang bị cấm chat, còn ${formatRemainingTime(remaining)} nữa sẽ tự động gỡ`, threadID, messageID);
        }

        if (!bannedUsers[threadID]) bannedUsers[threadID] = {};
        bannedUsers[threadID].ALL_MEMBERS = { 
            until: Date.now() + timeInput.ms,
            name: "ALL_MEMBERS",
            bannedBy: senderID
        };

        api.sendMessage(`⛔ Đã cấm tất cả thành viên nhắn tin trong ${timeInput.display}\n🕒 Nếu vi phạm sẽ bị kick`, threadID, messageID);

        setTimeout(() => {
            if (bannedUsers[threadID]?.ALL_MEMBERS) {
                delete bannedUsers[threadID].ALL_MEMBERS;
                api.sendMessage(`✅ Đã hết thời gian cấm chat toàn bộ (${timeInput.display})`, threadID);
            }
        }, timeInput.ms);
        return;
    }

    // --- CẤM CÁ NHÂN ---
    if (Object.keys(mentions).length === 0) {
        return api.sendMessage("⚠️ Vui lòng tag người cần cấm hoặc dùng 'all'/'qtv'", threadID, messageID);
    }

    const targetID = Object.keys(mentions)[0];
    const name = mentions[targetID].replace("@", "");

    // Kiểm tra miễn nhiễm
    if (IMMUNE_UIDS.includes(targetID)) {
        return api.sendMessage("??", threadID, messageID);
    }

    // Không thể cấm bot
    if (targetID === botID) {
        return api.sendMessage("🤖 Không thể cấm chat bot", threadID, messageID);
    }

    // Kiểm tra nếu đã bị cấm
    if (bannedUsers[threadID]?.[targetID]) {
        const remaining = bannedUsers[threadID][targetID].until - Date.now();
        return api.sendMessage(`⏳ ${name} đang bị cấm chat, còn ${formatRemainingTime(remaining)} nữa sẽ tự động gỡ`, threadID, messageID);
    }

    // Thực hiện cấm
    if (!bannedUsers[threadID]) bannedUsers[threadID] = {};
    bannedUsers[threadID][targetID] = { 
        until: Date.now() + timeInput.ms,
        name: name
    };

    api.sendMessage(`⛔ Đã cấm ${name} nhắn tin trong ${timeInput.display}\n🕒 Nếu vi phạm sẽ bị kick`, threadID, messageID);

    setTimeout(() => {
        if (bannedUsers[threadID]?.[targetID]) {
            delete bannedUsers[threadID][targetID];
            api.sendMessage(`✅ Đã hết thời gian cấm chat của ${name} (${timeInput.display})`, threadID);
        }
    }, timeInput.ms);
};

module.exports.handleEvent = async function({ api, event }) {
    const { threadID, senderID, messageID } = event;
    const botID = api.getCurrentUserID();

    // Bỏ qua nếu là bot hoặc người dùng miễn nhiễm
    if (senderID === botID || IMMUNE_UIDS.includes(senderID)) return;

    // Lấy thông tin nhóm
    const threadInfo = await api.getThreadInfo(threadID);
    const isAdmin = threadInfo.adminIDs.some(e => e.id == senderID);

    // --- XỬ LÝ CẤM CÁ NHÂN ---
    if (bannedUsers[threadID]?.[senderID]) {
        const { until, name } = bannedUsers[threadID][senderID];
        
        if (Date.now() > until) {
            delete bannedUsers[threadID][senderID];
            return;
        }

        // Xử lý vi phạm
        api.sendMessage(`🚨 ${name} đang trong thời gian cấm chat!`, threadID);
        
        try {
            await api.removeUserFromGroup(senderID, threadID);
            api.sendMessage(`⛔ Đã kick ${name} do vi phạm lệnh cấm chat`, threadID);
        } catch (err) {
            console.error("Lỗi khi kick:", err);
            api.sendMessage(`❌ Không thể kick ${name}, vui lòng kiểm tra quyền bot`, threadID);
        }

        delete bannedUsers[threadID][senderID];
        return;
    }

    // --- XỬ LÝ CẤM QTV ---
    if (isAdmin && bannedUsers[threadID]?.ADMINS) {
        const { until } = bannedUsers[threadID].ADMINS;
        
        if (Date.now() > until) {
            delete bannedUsers[threadID].ADMINS;
            api.sendMessage("✅ Đã hết thời gian cấm chat QTV", threadID);
            return;
        }

        // Xử lý QTV vi phạm
        let adminName = "QTV";
        try {
            const userInfo = await api.getUserInfo(senderID);
            adminName = userInfo[senderID]?.name || "QTV";
        } catch (e) {
            console.error("Không lấy được tên QTV:", e);
        }

        api.sendMessage(`🚨 ${adminName} (QTV) đang trong thời gian cấm chat!`, threadID);
        
        try {
            await api.removeUserFromGroup(senderID, threadID);
            api.sendMessage(`⛔ Đã kick ${adminName} (QTV) do vi phạm lệnh cấm chat`, threadID);
        } catch (err) {
            console.error("Lỗi khi kick QTV:", err);
            api.sendMessage(`❌ Không thể kick ${adminName} (QTV), vui lòng kiểm tra quyền bot`, threadID);
        }
        return;
    }

    // --- XỬ LÝ CẤM TOÀN BỘ ---
    if (bannedUsers[threadID]?.ALL_MEMBERS) {
        const { until } = bannedUsers[threadID].ALL_MEMBERS;
        
        if (Date.now() > until) {
            delete bannedUsers[threadID].ALL_MEMBERS;
            api.sendMessage("✅ Đã hết thời gian cấm chat toàn bộ", threadID);
            return;
        }

        // Xử lý thành viên vi phạm
        let memberName = "thành viên";
        try {
            const userInfo = await api.getUserInfo(senderID);
            memberName = userInfo[senderID]?.name || "thành viên";
        } catch (e) {
            console.error("Không lấy được tên thành viên:", e);
        }

        api.sendMessage(`🚨 ${memberName} đang trong thời gian cấm chat toàn bộ!`, threadID);
        
        try {
            await api.removeUserFromGroup(senderID, threadID);
            api.sendMessage(`⛔ Đã kick ${memberName} do vi phạm lệnh cấm chat toàn bộ`, threadID);
        } catch (err) {
            console.error("Lỗi khi kick thành viên:", err);
            api.sendMessage(`❌ Không thể kick ${memberName}, vui lòng kiểm tra quyền bot`, threadID);
        }
    }
};