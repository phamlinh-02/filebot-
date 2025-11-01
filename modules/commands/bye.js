module.exports.config = {
  name: "bye",
  version: "1.0.0",
  hasPermssion: 0,
  credit: "Sam",
  description: "Gửi lời chào tạm biệt",
  commandCategory: "Quản Trị Viên", 
  usages: "[text]",
  cooldowns: 5
}

module.exports.handleEvent = async ({ event, api, Users }) => {
  let KEY = [
    "bye",
    "pai",
    "bai", 
    "tạm biệt",
    "tam biet",
    "goodbye",
    "see you",
    "see ya",
    "biết",
    "chào tạm biệt",
    "hen gap lai"
  ];
  
  let thread = global.data.threadData.get(event.threadID) || {};
  if (typeof thread["bye"] == "undefined" || thread["bye"] == false) return;
  
  if (KEY.includes(event.body.toLowerCase())) {
    let name = await Users.getNameUser(event.senderID);
    let msg = {
      body: `Tạm biệt ${name} nha bạn nhớ sớm quay lại nhé\nNhi và mọi người trong nhóm đợi ${name} đó mãi iu:3`,
      mentions: [{
        tag: name,
        id: event.senderID
      }]
    }
    api.sendMessage(msg, event.threadID, event.messageID);
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
  
  if (typeof data["bye"] == "undefined" || data["bye"] == false) {
    data["bye"] = true;
  } else {
    data["bye"] = false;
  }
  
  await Threads.setData(threadID, { data });
  global.data.threadData.set(threadID, data);
  
  return api.sendMessage(
    `${(data["bye"] == false) ? getText("off") : getText("on")} ${getText("successText")}`,
    threadID,
    messageID
  );
}