const fs = require('fs');
const axios = require('axios');
const path = require('path');

module.exports.config = {
    name: "loppy",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Hung dep trai Convert By Dũngkon",
    description: "Bật tắt tính năng nhại tin nhắn kiểu loppy",
    commandCategory: "Tiện ích",
    usages: "!loppy",
    cooldowns: 5,
};

let Loppy = [];
let alreadyProcessed = {};  // Lưu trạng thái xử lý sự kiện

module.exports.run = async function({ api, event }) {
    const { threadID, messageID } = event;

    const find = Loppy.find(item => item == threadID);
    if (!find) {
        Loppy.push(threadID);
        return api.sendMessage('Nhại kiểu loppy đã kích hoạt!', threadID, messageID);
    } else {
        Loppy = Loppy.filter(item => item != threadID);
        return api.sendMessage('Nhại kiểu loppy đã tắt!', threadID, messageID);
    }
};

module.exports.handleEvent = async function({ api, event }) {
    const { threadID, messageID, body, senderID } = event;
    if (!body) return;

    const check = Loppy.find(item => item == threadID);
    if (!check) return;

    // Kiểm tra nếu người gửi là bot thì không phản hồi
    if (senderID === api.getCurrentUserID()) return;

    // Kiểm tra nếu sự kiện đã được xử lý
    if (alreadyProcessed[messageID]) return;

    const processedMessage = processSentence(body);

    const imageLinks = [
        "https://i.imgur.com/PqnesFX.jpeg",
        "https://i.imgur.com/vqK3olK.jpeg",
"https://i.imgur.com/xlXHyFi.jpeg",
"https://i.imgur.com/YsSDaiR.jpeg"
    ];
    const randomImage = imageLinks[Math.floor(Math.random() * imageLinks.length)];
    const imagePath = path.join(__dirname, 'temp_image.jpg');

    // Download and save the image temporarily
    await downloadImage(randomImage, imagePath);

    api.sendMessage({
        body: processedMessage,
        attachment: fs.createReadStream(imagePath)
    }, threadID, (error) => {
        if (!error) {
            // Delete the image after sending
            fs.unlink(imagePath, (err) => {
                if (err) console.error('Error deleting image:', err);
            });
        }
    }, messageID);

    // Đánh dấu sự kiện này đã được xử lý
    alreadyProcessed[messageID] = true;

    // Xóa trạng thái sau một thời gian ngắn để tránh tràn bộ nhớ
    setTimeout(() => {
        delete alreadyProcessed[messageID];
    }, 30000); // 30 giây
};

function replaceWordWithNh(word) {
    const vowels = 'aeiouăâêôơưáắấéếíóốớúứýàằầèềìòồờùừỳảẳẩẻểỉỏổởủửỷãẵẫẽễĩõỗỡũữỹạặậẹệịọộợụựỵ';
    word = word.toLowerCase();
    
    if (word == 'ok') return 'nhô nhê';
    if (word == 'cc' || word == 'vl') return 'nhờ nhờ';
    if (word == 'hihi') return 'nhi nhi';
    if (word == 'haha') return 'nha nha';
    if (word == 'hoho') return 'nho nho';
    if (word == 'paipai') return 'nhai nhai';
    if (word == 'kaka') return 'nha nha';
    if (word == 'dume') return 'nhu nhe';
    if (word == 'duma') return 'nhu nha';
    if (word == 'adu') return 'nha nhu';
    if (word == 'loppy') return 'nhop nhy';

    const index = word.split('').findIndex(char => vowels.includes(char));

    if (index !== -1) {
        return 'nh' + word.slice(index);
    }
    return word;
}

function processSentence(sentence) {
    const words = sentence.split(/\s+/);
    const processedWords = words.map(replaceWordWithNh);
    return processedWords.join(' ');
}

// Hàm tải hình ảnh từ URL
async function downloadImage(url, filePath) {
    const response = await axios({
        url,
        responseType: 'stream'
    });
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}