module.exports.config = {
  name: "out",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "DũngUwU",
  description: "out box",
  commandCategory: "Admin",
  usePrefix: true,
  usages: "[tid/all]",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const permission = ["100077056726311"];
  if (!permission.includes(event.senderID)) {
    return api.sendMessage("⚠️Xin lỗi! lệnh này chỉ admin chính mới dùng được", event.threadID, event.messageID);
  }

  // Hàm out all - out khỏi tất cả box trừ box hiện tại
  if (args[0] === "all") {
    api.sendMessage("🔄 Đang thực hiện out khỏi tất cả các box...", event.threadID);
    
    // Lấy danh sách các thread (box) mà bot đang tham gia
    api.getThreadList(100, null, ["INBOX"], (err, list) => {
      if (err) {
        console.error(err);
        return api.sendMessage("❌ Đã xảy ra lỗi khi lấy danh sách box!", event.threadID);
      }
      
      let outCount = 0;
      let errorCount = 0;
      const currentThreadID = event.threadID;
      
      // Lọc các box không phải là box hiện tại
      const threadsToLeave = list.filter(thread => 
        thread.threadID !== currentThreadID && 
        thread.isGroup === true
      );
      
      if (threadsToLeave.length === 0) {
        return api.sendMessage("🤖 Bot không tham gia box nào khác ngoài box hiện tại!", event.threadID);
      }
      
      api.sendMessage(`📋 Bot sẽ out khỏi ${threadsToLeave.length} box...`, event.threadID);
      
      // Out từng box một
      threadsToLeave.forEach((thread, index) => {
        setTimeout(() => {
          api.removeUserFromGroup(api.getCurrentUserID(), thread.threadID, (err) => {
            if (err) {
              console.error(`Lỗi khi out khỏi box ${thread.threadID}:`, err);
              errorCount++;
            } else {
              outCount++;
              console.log(`✅ Đã out khỏi box: ${thread.name || thread.threadID}`);
            }
            
            // Thông báo kết quả cuối cùng
            if (index === threadsToLeave.length - 1) {
              setTimeout(() => {
                api.sendMessage(
                  `✅ Out all hoàn tất!\n` +
                  `📊 Kết quả:\n` +
                  `• Out thành công: ${outCount} box\n` +
                  `• Lỗi: ${errorCount} box` ,
                  event.threadID
                );
              }, 1000);
            }
          });
        }, index * 1000); // Delay 1 giây giữa mỗi lần out để tránh bị block
      });
    });
    
    return;
  }

  // Out box cụ thể (giữ nguyên chức năng cũ)
  var id;
  if (!args.join("")) {
    id = event.threadID;
  } else {
    id = parseInt(args.join(" "));
  }
  
  return api.sendMessage('𝐓𝐮𝐚̂𝐧 𝐥𝐞̣̂𝐧𝐡 𝐜𝐮𝐧𝐠 𝐜𝐡𝐮̉ 💌', id, () => 
    api.removeUserFromGroup(api.getCurrentUserID(), id)
  );
}