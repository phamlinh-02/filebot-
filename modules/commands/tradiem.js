const axios = require('axios');
const cheerio = require('cheerio');

module.exports.config = {
    name: "diemthi",
    version: "1.0.3",
    hasPermssion: 0,
    credits: "Your Name",
    description: "Tra cứu điểm thi tốt nghiệp THPT 2025 từ VnExpress",
    commandCategory: "Tiện ích",
    usages: "[số báo danh]",
    usePrefix: true,
    cooldowns: 5,
    dependencies: {
        "axios": "",
        "cheerio": ""
    }
};

module.exports.run = async function ({ api, event, args }) {
    // Kiểm tra xem người dùng có nhập số báo danh hay không
    if (!args[0]) {
        return api.sendMessage("⚠️ Vui lòng nhập số báo danh. Ví dụ: !diemthi 28037299", event.threadID, event.messageID);
    }

    const sbd = args[0]; // Lấy số báo danh từ tham số
    // Kiểm tra định dạng số báo danh (8 chữ số)
    if (!/^\d{8}$/.test(sbd)) {
        return api.sendMessage("⚠️ Số báo danh phải là 8 chữ số.", event.threadID, event.messageID);
    }

    const url = `https://diemthi.vnexpress.net/index/detail/sbd/${sbd}/year/2025`;

    try {
        // Gửi thông báo đang xử lý
        await api.sendMessage("⏳ Đang tra cứu điểm thi...", event.threadID);

        // Gửi yêu cầu tới trang web với headers chi tiết hơn
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
                'Referer': 'https://diemthi.vnexpress.net/',
                'Connection': 'keep-alive'
            }
        });
        const html = response.data;

        // Sử dụng cheerio để phân tích HTML
        const $ = cheerio.load(html);

        // Tìm bảng điểm (thử tìm tất cả các table và lấy table đầu tiên chứa dữ liệu)
        let resultTable = $('table').first();
        if (!resultTable.length) {
            return api.sendMessage(`⚠️ Không tìm thấy kết quả điểm thi cho số báo danh ${sbd}.`, event.threadID, event.messageID);
        }

        // Lấy thông tin điểm từ bảng
        let resultText = `✅ Kết quả điểm thi cho số báo danh: ${sbd}\n\n`;
        resultTable.find('tr').each((index, row) => {
            const cells = $(row).find('td');
            if (cells.length >= 2) {
                const subject = $(cells.eq(0)).text().trim(); // Cột đầu tiên: môn học
                const score = $(cells.eq(1)).text().trim();  // Cột thứ hai: điểm số
                if (subject && score && !isNaN(parseFloat(score))) {
                    resultText += `${subject}: ${score}\n`;
                }
            }
        });

        // Kiểm tra nếu không có dữ liệu điểm hợp lệ
        if (resultText === `✅ Kết quả điểm thi cho số báo danh: ${sbd}\n\n`) {
            return api.sendMessage(`⚠️ Không tìm thấy thông tin điểm thi hợp lệ cho số báo danh ${sbd}.`, event.threadID, event.messageID);
        }

        // Thêm thông tin cụm thi nếu có
        const clusterInfo = $('.diem_thi_content p').first().text().trim() || '';
        if (clusterInfo) {
            resultText += `\n${clusterInfo}`;
        }

        // Gửi kết quả
        api.sendMessage(resultText, event.threadID, event.messageID);
    } catch (error) {
        console.error(error);
        api.sendMessage("⚠️ Có lỗi xảy ra khi tra cứu điểm thi. Vui lòng thử lại sau.", event.threadID, event.messageID);
    }
};