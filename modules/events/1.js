module.exports.config = {
  name: "updateQtv",
  eventType: ["log:thread-admins"],
  version: "1.0.2",
  author: "ChatGPT Fix",
  info: "Tự động cập nhật quản trị viên nhóm"
};

module.exports.run = function ({ api, event, Threads }) {
  const { threadID, logMessageType } = event;

  if (logMessageType !== "log:thread-admins") return;

  api.getThreadInfo(threadID, (err, threadInfo) => {
    if (err || !threadInfo) {
      console.log("❌ Không lấy được thông tin nhóm:", err);
      return api.sendMessage("⚠️ Không thể lấy thông tin nhóm.", threadID);
    }

    const qtvCount = threadInfo.adminIDs?.length || 0;

    Threads.setData(threadID, { threadInfo }, (err) => {
      if (!err) global.data.threadInfo.set(threadID, threadInfo);

      api.sendMessage(`✅ Đã cập nhật ${qtvCount} quản trị viên.`, threadID, (err, info) => {
        if (err) return;

        setTimeout(() => {
          api.unsendMessage(info.messageID, (err) => {
            if (err) console.error("❌ Lỗi unsend:", err);
          });
        }, 3000);
      });
    });
  });
};
