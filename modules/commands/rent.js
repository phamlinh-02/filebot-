const moment = require('moment-timezone');
const fs = require('fs');
const imageDownloader = require('image-downloader');
const fse = require('fs-extra');

// --- Cấu hình lệnh ---
exports.config = {
    name: 'rt',
    version: '2.0.7', // Cập nhật version để phản ánh thay đổi mới
    hasPermssion: 2, // Quyền admin bot (chỉ admin bot mới dùng được)
    credits: 'DC-Nam mod by Niiozic, updated by Grok',
    description: 'Quản lý thuê bot cho nhóm.',
    commandCategory: 'Admin',
    usages: '[add/info/del/del all/list/page/giahan/out]',
    cooldowns: 3 // Cooldown chung cho lệnh (3 giây)
};

// --- Khởi tạo data ---
const dataDir = __dirname + '/data';
const dataPath = dataDir + '/thuebot.json';
let rentData = []; // Biến lưu trữ dữ liệu thuê bot

// Tạo thư mục 'data' nếu chưa tồn tại
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// Hàm lưu dữ liệu vào file JSON
const saveData = () => fs.writeFileSync(dataPath, JSON.stringify(rentData, null, 2));

// Tải dữ liệu khi module được load
if (!fs.existsSync(dataPath)) {
    saveData(); // Tạo file rỗng nếu chưa có
} else {
    try {
        rentData = require(dataPath); // Tải dữ liệu từ file
    } catch (e) {
        console.error("Lỗi khi đọc file thuebot.json, tạo lại file rỗng.", e);
        rentData = [];
        saveData();
    }
}

// --- Hàm tiện ích ---

/**
 * Chuyển đổi định dạng ngày từ DD/MM/YYYY sang MM/DD/YYYY để Date object hiểu được.
 * @param {string} input Chuỗi ngày DD/MM/YYYY.
 * @returns {string} Chuỗi ngày MM/DD/YYYY.
 */
const formatDateForDateObject = (input = '') => {
    const split = input.split('/');
    if (split.length === 3) return `${split[1]}/${split[0]}/${split[2]}`;
    return input; // Trả về nguyên nếu không đúng định dạng
};

/**
 * Kiểm tra tính hợp lệ của một chuỗi ngày.
 * @param {string} dateStr Chuỗi ngày DD/MM/YYYY.
 * @returns {boolean} True nếu ngày không hợp lệ, False nếu hợp lệ.
 */
const isInvalidDate = dateStr => {
    const date = new Date(formatDateForDateObject(dateStr));
    return isNaN(date.getTime());
};

/**
 * Cập nhật biệt danh của bot trong nhóm để hiển thị trạng thái thuê.
 * @param {object} api Đối tượng API của bot.
 * @param {string} threadID ID của nhóm.
 * @param {string} prefix Prefix hiện tại của bot.
 * @param {string} botName Tên bot.
 * @param {string} timeEnd Ngày hết hạn (DD/MM/YYYY).
 */
async function updateNickname(api, threadID, prefix, botName, timeEnd) {
    const now = new Date();
    const endTime = new Date(formatDateForDateObject(timeEnd));
    const timeLeft = endTime.getTime() - now.getTime();

    let nickname = `『 ${prefix} 』 ⪼ ${botName}`;
    if (timeLeft > 0) {
        const endDateFormatted = moment(endTime).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
        nickname += ` | Hạn: ĐANG THUÊ (${endDateFormatted})`;
    } else {
        nickname += ` | Hạn: Hết hạn`;
    }
    try {
        await api.changeNickname(nickname, threadID, api.getCurrentUserID());
    } catch (error) {
        console.error(`Lỗi khi đổi biệt danh trong nhóm ${threadID}:`, error);
    }
}

/**
 * Tải ảnh từ URL và tạo readable stream để gửi đi.
 * @param {string} url URL của ảnh.
 * @param {string} mime Kiểu MIME của ảnh (mặc định là 'jpg').
 * @returns {Promise<fs.ReadStream|null>} Readable stream của ảnh hoặc null nếu có lỗi.
 */
