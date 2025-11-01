const cc = 30; // Tỉ lệ thành công mặc định cho người chơi bình thường

module.exports.config = {
    name: "cuop",
    version: "1.0.0",
    Rent: 2,
    hasPermssion: 0,
    credits: "Khoa",
    description: "Phủ định học thuyết lao động của triết gia Huấn rô sì :>",
    commandCategory: "Tài Chính",
    usages: "@tag",
    cooldowns: 5, // Cooldown trong config chỉ là cooldown chung, không phải cooldown riêng của lệnh
    envConfig: {
        cooldownTime: 1000 * 60 * 10 // 10 phút cooldown
    }
};

module.exports.languages = {
    "vi": {
        "cooldown": "%3 vừa cướp thành công rồi! Hãy nghỉ ngơi đi. \nQuay lại sau: %1 phút %2 giây.",
        "noMoneySender": "Bạn không có tiền, lỡ bị bắt rồi lấy gì trả!",
        "noTag": "Vui lòng tag mục tiêu!",
        "robBotFail": "Bạn có vẻ muốn cướp bot sao? Dù gì cũng không thể thành công đâu! Bạn đã thất bại và bị phạt %1VND vì tội to gan!",
        "robAdminFail": "Dũng cảm đấy, định cướp admin cơ à? Coi như thất bại và bị phạt %1VND vì tội vô lễ nhé!",
        "noMoneyTarget": "Mục tiêu %1 không có đồng xu dính túi!",
        "success": "Bạn đã cướp thành công %1VND của %2 :>",
        "fail": "Bạn đã cướp %1 thất bại và mất %2VND :>"
    }
};

function Number(number) {
    let strNumber = number.toString();
    let parts = strNumber.split('.');
    let int = parts[0];
    let decimalPart = parts.length > 1 ? '.' + parts[1] : '';
    let pattern = /(-?\d+)(\d{3})/;
    while (pattern.test(int)) {
        int = int.replace(pattern, '$1,$2');
    }
    return int + decimalPart;
}

module.exports.run = async function ({ api, event, Users, Threads, Currencies, getText }) {
    var { threadID, messageID, senderID } = event;

    // Danh sách ID của các admin trong nhóm
    const permission = [
        /* Thêm các ID của các admin vào đây */
        '61554620715942', // Ví dụ: ID của admin 1
        '61570496100333'  // Ví dụ: ID của admin 2
    ];

    // Lấy tên người dùng hiện tại
    let senderName = "Bạn";
    try {
        const userInfo = await api.getUserInfo(senderID);
        if (userInfo && userInfo[senderID]) {
            senderName = userInfo[senderID].name;
        }
    } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng (sender):", error);
    }

    const data1 = await Currencies.getData(senderID);
    const money1 = data1.money;

    // Kiểm tra tiền của người cướp
    if (money1 < 1 || isNaN(money1))    
        return api.sendMessage(getText("noMoneySender"), threadID, messageID);

    var mention = Object.keys(event.mentions)[0];
    if (!mention)    
        return api.sendMessage(getText("noTag"), threadID, messageID);

    const botID = api.getCurrentUserID();
    var name = await Users.getNameUser(mention);

    // Xử lý khi cướp bot hoặc admin (luôn thất bại và bị phạt)
    if (mention == botID || permission.includes(mention)) {
        var sotienmat = Math.floor(Math.random() * money1 / 4) + 1; // Số tiền bị mất
        await Currencies.decreaseMoney(senderID, sotienmat);
        if (mention == botID) {
            return api.sendMessage(getText("robBotFail", Number(sotienmat)), threadID, messageID);
        } else {
            return api.sendMessage(getText("robAdminFail", Number(sotienmat)), threadID, messageID);
        }
    }

    const data2 = await Currencies.getData(mention);
    const money2 = data2.money;

    // Kiểm tra tiền của mục tiêu
    if (money2 < 1 || isNaN(money2))    
        return api.sendMessage(getText("noMoneyTarget", name), threadID, messageID);

    // Xác định tỉ lệ thành công dựa trên quyền hạn
    let successRate = cc; // Mặc định là 30%
    if (permission.includes(senderID)) { // Nếu người cướp là admin
        successRate = 90; // Tỉ lệ thành công 90%
    }

    var tile = Math.floor(Math.random() * 100) + 1; // Tạo số ngẫu nhiên từ 1 đến 100

    if (tile <= successRate) { // Kiểm tra tỉ lệ thành công
        var phan = (money2 < 10000) ? 4 : 8; // Tỉ lệ tiền cướp được dựa trên số tiền mục tiêu
        var sotien = Math.floor(Math.random() * money2 / phan) + 1; // Số tiền cướp được

        await Currencies.increaseMoney(senderID, sotien);
        await Currencies.decreaseMoney(mention, sotien);

        // --- Bắt đầu phần Cooldown chỉ khi cướp thành công ---
        const cooldownTime = this.config.envConfig.cooldownTime;
        const now = Date.now();
        global.client.cooldowns.set(`${this.config.name}-${senderID}`, now);
        // --- Kết thúc phần Cooldown ---

        return api.sendMessage(getText("success", Number(sotien), name), threadID, messageID);
    }
    else {
        var phan = (money1 < 10000) ? 4 : 8; // Tỉ lệ tiền bị mất khi thất bại dựa trên số tiền của người cướp
        var sotienmat = Math.floor(Math.random() * money1 / phan) + 1; // Số tiền bị mất

        await Currencies.decreaseMoney(senderID, sotienmat);
        await Currencies.increaseMoney(mention, sotienmat);

        // Không áp dụng cooldown nếu thất bại
        return api.sendMessage(getText("fail", name, Number(sotienmat)), threadID, messageID);
    }
}