const axios = require('axios');

const parseString = (string) => {
  try {
    return JSON.parse(`{"text": "${string}"}`).text;
  } catch (error) {
    return "";
  }
};

const fbvideo = async (videourl, cookie) => {
  const headers = {
    "sec-fetch-user": "?1",
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-site": "none",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "cache-control": "max-age=0",
    authority: "www.facebook.com",
    "upgrade-insecure-requests": "1",
    "accept-language": "en-GB,en;q=0.9,tr-TR;q=0.8,tr;q=0.7,en-US;q=0.6",
    "sec-ch-ua": '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    cookie: cookie,
  };

  try {
    if (!videourl || !videourl.trim()) {
      return "Thiếu url facebook";
    }

    if (!videourl.includes("facebook.com")) {
      return "Vui lòng nhập video facebook hợp lệ!";
    }

    const { data } = await axios.get(videourl, { headers });
    const formattedData = data.replace(/&quot;/g, '"').replace(/&amp;/g, "&");

    const hdMatch =
      formattedData.match(/"browser_native_hd_url":"(.*?)"/) ||
      formattedData.match(/"playable_url_quality_hd":"(.*?)"/) ||
      formattedData.match(/hd_src\s*:\s*"([^"]*)"/);
    const titleMatch = formattedData.match(/<meta\sname="description"\scontent="(.*?)"/);

    if (hdMatch && hdMatch[1]) {
      const result = {
        title: titleMatch && titleMatch[1] ? parseString(titleMatch[1]) : data.match(/<title>(.*?)<\/title>/)?.[1] ?? "",
          link: hdMatch && hdMatch[1] ? parseString(hdMatch[1]) : ""
      };

      return result;
    } else {
      return "Không thể lấy thông tin video vào thời điểm này. Vui lòng thử lại";
    }
  } catch (error) {
    return "Lỗi khi thực hiện yêu cầu";
  }
};

module.exports = fbvideo;