async function streamURL(url, mime = 'jpg') {
    const dest = `${dataDir}/${Date.now()}.${mime}`;
    try {
        await imageDownloader.image({ url, dest });
        // Xóa file sau 1 phút để tránh đầy bộ nhớ
        setTimeout(() => fse.unlinkSync(dest), 60 * 1000, dest);
        return fse.createReadStream(dest);
    } catch (error) {
        console.error("Lỗi khi tải ảnh từ URL:", error);
        return null;
    }
}

// --- Hàm chính (run) ---
exports.run = async function (o) {
    const { api, event, Users, Threads, args } = o;
    const { threadID, messageID, senderID } = event;

    // Hàm gửi tin nhắn nhanh
    const send = (msg, callback) => api.sendMessage(msg, threadID, callback, messageID);
    
    // Lấy prefix và tên bot hiện tại
    const prefix = (global.data.threadData.get(threadID) || {}).PREFIX || global.config.PREFIX;
    const botName = global.config.BOTNAME || "BOT DongDev👾";
    
    // Tìm thông tin thuê bot của nhóm hiện tại
    const currentThreadRentInfo = rentData.find(item => item.t_id == threadID);

    // Kiểm tra các biến global cần thiết
    if (!global.data || !global.config || !global.data.userName || !global.data.threadInfo) {
        return send("Lỗi: Dữ liệu cấu hình bot hoặc dữ liệu người dùng/nhóm không được tải đầy đủ. Vui lòng kiểm tra lại cài đặt bot.");
    }

    try {
        const command = args[0] ? args[0].toLowerCase() : '';

        switch (command) {
            case 'add': {
                if (!args[1]) {
                    return send(`❎ Dùng: ${prefix}${this.config.name} add [số ngày hoặc ngày/tháng/năm] + (tùy chọn) **reply hoặc tag người thuê**.\n` +
                                `Ví dụ:\n` +
                                `- ${prefix}${this.config.name} add 30 (thuê 30 ngày cho người gửi lệnh)\n` +
                                `- ${prefix}${this.config.name} add 30 @tag (thuê 30 ngày cho người được tag)\n` +
                                `- ${prefix}${this.config.name} add 12/12/2025 @tag (ngày cụ thể cho người được tag)\n` +
                                `- ${prefix}${this.config.name} add [ID người thuê] [số ngày hoặc ngày/tháng/năm] (ít dùng, dễ sai sót).`);
                }

                let targetUID = senderID; // Mặc định là người gửi lệnh
                let timeEndArgIndex = 1;
                let timeEnd;

                // Xác định UID mục tiêu từ reply, mentions hoặc trực tiếp
                if (event.type === "message_reply") {
                    targetUID = event.messageReply.senderID;
                    timeEndArgIndex = 1;
                } else if (Object.keys(event.mentions).length > 0) {
                    targetUID = Object.keys(event.mentions)[0];
                    timeEndArgIndex = 1;
                } else if (args.length >= 3 && !isNaN(args[1])) { // Trường hợp người dùng nhập ID và ngày/số ngày trực tiếp
                    targetUID = args[1];
                    timeEndArgIndex = 2;
                }

                const timeInput = args[timeEndArgIndex];

                if (!timeInput) {
                    return send(`❎ Vui lòng cung cấp số ngày (ví dụ: 30) hoặc ngày hết hạn theo định dạng **DD/MM/YYYY**.`);
                }

                // Kiểm tra xem timeInput là số ngày hay ngày cụ thể
                if (!isNaN(timeInput)) {
                    const days = parseInt(timeInput);
                    if (days <= 0) {
                        return send(`❎ Số ngày phải là một số dương (ví dụ: 30).`);
                    }
                    timeEnd = moment.tz("Asia/Ho_Chi_Minh").add(days, 'days').format("DD/MM/YYYY");
                } else {
                    if (isInvalidDate(timeInput)) {
                        return send(`❎ Thời gian hết hạn không hợp lệ! Vui lòng nhập theo định dạng **DD/MM/YYYY** hoặc một số ngày (ví dụ: 30).`);
                    }
                    timeEnd = timeInput;
                }

                if (isNaN(targetUID) || isNaN(threadID)) {
                    return send(`❎ ID người thuê hoặc ID nhóm không hợp lệ!`);
                }

                const newRentInfo = {
                    t_id: threadID,
                    id: targetUID,
                    time_start: moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY"),
                    time_end: timeEnd,
                };

                const existingIndex = rentData.findIndex(item => item.t_id == threadID);
                if (existingIndex !== -1) {
                    rentData[existingIndex] = newRentInfo; // Cập nhật thông tin nếu nhóm đã tồn tại
                    send(`✅ Box này đã có trong danh sách. Đã **cập nhật lại thông tin thuê bot** thành công!`);
                } else {
                    rentData.push(newRentInfo); // Thêm mới nếu nhóm chưa tồn tại
                    send(`✅ Đã **thêm nhóm vào danh sách thuê bot** thành công!`);
                }

                saveData(); // Lưu dữ liệu sau khi thêm/cập nhật
                await updateNickname(api, threadID, prefix, botName, timeEnd); // Cập nhật biệt danh bot
            }
                break;

            case 'info': {
                if (!currentThreadRentInfo) {
                    return send("Box này chưa được thuê bot.");
                }

                const userInfo = await Users.getInfo(currentThreadRentInfo.id);
                const threadDetail = await Threads.getInfo(currentThreadRentInfo.t_id);

                const userName = userInfo ? userInfo.name : "Không tìm thấy";
                const threadName = threadDetail ? threadDetail.threadName : "Không tìm thấy";

                const time_diff_ms = new Date(formatDateForDateObject(currentThreadRentInfo.time_end)).getTime() - Date.now();
                const days = Math.floor(time_diff_ms / (1000 * 60 * 60 * 24));
                const hours = Math.floor((time_diff_ms / (1000 * 60 * 60)) % 24);

                let remainingTime = "";
                if (time_diff_ms < 0) {
                    remainingTime = "0 ngày 0 giờ nữa là hết hạn.";
                } else {
                    remainingTime = `${days} ngày ${hours} giờ là hết hạn.`;
                }

                const attachments = [];
                const userAvatar = await streamURL(`https://graph.facebook.com/${currentThreadRentInfo.id}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
                if (userAvatar) attachments.push(userAvatar);
                
                const threadImage = threadDetail && threadDetail.imageSrc ? await streamURL(threadDetail.imageSrc) : null;
                if (threadImage) attachments.push(threadImage);

                send({
                    body: `[ THÔNG TIN THUÊ BOT CỦA NHÓM NÀY ]\n\n` +
                          `👤 Tên người thuê: ${userName}\n` +
                          `🌐 Link Facebook: https://www.facebook.com/profile.php?id=${currentThreadRentInfo.id}\n` +
                          `🏘️ Nhóm: ${threadName}\n` +
                          `⚡ ID Nhóm: ${currentThreadRentInfo.t_id}\n` +
                          `📆 Ngày Thuê: ${currentThreadRentInfo.time_start}\n` +
                          `⏳ Hết Hạn: ${currentThreadRentInfo.time_end}\n` +
                          `📌 Thời gian: ${remainingTime}`,
                    attachment: attachments
                });
            }
                break;

            case 'del': {
                if (args[1] && args[1].toLowerCase() === 'all') {
                    if (rentData.length === 0) {
                        return send("Danh sách thuê bot hiện đang trống, không có gì để xóa.");
                    }

                    const deletedThreads = rentData.map(item => item.t_id);
                    rentData = [];
                    send(`✅ Đã **xóa toàn bộ ${deletedThreads.length} nhóm** khỏi danh sách thuê bot thành công!`);
                    saveData();
                    for (const tid of deletedThreads) {
                        await updateNickname(api, tid, prefix, botName, moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY"));
                    }
                } else {
                    if (!currentThreadRentInfo) {
                        return send("Box này hiện chưa thuê bot, không có gì để xóa.");
                    }
                    rentData = rentData.filter(item => item.t_id !== threadID);
                    send(`✅ Đã **xóa dữ liệu box này** khỏi danh sách thuê bot thành công!`);
                    saveData();
                    await updateNickname(api, threadID, prefix, botName, moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY"));
                }
            }
                break;

            case 'giahan': {
                if (!currentThreadRentInfo) {
                    return send("Box này chưa được thuê bot, không thể gia hạn. Vui lòng sử dụng lệnh add trước.");
                }

                const timeInput = args[1];
                if (!timeInput) {
                    return send(`❎ Vui lòng cung cấp số ngày (ví dụ: 30) hoặc ngày hết hạn mới theo định dạng **DD/MM/YYYY**.\n` +
                                `Ví dụ: ${prefix}${this.config.name} giahan 30 hoặc ${prefix}${this.config.name} giahan 01/01/2026`);
                }

                let newTimeEnd;
                if (!isNaN(timeInput)) {
                    const days = parseInt(timeInput);
                    if (days <= 0) {
                        return send(`❎ Số ngày phải là một số dương (ví dụ: 30).`);
                    }
                    newTimeEnd = moment(formatDateForDateObject(currentThreadRentInfo.time_end), "MM/DD/YYYY").add(days, 'days').format("DD/MM/YYYY");
                } else {
                    if (isInvalidDate(timeInput)) {
                        return send(`❎ Thời gian gia hạn không hợp lệ! Vui lòng nhập theo định dạng **DD/MM/YYYY** hoặc số ngày (ví dụ: 30).`);
                    }
                    newTimeEnd = timeInput;
                }

                currentThreadRentInfo.time_end = newTimeEnd;
                send(`✅ Đã **gia hạn nhóm** "${(global.data.threadInfo.get(threadID) || {}).threadName || "Không tìm thấy"}" đến ngày **${newTimeEnd}** thành công!`);
                saveData();
                await updateNickname(api, threadID, prefix, botName, newTimeEnd);
            }
                break;

            case 'list': {
                const itemsPerPage = 10;
                const totalPages = Math.ceil(rentData.length / itemsPerPage);
                const pageNumber = 1;
                const startIndex = (pageNumber - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const pageData = rentData.slice(startIndex, endIndex);

                if (rentData.length === 0) {
                    return send("Danh sách thuê bot hiện đang trống.");
                }

                let msgBody = `[ DANH SÁCH CÁC NHÓM THUÊ BOT - Trang ${pageNumber}/${totalPages}]\n\n`;
                if (pageData.length > 0) {
                    msgBody += pageData.map((item, i) => {
                        const listItemNumber = startIndex + i + 1;
                        const status = new Date(formatDateForDateObject(item.time_end)).getTime() > Date.now() ? 'Chưa Hết Hạn ✅' : 'Đã Hết Hạn ❎';
                        const userName = global.data.userName.get(item.id) || "Không tìm thấy";
                        const threadName = (global.data.threadInfo.get(item.t_id) || {}).threadName || "Không tìm thấy";
                        return `${listItemNumber}. ${userName}\n📝 Tình trạng: ${status}\n🌾 Nhóm: ${threadName}\nTừ: ${item.time_start}\nĐến: ${item.time_end}`;
                    }).join('\n\n');
                } else {
                    msgBody += "Không có dữ liệu ở trang này.";
                }

                msgBody += `\n\n--- Hướng dẫn tương tác ---` +
                           `\n→ **Reply (phản hồi)** theo STT để xem chi tiết` +
                           `\n→ Reply **del + STT** để xóa khỏi danh sách (ví dụ: del 1 3 5)` +
                           `\n→ Reply **out + STT** để bot thoát nhóm (ví dụ: out 2 4)` +
                           `\n→ Reply **page + STT** để xem các trang khác (ví dụ: page 2)`;

                api.sendMessage(msgBody, threadID, (err, info) => {
                    if (err) return console.error("Lỗi khi gửi danh sách:", err);
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID
                    });
                }, messageID);
            }
                break;

            case 'page': {
                const itemsPerPage = 10;
                const pageNumber = parseInt(args[1]);

                if (isNaN(pageNumber) || pageNumber < 1) {
                    return send(`Số trang không hợp lệ. Vui lòng nhập một số dương (ví dụ: ${prefix}${this.config.name} page 2).`);
                }

                const totalPages = Math.ceil(rentData.length / itemsPerPage);

                if (rentData.length === 0) {
                    return send("Danh sách thuê bot hiện đang trống.");
                }
                if (pageNumber > totalPages) {
                    return send(`Số trang **${pageNumber}** vượt quá giới hạn. Tổng số trang hiện có là **${totalPages}**.`);
                }

                const startIndex = (pageNumber - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const pageData = rentData.slice(startIndex, endIndex);

                let msgBody = `[ DANH SÁCH CÁC NHÓM THUÊ BOT - Trang ${pageNumber}/${totalPages}]\n\n`;
                if (pageData.length > 0) {
                    msgBody += pageData.map((item, i) => {
                        const listItemNumber = startIndex + i + 1;
                        const status = new Date(formatDateForDateObject(item.time_end)).getTime() > Date.now() ? 'Chưa Hết Hạn ✅' : 'Đã Hết Hạn ❎';
                        const userName = global.data.userName.get(item.id) || "Không tìm thấy";
                        const threadName = (global.data.threadInfo.get(item.t_id) || {}).threadName || "Không tìm thấy";
                        return `${listItemNumber}. ${userName}\n📝 Tình trạng: ${status}\n🌾 Nhóm: ${threadName}\nTừ: ${item.time_start}\nĐến: ${item.time_end}`;
                    }).join('\n\n');
                } else {
                    msgBody += `Không có dữ liệu ở trang ${pageNumber}.`;
                }

                msgBody += `\n\n--- Hướng dẫn tương tác ---` +
                           `\n→ **Reply (phản hồi)** theo STT để xem chi tiết` +
                           `\n→ Reply **del + STT** để xóa khỏi danh sách (ví dụ: del 1 3 5)` +
                           `\n→ Reply **out + STT** để bot thoát nhóm (ví dụ: out 2 4)` +
                           `\n→ Reply **page + STT** để xem các trang khác (ví dụ: page 2)`;

                api.sendMessage(msgBody, threadID, (err, info) => {
                    if (err) return console.error("Lỗi khi gửi trang danh sách:", err);
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID
                    });
                }, messageID);
            }
                break;

            default:
                send(`✨ **Hướng dẫn sử dụng lệnh ${prefix}${this.config.name}:**\n` +
                    `\n1. **${prefix}${this.config.name} list**: Xem danh sách các nhóm đang thuê bot (trang đầu tiên).\n` +
                    `\n2. **${prefix}${this.config.name} page [số trang]**: Xem danh sách theo số trang cụ thể (ví dụ: ${prefix}${this.config.name} page 2).\n` +
                    `\n3. **${prefix}${this.config.name} add [số ngày hoặc ngày/tháng/năm] + (tùy chọn) reply/tag người thuê**: Thêm/cập nhật thông tin thuê bot.\n` +
                    `   - Ví dụ: ${prefix}${this.config.name} add 30 (thuê 30 ngày cho người gửi)\n` +
                    `   - ${prefix}${this.config.name} add 30 @tag (thuê 30 ngày cho người được tag)\n` +
                    `   - ${prefix}${this.config.name} add 12/12/2025 @tag (ngày cụ thể).\n` +
                    `\n4. **${prefix}${this.config.name} del**: Xóa thông tin thuê bot của nhóm hiện tại.\n` +
                    `\n5. **${prefix}${this.config.name} del all**: Xóa toàn bộ danh sách các nhóm thuê bot.\n` +
                    `\n6. **${prefix}${this.config.name} info**: Xem thông tin chi tiết về việc thuê bot của nhóm hiện tại.\n` +
                    `\n7. **${prefix}${this.config.name} giahan [số ngày hoặc ngày/tháng/năm]**: Gia hạn thời gian thuê bot cho nhóm hiện tại, số ngày sẽ cộng vào ngày hết hạn cũ (ví dụ: ${prefix}${this.config.name} giahan 30 hoặc ${prefix}${this.config.name} giahan 01/01/2026).`);
                break;
        }
    } catch (e) {
        console.error("Lỗi trong hàm run của lệnh rt:", e);
        send("Đã xảy ra lỗi không mong muốn trong quá trình xử lý lệnh. Vui lòng thử lại sau.");
    }
};

