module.exports.config = {
    name: "taokieuchu",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Nguyên Blue • DongDev[Convert] & MySelf",
    description: "Chuyển font chữ - Reply để dùng",
    commandCategory: "Tiện ích",
    usages: "taokieuchu",
    cooldowns: 3
};

const { unsendMessage: un } = global.client.api;

const fontMaps = {
    "double": {
        map: {
            '0': '𝟘', '1': '𝟙', '2': '𝟚', '3': '𝟛', '4': '𝟜', '5': '𝟝',
            '6': '𝟞', '7': '𝟟', '8': '𝟠', '9': '𝟡',
            'A': '𝔸', 'B': '𝔹', 'C': 'ℂ', 'D': '𝔻', 'E': '𝔼', 'F': '𝔽', 'G': '𝔾', 'H': 'ℍ',
            'I': '𝕀', 'J': '𝕁', 'K': '𝕂', 'L': '𝕃', 'M': '𝕄', 'N': 'ℕ', 'O': '𝕆', 'P': 'ℙ',
            'Q': 'ℚ', 'R': 'ℝ', 'S': '𝕊', 'T': '𝕋', 'U': '𝕌', 'V': '𝕍', 'W': '𝕎', 'X': '𝕏',
            'Y': '𝕐', 'Z': 'ℤ',
            'a': '𝕒', 'b': '𝕓', 'c': '𝕔', 'd': '𝕕', 'e': '𝕖', 'f': '𝕗', 'g': '𝕘', 'h': '𝕙',
            'i': '𝕚', 'j': '𝕛', 'k': '𝕜', 'l': '𝕝', 'm': '𝕞', 'n': '𝕟', 'o': '𝕠', 'p': '𝕡',
            'q': '𝕢', 'r': '𝕣', 's': '𝕤', 't': '𝕥', 'u': '𝕦', 'v': '𝕧', 'w': '𝕨', 'x': '𝕩',
            'y': '𝕪', 'z': '𝕫'
        }
    },
    "bold": {
        map: {
            '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱',
            '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵',
            'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚',
            'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡',
            'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨',
            'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
            'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴',
            'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻',
            'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂',
            'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇'
        }
    }
};

function convertText(text, fontType) {
    if (!text || !fontMaps[fontType]) return text;
    let result = '';
    for (let char of text) {
        result += fontMaps[fontType].map[char] || char;
    }
    return result;
}

module.exports.run = async function ({ api, event }) {
    const { sendMessage: send } = api;
    const { threadID: tid, messageID: mid, senderID: sid } = event;

    const menu = `🎨 CHUYỂN FONT CHỮ\n\n` +
        `1️⃣ Font kiểu (123 → 𝟙𝟚𝟛)\n` +
        `2️⃣ Font in đậm (123 → 𝟭𝟮𝟯)\n\n` +
        `💬 Reply tin nhắn này: 1 hoặc 2`;

    return send(menu, tid, (a, b) => {
        global.client.handleReply.push({ 
            name: this.config.name, 
            messageID: b.messageID, 
            author: sid, 
            case: 'select_font' 
        });
    }, mid);
};

module.exports.handleReply = async function ({ handleReply: $, api, event }) {
    const { sendMessage: send } = api;
    const { threadID: tid, messageID: mid, senderID: sid, args } = event;

    if (sid != $.author) {
        const msg = `⛔ bạn không phải người dùng lệnh `;
        return send(msg, tid, mid);
    }
    
    // Sử dụng switch case để xử lý từng bước
    switch ($.case) {
        case 'select_font': {
            const reply = args[0] || ''; // Lấy lựa chọn của người dùng
            let fontType;
            if (reply === '1') {
                fontType = 'double';
            } else if (reply === '2') {
                fontType = 'bold';
            } else {
                return send('❌ Lựa chọn không hợp lệ. Vui lòng reply 1 hoặc 2.', tid, mid);
            }
            
            un($.messageID); // Gỡ tin nhắn menu
            
            const msg = `✨ Font đã chọn!\n\n📝 Bây giờ, hãy reply tin nhắn này với text cần chuyển:`;
            return send(msg, tid, (a, b) => {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: b.messageID,
                    author: sid,
                    case: 'convert_text',
                    fontType: fontType
                });
            }, mid);
        }
        
        case 'convert_text': {
            const reply = event.body.trim(); // Lấy toàn bộ nội dung reply
            
            if (!reply) {
                return send('❌ Vui lòng nhập text cần chuyển đổi.', tid, mid);
            }

            un($.messageID); // Gỡ tin nhắn yêu cầu nhập text
            
            const converted = convertText(reply, $.fontType);
            const result = `Kết quả khi chuyển là:\n${converted}`;
            
            return send(result, tid, mid);
        }
        
        default:
            break;
    }
};