const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

module.exports.config = {
  name: "capnhat",
  version: "1.0.6",
  hasPermssion: 1,
  credits: "Vdang",
  description: "Làm mới danh sách quản trị viên, lưu ảnh và tên nhóm lên Catbox, hiển thị tên quản trị viên và số lượng thành viên trên các dòng riêng",
  commandCategory: "Quản Trị Viên",
  usages: "để trống/threadID",
  cooldowns: 5,
  usePrefix: false,
  dependencies: {
    "axios": "",
    "fs-extra": "",
    "form-data": ""
  }
};

module.exports.run = async function ({ event, args, api, Threads, Users }) { 
  const moment = require("moment-timezone");
  const process = require("process");
  var gio = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss");
  const uptime = process.uptime();
  const h = Math.floor(uptime / 3600).toString().padStart(2, '0');
  const m = Math.floor((uptime % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(uptime % 60).toString().padStart(2, '0');
  const { threadID, messageID } = event;
  const targetID = args[0] || event.threadID;

  try {
    // Lấy thông tin nhóm
    var threadInfo = await api.getThreadInfo(targetID);
    let threadName = threadInfo.threadName || "Không có tên nhóm";
    let threadImage = threadInfo.imageSrc || "Không có ảnh nhóm";
    let adminIDs = threadInfo.adminIDs;
    let qtv = adminIDs.length;

    // Lấy tên các quản trị viên
    let adminNames = "Không có quản trị viên";
    if (qtv > 0) {
      try {
        let adminName = [];
        for (const arrayAdmin of adminIDs) {
          const name = await Users.getNameUser(arrayAdmin.id);
          adminName.push(name || `ID: ${arrayAdmin.id}`);
        }
        adminNames = adminName.map(name => `- ${name}`).join("\n");
      } catch (error) {
        console.error("Lỗi khi lấy thông tin quản trị viên:", error);
        adminNames = adminIDs.map(id => `- ID: ${id.id}`).join("\n");
      }
    }

    // Lấy danh sách thành viên
    let members = threadInfo.participantIDs || [];
    let memberCount = members.length;

    // Lưu ảnh nhóm lên Catbox
    let imageStatus = "Không có";
    if (threadImage && threadImage !== "Không có ảnh nhóm") {
      const dir = path.join(__dirname, "cache");
      const imgPath = path.join(dir, `${targetID}_boximage.jpg`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);

      // Tải ảnh nhóm
      fs.writeFileSync(imgPath, (await axios.get(threadImage, { responseType: "arraybuffer" })).data);

      // Tạo form để upload lên Catbox
      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("fileToUpload", fs.createReadStream(imgPath));

      // Upload ảnh lên Catbox
      const { data: url } = await axios.post("https://catbox.moe/user/api.php", form, {
        headers: form.getHeaders()
      });

      // Xóa file tạm
      fs.unlinkSync(imgPath);

      // Cập nhật trạng thái ảnh
      imageStatus = "Đã lưu";
    }

    // Lưu thông tin vào Threads
    await Threads.setData(targetID, { 
      threadInfo,
      name: threadName,
      image: threadImage,
      members: memberCount
    });
    global.data.threadInfo.set(targetID, threadInfo);

    // Gửi thông báo thành công
    return api.sendMessage(
      `✅ Cập nhật thông tin nhóm thành công vào lúc: ${gio}\n` +
      `───────────────\n` +
      `🏘️ Tên nhóm: ${threadName}\n` +
      `🔎 ID nhóm: ${targetID}\n` +
      `🖼️ Ảnh nhóm: ${imageStatus}\n` +
     `👨‍👩‍👧‍👦 Thành viên: có ${memberCount} thành viên\n` +
      `📌 Quản trị viên: có ${qtv} quản trị viên\n` +
      `👥 Gồm\n${adminNames}\n` +
      `───────────────\n` +
      `⏰ Uptime: ${h}:${m}:${s}`,
      threadID
    );
  } catch (error) {
    console.error(error);
    return api.sendMessage("❌ Đã xảy ra lỗi khi xử lý!", threadID, messageID);
  }
}
