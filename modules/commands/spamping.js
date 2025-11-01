module.exports.config = {
  name: "spamping",
  version: "2.0.0",
  hasPermssion: 1,
  Rent: 2,
  credits: "Vtuan",
  description: "spam đến chết một nội dung",
  commandCategory: "War/tag",
  usages: "",
  cooldowns: 1,
  envConfig: {
    spamDelay: 2  
  }
};

const spamThreads = new Set();  
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports.run = async function ({ api, event, args }) { 
  const { threadID, messageID } = event;
  const botID = api.getCurrentUserID();
  const originalContent = (args.length != 0) ? args.join(" ") : "@mọi người";
  const listUserID = event.participantIDs.filter(ID => ID != botID && ID != event.senderID);

  if (args[0] === "stop") {
    if (spamThreads.has(threadID)) {
      spamThreads.delete(threadID);
      return api.sendMessage('Đã dừng spam!', threadID, messageID);
    } 
    return api.sendMessage('Không có quá trình spam nào đang diễn ra!', threadID, messageID);
  } 

  if (!spamThreads.has(threadID)) {
    spamThreads.add(threadID);
    api.sendMessage(`Bắt đầu spam!`, threadID, messageID);
    while (spamThreads.has(threadID)) {
      await delay(this.config.envConfig.spamDelay * 1000);

      if (spamThreads.has(threadID)) {
        let content = "‎" + originalContent;
        let mentions = listUserID.map(idUser => ({ id: idUser, tag: content, fromIndex: 0 }));

        api.sendMessage({ body: content, mentions }, threadID);
      }
    }
  } else {
    api.sendMessage('Đang spam rồi cut!', threadID, messageID);
  }
};