const axios = require('axios');

const capcutdl = async (url) => {
  try {
    const extractLinks = (text) => {
      const regex = /(https:\/\/www.capcut.com\/t\/[a-zA-Z0-9_-]+)|(https:\/\/www.capcut.com\/template-detail\/[a-zA-Z0-9_-]+)/g;
      const matches = text.match(regex);
      return matches ? matches : [];
    };

    const extractedLinks = extractLinks(url);
    if (extractedLinks.length === 0) {
      throw new Error('Link này không phải link mẫu capcut vui lòng thay bằng link mẫu capcut');
    }

    const result = [];

    for (const link of extractedLinks) {
      const getUrlResponse = await axios.get(`https://ssscap.net/api/download/get-url?url=${link}`);
      const videoId = getUrlResponse.data.url.split("/")[4].split("?")[0];
      const options = {
        method: 'GET',
        url: `https://ssscap.net/api/download/${videoId}`,
        headers: {
          'Connection': 'keep-alive',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
          'Cookie': 'sign=08321c1cc11dbdd2d6e3c63f44248dcf; device-time=1699454542608',
          'Referer': 'https://ssscap.net/vi',
          'Host': 'ssscap.net',
          'Accept-Language': 'vi-VN,vi;q=0.9',
          'Accept': 'application/json, text/plain, /',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-Mode': 'cors'
        }
      };
      const urlVideo = link.split('?')[0];
      const response = await axios.request(options);
      const { title, description, usage, originalVideoUrl } = response.data;

      result.push({
        title: title,
        description: description,
        usage: usage,
        urlVideo: urlVideo,
        video: `https://ssscap.net${originalVideoUrl}`
      });
    }

    return result;
  } catch (error) {
    throw new Error('Không tìm thấy mẫu');
  }
};

module.exports = capcutdl;