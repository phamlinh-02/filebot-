module.exports.config = {
    name: "antiout",
    eventType: ["log:unsubscribe"],
    version: "0.0.1",
    credits: "DungUwU",
    description: "Listen events"
};

module.exports.run = async({ event, api, Threads, Users }) => {
    let data = (await Threads.getData(event.threadID)).data || {};
    if (!data.antiout) return;
    if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID()) return;
    const name = global.data.userName.get(event.logMessageData.leftParticipantFbId) || await Users.getNameUser(event.logMessageData.leftParticipantFbId);
    const type = (event.author == event.logMessageData.leftParticipantFbId) ? "tự rời" : "bị quản trị viên đuổi";
    if (type == "tự rời") {
        api.addUserToGroup(event.logMessageData.leftParticipantFbId, event.threadID, (error, info) => {
            if (error) {
                api.sendMessage(`[𝐀𝐍𝐓𝐈𝐎𝐔𝐓] 𝐊𝐡𝐨𝐧𝐠 𝐭𝐡𝐞 𝐦𝐨𝐢 ${name} 𝐯𝐚𝐨 𝐥𝐚𝐢 𝐧𝐡𝐨𝐦 `, event.threadID)
            } else api.sendMessage(`[𝐀𝐍𝐓𝐈𝐎𝐔𝐓] 𝐃𝐚 𝐦𝐨𝐢 ${name} 𝐯𝐚𝐨 𝐥𝐚𝐢 𝐧𝐡𝐨𝐦`, event.threadID);
        })
    }
}