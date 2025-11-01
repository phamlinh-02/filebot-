
//lưu ý , api có thể liên quan tới pháp luật , nên cân nhắc khi vô file lấy api chỉnh sửa nhiều thứ
//cấm đổi credits
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const expectedCredits = "Nguyễn Trương Thiện Phát (Pcoder)";
const creditsFilePath = path.join(__dirname, 'credits_config.json');

function loadExpectedCredits() {
    try {
        if (fs.existsSync(creditsFilePath)) {
            const data = fs.readFileSync(creditsFilePath, 'utf8');
            return JSON.parse(data).credits;
        }
        return null;
    } catch (err) {
        console.error("❌ Lỗi khi đọc file credits:", err);
        return null;
    }
}

function saveExpectedCredits() {
    try {
        const data = { credits: expectedCredits };
        fs.writeFileSync(creditsFilePath, JSON.stringify(data), 'utf8');
        console.log("✅ Đã lưu thông tin credits vào file.");
    } catch (err) {
        console.error("❌ Lỗi khi lưu file credits:", err);
    }
}

function checkCredits() {
    const currentCredits = loadExpectedCredits();
    if (currentCredits !== expectedCredits) {
        logErrorAndExit('credits', __filename, 19);
    }
}

function logErrorAndExit(whatChanged, fileName, lineNumber) {
    console.log(`⚠️ Địt Mẹ Mày, ai cho mày đổi ${whatChanged} ?????`);
    console.log(`Vui lòng kiểm tra và sửa lại giá trị "${whatChanged}" trong tệp.`);
    console.log(`Sửa lại giá trị "${whatChanged}" tại dòng: ${lineNumber} trong file ${fileName}`);
    process.exit(1);
}

function checkConfig() {
    // Đảm bảo rằng module.exports.config được xác định trước khi kiểm tra
    if (module.exports && module.exports.config && module.exports.config.credits !== expectedCredits) {
        logErrorAndExit('credits trong config', __filename, 28);
    }
}

function createConfigFileIfNotExist() {
    if (loadExpectedCredits() === null) {
        saveExpectedCredits();
    }
}

function checkAllConfigs() {
    checkCredits();
    checkConfig();
}

function prepareConfigModule() {
    module.exports.config = {
        name: "phatnguoi",
        version: "1.0.1",
        hasPermission: 0,
        credits: expectedCredits,
        description: "Kiểm tra phạt nguội xe máy, ô tô, xe máy điện",
        commandCategory: "Tiện ích",
        usages: "[Biển số xe]",
        cooldowns: 5,
    };
}

function handleRequest({ api, event, args }) {
    const bienSo = args.join("").toUpperCase();

    if (!bienSo) {
        return api.sendMessage("⚠️ Vui lòng nhập biển số xe cần kiểm tra. VD : /phatnguoi 72A12345", event.threadID, event.messageID);
    }

    processCheckRequest(api, event, bienSo);
}

async function processCheckRequest(api, event, bienSo) {
    try {
        const response = await axios.post("https://api.checkphatnguoi.vn/phatnguoi", { bienso: bienSo }, {
            headers: { "Content-Type": "application/json" }
        });

        const { status, data, data_info } = response.data;

        if (status === 1 && data.length > 0) {
            await sendViolationMessage(api, event, bienSo, data_info, data);
        } else {
            api.sendMessage(`✅ Biển số **${bienSo}** không có phạt nguội.`, event.threadID, event.messageID);
        }
    } catch (error) {
        handleError(api, event, error);
    }
}

async function sendViolationMessage(api, event, bienSo, data_info, data) {
    let message = `🚨 *Kết quả kiểm tra phạt nguội cho biển số: **${bienSo}**\n`;
    message += `📊 Tổng số vi phạm: ${data_info.total}\n`;
    message += `❌ Chưa xử phạt: ${data_info.chuaxuphat} | ✅ Đã xử phạt: ${data_info.daxuphat}\n`;
    message += `⏰ Lần vi phạm gần nhất: ${data_info.latest || "Không có lỗi"}\n\n`;

    data.forEach((violation, index) => {
        message += `🚔 *Vi phạm ${index + 1}:*\n`;
        message += `📅 *Thời gian:* ${violation["Thời gian vi phạm"] || "Không có lỗi"}\n`;
        message += `📍 *Địa điểm:* ${violation["Địa điểm vi phạm"] || "Không có lỗi"}\n`;
        message += `⚠️ *Lỗi vi phạm:* ${violation["Hành vi vi phạm"] || "Không có lỗi"}\n`;
        message += `📌 *Trạng thái:* ${violation["Trạng thái"] || "Không có lỗi"}\n`;
        message += `🚓 *Đơn vị phát hiện:* ${violation["Đơn vị phát hiện vi phạm"] || "Không có lỗi"}\n\n`;

        message += `📌 *Nơi giải quyết vụ việc:*\n`;
        if (violation["Nơi giải quyết vụ việc"] && violation["Nơi giải quyết vụ việc"].length > 0) {
            violation["Nơi giải quyết vụ việc"].forEach((place, i) => {
                message += `📍 ${place}\n`;
            });
        } else {
            message += "🏢 Không có thông tin nơi giải quyết\n";
        }
        message += "\n";
    });

    api.sendMessage(message, event.threadID, event.messageID);
}

function handleError(api, event, error) {
    console.error("❌ Lỗi khi kiểm tra phạt nguội:", error.message);
    api.sendMessage("⚠️ Đã xảy ra lỗi khi kiểm tra. Vui lòng thử lại sau.", event.threadID, event.messageID);
}

createConfigFileIfNotExist();
checkAllConfigs();

prepareConfigModule();

module.exports.run = handleRequest;
