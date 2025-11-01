module.exports.config = {
	name: "lyrics",
	version: "1.0.0",
	hasPermssion: 0,
	credits: "Jukie~",
	description: "Lyrics from nhaccuatui",
	commandCategory: "Tiện ích",
	usages: "lyrics [name of the song]",
	cooldowns: 5
};

module.exports.run = async ({ api, event,args }) => {
const axios = require("axios");
let song = args.join(" ");
const res = await axios.get(`https://api.popcat.xyz/lyrics?song=${song}`);
var lyrics = res.data.lyrics;
var name = res.data.title;
var artist = res.data.artist;
const image = res.data.image;
const download = (await axios.get(image, {
        responseType: "stream"
    })).data;
return api.sendMessage({body:`Title: ${name}\nArtist: ${artist}\n\nLyrics:\n${lyrics}`,attachment : download} ,  event.threadID, event.messageID)
}
