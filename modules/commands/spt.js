const axios = require("axios");
const moment = require('moment-timezone');
const fs = require("fs");

function formatSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

module.exports.config = {
  name: "spt",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Dev",
  description: "Tìm kiếm nhạc trên Spotify",
  commandCategory: "mp3/mp4",
  usages: "[]",
  images: [],
  cooldowns: 2,
};

function convertTime(a) {
  const giay = Math.floor((a / 1000) % 60);
  const phut = Math.floor((a / (1000 * 60)) % 60);
  const gio = Math.floor(a / (1000 * 60 * 60));
  return `${gio}:${String(phut).padStart(2, '0')}:${String(giay).padStart(2, '0')}`;
}

async function get_token(client_id, client_secret) {
  try {
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        Authorization: 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
      },
      form: {
        grant_type: 'client_credentials'
      },
      json: true
    };

    const response = await axios.post(authOptions.url, null, {
      headers: authOptions.headers,
      params: authOptions.form,
    });

    return response.data.access_token;
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    throw error;
  }
}

async function search(keywords, limit) {
  const data_audio = [];
  try {
    const client_id = 'b9d2557a2dd64105a37f413fa5ffcda4';
    const client_secret = '41bdf804974e4e70bfa0515bb3097fbb';

    const token = await get_token(client_id, client_secret);

    const res = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURI(keywords)}&type=track&limit=6`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    for (const item of res.data.tracks.items) {
      const result = {
        id: item.id,
        title: item.name,
        author: item.album.artists[0].name,
        duration: item.duration_ms,
        thumb: item.album.images[0].url,
        link: item.external_urls.spotify,
        preview_url: item.preview_url,
      };
      data_audio.push(result);
    }
    return data_audio;
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports.run = async function ({ api, event, args }) {
  try {
    const keyword = args.join(" ");

    if (!keyword) {
      api.sendMessage("⚠️ Vui lòng nhập từ khóa để tìm nhạc trên Spotify", event.threadID, event.messageID);
      return;
    }

    const dataSearch = await search(keyword);

    if (dataSearch.length === 0) {
      api.sendMessage(`❎ Không tìm thấy kết quả nào cho từ khóa: ${keyword}`, event.threadID, event.messageID);
      return;
    }

    const img = dataSearch.map(t => t.thumb);

    const image = [];
    for (let i = 0; i < img.length; i++) {
      const a = img[i];
      const stream = (await axios.get(a, {
        responseType: "stream"
      })).data;
      image.push(stream);
    }

    const messages = dataSearch.map((item, index) => {
      const duration = convertTime(item.duration);
      return `\n${index + 1}. 👤 Tên: ${item.author}\n📜 Tiêu đề: ${item.title}\n⏳ Thời lượng: ${duration} giây`;
    });

    const listTrack = {
      body: `[ SPOTIFY - SEARCH TRACKS ]\n────────────────────\n📝 Danh sách tìm kiếm của từ khóa: ${keyword}\n${messages.join("\n")}\n\n📌 Reply (phản hồi) theo STT tương ứng để tải nhạc`,
      attachment: image
    };

    api.sendMessage(listTrack, event.threadID, (error, info) => {
      global.client.handleReply.push({
        type: "choose",
        name: module.exports.config.name,
        author: info.senderID,
        messageID: info.messageID,
        dataTrack: dataSearch,
      });
    });
  } catch (error) {
    console.error(error);
    api.sendMessage("Lỗi: " + error, event.threadID);
  }
};

module.exports.handleReply = async function ({ api, event, handleReply, args }) {
  const userInput = parseInt(event.body.trim());
  if (!isNaN(userInput) && userInput >= 1 && userInput <= handleReply.dataTrack.length) {
    const selectedTrack = handleReply.dataTrack[userInput - 1];
    try {
      const trackUrl = encodeURIComponent(selectedTrack.link);
      const apiUrl = `https://www.bhandarimilan.info.np/spotify?url=${trackUrl}`;
      const apiResponse = await axios.get(apiUrl);

      if (apiResponse.data.success && apiResponse.data.link) {
        const audioLink = apiResponse.data.link;
        const audioResponse = await axios.get(audioLink, { responseType: 'arraybuffer' });
        const audioFilePath = `${__dirname}/cache/spotifyAudio.mp3`;
        fs.writeFileSync(audioFilePath, Buffer.from(audioResponse.data));

        const fileSize = fs.statSync(audioFilePath).size;
        const sizeFormatted = formatSize(fileSize);

        const attachment = fs.createReadStream(audioFilePath);
        if (audioResponse) {
          api.sendMessage(`Downloading track: ${selectedTrack.name}`);
          const trackDetails = `
• Title: ${apiResponse.data.metadata.title}
• Artist: ${apiResponse.data.metadata.artists}
📅 Release Date: ${apiResponse.data.metadata.releaseDate}
💽 Size: ${sizeFormatted}`;
          await api.sendMessage({
            body: `${trackDetails}`,
            attachment: attachment
          }, event.threadID);

          // Thu hồi tin nhắn khi đã xử lý xong
          api.unsendMessage(handleReply.messageID);

        } else {
          console.error("Audio stream not available");
          api.sendMessage("Sorry, the audio file could not be downloaded.");
        }
      } else {
        console.error("Audio link not available");
        api.sendMessage("Sorry, the audio link could not be retrieved.");
      }
    } catch (error) {
      console.error(error);
      api.sendMessage("Error downloading the audio file.");
    }
  } else {
    api.sendMessage('⚠️ Vui lòng nhập 1 con số hợp lệ trong danh sách', event.threadID, event.messageID);
  }
};