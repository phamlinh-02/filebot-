const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "hoctap",
    version: "1.0.0",
    hasPermssion: 1,
    credits: "Dgk",
    description: "hoctap",
    commandCategory: "Admin",
    usages: "[từ khóa]",
    cooldowns: 5
};



module.exports.handleReply = async function({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    if (senderID !== handleReply.author) return;
    
    const input = parseInt(body.trim());
    if (isNaN(input) || input < 1 || input > handleReply.videos.length) {
        return api.sendMessage(`⚠️ Vui lòng nhập số từ 1 đến ${handleReply.videos.length}`, threadID, messageID);
    }
    
    const video = handleReply.videos[input - 1];
    api.unsendMessage(handleReply.messageID);
    
    try {
        await downloadVideo(video.url, api, threadID, messageID);
    } catch (error) {
        api.sendMessage(`Lỗi khi tải video: ${error.message}`, threadID, messageID);
    }
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const adminIDs = threadInfo.adminIDs.map(admin => admin.id);
        if (!adminIDs.includes(senderID) && !global.config.ADMINBOT.includes(senderID)) {
            return api.sendMessage("⚠️ Chỉ quản trị viên nhóm mới có thể sử dụng lệnh này! Bạn tuổi lồn dùng", threadID, messageID);
        }
    } catch (err) {}
    
    
    if (!args[0]) {
        return api.sendMessage(`⚠️ Vui lòng nhập từ khóa tìm kiếm!`, threadID, messageID);
    }
    
  
    if (args[0].startsWith("http") && args[0].includes("xnxx.com")) {
        
        try {
            await downloadVideo(args[0], api, threadID, messageID);
        } catch (error) {
            api.sendMessage(`chịu rồi lỗi đéo tải được video: ${error.message}`, threadID, messageID);
        }
        return;
    }
    
   
    const searchQuery = args.join(" ");
    
    try {
        const videos = await searchVideos(searchQuery);
        if (!videos || videos.length === 0) {
            return api.sendMessage(`chịu đéo tìm được cho "${searchQuery}"!`, threadID, messageID);
        }
        
        let msg = `🔍 Kết quả cho "${searchQuery}":\n\n`;
        videos.forEach((video, index) => {
            msg += `${index + 1}. ${video.title}\n`;
            if (video.duration) msg += `⏱️ ${video.duration}`;
            if (video.quality) msg += ` | 📺 ${video.quality}`;
            if (video.views) msg += ` | 👁️ ${video.views}`;
            if (video.uploader) msg += `\n👤 ${video.uploader}`;
            msg += "\n\n";
        });
        
        msg += "👉 Phản hồi số thứ tự để tải video.";
        
        api.sendMessage(msg, threadID, (error, info) => {
            if (error) return;
            global.client.handleReply.push({
                name: this.config.name,
                author: senderID,
                messageID: info.messageID,
                videos: videos,
                type: "search"
            });
        }, messageID);
    } catch (error) {
        api.sendMessage(` Lỗi khi tìm kiếm: ${error.message}`, threadID, messageID);
    }
};

async function searchVideos(query) {
    try {
        let searchQuery = query;
        if (!query.toLowerCase().includes('viet') && !query.toLowerCase().includes('vietnam')) {
            searchQuery = query + " vietnam";
        }
        
        const response = await axios.get(`https://www.xnxx.com/search/${encodeURIComponent(searchQuery)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });
        
        return parseVideos(response.data);
    } catch (error) {
        throw new Error(`lỗi cụ rồi: ${error.message}`);
    }
}

function parseVideos(html) {
    const results = [];
    const $ = cheerio.load(html);
    
    $('.mozaique .thumb-block').each((index, element) => {
        if (index >= 10) return;
        
        const el = $(element);
        const titleElement = el.find('.thumb-under p a');
        const title = titleElement.attr('title') || titleElement.text().trim() || `Video ${index + 1}`;
        
        const href = titleElement.attr('href') || '';
        const url = href.startsWith('/') ? `https://www.xnxx.com${href}` : href;
        if (!url) return;
        
        const metadataText = el.find('.metadata').text().trim();
        
        const durationMatch = metadataText.match(/([0-9]+min[0-9]*sec?|[0-9]+min|[0-9]+sec)/);
        const duration = durationMatch ? durationMatch[0] : "";
        
        const qualityMatch = metadataText.match(/([0-9]+p)/i);
        const quality = qualityMatch ? qualityMatch[0] : "";
        
        const viewsMatch = el.find('.metadata .right').text().match(/([0-9\.]+[kKmMbB]?)/);
        const views = viewsMatch ? viewsMatch[0] : "";
        
        const uploader = el.find('.uploader a span.name').text().trim() || "";
        
        results.push({ title, url, duration, views, quality, uploader });
    });
    
    return results;
}

async function downloadVideo(url, api, threadID, messageID) {
    const cachePath = path.join(__dirname, "cache");
    if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });
    
    const tempFile = path.join(cachePath, `xnxx_${Date.now()}.mp4`);
    
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
        };
        
        const response = await axios.get(url, { headers });
        
        let title = '';
        const titleMatch = response.data.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) title = titleMatch[1].split(' - ')[0].trim();
        
        if (!title) {
            const metaTitleMatch = response.data.match(/<meta property="og:title" content="([^"]+)"/i);
            if (metaTitleMatch) title = metaTitleMatch[1].trim();
            else title = 'Video XNXX';
        }
        
        let duration = '';
        const durationMatch = response.data.match(/<span class="duration">([^<]+)<\/span>/i);
        if (durationMatch) duration = durationMatch[1].trim();
        
        let videoUrl = '';
        const lowMatch = response.data.match(/setVideoUrlLow\(['"](.+?)['"]\)/);
        const normalMatch = response.data.match(/setVideoUrl\(['"](.+?)['"]\)/);
        const highMatch = response.data.match(/setVideoUrlHigh\(['"](.+?)['"]\)/);
        
        if (lowMatch) videoUrl = lowMatch[1];
        else if (normalMatch) videoUrl = normalMatch[1];
        else if (highMatch) videoUrl = highMatch[1];
        
        if (!videoUrl) {
            const metaMatch = response.data.match(/<meta property="og:video" content="([^"]+)"/i);
            if (metaMatch) videoUrl = metaMatch[1];
        }
        
        if (!videoUrl) throw new Error("Không tìm thấy URL video!");
        
        const videoResponse = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'arraybuffer',
            headers: { ...headers, 'Range': 'bytes=0-20971520' },
            maxContentLength: 25165824,
            timeout: 30000
        });
        
        fs.writeFileSync(tempFile, Buffer.from(videoResponse.data));
        
        let messageBody = `🎬 ${title}`;
        if (duration) messageBody += `\n⏱️ ${duration}`;
        
        const $ = cheerio.load(response.data);
        
        const qualityMatch = $('.metadata').text().match(/([0-9]+p)/i);
        if (qualityMatch) messageBody += ` | 📺 ${qualityMatch[1]}`;
        
        const viewsMatch = $('.metadata').text().match(/([0-9,.]+k?)/g);
        if (viewsMatch && viewsMatch.length > 0) 
            messageBody += `\n👁️ ${viewsMatch[viewsMatch.length - 1]} lượt xem`;
        
        const uploader = $('span.name').first().text().trim();
        if (uploader) messageBody += `\n👤 ${uploader}`;
        
        api.sendMessage({
            body: messageBody,
            attachment: fs.createReadStream(tempFile)
        }, threadID, () => {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        }, messageID);
    } catch (error) {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        throw error;
    }
}