const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const stream = require("stream");
const { Buffer } = require('buffer');

dotenv.config({ override: true });

const API_KEY = "AIzaSyDm2hVLDnqwOYuzDxiy4oXT_ZCmPbxJYH8";
const model = "gemini-2.0-flash";
const GENAI_DISCOVERY_URL = `https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta&key=${API_KEY}`;

const TAROT_MAJOR = [
    "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor", "The Hierophant",
    "The Lovers", "The Chariot", "Strength", "The Hermit", "Wheel of Fortune", "Justice", "The Hanged Man",
    "Death", "Temperance", "The Devil", "The Tower", "The Star", "The Moon", "The Sun", "Judgement", "The World"
];

const TAROT_TOPICS = [
    "Công vi?c", "Tình duyên", "Tài chính", "S?c kh?e", "Gia dình", "Phát tri?n b?n thân", "H?c t?p", "M?i quan h? xã h?i"
];

const TAROT_COLORS = [
    { name: "Ð?", hex: "#e53935" },
    { name: "Xanh duong", hex: "#1e88e5" },
    { name: "Vàng", hex: "#fbc02d" },
    { name: "Tím", hex: "#8e24aa" },
    { name: "Xanh lá", hex: "#43a047" },
    { name: "Cam", hex: "#fb8c00" },
    { name: "H?ng", hex: "#ec407a" },
    { name: "Xanh ng?c", hex: "#00bcd4" },
    { name: "Nâu", hex: "#8d6e63" },
    { name: "Ðen", hex: "#212121" },
    { name: "Tr?ng", hex: "#fafafa" },
    { name: "Xám", hex: "#757575" },
    { name: "Xanh bi?n", hex: "#1976d2" },
    { name: "Vàng chanh", hex: "#cddc39" },
    { name: "Xanh rêu", hex: "#558b2f" }
];

