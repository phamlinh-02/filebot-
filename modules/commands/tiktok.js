const axios = require("axios");
const fs = require("fs-extra");

module.exports.config = {
    name: "tiktok",
    version: "1.0.2",
    hasPermission: 0,
    credits: "Kz Khanhh",
    description: "Tìm kiếm video TikTok hoặc xem thông tin profile TikTok",
    commandCategory: "Tiện ích",
    usage: "tiktok <từ khóa> hoặc tiktok user <username>",
    cooldowns: 5
};

const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const extractUsername = (input) => {
    if (input.includes('tiktok.com/@')) return input.split('@')[1].split('/')[0].split('?')[0];
    if (input.includes('tiktok.com/')) {
        const parts = input.split('/');
        const userIndex = parts.findIndex(part => part.startsWith('@'));
        if (userIndex !== -1) return parts[userIndex].substring(1);
    }
    if (input.startsWith('@')) return input.substring(1);
    return input;
};

module.exports.handleReply = async ({ api, event, handleReply }) => {
    const { threadID, messageID, body } = event;
    if (handleReply.author !== event.senderID || !body) return;

    const args = body.split(' ');
    if (isNaN(body)) return api.sendMessage("Vui lòng nhập số thứ tự hợp lệ!", threadID, messageID);
    const index = parseInt(body) - 1; // Khai báo biến index một lần ở đây

    switch (handleReply.type) {
        case 'search':
            const { videoInfo } = handleReply;
            if (index < 0 || index >= videoInfo.length) return api.sendMessage("Số thứ tự không hợp lệ!", threadID, messageID);

            api.setMessageReaction("⏳", event.messageID, () => {}, true);
            api.unsendMessage(handleReply.messageID);

            const { digg_count, comment_count, play_count, share_count, download_count, duration, region, title, nickname, unique_id, video_url } = videoInfo[index];
            try {
                const res = await axios.get(video_url, { responseType: "stream" });
                res.data.pipe(fs.createWriteStream(__dirname + "/cache/tiktok.mp4"));
                res.data.on("end", () => {
                    api.setMessageReaction("✅", event.messageID, () => {}, true);
                    api.sendMessage({
                        body: `====== TIKTOK =====
Quốc gia: ${region || 'Không có'}
Tiêu đề: ${title}
Kênh: ${nickname}
ID người dùng: ${unique_id}
Lượt thích: ${formatNumber(digg_count)}
Bình luận: ${formatNumber(comment_count)}
Lượt xem: ${formatNumber(play_count)}
Chia sẻ: ${formatNumber(share_count)}
Lượt tải: ${formatNumber(download_count)}
Thời gian: ${duration} giây`,
                        attachment: fs.createReadStream(__dirname + "/cache/tiktok.mp4")
                    }, threadID, () => fs.unlinkSync(__dirname + "/cache/tiktok.mp4"), messageID);
                });
            } catch (err) {
                console.log('Lỗi tải video:', err.message);
                api.sendMessage("Có lỗi khi tải video!", threadID, messageID);
                api.setMessageReaction("❌", event.messageID, () => {}, true);
            }
            break;

        case 'userVideos':
            const { videos } = handleReply;
            if (index < 0 || index >= videos.length) return api.sendMessage("Số thứ tự không hợp lệ!", threadID, messageID);

            api.setMessageReaction("⏳", event.messageID, () => {}, true);
            api.unsendMessage(handleReply.messageID);

            const selectedVideo = videos[index];
            const attachments = [];
            const tempFiles = [];

            try {
                const isPhotoPost = selectedVideo.duration === 0 && selectedVideo.images && selectedVideo.images.length > 0;

                if (isPhotoPost) {
                    const maxImages = Math.min(selectedVideo.images.length, 50);
                    for (let i = 0; i < maxImages; i++) {
                        try {
                            const imageResponse = await axios.get(selectedVideo.images[i], { responseType: 'arraybuffer' });
                            const imagePath = __dirname + `/cache/tikuser_image_${i}.jpg`;
                            fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));
                            attachments.push(fs.createReadStream(imagePath));
                            tempFiles.push(imagePath);
                        } catch (e) {
                            console.log(`Lỗi tải ảnh ${i}:`, e.message);
                        }
                    }

                    api.setMessageReaction("✅", event.messageID, () => {}, true);
                    api.sendMessage({
                        body: `====== TIKTOK ẢNH =====
Tiêu đề: ${selectedVideo.title}
Tổng số ảnh: ${selectedVideo.images.length}
Lượt thích: ${formatNumber(selectedVideo.digg_count)}
Chia sẻ: ${formatNumber(selectedVideo.share_count)}
Lượt xem: ${formatNumber(selectedVideo.play_count)}
Đã gửi ${Math.min(maxImages, selectedVideo.images.length)} ảnh`,
                        attachment: attachments
                    }, threadID, () => {
                        tempFiles.forEach(file => {
                            try { fs.unlinkSync(file); } catch (e) { console.log('Lỗi xóa file:', e.message); }
                        });
                    }, messageID);
                } else {
                    if (selectedVideo.cover) {
                        try {
                            const imageResponse = await axios.get(selectedVideo.cover, { responseType: 'arraybuffer' });
                            const imagePath = __dirname + "/cache/tikuser_image.jpg";
                            fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));
                            attachments.push(fs.createReadStream(imagePath));
                            tempFiles.push(imagePath);
                        } catch (e) {
                            console.log('Lỗi tải ảnh cover:', e.message);
                        }
                    }

                    if (selectedVideo.play && !selectedVideo.play.includes('.mp3')) {
                        const videoResponse = await axios.get(selectedVideo.play, { responseType: "stream" });
                        const videoPath = __dirname + "/cache/tikuser_video.mp4";
                        videoResponse.data.pipe(fs.createWriteStream(videoPath));

                        videoResponse.data.on("end", () => {
                            attachments.push(fs.createReadStream(videoPath));
                            tempFiles.push(videoPath);

                            api.setMessageReaction("✅", event.messageID, () => {}, true);
                            api.sendMessage({
                                body: `====== TIKTOK VIDEO =====
Tiêu đề: ${selectedVideo.title}
Thời gian: ${selectedVideo.duration}s
Lượt thích: ${formatNumber(selectedVideo.digg_count)}
Chia sẻ: ${formatNumber(selectedVideo.share_count)}
Lượt xem: ${formatNumber(selectedVideo.play_count)}
Đã gửi kèm ảnh cover + video`,
                                attachment: attachments
                            }, threadID, () => {
                                tempFiles.forEach(file => {
                                    try { fs.unlinkSync(file); } catch (e) { console.log('Lỗi xóa file:', e.message); }
                                });
                            }, messageID);
                        });

                        videoResponse.data.on("error", (err) => {
                            console.log('Lỗi stream video:', err);
                            tempFiles.forEach(file => {
                                try { fs.unlinkSync(file); } catch (e) {} });
                            api.sendMessage("Có lỗi khi tải video!", threadID, messageID);
                            api.setMessageReaction("❌", event.messageID, () => {}, true);
                        });
                    } else {
                        if (attachments.length > 0) {
                            api.setMessageReaction("✅", event.messageID, () => {}, true);
                            api.sendMessage({
                                body: `====== TIKTOK ÂM THANH =====
Tiêu đề: ${selectedVideo.title}
Lượt thích: ${formatNumber(selectedVideo.digg_count)}
Lượt xem: ${formatNumber(selectedVideo.play_count)}
Chỉ có ảnh cover (bài đăng âm thanh)`,
                                attachment: attachments
                            }, threadID, () => {
                                tempFiles.forEach(file => {
                                    try { fs.unlinkSync(file); } catch (e) {} });
                            }, messageID);
                        } else {
                            api.sendMessage("Không thể tải ảnh hoặc video!", threadID, messageID);
                            api.setMessageReaction("❌", event.messageID, () => {}, true);
                        }
                    }
                }
            } catch (err) {
                console.log(err);
                tempFiles.forEach(file => { try { fs.unlinkSync(file); } catch (e) {} });
                api.sendMessage("Có lỗi khi tải nội dung!", threadID, messageID);
                api.setMessageReaction("❌", event.messageID, () => {}, true);
            }
            break;
    }
};

