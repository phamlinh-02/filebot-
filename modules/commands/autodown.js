const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const autodownConfig = {
    name: "autodown",
    version: "1.0.5",
    hasPermssion: 0,
    credits: "gấu lỏ",
    description: "Tự động tải video/ảnh từ các nền tảng",
    commandCategory: "Tiện ích",
    usages: "[link] hoặc bật/tắt autodown",
    cooldowns: 5
};
const cacheDirectory = (() => {
    const dir = path.join(__dirname, "cache");
    fs.existsSync(dir) || fs.mkdirSync(dir);
    return dir;
})();
const stateFile = path.join(cacheDirectory, "autodown_state.json");
const persistState = obj => fs.writeFileSync(stateFile, JSON.stringify(obj, null, 4));
const retrieveState = () => {
    if (!fs.existsSync(stateFile)) persistState({});
    return JSON.parse(fs.readFileSync(stateFile));
};
module.exports.config = autodownConfig;
module.exports.run = async function ({ api, event }) {
    const { threadID } = event;
    const state = retrieveState();
    state[threadID] = state[threadID] || { enabled: true };
    state[threadID].enabled = !state[threadID].enabled;
    persistState(state);
    return api.sendMessage(`Đã ${(state[threadID].enabled ? "Bật" : "Tắt")} tự động tải link ✅`, threadID);
};
module.exports.handleEvent = async function ({ api, event }) {
    const { threadID, messageID, body } = event;
    if (!body) return;
    const state = retrieveState();
    state[threadID] = state[threadID] || { enabled: true };
    if (!state[threadID].enabled) return;
    const match = body.match(/https?:\/\/[^\s]+/g);
    if (!match) return;
    const url = match[0].replace(/[^\w\d:/?&=%.~-]/g, "");
    const supported = ["facebook.com", "tiktok.com", "v.douyin.com", "instagram.com", "threads.com", "youtube.com", "youtu.be"];
    if (!supported.some(domain => url.includes(domain))) return;
    const fetchMedia = async (url, ext) => {
        const filename = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
        const filepath = path.join(cacheDirectory, filename);
        const res = await axios.get(url, { responseType: "arraybuffer" });
        fs.writeFileSync(filepath, res.data);
        return { stream: fs.createReadStream(filepath), path: filepath };
    };
    try {
        const { data } = await axios.get(`https://niio-team.onrender.com/downr?url=${encodeURIComponent(url)}`);
        if (data.error || !Array.isArray(data.medias)) return;
        const { title = "Không có tiêu đề", author = "Không rõ", source = "Unknown" } = data;
        const header = `[${source.toUpperCase()}] - Tự Động Tải`;
        const info = `👤 Tác giả: ${author}\n💬 Tiêu đề: ${title}`;
        const medias = data.medias;
        const allAttachments = [];
        const tempPaths = [];
        for (const media of medias) {
            if (media.type !== "video" && media.type !== "image") continue;
            const { stream, path: temp } = await fetchMedia(media.url, media.extension || "bin");
            allAttachments.push(stream);
            tempPaths.push(temp);
        }
        if (allAttachments.length > 0) {
            await api.sendMessage({ body: `${header}\n\n${info}`, attachment: allAttachments }, threadID, () => {
                for (const file of tempPaths) fs.unlinkSync(file);
            }, messageID);
        }
    } catch (err) {
        console.error("❌ Lỗi tải media:", err.message || err);
    }
};