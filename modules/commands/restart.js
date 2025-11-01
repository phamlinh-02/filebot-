const fs = require("fs");
module.exports.config = {
    name: "khoidong",
    version: "1.0.1",
    hasPermssion: 3,
    credits: "Mirai Team & Grok",
    description: "Khởi động lại bot và thông báo thời gian khởi động.",
    commandCategory: "Admin",
    usePrefix: false,
    cooldowns: 0
};

module.exports.run = ({ event, api }) => {
    const restartTime = Date.now();
    const threadID = event.threadID;

    // Lưu thông tin restart vào file
    fs.writeFileSync("restart.json", JSON.stringify({ threadID, restartTime }));

    api.sendMessage("Tiến hành khởi động hệ thống vui lòng chờ", threadID, () => process.exit(1));
};

// Phần này cần thêm vào file khởi động chính của bot (ví dụ: main.js hoặc index.js)
module.exports.onLoad = () => {
    const fs = require("fs");
    if (fs.existsSync("restart.json")) {
        const { threadID, restartTime } = JSON.parse(fs.readFileSync("restart.json"));
        const startupTime = new Date();
        const timeDiff = Math.round((startupTime - restartTime) / 1000); // Tính thời gian khởi động (giây)
        
        global.client.api.sendMessage(
            `Bot đã khởi động lại xong! 🟢\nThời gian khởi động:${timeDiff} giây.`,
            threadID
        );

        // Xóa file restart.json sau khi gửi tin nhắn
        fs.unlinkSync("restart.json");
    }
};