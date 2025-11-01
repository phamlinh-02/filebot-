const axios = require("axios");

module.exports = async function twdown(url, options) {
    try {
        let input = {};

        if (typeof url === 'object') {
            if (url.url) input = url;
            else return { found: false, error: 'Không có URL nào được cung cấp' };
        } else if (typeof url === 'string') {
            input.url = url;
        } else {
            return { found: false, error: 'Đối số đầu tiên không hợp lệ' };
        }

        if (options) Object.assign(input, options);

        if (/twitter\.com|x\.com/.test(input.url)) {
            const apiURL = input.url.replace(/twitter\.com|x\.com/g, 'api.vxtwitter.com');
            const result = await axios.get(apiURL).then(res => res.data).catch(() => {
                throw new Error('Đã xảy ra sự cố. Đảm bảo liên kết Twitter hợp lệ.');
            });

            if (!result.media_extended) return { found: false, error: 'Không tìm thấy phương tiện nào' };

            const output = {
                found: true,
                type: result.media_extended[0].type,
                media: result.mediaURLs
            };

            if (input.text) 
            output.title = result.text;
            output.id = result.conversationID;
            output.date = result.date; // Thời gian đăng bài
            output.likes = result.likes; // Số lượt thích
            output.replies = result.replies; // Số lượt trả lời
            output.retweets = result.retweets; // Số lượt retweet
            output.author = result.user_name; // Tên người đăng
            output.username = result.user_screen_name;
            return output;
        } else {
            return { found: false, error: `URL không hợp lệ: ${input.url}` };
        }
    } catch (error) {
        return { found: false, error: error.message };
    }
};