module.exports.config = {
    name: "buff",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "...",
    description: "Hiển thị bảng giá tương tác mạng xã hội",
    commandCategory: "Tiện ích",
    usages: "buff",
 usePrefix: false,
    cooldowns: 5
};

module.exports.run = async function({ api, event }) {
    const priceList = `✨ BẢNG GIÁ DỊCH VỤ TĂNG TƯƠNG TÁC MẠNG XÃ HỘI ✨\n\n⚡Uy Tín - Nhanh Chóng - Ổn Định\n\n━━━━━━━━━━━━━━━━━━\n🎯 FACEBOOK\n❤️ 1K Like bài viết: 20K\n👥 1K Follow cá nhân: 40K\n📢 1K Follow Page: 50K\n👍 1K Like Page: 40K\n👀 1K View video/story: 10K\n🔁 1K Share ảo bài viết: 5K\n   (Chỉ chạy ảnh/bài viết, không chạy video)\n🤝 1K Bạn bè: 100K\n💬 10 Bình luận: 10K\n━━━━━━━━━━━━━━━━━━\n🎶 TIKTOK\n👀 1K View video: 5K\n❤️ 1K Tim video: 10K\n👥 1K Follow: 40K\n━━━━━━━━━━━━━━━━━━\n📸 INSTAGRAM\n❤️ 1K Like bài viết (đa quốc gia): 10K\n👥 1K Follow: 30K\n━━━━━━━━━━━━━━━━━━\n🧵 THREADS\n❤️ 1K Like: 48K\n👥 1K Follow: 62K\n━━━━━━━━━━━━━━━━━━\n📌 Cam kết: Nhanh – Uy tín – Giá tốt\n📥 Inbox ngay để được tư vấn chi tiết nhé!\n\n🌐 Facebook: Dang Danh\n📱 Zalo: 0977479851 
`; // Đã bỏ ** ở đây

    return api.sendMessage(priceList, event.threadID, event.messageID);
};