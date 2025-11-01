module.exports.config = {
    name: "spamtag",
    version: "3.0.0",
    hasPermssion: 3,
    Rent: 2,
    credits: "Vtuan",
    description: "Spam đến chết 1 nội dung (gọi hồn liên tục)",
    commandCategory: "War/tag",
    usages: "tag",
    cooldowns: 1
  };
  const spamThreads = new Map(); 
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  module.exports.run = async function({ api, event, args }) {
    const timedelay = 2;
    const { threadID, messageID } = event;
    if (args[0] === "stop") {
      const state = spamThreads.get(threadID);
      if (state) {
        let stopIndex = state.i; 
        spamThreads.delete(threadID);
        api.sendMessage(`Đã tạm dừng`, threadID, messageID);
      } else {
        api.sendMessage("Chưa ai bị tag!", threadID, messageID);
      }
      return;
    }
    const content = (args.length != 0) ? args.join(" ") : ``
    var mention = Object.keys(event.mentions)[0];
    if (!mention) return api.sendMessage("Cần phải tag 1 người!", event.threadID);
    let name = event.mentions[mention];
    var arraytag = [];
    arraytag.push({ id: mention, tag: name });
    if (!spamThreads.has(threadID)) {
      let i = 0; 
      spamThreads.set(threadID, { i });
      while (spamThreads.has(threadID)) {
        await api.sendMessage({
          body: `${content}`, mentions: arraytag },threadID)
        await delay(timedelay * 1000);
        i++;
        spamThreads.get(threadID).i = i; 
      }
    }
  };