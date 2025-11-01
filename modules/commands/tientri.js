
module.exports.config = {
    name: "tientri",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Dũngkon",
    description: "Phân tích avatar của bạn",
    commandCategory: "Tiện ích",
    usages: "phantich reply/@tag",
    cooldowns: 0
    };
module.exports.run = async function ({ api, event, args, Users, Currencies }) {
  const fs = require("fs-extra");
  const request = require("request");
  const t = ["Người đẹp không tổi",
    "Đéo biết tuổi gì",
    "Tuổi con ngan con",
    "Tuổi con cặc",
    "Tuổi con tép",
    "Tuổi mày bằng tuổi con tao",
    "Lồn"];
  const gt = ["Bê đê",
    "Nam",
    "Nữ",
    "Gay",
    "Less"
];
const tc = ["Tự tin","Chầm tính","Tự ti","Khó tính","Hiền lành","Tính như lồn","Người tình cảm","Tham vọng","Người cá tính","Người lý trí","Người trung thành","Nhiệt tình","Người mạnh mẽ","Ôn hòa","Hay dỗi","Nóng tính","Tự kỉ","Dễ gần","Thú vị","Thân thiện","Vui vẻ","Buồn chán","Cẩn thận","Bất cẩn, cẩu thả","Điên khùng hào phóng","Chăm chỉ","Bất lịch sự","Keo kiệt","Cởi mở","Lịch sự","Ít nói","Nghiêm túc","Nhút nhát","Thông minh","Hòa đồng","Ngu ngốc","Tài năng","Hung hăng bố láo","Tham vọng","Thận trọng","Cạnh tranh","Tự tin","Sáng tạo","Đáng tin cậy","Nhiệt tình","Hướng ngoại","Lạc quan","Bi quan","Dễ khóc","Hấp tấp","Thành thật","Bướng bỉnh","Hiểu biết","Thông thái","Uyên bác","Khéo léo","Chung thủy","Nhẹ nhàng","Hài hước","Trung thành","Kiên nhẫn","Ích kĩ","Lạnh lùng","Điên khùng","Tốt bụng","Đọc ác","Thô lỗ, cọc cằn","Láo xược","Kêu căng","Khoe khoang","Nổ","Khiêm tốn ","Say mê","Cứng đầu","Nghịch ngợm","Mất dạy","Phóng khoáng","Ga lăng" ];
const y = ["Tiền",
  "tình",
  "Gia đình",
  "Tình dục",
  "Yêu gì kệ mày tao đéo biết",
  "Màu hồng",
  "Động vật",
  "Công việc",
  "Yêu mấy thằng gay"
];
const g = ["Nói dối",
  "Cục súc",
  "Nói nhiều",
  "Hãm lồn",
  "Tao đéo biết mày ghét gì",
  "Bạo lực",
  "Động vật",
  "Đông người",
  "Học",
  "Tình dục",
  "Người yêu cũ",
  "Giả dối"
];
const mt = ["Quá Độc Lập",
  "Nói nhiều",
  "Làm không suy nghĩ",
  "Tiêu cực",
  "Suy nghĩ nhiều, linh tinh",
  "Không suy nghĩ cho bản thân",
  "Ki bo",
  "Khao khát bạo lực",
  "Ăn cắp vặt",
  "Thích đánh bạc"
];
const ms = ["Vui vẻ",
  "Bình yên",
  "nhây",
  "Nhoi",
  "lầy",
  "Khiến người khác thoải mái",
  "Hay giúp đỡ người khác",
  "Đúng giờ",
  "Trung thành",
  "Tôn trọng người khác",
  "Giữ lời hứa",
  "Rộng lượng",
  "Đồng cảm"
];
const bm = ["Body nóng bỏng",
  "Rất nhiều tiền",
  "Gay",
  "Nghèo vcl",
  "Bí mật quá tao đéo biết",
  "Người không biết giữ Bí mật",
  "Học ngu",
  "Thiên tài",
  "Ăn nhiều"
];
const tk = ["Là người có tâm hồn đẹp",
  "Con người phóng khoáng",
  "Xấu tính hay làm người khác khó chịu",
  "Con người không biết suy nghĩ",
   "Không Biết trước biết sau",
];
  const la = ["Mất facebook","Bị người yêu cắm sừng","Bắt nạt con nít","Cởi chuồng thả rông","Quay tiktok bị mẹ phát hiện","Đút cc vô quạt gió","Bị công an mời lên phường","Được giáo viên gọi lên bảng","Làm các em gái chết mê chết mệt","Đấm vào mồm thằng Luân","Đi ỉa không chùi đít","Ăn cắp tiền","Cướp ngân hàng","Giao hàng lậu bị phát hiện","Thay trời hành đạo","Tu hành","Mắc nợ nhưng chưa trả","Cover bài nhưng giọng như l","Nghịch ngu","Tai nạn giao thông","Ăn ớt siêu to khổng lồ","Quay vlog cùng bà tư vlog","Hun Đức Bo","Bị cộng đồng mạng soi wall","Bị crush từ chhối","Đái dầm khi ngủ","Bị bồ đá","Mua điện thoại sida","Xem sex","Tìm cụm từ hentai","Nói chuyện giống bê đê","Thụ tinh nhân tạo","làm việc tốt nhưng đéo ai quan tâm","Hát rông ngoài đường","Té sông","Mở lòng với bản thân","Ảo tưởng súc mạnh","Dùng lệnh ngu","Nhém vào bàn thờ","Móc đít ngửi","Rên trước mặt crush","Bị quay lén khi đang tắm","Tự nhận mình là trẻ trâu","Bốc cức ăn","Thủ dâm tại nhà","Đi khách sạn với tokuda","Mặc váy","Đội quần lên đầu","Giết người","Biểu diễn văn nghệ nhưng nghệ vl","Được coi là trúa hề VietNam","Được công nhận là thánh xàm l","Nhổ răng nhưng là nguyên hàm","Thất tình","Phẩu thuật thẫm mỹ"];
  const nn = ["Kế toán","Ca sĩ","Thợ sửa ổ khóa","Bán ve chai","Đào mỏ","Bác sĩ","Bác sĩ thú ý","diễn viên","Nghệ sĩ","Công nhân","Làm đĩ","Bán vé số","Tiếp viên hàng không","Quản lí ngân hàng","Chủ cửa hàng thú cưng","Ăn hàng ở không","Vô gia cư","Thất nghiệp","Bán chè","Kinh doanh ma túy","Chế tạo máy tính","Hacker","Tricker","Ăn bám gia đình","Phụ hồ","Staker chuyên nghiệp","Công tác viên Facebook","Bán hàng sida","Bán hàng online","Thợ may","Làm móng/nail","Thợ điện","Thu tiền nước","Dọn vệ sing","Lao công","Bảo vệ ở Bách Hóa Xanh","Bảo vệ ở Điện máy xanh","Streamer","Cầu thủ bóng đá","Họa sĩ","Thạc sĩ","Tổng thống","Chủ tịch xã","Chủ tịch huyện","Chủ tịch tỉnh","Chủ tịch nước","Cận vệ của tổng thống","Osin","Nhân viên bán hàng","Giang hồ","Giang Hồ mõm","Tiktoker","Youtuber","Giao dịch","Quản trị khách sạn","Lắp đặt camera","Giao hàng online","Bán xe đạp","Bán xe máy","Bán xe máy","Bán xe oto","Bán nhà","Bán đất","Nông dân","làm ruộng","lồng tiến phim hoạt hình","lồng tiến phim sex","Đóng phim sex","Người hầu","Kế ngôi Thầy ông nội","Lau kính","Chà bồn cầu","Nhà tiên tri","Chế tạo máy móc","Xưởng gỗ","Hải tặc","Mhà phép thuật","Tài xế","Xe ôm","Bán bánh mì","Thợ câu cá","Game thủ","Trùm xã hội đen","Siêu anh hùng"];
  var kg = Math.floor(Math.random() * 101);
   var tm = Math.floor(Math.random() * 101);
   var sm = Math.floor(Math.random() * 101);
  var st = Math.floor(Math.random() * 101);
  var xl = Math.floor(Math.random() * 101);
   var giau = Math.floor(Math.random() * 101);
    var cc = Math.floor(Math.random() * 99);
    var fact = Math.floor(Math.random() * 999);
    var a = Math.floor(Math.random() * 999,);
    var iq = Math.floor(Math.random() * 101);
    var b = Math.floor(Math.random() * 999,);
    var chet = Math.floor(Math.random() * 101);
    if (Object.keys(event.mentions).length == 1) {
      var mentions = Object.keys(event.mentions)
      var data = await Currencies.getData(mentions);
      var name = (await Users.getData(mentions)).name
      var callback = () => api.sendMessage({
        body: `💈──── •🍄• ────💈\n💛${name}💛\n🧠 𝐓𝐡𝐨̂𝐧𝐠 𝐌𝐢𝐧𝐡: 【${tm}%】\n🎀 𝐍𝐠𝐡𝐞̂̀ 𝐧𝐠𝐡𝐢𝐞̣̂𝐩: ${nn[Math.floor(Math.random() * nn.length)]}\n💪 𝐒𝐮̛́𝐜 𝐌𝐚̣𝐧𝐡: 【${sm}%】\n🧛‍♂️ 𝐒𝐢𝐧𝐡 𝐓𝐨̂̀𝐧: 【${st}%】\n🧟‍♀️ 𝐓𝐫𝐢̀𝐧𝐡 𝐗𝐚̣𝐨 𝐋𝐨̂̀𝐧: 【${xl}%】\n💸 𝐒𝐮̛̣ 𝐆𝐢𝐚̀𝐮 𝐂𝐨́: 【${giau}%】\n⏳ 𝐓𝐮𝐨̂̉𝐢 𝐓𝐡𝐨̣: 【${chet} 】\n💈──── •🍄• ────💈`,
        attachment: fs.createReadStream(__dirname + "/cache/1.png")
      },
        event.threadID, () => fs.unlinkSync(__dirname + "/cache/1.png"), event.messageID);
      return request(encodeURI(`https://graph.facebook.com/${mentions}/picture?height=1500&width=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`))
        .pipe(fs.createWriteStream(__dirname + '/cache/1.png'))
        .on('close', () => callback());
    }
    else {
      if (!args[0]) {
        if (event.type == "message_reply")
          idmen = event.messageReply.senderID
        else idmen = event.senderID;
        var data = await Currencies.getData(idmen);
        var name = (await Users.getData(idmen)).name;
        var callback = () => api.sendMessage({
          body: `💈──── •🍄• ────💈\n💛${name}💛\n🧠 𝐓𝐡𝐨̂𝐧𝐠 𝐌𝐢𝐧𝐡: 【${tm}%】\n🎀 𝐍𝐠𝐡𝐞̂̀ 𝐧𝐠𝐡𝐢𝐞̣̂𝐩: ${nn[Math.floor(Math.random() * nn.length)]}\n💪 𝐒𝐮̛́𝐜 𝐌𝐚̣𝐧𝐡: 【${sm}%】\n🧛‍♂️ 𝐒𝐢𝐧𝐡 𝐓𝐨̂̀𝐧: 【${st}%】\n🧟‍♀️ 𝐓𝐫𝐢̀𝐧𝐡 𝐗𝐚̣𝐨 𝐋𝐨̂̀𝐧: 【${xl}%】\n💸 𝐒𝐮̛̣ 𝐆𝐢𝐚̀𝐮 𝐂𝐨́: 【${giau}%】\n⏳ 𝐓𝐮𝐨̂̉𝐢 𝐓𝐡𝐨̣: 【${chet} 】\n💈──── •🍄• ────💈`,
          attachment: fs.createReadStream(__dirname + "/cache/1.png")
        },
          event.threadID, () => fs.unlinkSync(__dirname + "/cache/1.png"), event.messageID);
        return request(encodeURI(`https://graph.facebook.com/${idmen}/picture?height=1500&width=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`))
          .pipe(fs.createWriteStream(__dirname + '/cache/1.png'))
          .on('close', () => callback());
      }
    }
  }