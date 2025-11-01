module.exports.config = {
    name: "random",
    version: "1.3.1",
    hasPermssion: 0,
    credits: "D-Jukie, fix by ChatGPT",
    description: "Chọn ngẫu nhiên một từ khóa với dấu | hoặc xuống dòng (nếu được)",
    commandCategory: "Tiện ích",
    usages: "/random a|b|c",
    cooldowns: 0
};

module.exports.run = async ({ api, event }) => {
    const { threadID, messageID, isGroup, body } = event;

    if (!isGroup) {
        return api.sendMessage('Vui lòng thực hiện lệnh này ở nhóm!', threadID, messageID);
    }

    // Lấy nội dung tin nhắn trừ prefix
    const rawText = body.replace(/^\/random\s*/i, "").trim();

    if (!rawText) {
        return api.sendMessage('Vui lòng nhập từ khóa!\nVí dụ: /random ăn|ngủ|chơi', threadID, messageID);
    }

    // Tách từ theo dấu | hoặc xuống dòng (nếu có)
    const rawKeywords = rawText.includes('|') 
        ? rawText.split('|') 
        : rawText.split(/\r?\n/);

    // Làm sạch dữ liệu
    const keywords = rawKeywords.map(k => k.trim()).filter(Boolean);

    if (keywords.length === 0) {
        return api.sendMessage('Không có từ khóa hợp lệ. Ví dụ: /random ăn|ngủ|chơi', threadID, messageID);
    }

    // Gửi thông báo quay
    await api.sendMessage('Đang quay đợi tý... 🎲 (20s)', threadID);

    // Delay 20 giây
    await new Promise(resolve => setTimeout(resolve, 20000));

    // Chọn ngẫu nhiên
    const selected = keywords[Math.floor(Math.random() * keywords.length)];

    return api.sendMessage(`Từ khóa được chọn là: • ${selected}`, threadID, messageID);
};
