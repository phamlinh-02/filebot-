module.exports.config = {
  name: "thamgia",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "cherry", //ntkhang fix :(
  description: "...",
  commandCategory: "Admin",
  usages: "bủh",
  cooldowns: 0,
  dependencies: {
    request: "",
    "fs-extra": "",
    axios: "",
  },
};
module.exports.handleReply = async ({ event, api, handleReply, Threads }) => {
  var { threadID, messageID, body, senderID } = event;
  var { threadList, author } = handleReply;
  if (senderID != author) return;
  api.unsendMessage(handleReply.messageID);
  if (!body || !parseInt(body))
    return api.sendMessage(
      "Lựa chọn của admin pro phải là một số.",
      threadID,
      messageID,
    );
  if (!threadList[parseInt(body) - 1])
    return api.sendMessage(
      "Lựa chọn của admin pro không nằm trong danh sách",
      threadID,
      messageID,
    );
  else {
    try {
      var threadInfo = threadList[parseInt(body) - 1];
      var { participantIDs } = threadInfo;
      if (participantIDs.includes(senderID))
        return api.sendMessage(
          "admin đã có mặt trong nhóm này.",
          threadID,
          messageID,
        );
      api.addUserToGroup(senderID, threadInfo.threadID, (e) => {
        if (e)
          api.sendMessage(
            `Đã cảy ra lỗi: ${e.errorDescription}`,
            threadID,
            messageID,
          );
        else
          api.sendMessage(
            `🐧Bot đã thêm bạn vào nhóm. Vui lòng check mục tin nhắn spam hoặc chờ quản trị viên của nhóm duyệt.\nĐiều hành bởi: Hùng CTer`,
            threadID,
            messageID,
          );
      });
    } catch (error) {
      return api.sendMessage(`:( Em bị lỗi: ${error}`, threadID, messageID);
    }
  }
};

module.exports.run = async function ({ api, event, Threads }) {
  var { threadID, messageID, senderID } = event;
  var allThreads = (await api.getThreadList(500, null, ["INBOX"])).filter(
      (i) => i.isGroup,
    ),
    msg = `Danh sách tất cả các box admin có thể tham gia:\n`,
    number = 0;
  for (var thread of allThreads) {
    number++;
    msg += `${number}. ${thread.name}\n`;
  }
  msg += `\nReply tin nhắn này kèm số tương ứng với box mà admin muốn vào.`;
  return api.sendMessage(
    msg,
    threadID,
    (error, info) => {
      global.client.handleReply.push({
        name: this.config.name,
        messageID: info.messageID,
        author: senderID,
        threadList: allThreads,
      });
    },
    messageID,
  );
};
