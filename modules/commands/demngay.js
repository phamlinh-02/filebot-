module.exports.config = {
  name: "demngay",
  version: "1.3.2",
  hasPermssion: 0,
  credits: "CatalizCS - chỉnh sửa bởi ChatGPT",
  description: "Tính thời gian giữa ngày nhập và hiện tại",
  commandCategory: "Tiện ích",
  cooldowns: 5
};

module.exports.run = function ({ event, api, args }) {
  if (args.length < 2) {
    return api.sendMessage(
      "📌 Cách dùng:\n" +
      "→ demngay yeu ngày/tháng hoặc ngày/tháng/năm\n" +
      "→ demngay sn ngày/tháng\n" +
      "→ demngay ngày/tháng/năm",
      event.threadID,
      event.messageID
    );
  }

  let eventType = args[0].toLowerCase();
  const validEventTypes = ["yeu", "sn"];
  const isSpecificDate = !validEventTypes.includes(eventType);
  if (isSpecificDate) eventType = "ngay";

  const inputDate = args.slice(1).join(" ");
  const dateParts = inputDate.split("/");
  const day = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]);
  let year;

  if (["yeu", "ngay"].includes(eventType)) {
    year = dateParts.length === 3 ? parseInt(dateParts[2]) : new Date().getFullYear();
  } else if (eventType === "sn") {
    if (dateParts.length !== 2) return api.sendMessage("⚠️ Sinh nhật cần nhập theo định dạng ngày/tháng", event.threadID, event.messageID);
    year = new Date().getFullYear();
  }

  if (isNaN(day) || isNaN(month) || isNaN(year) || month < 1 || month > 12 || day < 1 || day > 31) {
    return api.sendMessage("⚠️ Ngày, tháng hoặc năm không hợp lệ!", event.threadID, event.messageID);
  }

  function createDateInVN(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    return new Date(date.getTime() + 7 * 60 * 60 * 1000);
  }

  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 7);

  const targetDate = createDateInVN(year, month, day);
  const diff = targetDate - now;
  const absDiff = Math.abs(diff);

  const totalDays = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const totalHours = Math.floor(absDiff / (1000 * 60 * 60));
  const totalMinutes = Math.floor(absDiff / (1000 * 60));
  const totalSeconds = Math.floor(absDiff / 1000);

  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = (totalDays % 365) % 30;
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  if (eventType === "yeu") {
    return api.sendMessage(
      `💓 Từ ${day}/${month}/${year} đến nay đã được:\n` +
      `→ ${years} năm ${months} tháng ${days} ngày ${hours} giờ ${minutes} phút ${seconds} giây\n` +
      `→ Tổng cộng: ${totalDays} ngày`,
      event.threadID,
      event.messageID
    );
  }

  if (eventType === "sn") {
    const snDate = createDateInVN(year, month, day);
    if (snDate < now) {
      return api.sendMessage(`🎂 Sinh nhật (${day}/${month}/${year}) năm nay đã qua rồi.`, event.threadID, event.messageID);
    } else {
      return api.sendMessage(
        `🎉 Còn ${totalDays} ngày ${hours} giờ ${minutes} phút ${seconds} giây nữa là đến sinh nhật (${day}/${month})!`,
        event.threadID,
        event.messageID
      );
    }
  }

  if (eventType === "ngay") {
    if (diff < 0) {
      return api.sendMessage(
        `📅 Ngày ${day}/${month}/${year} đã qua rồi.\n⏱️ Đã trôi qua: ${totalDays} ngày ${hours} giờ ${minutes} phút ${seconds} giây`,
        event.threadID,
        event.messageID
      );
    } else {
      return api.sendMessage(
        `📅 Còn lại đến ${day}/${month}/${year}:\n⏳ ${totalDays} ngày ${hours} giờ ${minutes} phút ${seconds} giây`,
        event.threadID,
        event.messageID
      );
    }
  }
};
