module.exports.config = {
    name: 'vd',
    version: '1.0.0',
    credits: 'Vtan',
    hasPermission: 0,
    description: 'Gửi video ngẫu nhiên theo chủ đề (gai, trai, anime, cosplay).',
    commandCategory: 'Tiện ích',
    usages: '[gai | trai | anime |cosplay]',
    cooldowns: 3,
};

module.exports.run = async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const type = args[0]?.toLowerCase();

    // Nếu không có đối số, gửi tin nhắn hướng dẫn
    if (!type) {
        const helpMessage = `👉 Bạn chưa chọn chủ đề.\nVui lòng sử dụng lệnh theo cú pháp:\n\n💅 vd gai\n✨ vd trai\n🎬 vd anime\n💃 vd cosplay\n😔 vdsad`;
        return api.sendMessage(helpMessage, threadID, messageID);
    }

    let videoQueue;
    let messageBody;

    // Chọn "kho" video và nội dung tin nhắn dựa trên đối số
    switch (type) {
        case 'gai':
            videoQueue = global.vdgai;
            messageBody = '🌸 Video gái xinh của bạn đây 🌸';
            break;
        case 'trai':
            videoQueue = global.vdtrai;
            messageBody = '✨ Video trai đẹp của bạn đây ✨';
            break;
        case 'anime':
            videoQueue = global.vdanime;
            messageBody = '🎬 Video anime của bạn đây 🎬';
            break;
             case 'cosplay':
            videoQueue = global.vdcosplay;
            messageBody = '💃 video cosplay của bạn đây 💃';
            break;
       case'sad':
            videoQueue = global.vdsad;
            messageBody = '😔 video suy của bạn đây 😔';
            break;
        default:
            // Nếu đối số không hợp lệ, cũng gửi tin nhắn hướng dẫn
            return api.sendMessage(`🚫 Chủ đề "${type}" không tồn tại. Vui lòng chọn một trong các chủ đề sau: gai, trai,sad, anime, cosplay`, threadID, messageID);
    }

    try {
        // Kiểm tra xem "kho" được chọn có video nào không
        if (!videoQueue || videoQueue.length === 0) {
            return api.sendMessage(
                `⏳ Kho video cho chủ đề "${type}" đang được làm đầy, vui lòng thử lại sau giây lát.\n(Admin cần bật worker bằng lệnh "global")`,
                threadID,
                messageID
            );
        }

        // Lấy một video ra khỏi "kho"
        const videoAttachment = videoQueue.shift();

        // Gửi đi ngay lập tức
        return api.sendMessage({
            body: messageBody,
            attachment: [videoAttachment] // Gửi attachment trong một mảng
        }, threadID, messageID);

    } catch (error) {
        console.error(`Lỗi trong lệnh vd (sender) với type ${type}:`, error);
        return api.sendMessage("❎ Có lỗi xảy ra, vui lòng thử lại sau!", threadID, messageID);
    }
};