const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');

module.exports.config = {
    name: "join",
    version: "1.2.1",
    hasPermssion: 1,
    credits: "Phạm Thanh Tùng",
    description: "Cấu hình lời chào mừng thành viên mới",
    commandCategory: "Quản Trị Viên",
    usages: "autotb [on|off|set|check|reset|del|media]",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
    const threadID = event.threadID;
    const messageID = event.messageID;
    const messageReply = event.messageReply;

    const defaultConfig = {
       enabled: true,
        message:
       "[ 𝐓𝐡𝐚̀𝐧𝐡 𝐯𝐢𝐞̂𝐧 𝐯𝐚̀𝐨 𝐧𝐡𝐨́𝐦 ]\n─────────────────\n🎊Xin chào con vợ {name}.\n🎀Chào mừng con vợ đã đến với  box {box}.\n👤{name} là thành viên thứ {count} của nhóm\n🎀 Bạn được thêm bởi: {add}\n─────────────────\n⏰ Thời gian:{time}\n📆 Ngày {date}"    
    };

    const dataPath = path.join(__dirname, "data", "welcomeData.json");

    function readData() {
        if (!fs.existsSync(dataPath)) {
            fs.outputFileSync(dataPath, JSON.stringify({}, null, 2), "utf8");
        }
        try {
            const content = fs.readFileSync(dataPath, "utf8");
            const data = JSON.parse(content);
            return typeof data === "object" ? data : {};
        } catch {
            return {};
        }
    }

    function writeData(data) {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
    }

    async function uploadToCatbox(url, filename = 'media') {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
            const contentType = response.headers['content-type'] || '';
            let ext = '.jpg';
            if (contentType.includes('png')) ext = '.png';
            else if (contentType.includes('gif')) ext = '.gif';
            else if (contentType.includes('jpeg')) ext = '.jpg';
            else if (contentType.includes('webp')) ext = '.webp';
            else if (contentType.includes('mp4')) ext = '.mp4';
            else if (contentType.includes('mp3')) ext = '.mp3';
            else if (contentType.includes('wav')) ext = '.wav';

            const tempPath = path.join(os.tmpdir(), `upload_${Date.now()}${ext}`);
            await fs.outputFile(tempPath, response.data);

            if (!fs.existsSync(tempPath)) {
                throw new Error(`Tệp tạm không tồn tại: ${tempPath}`);
            }

            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', fs.createReadStream(tempPath), {
                filename: `${filename}${ext}`,
                contentType
            });

            const uploadRes = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: form.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            await fs.unlink(tempPath);

            if (typeof uploadRes.data !== 'string' || !uploadRes.data.startsWith('https://')) {
                throw new Error('Upload không thành công hoặc trả về không phải URL.');
            }

            return uploadRes.data;

        } catch (error) {
            console.error('Lỗi khi tải media lên Catbox:', error.message || error);
            throw error;
        }
    }

    const data = readData();
    if (!data[threadID]) data[threadID] = { ...defaultConfig };
    const sub = args[0]?.toLowerCase();

    if (!sub) {
        return api.sendMessage(
            "Hướng dẫn sử dụng autotb:\n" +
            "→ on/off: bật hoặc tắt lời chào\n" +
            "→ set [nội dung]\n" +
            "→ media reply ảnh/video/audio\n" +
            "→ del: xoá media\n" +
            "→ reset: về mặc định\n" +
            "→ check: xem cấu hình\n\n" +
            "→ {name}: tên thành viên\n" +
            "→ {box}: tên nhóm\n" +
            "→ {count}: thành viên thứ\n" +
            "→ {add}: ID người thêm\n" +
            "→ {time}: giờ phút giây\n" +
            "→ {date}: ngày tháng năm\n",
            threadID,
            messageID
        );
    }

    switch (sub) {
        case "on":
        case "enable":
            data[threadID].enabled = true;
            writeData(data);
            return api.sendMessage("Đã bật chức năng chào mừng.", threadID, messageID);

        case "off":
        case "disable":
            data[threadID].enabled = false;
            writeData(data);
            return api.sendMessage("Đã tắt chức năng chào mừng.", threadID, messageID);

        case "set": {
            const content = args.slice(1).join(" ");
            if (!content) return api.sendMessage("Thiếu nội dung.", threadID, messageID);
            data[threadID].message = content;
            writeData(data);
            return api.sendMessage(`Đã cập nhật nội dung: ${content}`, threadID, messageID);
        }

        case "media": {
            let url;
            if (args[1]) {
                url = args.slice(1).join(" ");
            } else if (messageReply?.attachments?.length) {
                const attachment = messageReply.attachments[0];
                if (!attachment.url) return api.sendMessage("Không tìm thấy URL trong media đính kèm.", threadID, messageID);
                url = attachment.url;
            } else {
                return api.sendMessage("Vui lòng cung cấp URL hoặc reply media (mp4, gif, jpeg, png, webp, mp3, wav).", threadID, messageID);
            }

            try {
                const uploadedUrl = await uploadToCatbox(url);
                data[threadID].mediaUrl = uploadedUrl;
                writeData(data);
                return api.sendMessage(`Đã lưu media thành công:\n→ ${uploadedUrl}`, threadID, messageID);
            } catch (error) {
                return api.sendMessage("Đã xảy ra lỗi khi tải media lên Catbox.", threadID, messageID);
            }
        }

        case "del":
            delete data[threadID].mediaUrl;
            writeData(data);
            return api.sendMessage("Đã xoá media.", threadID, messageID);

        case "reset":
            data[threadID] = { ...defaultConfig };
            writeData(data);
            return api.sendMessage("Đã khôi phục mặc định.", threadID, messageID);

        case "check": {
            const conf = data[threadID];
            return api.sendMessage(
                `Cấu hình hiện tại:\n→ Trạng thái: ${conf.enabled ? "Bật" : "Tắt"}\n→ Nội dung: ${conf.message}\n→ Media: ${conf.mediaUrl || "Không có"}`,
                threadID,
                messageID
            );
        }

        default:
            return api.sendMessage(`Lệnh không hợp lệ: ${sub}`, threadID, messageID);
    }
};