// --- Hàm xử lý phản hồi (handleReply) ---
exports.handleReply = async function (o) {
    const { api, event, Users, Threads } = o;
    const { threadID, messageID, senderID, args } = event;
    const handleReplyData = o.handleReply;

    const send = (msg, callback) => api.sendMessage(msg, threadID, callback, messageID);
    const prefix = (global.data.threadData.get(threadID) || {}).PREFIX || global.config.PREFIX;
    const botName = global.config.BOTNAME || "BOT DongDev👾";

    // Đảm bảo chỉ người gửi lệnh ban đầu mới được tương tác với phản hồi này
    if (senderID !== handleReplyData.author) {
        return;
    }

    // Luôn tải lại dữ liệu mới nhất từ file để đảm bảo tính đồng bộ
    try {
        rentData = require(dataPath);
    } catch (e) {
        console.error("Lỗi khi tải lại file thuebot.json trong handleReply:", e);
        return send("Lỗi: Không thể tải dữ liệu thuê bot mới nhất. Vui lòng thử lại lệnh chính.");
    }

    const commandArgs = args[0] ? args[0].toLowerCase() : '';
    const itemsPerPage = 10;

    try {
        if (!isNaN(commandArgs)) {
            const itemIndex = parseInt(commandArgs) - 1;
            const info = rentData[itemIndex];

            if (!info) {
                return send(`STT **${commandArgs}** không tồn tại trong danh sách. Vui lòng kiểm tra lại.`);
            }

            const userInfo = await Users.getInfo(info.id);
            const threadDetail = await Threads.getInfo(info.t_id);

            const userName = userInfo ? userInfo.name : "Không tìm thấy";
            const threadName = threadDetail ? threadDetail.threadName : "Không tìm thấy";

            const time_diff_ms = new Date(formatDateForDateObject(info.time_end)).getTime() - Date.now();
            const days = Math.floor(time_diff_ms / (1000 * 60 * 60 * 24));
            const hours = Math.floor((time_diff_ms / (1000 * 60 * 60)) % 24);

            let remainingTime = "";
            if (time_diff_ms < 0) {
                remainingTime = "Đã hết hạn.";
            } else {
                remainingTime = `${days} ngày ${hours} giờ là hết hạn.`;
            }

            const attachments = [];
            const userAvatar = await streamURL(`https://graph.facebook.com/${info.id}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
            if (userAvatar) attachments.push(userAvatar);
            
            const threadImage = threadDetail && threadDetail.imageSrc ? await streamURL(threadDetail.imageSrc) : null;
            if (threadImage) attachments.push(threadImage);

            return send({
                body: `[ THÔNG TIN THUÊ BOT ]\n\n` +
                      `👤 Tên người thuê: ${userName}\n` +
                      `🌐 Link Facebook: https://www.facebook.com/profile.php?id=${info.id}\n` +
                      `🏘️ Nhóm: ${threadName}\n` +
                      `⚡ ID Nhóm: ${info.t_id}\n` +
                      `📆 Ngày Thuê: ${info.time_start}\n` +
                      `⏳ Hết Hạn: ${info.time_end}\n` +
                      `📌 Còn: ${remainingTime}`,
                attachment: attachments
            });
        } else if (commandArgs === 'del') {
            const sttToDelete = args.slice(1).map(Number).filter(n => !isNaN(n) && n > 0);

            if (sttToDelete.length === 0) {
                return send(`Vui lòng cung cấp **STT** của nhóm muốn xóa (ví dụ: del 1 hoặc del 1 2 3).`);
            }

            const deletedThreads = [];
            let deletedCount = 0;
            sttToDelete.sort((a, b) => b - a);

            for (const stt of sttToDelete) {
                const index = stt - 1;
                if (index < 0 || index >= rentData.length) {
                    send(`STT **${stt}** không hợp lệ hoặc không tồn tại.`);
                    continue;
                }
                const tidToDelete = rentData[index].t_id;
                deletedThreads.push(tidToDelete);
                rentData.splice(index, 1);
                deletedCount++;
            }
            
            if (deletedCount > 0) {
                send(`✅ Đã **xóa ${deletedCount} box** khỏi danh sách thuê bot thành công!`);
                saveData();
                for (const tid of deletedThreads) {
                    await updateNickname(api, tid, prefix, botName, moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY"));
                }
            } else {
                send("Không có nhóm nào được xóa.");
            }
        } else if (commandArgs === 'out') {
            const sttToOut = args.slice(1).map(Number).filter(n => !isNaN(n) && n > 0);

            if (sttToOut.length === 0) {
                return send(`Vui lòng cung cấp **STT** của nhóm muốn bot thoát (ví dụ: out 1 hoặc out 1 2 3).`);
            }

            const exitedThreads = [];
            let exitedCount = 0;
            sttToOut.sort((a, b) => b - a);

            for (const stt of sttToOut) {
                const index = stt - 1;
                if (index < 0 || index >= rentData.length) {
                    send(`STT **${stt}** không hợp lệ hoặc không tồn tại.`);
                    continue;
                }
                const threadIdToExit = rentData[index].t_id;
                try {
                    await api.removeUserFromGroup(api.getCurrentUserID(), threadIdToExit);
                    exitedThreads.push(threadIdToExit);
                    rentData.splice(index, 1);
                    exitedCount++;
                } catch (error) {
                    console.error(`Lỗi khi thoát nhóm ${threadIdToExit}:`, error);
                    send(`❌ Không thể thoát khỏi nhóm có ID ${threadIdToExit}. Có thể bot không đủ quyền.`);
                }
            }

            if (exitedCount > 0) {
                send(`✅ Đã **thoát ${exitedCount} nhóm** theo yêu cầu và xóa khỏi danh sách thuê bot!`);
                saveData();
                for (const tid of exitedThreads) {
                    await updateNickname(api, tid, prefix, botName, moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY"));
                }
            } else {
                send("Không có nhóm nào để thoát hoặc STT không hợp lệ.");
            }
        } else if (commandArgs === 'page') {
            const pageNumber = parseInt(args[1]);

            if (isNaN(pageNumber) || pageNumber < 1) {
                return send(`Số trang không hợp lệ. Vui lòng nhập một số dương (ví dụ: page 2).`);
            }

            const totalPages = Math.ceil(rentData.length / itemsPerPage);

            if (rentData.length === 0) {
                return send("Danh sách thuê bot hiện đang trống.");
            }
            if (pageNumber > totalPages) {
                return send(`Số trang **${pageNumber}** vượt quá giới hạn. Tổng số trang hiện có là **${totalPages}**.`);
            }

            const startIndex = (pageNumber - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageData = rentData.slice(startIndex, endIndex);

            let msgBody = `[ DANH SÁCH CÁC NHÓM THUÊ BOT - Trang ${pageNumber}/${totalPages}]\n\n`;
            if (pageData.length > 0) {
                msgBody += pageData.map((item, i) => {
                    const listItemNumber = startIndex + i + 1;
                    const status = new Date(formatDateForDateObject(item.time_end)).getTime() > Date.now() ? 'Chưa Hết Hạn ✅' : 'Đã Hết Hạn ❎';
                    const userName = global.data.userName.get(item.id) || "Không tìm thấy";
                    const threadName = (global.data.threadInfo.get(item.t_id) || {}).threadName || "Không tìm thấy";
                    return `${listItemNumber}. ${userName}\n📝 Tình trạng: ${status}\n🌾 Nhóm: ${threadName}\nTừ: ${item.time_start}\nĐến: ${item.time_end}`;
                }).join('\n\n');
            } else {
                msgBody += `Không có dữ liệu ở trang ${pageNumber}.`;
            }

            msgBody += `\n\n--- Hướng dẫn tương tác ---` +
                       `\n→ **Reply (phản hồi)** theo STT để xem chi tiết` +
                       `\n→ Reply **del + STT** để xóa khỏi danh sách (ví dụ: del 1 3 5)` +
                       `\n→ Reply **out + STT** để bot thoát nhóm (ví dụ: out 2 4)` +
                       `\n→ Reply **page + STT** để xem các trang khác (ví dụ: page 2)`;

            api.sendMessage(msgBody, threadID, (err, info) => {
                if (err) return console.error("Lỗi khi gửi trang danh sách phản hồi:", err);
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID
                });
            }, messageID);
        } else {
            send(`❎ Phản hồi không hợp lệ. Vui lòng sử dụng:\n` +
                 `→ Số STT để xem chi tiết (ví dụ: 1)\n` +
                 `→ **del + STT** để xóa (ví dụ: del 1 3 5)\n` +
                 `→ **out + STT** để bot thoát nhóm (ví dụ: out 2 4)\n` +
                 `→ **page + STT** để xem trang khác (ví dụ: page 2)`);
        }
    } catch (e) {
        console.error("Lỗi trong hàm handleReply của lệnh rt:", e);
        send("Đã xảy ra lỗi không mong muốn khi xử lý phản hồi. Vui lòng thử lại sau.");
    }
};