module.exports.config = {
  name: "taoanhbox",
  version: "2.3.3",
  hasPermssion: 1,
  credits: "ThanhTung",
  description: "Tạo ảnh all thành viên trong box",
  commandCategory: "Quản Trị Viên",
  usages: "anhbox <size> [#mã màu] <tiêu đề>",
  cooldowns: 5,
  dependencies: {
    "fs-extra": "",
    "axios": "",
    "canvas": "",
    "jimp": "",
    "node-superfetch": "",
    "chalk": ""
  }
};

module.exports.circle = async (image) => {
  const jimp = global.nodemodule["jimp"];
  image = await jimp.read(image);
  image.circle();
  return await image.getBufferAsync("image/png");
};

module.exports.run = async ({ event, api, args }) => {
  const jimp = global.nodemodule["jimp"];
  const Canvas = global.nodemodule["canvas"];
  const superfetch = global.nodemodule["node-superfetch"];
  const fs = global.nodemodule["fs-extra"];
  const axios = global.nodemodule["axios"];
  const { threadID, messageID } = event;

  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  if (args[0] == 'help' || args[0] == '0' || args[0] == '-h') {
    return api.sendMessage('Sử dụng: ' + this.config.name + ' [size avt] [mã màu] [tên nhóm (title)] || bỏ trống tất cả bot sẽ get thông tin tự động', threadID, messageID);
  }

  const fontPath = __dirname + `/cache/TUVBenchmark.ttf`;
  if (!fs.existsSync(fontPath)) {
    const fontData = (await axios.get(`https://drive.google.com/u/0/uc?id=1NIoSu00tStE8bIpVgFjWt2in9hkiIzYz&export=download`, { responseType: "arraybuffer" })).data;
    fs.writeFileSync(fontPath, Buffer.from(fontData, "utf-8"));
  }

  const bgList = [
"https://files.catbox.moe/f25ukt.jpeg",
"https://files.catbox.moe/u7amr0.jpeg",
"https://files.catbox.moe/csiqa3.jpeg",
"https://files.catbox.moe/2nzxgc.jpeg"];
  const background = await Canvas.loadImage(bgList[Math.floor(Math.random() * bgList.length)]);
  const bgX = background.width;

  const threadInfo = await api.getThreadInfo(threadID);
  const { participantIDs, adminIDs, name, userInfo, threadName } = threadInfo;
  const admin = adminIDs.map(e => e.id);
  const live = userInfo.filter(u => u.gender !== undefined);

  const boxAvatarURL = threadInfo.imageSrc || `https://i.imgur.com/bwMjOdp.jpg`;
  const boxAvatarRaw = await superfetch.get(boxAvatarURL);
  const boxAvatarBuffer = boxAvatarRaw.body;
  const boxAvatarCircle = await module.exports.circle(boxAvatarBuffer);
  const boxAvatarImage = await Canvas.loadImage(boxAvatarCircle);

  let size, color, title;
  const image = bgX * 1000;
  const sizeParti = Math.floor(image / live.length);
  const sizeAuto = Math.floor(Math.sqrt(sizeParti));
  if (!args[0]) {
    size = sizeAuto;
    color = '#FFFFFF';
    title = threadName || name;
  } else {
    size = parseInt(args[0]);
    if (isNaN(size) || size < 10 || size > 1000) return api.sendMessage("Kích thước không hợp lệ!", threadID, messageID);
    color = args[1] || '#FFFFFF';
    title = args.slice(2).join(" ").trim();
    if (!title) title = threadName || name;
  }

  const l = parseInt(size / 15);
  const adminUsers = live.filter(u => admin.includes(u.id));
  const memberUsers = live.filter(u => !admin.includes(u.id));
  const maxPerRow = Math.floor(bgX / (size + l));

  const imgCanvas = Canvas.createCanvas(bgX, 5000);
  const ctx = imgCanvas.getContext('2d');

  for (let y = 0; y < 5000; y += background.height) {
    ctx.drawImage(background, 0, y, bgX, Math.min(background.height, 5000 - y));
  }

  Canvas.registerFont(fontPath, { family: "TUVBenchmark" });
  const maxTitleWidth = bgX * 0.9;
  let titleFontSize = 100;
  ctx.font = `${titleFontSize}px TUVBenchmark`;
  while (ctx.measureText(title).width > maxTitleWidth && titleFontSize > 10) {
    titleFontSize -= 2;
    ctx.font = `${titleFontSize}px TUVBenchmark`;
  }

  ctx.textAlign = "center";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#ff69b4";
  ctx.strokeText(title, bgX / 2, titleFontSize + 30);
  ctx.fillStyle = color;
  ctx.fillText(title, bgX / 2, titleFontSize + 30);

  // Avatar box hình tròn với viền trắng
  const boxSize = 400;
  const boxX = 60;
  const boxY = 40;
  const centerX = boxX + boxSize / 2;
  const centerY = boxY + boxSize / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, boxSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(boxAvatarImage, boxX, boxY, boxSize, boxSize);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(centerX, centerY, boxSize / 2 + 5, 0, Math.PI * 2);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.closePath();

  // Avatar admin căn giữa
  let totalAdminWidth = adminUsers.length * (size + l) - l;
  let xRight = Math.floor((bgX - totalAdminWidth) / 2);
  let yRight = titleFontSize + 80;

  for (let adminUser of adminUsers) {
    try {
      const avtAdmin = await superfetch.get(`https://graph.facebook.com/${adminUser.id}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
      const avatar = await module.exports.circle(avtAdmin.body);
      const avatarImage = await Canvas.loadImage(avatar);
      ctx.drawImage(avatarImage, xRight, yRight, size, size);

      ctx.beginPath();
      ctx.arc(xRight + size / 2, yRight + size / 2, size / 2 + 4, 0, Math.PI * 2);
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.closePath();

      xRight += size + l;
    } catch (err) {
      console.log("Lỗi admin avatar: ", adminUser.id);
    }
  }

  // Vẽ avatar thành viên căn giữa
  let i = 0;
  const drawAvatars = async (users, startY) => {
    let x = 0, y = startY;
    for (let index = 0; index < users.length;) {
      const rowUsers = users.slice(index, index + maxPerRow);
      const rowWidth = rowUsers.length * (size + l) - l;
      x = Math.floor((bgX - rowWidth) / 2);

      for (let user of rowUsers) {
        try {
          const avtUser = await superfetch.get(`https://graph.facebook.com/${user.id}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
          const avatar = await module.exports.circle(avtUser.body);
          const avatarload = await Canvas.loadImage(avatar);
          ctx.drawImage(avatarload, x, y, size, size);
          x += size + l;
          i++;
        } catch (e) {
          console.log("Lỗi: " + user.id);
        }
        index++;
      }
      y += size + l;
    }
    return y;
  };

  const lastYMembers = await drawAvatars(memberUsers, yRight + size + 40);
  const actualHeight = lastYMembers + size + 200;

  const cutCanvas = Canvas.createCanvas(bgX, actualHeight);
  const cutCtx = cutCanvas.getContext('2d');
  cutCtx.drawImage(imgCanvas, 0, 0);

  const pathAVT = __dirname + `/cache/${Date.now() + 10000}.png`;
  const cutImage = await jimp.read(cutCanvas.toBuffer());
  await cutImage.writeAsync(pathAVT);
  await delay(300);

  return api.sendMessage({
    body: `🍗 Tổng: ${i} thành viên\n👑 Admin: ${adminUsers.length} | 👥 Member: ${memberUsers.length}\n📏 Kích thước ảnh: ${bgX} x ${actualHeight}\n🍠 Lọc ${participantIDs.length - i} người dùng ẩn`,
    attachment: fs.createReadStream(pathAVT)
  }, threadID, (err) => {
    if (err) api.sendMessage(`Đã xảy ra lỗi: ${err}`, threadID, messageID);
    fs.unlinkSync(pathAVT);
  }, messageID);
};