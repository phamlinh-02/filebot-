const { get } = require('axios');

module.exports.config = {
  name: 'xsmb',
  version: '10.10',
  hasPermssion: 0,
  credits: 'DC-Nam - Fix tối ưu bởi ChatGPT',
  description: 'Gửi kết quả XSMB lúc 18:33 giờ Việt Nam',
  commandCategory: 'Tiện ích',
  usages: '[ngày-tháng-năm]',
  cooldowns: 3
};

// ✅ Format kết quả xổ số
function formatResult(result) {
  const match = result.message.match(/Giải Đặc Biệt: ([\d-]+)/);
  const special = match ? match[1] : 'Không rõ';
  return `🎉 Giải Đặc Biệt: ${special}\n\n${result.message}`;
}

// ✅ TỰ ĐỘNG GỬI KẾT QUẢ LÚC 6:33 PM
module.exports.onLoad = (o) => {
  if (global.xsmbInterval) clearInterval(global.xsmbInterval);

  const sentTodayMap = new Set(); // Lưu nhóm đã gửi
  let lastSentDate = null;

  global.xsmbInterval = setInterval(async () => {
    const now = new Date();
    const timeVN = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
    });

    const dateVN = now.toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh'
    }); // VD: "17/07/2025"

    // Nếu sang ngày mới thì reset danh sách nhóm đã gửi
    if (lastSentDate !== dateVN) {
      lastSentDate = dateVN;
      sentTodayMap.clear();
    }

    // Gửi vào đúng 6:33 PM giờ VN
    if (timeVN === '06:33 PM') {
      try {
        const res = await get(`https://api-ngollll.onrender.com/v2/tien-ich/check-xsmb.json`);
        const data = res.data?.data || [];
        if (!data[0]) return;

        const message = formatResult(data[0]);
        const threads = global.data?.allThreadID || [];

        for (const threadID of threads) {
          if (sentTodayMap.has(threadID)) continue;

          o.api.sendMessage(message, threadID, (err) => {
            if (!err) sentTodayMap.add(threadID);
          });
        }

        console.log(`[BOT] ✅ Đã gửi kết quả XSMB lúc 6:33 PM ngày ${dateVN}`);
      } catch (err) {
        console.error('[BOT] ❌ Lỗi khi gửi XSMB:', err.message);
      }
    }
  }, 10000); // Kiểm tra mỗi 10 giây
};

// ✅ XỬ LÝ KHI NGƯỜI DÙNG GỌI LỆNH THỦ CÔNG
module.exports.run = async function ({ api, event, args }) {
  const send = (msg, reply = false) => api.sendMessage(msg, event.threadID, reply ? event.messageID : null);

  try {
    const res = await get(`https://api-ngollll.onrender.com/v2/tien-ich/check-xsmb.json`);
    const data = res.data?.data || [];

    if (args[0]) {
      if (!/^\d{1,2}-\d{1,2}-\d{4}$/.test(args[0]))
        return send(`[⚜️] Vui lòng nhập đúng định dạng: ngày-tháng-năm (VD: 16-07-2025)`, true);

      const [d, m, y] = args[0].split("-");
      const inputFormatted = [d.padStart(2, '0'), m.padStart(2, '0'), y].join("-");

      const found = data.find(i => i.message.includes(inputFormatted));
      if (!found)
        return send(`[⚜️] Không tìm thấy kết quả ngày "${inputFormatted}"`, true);

      return send(formatResult(found), true);
    } else {
      return send(formatResult(data[0]), true); // Gửi kết quả hôm nay
    }
  } catch (err) {
    return send(`❌ Lỗi khi lấy dữ liệu: ${err.message}`, true);
  }
};