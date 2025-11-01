const fs = require('fs-extra');
const path = require('path');
const ratingsFilePath = path.resolve(__dirname, 'ratings.json');
const usersFilePath = path.resolve(__dirname, 'users.json');

module.exports.config = {
    name: "danhgia",
    version: "1.0.6",
    hasPermssion: 0,
    credits: "Dũngkon",
    description: "Đánh giá chất lượng bot và kiểm tra điểm số.",
    commandCategory: "Tiện ích",
    usages: "[feedback|check]",
    cooldowns: 5
};

// Đọc đánh giá từ file
async function getRatings() {
    try {
        const data = await fs.readFile(ratingsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Lưu đánh giá vào file
async function saveRatings(ratings) {
    await fs.writeFile(ratingsFilePath, JSON.stringify(ratings, null, 2));
}

// Đọc thông tin người dùng từ file
async function getUsers() {
    try {
        const data = await fs.readFile(usersFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Lưu thông tin người dùng vào file
async function saveUsers(users) {
    await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, senderID } = event;
    const command = args[0] ? args[0].toLowerCase() : '';
    const ratings = await getRatings();
    const users = await getUsers();

    if (command === 'feedback') {
        if (users[senderID]) {
            return api.sendMessage("❌ Bạn đã đánh giá rồi. Bạn chỉ có thể đánh giá một lần.", threadID);
        }

        // Yêu cầu người dùng cung cấp số sao và ghi chú
        return api.sendMessage({
            body: "✨ Đánh giá bot: Vui lòng reply tin nhắn này với số sao từ 1 đến 10 và để lại lời nhắn của bạn (ví dụ: 5 - Đây là ghi chú).",
        }, threadID, (err, info) => {
            if (err) return console.error(err);

            global.client.handleReply.push({
                type: 'danhgia',
                name: this.config.name,
                messageID: info.messageID,
                author: senderID
            });
        });
    }

    if (command === 'check') {
        // Kiểm tra điểm số và tổng hợp đánh giá
        const ratings = await getRatings(); // Đảm bảo lấy ratings mới nhất
        const totalRatings = ratings.length;
        const totalStars = ratings.reduce((sum, rating) => sum + rating.stars, 0);
        const averageRating = totalRatings > 0 ? totalStars / totalRatings : 0;

        const result = `📊 Tổng số lượt đánh giá chất lượng bot: ${totalRatings}\n` +
                        `⭐ Tổng số sao: ${totalStars}\n` +
                        `⭐ Điểm trung bình: ${averageRating.toFixed(2)}\n` +
                        `Ghi chú:\n${totalRatings > 0 ? ratings.map(r => `⭐ ${r.stars} Sao - ${r.feedback}`).join('\n') : 'Chưa có đánh giá nào.'}`;

        return api.sendMessage(result, threadID);
    }

    return api.sendMessage("❌ Lệnh không hợp lệ. Sử dụng `[feedback|check]` để đánh giá hoặc kiểm tra.", threadID);
};

module.exports.handleReply = async function({ api, event, handleReply }) {
    const { body, threadID, senderID, messageID } = event;

    if (senderID !== handleReply.author) return;

    // Phân tích số sao và ghi chú từ tin nhắn
    const [stars, ...feedbackParts] = body.split('-').map(part => part.trim());
    const parsedStars = parseInt(stars);
    const feedback = feedbackParts.join('-').trim();

    if (isNaN(parsedStars) || parsedStars < 1 || parsedStars > 10) {
        return api.sendMessage(`❌ Số sao không hợp lệ. Vui lòng chọn số sao từ 1 đến 10.`, threadID, messageID);
    }

    // Lưu đánh giá và ghi chú
    const ratings = await getRatings(); // Đảm bảo lấy ratings mới nhất
    ratings.push({ stars: parsedStars, feedback: feedback });
    await saveRatings(ratings);

    // Cập nhật thông tin người dùng đã đánh giá
    const users = await getUsers();
    users[senderID] = true;
    await saveUsers(users);

    return api.sendMessage("✅ Cảm ơn bạn đã đánh giá! Đánh giá của bạn đã được ghi nhận.", threadID, () => {
        api.deleteMessage(handleReply.messageID);
        api.deleteMessage(messageID);
    });
};
