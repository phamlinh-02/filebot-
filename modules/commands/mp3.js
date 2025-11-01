const axios = require("axios");
const fs = require("fs");

module.exports = class {
  static config = {
    name: "tiktok_mp3_only", // Đổi tên để rõ ràng chức năng
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Dgk",
    description: "Chỉ tải âm thanh MP3 từ liên kết TikTok.",
    commandCategory: "Tài Chính",
    usages: "[link TikTok]",
    cooldowns: 5
  }

  static run() {}

  static check_url(url) {
    return /^https:\/\//.test(url);
  }

  static async streamURL(url, type) {
    const path = __dirname + `/cache/${Date.now()}.${type}`;
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(path, res.data);
    // Giữ file trong 5 phút rồi xóa
    setTimeout(() => fs.unlinkSync(path), 1000 * 60 * 5); 
    return fs.createReadStream(path);
  }

  static async handleEvent(o) {
    const { threadID: t, messageID: m, body: b } = o.event;
    const send = msg => o.api.sendMessage(msg, t, m);

    // Kiểm tra liên kết TikTok
    if (/(^https:\/\/)((vm|vt|www|v)\.)?(tiktok|douyin)\.com\//.test(b)) {
      try {
        const json = await this.infoPostTT(b); // Lấy chi tiết bài đăng TikTok
        let audioAttachment = null;

        // Nếu có thông tin nhạc và URL phát nhạc
        if (json.music_info && json.music_info.play) {
          audioAttachment = await this.streamURL(json.music_info.play, 'mp3'); // Tải âm thanh MP3
          send({
            body: `MP3`, // Chỉ gửi "MP3" làm nội dung tin nhắn
            attachment: audioAttachment
          });
        } else {
          send("Không tìm thấy âm thanh MP3 cho liên kết TikTok này.");
        }
      } catch (error) {
        console.error('Lỗi khi tải âm thanh TikTok:', error);
        send("");
      }
      return; // Thoát sau khi xử lý TikTok
    }
    // Các loại liên kết khác sẽ bị bỏ qua và không xử lý gì
  }

  // Hàm để lấy chi tiết bài đăng TikTok từ API tikwm.com
  static async infoPostTT(url) {
    const response = await axios({
      method: 'post',
      url: `https://tikwm.com/api/`,
      data: {
        url
      },
      headers: {
        'content-type': 'application/json'
      }
    });
    return response.data.data;
  }
}

exports.handleReaction = async function ({ api, event, Threads, handleReaction }) {
  // Không có xử lý phản ứng trong module này
};