module.exports.config = {
    name: "cmsn",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "TuấnDz (modified)",
    description: "Chúc mừng sinh nhật liên tục người bạn tag trong 8 lần",
    commandCategory: "Tiện ích",
    usages: "cmsn [năm] @mention",
    cooldowns: 10



,
    dependencies: {
        "fs-extra": "",
        "axios": ""
    }
}

module.exports.run = async function({ api, args, Users, event}) {
    var mention = Object.keys(event.mentions)[0];
    if(!mention) return api.sendMessage("Cần phải tag 1 người bạn muốn chúc mừng sinh nhật", event.threadID);
    let name = await Users.getNameUser(mention); // Lấy tên người dùng không có @
    var arraytag = [];
        arraytag.push({id: mention, tag: name});
    let year = args[0] && !isNaN(args[0]) ? parseInt(args[0]) : null;
    let age = year ? new Date().getFullYear() - year : null;
    let message = age ? `🎉 Chúc mừng sinh nhật tuổi ${age} ${name}! 😊` : `🎉 Chúc mừng sinh nhật ${name}! 😊`;
    
    var a = function (a) { api.sendMessage(a, event.threadID); }
    a({body: message, mentions: arraytag});
    setTimeout(() => {a(`Chúc ${name} một sinh nhật rực rỡ, tràn đầy niềm vui và khoảnh khắc đáng nhớ bên người thân yêu! 🌟`)} , 3000);
    setTimeout(() => {a(`Mong ${name} luôn khỏe mạnh, hạnh phúc và đạt mọi mục tiêu trong năm mới này! 🎈`)} , 4000);
    setTimeout(() => {a(`Chúc ${name} một năm đầy thành công, may mắn và những cơ hội để tỏa sáng rực rỡ! 🎁`)} , 5000);
    setTimeout(() => {a(`Chúc ${name} nụ cười luôn rạng rỡ, trái tim ấm áp và giấc mơ thành hiện thực! 😊`)} , 6000);
    setTimeout(() => {a(`Mong ${name} gặp nhiều may mắn, luôn lạc quan và tận hưởng ngày đặc biệt này! 🌈`)} , 7000);
    setTimeout(() => {a(`Chúc ${name} một sinh nhật ý nghĩa, đầy tình yêu và những bất ngờ thú vị! ❤️`)} , 8000);
    setTimeout(() => {a(`Chúc ${name} luôn vui vẻ, mọi điều ước sinh nhật đều trở thành hiện thực! 🌟`)} , 9000);
    setTimeout(() => {a(`Hôm nay ${name} là ngôi sao sáng nhất, chúc bạn hành trình mới đầy ý nghĩa, hạnh phúc và lan tỏa yêu thương! 🎉`)} , 10000);
}