module.exports.config = {
  name: "setmoney",
  version: "1.0.0",
  hasPermssion: 3,
  credits: "CatalizCS",
  description: "Điều chỉnh thông tin của người dùng",
  commandCategory: "Admin",
  usages: "[add/set/clean/reset] [Số tiền] [Tag người dùng/all]",
  cooldowns: 5
};

// Hàm hỗ trợ format số tiền
function formatNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Hàm mới để parse và giới hạn số tiền
function parseAndLimitMoney(moneyInput) {
  let parsedMoney = parseInt(moneyInput);
  if (isNaN(parsedMoney)) {
    return null; // Trả về null nếu không phải số hợp lệ
  }
  // Giới hạn số tiền không vượt quá Number.MAX_SAFE_INTEGER
  return Math.min(parsedMoney, Number.MAX_SAFE_INTEGER);
}

module.exports.run = async function({ event, api, Currencies, args }) {
  const { threadID, messageID, senderID } = event;
  const { throwError } = global.utils;
  const mentionID = Object.keys(event.mentions);
  
  // Sử dụng parseAndLimitMoney để xử lý số tiền đầu vào
  const money = parseAndLimitMoney(args[1]);

  var message = [];
  var error = [];
  try {
    switch (args[0]) {
      case "add": {
        if (mentionID.length != 0) {
          if (money === null) return api.sendMessage('❎ Số tiền phải là một số hợp lệ', threadID, messageID);
          for (singleID of mentionID) {
            try {
              await Currencies.increaseMoney(singleID, money);
              message.push(singleID);
            } catch (e) { 
              error.push(e);
              console.error(e); // Dùng console.error để log lỗi rõ hơn
            };
          }
          return api.sendMessage(`✅ Đã cộng thêm ${formatNumber(money)}$ cho ${message.length} người`, threadID, function() { if (error.length != 0) return api.sendMessage(`❎ Không thể cộng thêm tiền cho ${error.length} người`, threadID) }, messageID);
        } else {
          if (money === null) return api.sendMessage('❎ Số tiền phải là một số hợp lệ', threadID, messageID);
          try {
            var uid = event.senderID;
            if (event.type == "message_reply") {
              uid = event.messageReply.senderID;
            } else if (args.length === 3) {
              uid = args[2];
            }
            await Currencies.increaseMoney(uid, money);
            message.push(uid);
          } catch (e) { 
            error.push(e);
            console.error(e);
          };
          return api.sendMessage(`✅ Đã cộng thêm ${formatNumber(money)}$ cho ${uid !== senderID ? '1 người' : 'bản thân'}`, threadID, function() { if (error.length != 0) return api.sendMessage(`❎ Không thể cộng thêm tiền cho ${uid !== senderID ? '1 người' : 'bản thân'}`, threadID) }, messageID);
        }
      }

      // Case 'all' này vẫn là "add all"
      case 'all': 
      {
        const allUserID = event.participantIDs;
        const mon = parseAndLimitMoney(args[1]); // Sử dụng hàm mới
        
        if (mon === null) return api.sendMessage('❎ Số tiền phải là một số hợp lệ', threadID, messageID);

        for (const singleUser of allUserID) {
          await Currencies.increaseMoney(singleUser, mon);
        }
        api.sendMessage(`✅ Đã cộng thêm ${formatNumber(mon)}$ cho toàn bộ thành viên`, event.threadID, messageID);
      }
      break;

      case "set": {
        if (args[1]?.toLowerCase() === 'all') {
          const setAmount = parseAndLimitMoney(args[2]); // Sử dụng hàm mới

          if (setAmount === null) {
            return api.sendMessage('❎ Cú pháp sai! Vui lòng dùng: setmoney set all [số tiền]', threadID, messageID);
          }
          
          const allUserID = event.participantIDs;
          for (const singleUser of allUserID) {
            await Currencies.setData(singleUser, { money: setAmount });
          }
          return api.sendMessage(`✅ Đã set thành công ${formatNumber(setAmount)}$ cho toàn bộ thành viên trong nhóm`, threadID, messageID);

        } else if (mentionID.length != 0) {
          if (money === null) return api.sendMessage('❎ Số tiền phải là một số hợp lệ', threadID, messageID);
          for (singleID of mentionID) {
            try {
              await Currencies.setData(singleID, { money: money });
              message.push(singleID);
            } catch (e) { 
              error.push(e);
              console.error(e);
            };
          }
          return api.sendMessage(`✅ Đã set thành công ${formatNumber(money)}$ cho ${message.length} người`, threadID, function() { if (error.length != 0) return api.sendMessage(`❎ Không thể set tiền cho ${error.length} người`, threadID) }, messageID);
        } else {
          if (money === null) return api.sendMessage('❎ Số tiền phải là một số hợp lệ', threadID, messageID);
          try {
            var uid = event.senderID;
            if (event.type == "message_reply") {
              uid = event.messageReply.senderID;
            } else if (args.length === 2) {
              // Nếu chỉ có set [số tiền] thì áp dụng cho senderID
            } else if (args.length === 3) { // set [số tiền] [UID]
                uid = args[2];
            }
            await Currencies.setData(uid, { money: money });
            message.push(uid);
          } catch (e) { 
            error.push(e);
            console.error(e);
          };
          return api.sendMessage(`✅ Đã set thành công ${formatNumber(money)}$ cho ${uid !== senderID ? '1 người' : 'bản thân'}`, threadID, function() { if (error.length != 0) return api.sendMessage(`❎ Không thể set tiền cho ${uid !== senderID ? '1 người' : 'bản thân'}`, threadID) }, messageID);
        }
      }

      case "clean": {
        if (args[1]?.toLowerCase() === 'all') {
          const data = await Threads.getInfo(threadID);
          const participantIDs = data.participantIDs;
          for (const userID of participantIDs) {
            const datas = (await Currencies.getData(userID)).data;
            if (datas !== undefined) {
              datas.money = 0; // Đặt về 0
              await Currencies.setData(userID, datas);
            }
          }
          return api.sendMessage("✅ Đã xóa thành công toàn bộ tiền của nhóm", event.threadID, messageID);
        }
        if (mentionID.length != 0) {
          for (singleID of mentionID) {
            try {
              await Currencies.setData(singleID, { money: 0 });
              message.push(singleID);
            } catch (e) { 
              error.push(e);
              console.error(e);
            };
          }
          return api.sendMessage(`✅ Đã xóa thành công toàn bộ tiền của ${message.length} người`, threadID, function() { if (error.length != 0) return api.sendMessage(`❎ Không thể xóa toàn bộ tiền của ${error.length} người`, threadID) }, messageID);
        } else {
          try {
            var uid = event.senderID;
            if (event.type == "message_reply") {
              uid = event.messageReply.senderID;
            }
            await Currencies.setData(uid, { money: 0 });
            message.push(uid);
          } catch (e) { 
            error.push(e);
            console.error(e);
          };
          return api.sendMessage(`✅ Đã xóa thành công tiền của ${uid !== senderID ? '1 người' : 'bản thân'}`, threadID, function() { if (error.length != 0) return api.sendMessage(`❎ Không thể xóa toàn bộ tiền của ${uid !== senderID ? '1 người' : 'bản thân'}`, threadID) }, messageID);
        }
      }

      case "reset": {
        const allUserData = await Currencies.getAll(['userID']);
        for (const userData of allUserData) {
            const userID = userData.userID;
            try {
                await Currencies.setData(userID, { money: 0 });
                message.push(userID);
            } catch (e) { 
              error.push(e);
              console.error(e);
            };
        }
        return api.sendMessage(`✅ Đã xóa toàn bộ dữ liệu tiền của ${message.length} người trong database`, threadID, function () { if (error.length != 0) return api.sendMessage(`❎ Không thể xóa dữ liệu tiền của ${error.length} người`, threadID) }, messageID);
      }

      default: {
        return global.utils.throwError(this.config.name, threadID, messageID);
      }
    }
  } catch (e) {
    console.error("Lỗi tổng quát:", e); // Log lỗi tổng quát
  }
}