function drawTarotCard(cardName, colorHex, userInfo, topics) {
    const canvas = createCanvas(400, 600);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 400, 600);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 380, 580);

    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(cardName, 200, 80);

    ctx.font = "18px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(`H? tên: ${userInfo.name}`, 30, 140);
    ctx.fillText(`Ngày sinh: ${userInfo.birth}`, 30, 170);
    ctx.fillText(`Ch? d?: ${topics.map(i => TAROT_TOPICS[i]).join(", ")}`, 30, 200);

    ctx.beginPath();
    ctx.arc(200, 350, 80, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff2";
    ctx.fill();

    ctx.font = "italic 20px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("Tarot Reading", 200, 570);

    const filePath = path.join(__dirname, "cache", `tarot_${Date.now()}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer());
    return filePath;
}

async function getGeminiTarot(uid, prompt, fileUrls) {
    const genaiService = await google.discoverAPI({ url: GENAI_DISCOVERY_URL });
    const auth = new google.auth.GoogleAuth().fromAPIKey(API_KEY);

    const fileDataParts = [];
    if (fileUrls && fileUrls.length > 0) {
        for (const fileUrl of fileUrls) {
            const imageBase64 = fs.readFileSync(fileUrl).toString("base64");
            const bufferStream = new stream.PassThrough();
            bufferStream.end(Buffer.from(imageBase64, "base64"));
            const media = {
                mimeType: "image/png",
                body: bufferStream,
            };
            const body = { file: { displayName: "Tarot Card" } };
            const createFileResponse = await genaiService.media.upload({
                media,
                auth,
                requestBody: body,
            });
            const file = createFileResponse.data.file;
            fileDataParts.push({ file_uri: file.uri, mime_type: file.mimeType });
        }
    }

    const contents = {
        contents: [
            {
                role: "user",
                parts: [{ text: prompt }, ...fileDataParts.map(data => ({ file_data: data }))],
            },
        ],
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
        generation_config: {
            maxOutputTokens: 2048,
            temperature: 0.7,
            topP: 0.8,
        },
    };

    const generateContentResponse = await genaiService.models.generateContent({
        model: `models/${model}`,
        requestBody: contents,
        auth: auth,
    });

    return generateContentResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

module.exports = {
    config: {
        name: "tarot",
        version: "1.0.0",
        hasPermssion: 0,
        credits: "Dungkon",
        description: "Xem tarot b?ng AI (không dúng, dùng AI d? ch?n lá và gi?i nghia lá bài dó)",
        commandCategory: "box",
        usages: "tarot",
        cooldowns: 5,
    },

    run: async ({ api, event }) => {
        api.sendMessage(
            "?? Tarot AI(ch? có m?c dích vui)\nVui lòng reply tin nh?n này v?i:\n1. H? và tên c?a b?n",
            event.threadID,
            (err, info) => {
                global.client.handleReply.push({
                    name: "tarot",
                    step: 1,
                    messageID: info.messageID,
                    author: event.senderID,
                    userInfo: {}
                });
            },
            event.messageID
        );
    },

    handleReply: async ({ api, event, handleReply }) => {
        if (event.senderID !== handleReply.author) return;
        const { step, userInfo } = handleReply;

        if (step === 1) {
            userInfo.name = event.body.trim();
            return api.sendMessage(
                "2. Ngày tháng nam sinh c?a b?n (dd/mm/yyyy)",
                event.threadID,
                (err, info) => {
                    global.client.handleReply.push({
                        name: "tarot",
                        step: 2,
                        messageID: info.messageID,
                        author: event.senderID,
                        userInfo
                    });
                },
                event.messageID
            );
        }

        if (step === 2) {
            userInfo.birth = event.body.trim();
            let msg = "3. Ch?n màu b?n thích (reply s?):\n";
            TAROT_COLORS.forEach((c, i) => {
                msg += `${i + 1}. ${c.name}\n`;
            });
            return api.sendMessage(
                msg,
                event.threadID,
                (err, info) => {
                    global.client.handleReply.push({
                        name: "tarot",
                        step: 3,
                        messageID: info.messageID,
                        author: event.senderID,
                        userInfo
                    });
                },
                event.messageID
            );
        }

        if (step === 3) {
            const colorIdx = parseInt(event.body.trim()) - 1;
            if (isNaN(colorIdx) || colorIdx < 0 || colorIdx >= TAROT_COLORS.length) {
                return api.sendMessage("Vui lòng ch?n s? h?p l?!", event.threadID, event.messageID);
            }
            userInfo.color = TAROT_COLORS[colorIdx];
            let msg = "4. B?n mu?n xem v? linh v?c nào? (reply s?, có th? nhi?u s? cách nhau b?i d?u ph?y)\n";
            TAROT_TOPICS.forEach((t, i) => {
                msg += `${i + 1}. ${t}\n`;
            });
            msg += "\nVí d?: 1,2 d? xem Công vi?c và Tình duyên";
            return api.sendMessage(
                msg,
                event.threadID,
                (err, info) => {
                    global.client.handleReply.push({
                        name: "tarot",
                        step: 4,
                        messageID: info.messageID,
                        author: event.senderID,
                        userInfo
                    });
                },
                event.messageID
            );
        }

        if (step === 4) {
            let topicIdxs = event.body.trim().split(",").map(s => parseInt(s) - 1).filter(i => i >= 0 && i < TAROT_TOPICS.length);
            if (!topicIdxs.length) {
                return api.sendMessage("Vui lòng ch?n s? h?p l?!", event.threadID, event.messageID);
            }
            userInfo.topics = topicIdxs;

            const prompt =
                `B?n là chuyên gia Tarot. D?a trên thông tin sau, hãy ch?n 1 lá bài Major Arcana phù h?p nh?t v?i ngu?i dùng, gi?i thích ý nghia và dua ra l?i khuyên th?c t?:\n` +
                `- H? tên: ${userInfo.name}\n- Ngày sinh: ${userInfo.birth}\n- Màu s?c yêu thích: ${userInfo.color.name}\n- Ch? d?: ${topicIdxs.map(i => TAROT_TOPICS[i]).join(", ")}\n` +
                `Danh sách các lá bài Major Arcana: ${TAROT_MAJOR.join(", ")}\n` +
                `Tr? v? dúng tên lá bài b?n ch?n ? d?u câu tr? l?i, sau dó là ý nghia và l?i khuyên.`;

            api.sendMessage("?? Ðang d? AI ch?n lá bài phù h?p nh?t cho b?n...", event.threadID, async (err, info) => {
                try {
                    const aiText = await getGeminiTarot(event.senderID, prompt, []);
                    let cardName = TAROT_MAJOR.find(card => aiText.toLowerCase().includes(card.toLowerCase()));
                    if (!cardName) cardName = TAROT_MAJOR[Math.floor(Math.random() * TAROT_MAJOR.length)]; 
                    const imgPath = drawTarotCard(cardName, userInfo.color.hex, userInfo, topicIdxs);

                    api.sendMessage({
                        body: `?? Lá bài AI ch?n cho b?n là: ${cardName}\nGi?i nghia:\n${aiText}`,
                        attachment: fs.createReadStream(imgPath)
                    }, event.threadID, () => {
                        fs.unlink(imgPath, () => {});
                    });
                } catch (e) {
                    api.sendMessage("? L?i AI: " + e.message, event.threadID);
                }
            }, event.messageID);
        }
    }
};