module.exports.config = {
  name: "trom",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "convert Mirai",
  description: "stole all members of a specific group to the current group",
  commandCategory: "Admin",
  usages: "stole <threadID>",
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const targetThreadID = args[0];
  const currentThreadID = event.threadID;

  if (!targetThreadID) {
    return api.sendMessage("vui lòng thêm id nhóm d? box b?t c?c v? nhóm mình", currentThreadID, event.messageID);
  }

  try {
    const threadInfo = await api.getThreadInfo(targetThreadID);
    const participantIDs = threadInfo.participantIDs;

    for (const memberID of participantIDs) {
      const currentThreadInfo = await api.getThreadInfo(currentThreadID);
      const currentParticipantIDs = currentThreadInfo.participantIDs;

      if (!currentParticipantIDs.includes(memberID)) {
        await new Promise((resolve, reject) => {
          api.addUserToGroup(memberID, currentThreadID, (err) => {
            if (err) {
              console.error("Failed to steal members to the current group:", err);
              return reject(err);
            }
            console.log(`User ${memberID} added to the current group.`);
            resolve();
          });
        });
      }
    }

    api.sendMessage(`All members from thread ${targetThreadID} have been stolen successfully.`, currentThreadID, event.messageID);
  } catch (error) {
    console.error("Error stealing members:", error);
    api.sendMessage(`Failed to steal members from thread ${targetThreadID}. Please try again later.`, currentThreadID, event.messageID);
  }
};
