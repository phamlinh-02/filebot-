module.exports.config = {
  name: "hi",
  version: "1.0.0",
  hasPermssion: 0,
  credit: "Sam",
  description: "hi gửi sticker",
  commandCategory: "Giải trí",
  usages: "[text]",
  cooldowns: 5
}

module.exports.handleEvent = async ({ event, api, Users }) => {
  let KEY = [ 
    "hello",
    "hi",
    "hai",
    "chào",
    "chao",
    "hí",
    "híí",
    "hì",
    "hìì",
    "lô",
    "hii",
    "helo",
    "hê nhô"
  ];
  let thread = global.data.threadData.get(event.threadID) || {};
  if (typeof thread["hi"] == "undefined", thread["hi"] == false) return
  else {
  if (KEY.includes((event.body || '').toLowerCase()) !== false) {
    let data = [
      "526214684778630",
      "526220108111421",
      "526220308111401",
      "526220484778050",
      "526220691444696",
      "526220814778017",
      "526220978111334",
      "526221104777988",
      "526221318111300",
      "526221564777942",
      "526221711444594",
      "526221971444568",
      "1841028362616606",
      "1841028482616594",
      "1841028609283248",
      "526220308111401",
      "193082987877305",
      "2041011389459668", 
      "2041011569459650", 
      "2041011726126301",
      "2041011836126290", 
      "2041011952792945", 
      "2041012109459596", 
      "2041012262792914", 
      "2041012406126233", 
      "2041012539459553",
      "2041012692792871",
      "2041014432792697",
      "2041014739459333", 
      "2041015016125972", 
      "2041015182792622",
      "2041015329459274",
      "2041015422792598",
      "2041015576125916",
      "2041017422792398", 
      "2041020049458802",
      "2041020599458747", 
      "2041021119458695",
      "2041021609458646",
      "2041022029458604", 
      "2041022286125245",
      "2523892817885618",
      "2523892964552270",
      "2523893081218925",
      "2523893217885578",
      "2523893384552228",
      "2523892544552312",
      "2523892391218994",
      "2523891461219087",
      "2523891767885723",
      "2523891204552446",
      "2523890691219164",
      "2523890981219135",
      "2523890374552529",
      "2523889681219265",
      "2523889851219248",
      "2523890051219228",
      "2523886944552872",
      "2523887171219516",
      "2523888784552688",
      "2523888217886078",
      "2523888534552713",
      "2523887371219496",
      "2523887771219456",
      "2523887571219476",
      "237319333754393",
      "237320717087588",
      "237320150420978",
      "237320493754277",
      "237319140421079",
      "237317540421239",
      "237318950421098",
      "254597059336998",
      "254597706003600",
      "254593389337365",
      "254595492670488",
      "254595732670464",
      "254595959337108",
      "4046865862027268",
      "4046879105359277",
      "4046655705381617",
      "1926231774082483",
      "1926234657415528",
      "1926234920748835",
      "1926237197415274"
    ];
    let sticker = data[Math.floor(Math.random() * data.length)];
    let moment = require("moment-timezone");
    let hours = moment.tz('Asia/Ho_Chi_Minh').format('HHmm');
    let data2 = [
      "tốt lành 🥳",
      "vui vẻ 😄",
      "hạnh phúc ❤",
      "yêu đời 😘",
      "may mắn 🍀",
      "full năng lượng ⚡",
      "tuyệt vời 😁",
      "tỉnh táo 🤓",
      "đầy sức sống 😽",
      "nhiệt huyết 🔥"
    ];
    let text = data2[Math.floor(Math.random() * data2.length)]
    let session = (
    hours > 0001 && hours <= 400 ? "sáng tinh mơ" : 
    hours > 401 && hours <= 700 ? "sáng sớm" :
    hours > 701 && hours <= 1000 ? "sáng" :
    hours > 1001 && hours <= 1200 ? "trưa" : 
    hours > 1201 && hours <= 1700 ? "chiều" : 
    hours > 1701 && hours <= 1800 ? "chiều tà" : 
    hours > 1801 && hours <= 2100 ? "tối" : 
    hours > 2101 && hours <= 2400 ? "tối muộn" : 
    "lỗi");
    let name = await Users.getNameUser(event.senderID);
    let mentions = [];
    mentions.push({
      tag: name,
      id: event.senderID
    })
    let msg = {body: `Xin chào ${name}, chúc bạn một buổi ${session} ${text}`, mentions}
    api.sendMessage(msg, event.threadID, (e, info) => {
      setTimeout(() => {
        api.sendMessage({sticker: sticker}, event.threadID);
      }, 100)
    }, event.messageID)
  }
  }
}

module.exports.languages = {
  "vi": {
    "on": "Bật",
    "off": "Tắt",
    "successText": `${this.config.name} thành công`,
  },
  "en": {
    "on": "on",
    "off": "off",
    "successText": "success!",
  }
}

module.exports.run = async ({ event, api, Threads, getText }) => {
  let { threadID, messageID } = event;
  let data = (await Threads.getData(threadID)).data;
  if (typeof data["hi"] == "undefined" || data["hi"] == true) data["hi"] = false;
  else data["hi"] = true;
  await Threads.setData(threadID, {
    data
  });
  global.data.threadData.set(threadID, data);
  return api.sendMessage(`${(data["hi"] == false) ? getText("off") : getText("on")} ${getText("successText")}`, threadID, messageID);
}