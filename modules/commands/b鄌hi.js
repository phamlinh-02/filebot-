module.exports.config = {
    name: "baochi",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Kaori Waguri",
    description: "Lấy tin tức mới nhất và dịch sang tiếng Việt",
    commandCategory: "Tiện ích",
    usages: "baochi [chủ đề]",
    cooldowns: 10,
    dependencies: {
        "fs-extra": "",
        "axios": ""
    }
};

module.exports.run = async ({ event, api, args }) => {
    const fs = global.nodemodule["fs-extra"];
    const axios = global.nodemodule["axios"];
    const { threadID, messageID } = event;
    
    try {
        // Lấy chủ đề từ args (mặc định là "anime")
        let topic = args.join(" ") || "anime";
        
        // Dịch chủ đề từ tiếng Việt sang tiếng Anh để API hiểu
        const translateQuery = async (text) => {
            try {
                const translateResponse = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=en&dt=t&q=${encodeURIComponent(text)}`);
                return translateResponse.data[0][0][0] || text;
            } catch (e) {
                return text; // Nếu không dịch được thì dùng từ gốc
            }
        };
        
        // Dịch văn bản từ tiếng Anh sang tiếng Việt
        const translateText = async (text) => {
            try {
                const translateResponse = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text)}`);
                return translateResponse.data[0][0][0] || text;
            } catch (e) {
                return text; // Nếu không dịch được thì dùng text gốc
            }
        };
        
        api.sendMessage("🔍 Đang tìm kiếm tin tức mới nhất...", threadID, messageID);
        
        // Dịch chủ đề sang tiếng Anh
        const englishTopic = await translateQuery(topic);
        
        // Gọi NewsAPI
        const newsResponse = await axios.get(`https://newsapi.org/v2/everything`, {
            params: {
                q: englishTopic,
                apiKey: "c2694ba11d404b53a722f3e15382e4fe",
                language: "en",
                sortBy: "publishedAt",
                pageSize: 5
            }
        });
        
        const articles = newsResponse.data.articles;
        
        if (!articles || articles.length === 0) {
            return api.sendMessage(`❌ Không tìm thấy tin tức nào về "${topic}"!`, threadID, messageID);
        }
        
        api.sendMessage("🔄 Đang dịch tin tức sang tiếng Việt...", threadID, messageID);
        
        let newsMessage = `
╭─────────────────────╮
│    📰 TIN TỨC MỚI NHẤT 📰    │
╰─────────────────────╯

🔍 Chủ đề: ${topic}
📅 Thời gian: ${new Date().toLocaleString("vi-VN")}
📊 Tìm thấy: ${articles.length} bài báo

`;
        
        // Xử lý từng bài báo
        for (let i = 0; i < Math.min(articles.length, 3); i++) {
            const article = articles[i];
            
            try {
                // Dịch tiêu đề và mô tả
                const translatedTitle = await translateText(article.title || "Không có tiêu đề");
                const translatedDescription = await translateText(article.description || "Không có mô tả");
                
                // Format thời gian
                const publishedDate = new Date(article.publishedAt).toLocaleString("vi-VN");
                
                newsMessage += `
━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 BÃI ${i + 1}:

📝 Tiêu đề: ${translatedTitle}

📄 Mô tả: ${translatedDescription}

🏢 Nguồn: ${article.source?.name || "Không rõ"}
🕒 Thời gian: ${publishedDate}
🔗 Link: ${article.url}

`;
                
                // Delay để tránh spam API dịch
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (e) {
                console.log(`Lỗi dịch bài ${i + 1}:`, e.message);
                // Hiển thị bản gốc nếu không dịch được
                newsMessage += `
━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 BÃI ${i + 1}: (Bản gốc)

📝 ${article.title || "Không có tiêu đề"}
📄 ${article.description || "Không có mô tả"}
🏢 ${article.source?.name || "Không rõ"}
🔗 ${article.url}

`;
            }
        }
        
        newsMessage += `
━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Gõ "!baochi [chủ đề]" để tìm tin tức khác
🌐 Dữ liệu từ NewsAPI.org
`;
        
        // Chia tin nhắn nếu quá dài
        if (newsMessage.length > 2000) {
            const chunks = [];
            let currentChunk = "";
            const lines = newsMessage.split('\n');
            
            for (const line of lines) {
                if ((currentChunk + line).length > 1800) {
                    chunks.push(currentChunk);
                    currentChunk = line + '\n';
                } else {
                    currentChunk += line + '\n';
                }
            }
            if (currentChunk) chunks.push(currentChunk);
            
            // Gửi từng phần
            for (let i = 0; i < chunks.length; i++) {
                setTimeout(() => {
                    api.sendMessage(chunks[i], threadID);
                }, i * 2000);
            }
        } else {
            api.sendMessage(newsMessage, threadID, messageID);
        }
        
        // Lưu log
        const logPath = __dirname + "/cache/baochi_log.json";
        let logData = {};
        
        if (fs.existsSync(logPath)) {
            logData = JSON.parse(fs.readFileSync(logPath));
        }
        
        const logEntry = {
            timestamp: new Date().toLocaleString("vi-VN"),
            user: event.senderID,
            topic: topic,
            englishTopic: englishTopic,
            articlesFound: articles.length
        };
        
        if (!logData.searches) logData.searches = [];
        logData.searches.push(logEntry);
        
        // Giữ lại 50 lần tìm kiếm gần nhất
        if (logData.searches.length > 50) {
            logData.searches = logData.searches.slice(-50);
        }
        
        fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
        
    } catch (error) {
        console.log("Lỗi báo chí:", error);
        
        if (error.response && error.response.status === 429) {
            return api.sendMessage("⚠️ API đã đạt giới hạn, vui lòng thử lại sau!", threadID, messageID);
        } else if (error.response && error.response.status === 401) {
            return api.sendMessage("❌ API key không hợp lệ!", threadID, messageID);
        } else {
            return api.sendMessage(`❌ Có lỗi xảy ra: ${error.message}`, threadID, messageID);
        }
    }
};