module.exports.run = async ({ api, event, args }) => {
    api.setMessageReaction("⏳", event.messageID, () => {}, true);
    const input = args.join(" ");
    if (!input) return api.sendMessage("Vui lòng nhập từ khóa hoặc tên người dùng!", event.threadID, event.messageID);

    const isUserCommand = args[0].toLowerCase() === "user";
    const query = isUserCommand ? args.slice(1).join(" ") : input;

    if (isUserCommand) {
        // Xem thông tin profile
        const username = extractUsername(query);
        if (!username) return api.sendMessage("Tên người dùng không hợp lệ! Vui lòng nhập @username hoặc URL profile.", event.threadID, event.messageID);

        try {
            const profileResponse = await axios.get(`https://www.tikwm.com/api/user/info`, {
                params: { unique_id: username },
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            if (profileResponse.data.code !== 0) return api.sendMessage("Không tìm thấy người dùng này hoặc tài khoản bị riêng tư!", event.threadID, event.messageID);

            const userInfo = profileResponse.data.data.user;
            const stats = profileResponse.data.data.stats;

            let avatarAttachment = null;
            const avatarUrl = userInfo.avatarLarger || userInfo.avatarMedium || userInfo.avatarThumb;
            if (avatarUrl) {
                try {
                    const avatarResponse = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
                    const avatarPath = __dirname + "/cache/tikuser_avatar.jpg";
                    fs.writeFileSync(avatarPath, Buffer.from(avatarResponse.data));
                    avatarAttachment = fs.createReadStream(avatarPath);
                } catch (e) {
                    console.log('Lỗi tải avatar:', e.message);
                }
            }

            const videosResponse = await axios.get(`https://www.tikwm.com/api/user/posts`, {
                params: { unique_id: username, count: 10, cursor: 0 },
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            let videosList = '';
            let videos = [];
            if (videosResponse.data.code === 0 && videosResponse.data.data.videos) {
                videos = videosResponse.data.data.videos.slice(0, 5);
                videosList = '\n\nVideo mới nhất:\n===================\n';
                videos.forEach((video, index) => {
                    const title = video.title.length > 50 ? video.title.substring(0, 50) + '...' : video.title;
                    const isPhotoPost = video.duration === 0 && video.images && video.images.length > 0;
                    const postType = isPhotoPost ? '[Ảnh]' : (video.play && video.play.includes('.mp3') ? '[Âm thanh]' : '[Video]');
                    videosList += `${index + 1}. ${postType} ${title}\n   Xem: ${formatNumber(video.play_count)} | Thích: ${formatNumber(video.digg_count)}${isPhotoPost ? ` | Ảnh: ${video.images.length}` : ''}\n---------------\n`;
                });
                videosList += '\nTrả lời tin nhắn này với số thứ tự để tải video!';
            }

            let socialLinks = '';
            const socials = [];
            if (userInfo.ins_id && userInfo.ins_id.trim()) socials.push(`Instagram: @${userInfo.ins_id}`);
            if (userInfo.twitter_id && userInfo.twitter_id.trim()) socials.push(`Twitter: @${userInfo.twitter_id}`);
            if (userInfo.youtube_channel_title && userInfo.youtube_channel_id) socials.push(`YouTube: ${userInfo.youtube_channel_title}`);
            if (socials.length > 0) socialLinks = '\n\nMạng xã hội:\n=============\n' + socials.join('\n');

            const profileInfo = `====== TIKTOK TÀI KHOẢN =====
Tên: ${userInfo.nickname || 'Không có'}
Tên người dùng: @${userInfo.uniqueId || username}
Mô tả: ${userInfo.signature || 'Không có mô tả'}
Thống kê:
- Người theo dõi: ${formatNumber(stats.followerCount || stats.follower_count || 0)}
- Đang theo dõi: ${formatNumber(stats.followingCount || stats.following_count || 0)}
- Tổng lượt thích: ${formatNumber(stats.heartCount || stats.heart_count || stats.total_likes || 0)}
- Tổng video: ${formatNumber(stats.videoCount || stats.video_count || 0)}
Đã xác minh: ${userInfo.verified ? 'Có' : 'Không'}
Riêng tư: ${userInfo.secret || userInfo.privateAccount ? 'Có' : 'Không'}${socialLinks}${videosList}`;

            api.setMessageReaction("✅", event.messageID, () => {}, true);
            api.sendMessage({ body: profileInfo, attachment: avatarAttachment }, event.threadID, (err, info) => {
                if (err) return console.log(err);
                if (avatarAttachment) {
                    try { fs.unlinkSync(__dirname + "/cache/tikuser_avatar.jpg"); } catch (e) { console.log('Lỗi xóa avatar:', e.message); }
                }
                if (videos.length > 0) {
                    global.client.handleReply.push({
                        name: module.exports.config.name,
                        author: event.senderID,
                        messageID: info.messageID,
                        videos,
                        type: "userVideos"
                    });
                }
            });
        } catch (err) {
            console.log('Lỗi khi gọi TikWM API:', err.message);
            api.sendMessage("Có lỗi khi lấy thông tin tài khoản. Vui lòng kiểm tra tên người dùng và thử lại!", event.threadID, event.messageID);
            api.setMessageReaction("❌", event.messageID, () => {}, true);
        }
    } else {
        // Tìm kiếm video
        try {
            const response = await axios.get(`https://www.tikwm.com/api/feed/search`, {
                params: { keywords: query, count: 12, cursor: 0, HD: 1 },
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            const result = response.data.data.videos;
            if (!result || result.length === 0) return api.sendMessage("Không tìm thấy kết quả nào!", event.threadID, event.messageID);

            const lengthResult = result.length > 9 ? 9 : result.length;
            let videoInfo = [];
            let msg = `Tìm thấy ${lengthResult} kết quả phù hợp với từ khóa\n===================\n`;
            let nameATM = [], attachment = [];

            for (let i = 0; i < lengthResult; i++) {
                const video = result[i];
                const digg_count = video.digg_count || 0;
                const comment_count = video.comment_count || 0;
                const play_count = video.play_count || 0;
                const share_count = video.share_count || 0;
                const download_count = video.download_count || 0;
                const duration = video.duration || 0;
                const region = video.region || 'Không có';
                const title = video.title || 'Không có tiêu đề';
                const nickname = video.author?.nickname || 'Không rõ';
                const unique_id = video.author?.unique_id || 'Không rõ';
                const video_url = video.play || video.wmplay || '';
                const cover = video.cover || video.origin_cover || '';

                if (cover) {
                    try {
                        let stream_ = await axios.get(encodeURI(cover), { responseType: 'arraybuffer' });
                        const tempDir = __dirname + `/tikinfo${Date.now()}${i}.png`;
                        fs.writeFileSync(tempDir, Buffer.from(stream_.data, 'utf8'));
                        nameATM.push(tempDir);
                        attachment.push(fs.createReadStream(tempDir));
                    } catch (e) {
                        console.log('Lỗi tải ảnh cover:', e.message);
                    }
                }

                msg += `Kết quả ${i + 1}\nTác giả: ${nickname}\nTiêu đề: ${title}\nThời gian: ${duration} giây\n===================\n`;
                videoInfo.push({ digg_count, comment_count, play_count, share_count, download_count, region, nickname, title, video_url, cover, unique_id, duration });
            }

            api.setMessageReaction("✅", event.messageID, () => {}, true);
            msg += '\nTrả lời tin nhắn này với số thứ tự để tải video!';

            api.sendMessage({ body: msg, attachment }, event.threadID, (err, info) => {
                if (err) return console.log(err);
                nameATM.forEach(pa => {
                    try { fs.unlinkSync(pa); } catch (e) { console.log('Lỗi xóa file:', e.message); }
                });
                global.client.handleReply.push({
                    name: module.exports.config.name,
                    author: event.senderID,
                    messageID: info.messageID,
                    videoInfo,
                    type: "search"
                });
            });
        } catch (err) {
            console.log('Lỗi khi gọi TikWM API:', err.message);
            api.sendMessage("Có lỗi khi tìm kiếm video TikTok. Vui lòng thử lại sau!", event.threadID, event.messageID);
            api.setMessageReaction("❌", event.messageID, () => {}, true);
        }
    }
};