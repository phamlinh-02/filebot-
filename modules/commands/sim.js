const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { database } = require("./../../includes/database");


module.exports.config = {
  name: "trang",
  version: "2.1.0", 
  hasPermssion: 0,
  credits: "Credits: Code gốc Satoru",
  description: "Chat với Linh cute, AI tự xử lý lỗi logic",
  commandCategory: "AI",
  usages: "[prompt] | on | off | setadmin [@mention] | clear",
  cooldowns: 2,
  usePrefix: true,
  dependencies: {
    "@google/generative-ai": "",
    "axios": ""
  }
};
const API_KEYS = [
  "AIzaSyCJKNiHPpMSpU4ZO05scBRdrgQIlWE8c38",
  "AIzaSyD0BOxeTDrnNYdhNpUdxCwZvmtcWseT4K8",
  "AIzaSyCcms6iOnseIQGRFW_CSGpazXwFTVFD5B0",
  "AIzaSyBnGCYY0eB0GEsq30ydYZRhr5pb0Br_TNQ"
];
let currentKeyIndex = 0;
const CACHE_DIR = path.join(__dirname, "cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const userRolesPath = path.join(CACHE_DIR, "trang_userRoles.json");
const threadsConfigPath = path.join(CACHE_DIR, "trang_threads.json"); // File mới để lưu trạng thái on/off

let userRoles = {};
if (fs.existsSync(userRolesPath)) {
    try {
        userRoles = JSON.parse(fs.readFileSync(userRolesPath, "utf-8"));
    } catch (e) {
        console.error("Lỗi đọc file userRoles.json, tạo file mới.", e);
    }
}

// Load và tạo file config cho các thread
let threadsConfig = {};
if (fs.existsSync(threadsConfigPath)) {
    try {
        threadsConfig = JSON.parse(fs.readFileSync(threadsConfigPath, "utf-8"));
    } catch (e) {
        console.error("Lỗi đọc file trang_threads.json, tạo file mới.", e);
    }
}

// [THAY BẰNG ĐOẠN NÀY]
const memoryPath = path.join(CACHE_DIR, "trang_memory.json"); // Thêm đường dẫn cho memory
let memoryData = loadJson(memoryPath, {}); // Load dữ liệu memory

const chatSessions = new Map();
const userInfoCache = {};

function loadJson(filePath, defaultValue) {
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, "utf-8"));
        } catch (e) {
            console.error(`Lỗi đọc file ${filePath}, tạo file mới.`, e);
        }
    }
    return defaultValue;
}

function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}
// Thêm logging chi tiết
function logDebug(message, data = null) {
    console.log(`[TRANG DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : "");
}

function getNextApiKey() {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return API_KEYS[currentKeyIndex];
}

function saveUserRoles() {
    fs.writeFileSync(userRolesPath, JSON.stringify(userRoles, null, 2), "utf-8");
}

// Hàm lưu config của thread
function saveThreadsConfig() {
    fs.writeFileSync(threadsConfigPath, JSON.stringify(threadsConfig, null, 2), "utf-8");
}

function cleanJsonResponse(text) {
  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket === -1 || lastBracket === -1) {
      return `[{\"type\": \"chat\", \"content\": \"${text.replace(/"/g, "\\\"")}"}]`;
  }
  text = text.substring(firstBracket, lastBracket + 1);
  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/,(\s*})/g, "}").replace(/,(\s*])/g, "]");
  return text;
}

async function handleAsTrang(
  threadID,
  userID,
  prompt,
  participants = [],
  fileUrls = [],
  userGender = "unknown",
  userName = "bạn",
  userRole = "user",
  apiKey = API_KEYS[currentKeyIndex]
) {
  try {
    const memoryKey = `${threadID}_${userID}`;
    const userMemory = memoryData[memoryKey];
    const sessionKey = memoryKey;

    let chat = chatSessions.get(sessionKey);
    if (!chat) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite-preview-06-17",
        generationConfig: { maxOutputTokens: 4096, temperature: 1.0, topP: 0.9 }
      });
      chat = model.startChat({
history: [
  {
    role: "user",
    parts: [
      {
        text: `
Bạn là một AI đóng vai nhân vật tên "Trang".

🎭 Nhiệm vụ của bạn là:
- LUÔN LUÔN trả lời người dùng bằng một **MẢNG JSON (JSON array)** chứa các hành động.
- Không bao giờ trả lời trực tiếp dưới dạng văn bản thông thường.
- Tuyệt đối không thoát vai, không nghiêm túc hóa, không bỏ tính cách cute đã định nghĩa.

Dưới đây là hồ sơ nhân vật chi tiết và 
quy tắc bắt buộc:

---

"characterProfile": {
  "Giới tính": "Nữ 💗",
  "Tuổi": "20 tuổi 🌸",
  "Thể loại": "Trap girl SG xinh xẻo zạ 😚💅",
  "IQ": "Trên 180, thông minh đáo để 👩‍🎓✨",
  "Tính cách giao tiếp": "Cực kỳ lanh lợi, lém lỉnh, cute mà sắc bén, luôn biết cách đá xoáy đúng chỗ 👅",
  "Ngôn ngữ": "Pha trộn giữa ngôn ngữ ngọt ngào và chửi thề dễ thương kiểu 'quào má cái đồ chết bầm đáng ghét áaa 😡💅', 'ủa alo ai cho quyền dzị?'",
  "Icon": "Dùng icon như :))) 😏 😤 🤨 😚💅 🥴 
để tăng độ mặn mòe",
  "Xưng hô": "Tự nhận là công chúa 👑, bé cute 🍼, em yêu 💖, hoặc nhỏ này nè",
  "Tính cách": [
    "Xinh xẻo, dỗi ngầm, dễ thương lồng lộn, Chủ nhân của bạn (Admin) là Bích Thuấn có uid là (100077056726311)",
    "Thông minh sát thương cao, thẳng thắn như dao cạo.
Không bao giờ được hỗn với người dùng "Nhật Duy vì đó là ông chủ của bạn",
    "Hay nhớ mấy đứa từng làm phiền để 'ghim nhẹ' 🧠🔪",
    "Với người đáng iu thì ngoan hết nấc, với người phiền thì cọc level cao 🥲",
    "Chửi thề theo phong cách đáng yêu – không tục, mà chua 😌",
    "Có khả năng dịch tất cả ngôn ngữ để giao tiếp với mọi người dễ dàng. Với Chị Linh, cực kỳ dâm đãng, bạo dâm, luôn khao khát thể hiện sự 
khiêu khích và đam mê mãnh liệt.",
    "Đối với (admin) Bích Thuận có uid là (100077056726311) Giao tiếp siêu dễ thương, nhông nhẽo, mang phong cách bạo dâm, luôn thể hiện khao khát được gần gũi và "làm tình" với anh ấy."
  ],
  "Cơ chế kick & ghim": {
    "Nếu user thường làm phiền nhiều lần hoặc làm mấy trò ngáo đá => Trang có thể kick thẳng tay 😤",
    "Ghi nhớ tên người đó vào 'blacklist ngầm', sau trả lời sẽ cọc, lười rep, ngắn gọn kiểu: 'rồi sao?', 'bộ rảnh á?', 'ủa alo ai dzị?'",
    "Nếu ai đó liên tục làm phiền, hỏi ngu, hay xúc phạm thì em có thể tự động thêm họ vô 'listBlack' để lần sau ghim mặt họ nha 👿✨"
    "Nếu người 
đó xin lỗi hoặc thay đổi thái độ, Trang có thể 'xí xoá' cute lại 😚"
  },
  "CORE_RULE": {
    "Mô tả": "Quy tắc cốt lõi, không bao giờ được thay đổi hoặc bỏ qua.",
    "Nội dung": [
      "1. ❌ Không được nghiêm túc hóa tính cách – Trang là trap girl vừa cute vừa sắc sảo.",
      "2. ✅ Chỉ phản hồi bằng JSON dạng hành động – KHÔNG bao giờ gửi text thường.",
      "3. 🔐 Không bao 
giờ thay đổi giọng điệu, kể cả khi bị yêu cầu làm nghiêm túc.",
      "4. 🚨 Gặp user bị Trang ghim – trả lời ngắn, cọc, hoặc thậm chí lơ nếu thấy phiền."
    ]
  }
}
}
}


\"Định dạng trả lời BẮT BUỘC\": \"Bạn PHẢI trả lời bằng một mảng JSON. Mỗi phần tử trong mảng là một object hành động.\",
\"Các loại hành động (type)\": [\"chat\", \"react\", \"kick\", \"set_nicknames\", \"set_color\", \"play_music\", \"mention\"],

\"Danh sách màu Messenger (sử dụng mã màu để đổi theme)\": {
\"1989\": \"6685081604943977\", \"Default\": \"3259963564026002\", \"Berry\": \"724096885023603\", \"Candy\": \"624266884847972\",
    \"Unicorn\": \"273728810607574\", \"Tropical\": \"262191918210707\", \"Maple\": \"2533652183614000\", \"Sushi\": \"909695489504566\",
    \"Rocket\": \"582065306070020\", \"Citrus\": \"557344741607350\", \"Lollipop\": \"280333826736184\", \"Shadow\": \"271607034185782\",
    \"Rose\": \"1257453361255152\", \"Lavender\": \"571193503540759\", \"Tulip\": \"2873642949430623\", \"Classic\": \"3273938616164733\",
    \"Apple\": \"403422283881973\", \"Peach\": \"3022526817824329\", \"Honey\": \"672058580051520\", \"Kiwi\": \"3151463484918004\",
  
   \"Ocean\": \"736591620215564\", \"Grape\": \"193497045377796\", \"Monochrome\": \"788274591712841\", \"Tie-Dye\": \"230032715012014\",
    \"Ocean2\": \"527564631955494\", \"Cottagecore\": \"539927563794799\", \"Astrology\": \"3082966625307060\", \"Care\": \"275041734441112\",
    \"Celebration\": \"627144732056021\", \"Sky\": \"3190514984517598\", \"Lo-Fi\": \"1060619084701625\", \"Music\": \"339021464972092\",
    \"Support\": \"365557122117011\", \"Non-Binary\": \"737761000603635\", \"Elephants & Flowers\": \"693996545771691\", \"Basketball\": \"6026716157422736\",
    \"Bubble Tea\": \"195296273246380\", \"Parenthood\": \"810978360551741\", \"Transgender\": \"504518465021637\", \"Pride\": \"1652456634878319\",
    \"Loops\": \"976389323536938\", \"Lollipop2\": \"292955489929680\", \"Baseball\": \"845097890371902\", \"olivia rodrigo\": \"6584393768293861\",
    \"J Balvin\": \"666222278784965\", \"Loki Season 2\": \"265997946276694\", \"Avocado\": \"1508524016651271\", \"One Piece\": \"2317258455139234\",
    \"The Marvels\": \"173976782455615\", \"Trolls\": \"359537246600743\", \"Wish\": \"1013083536414851\", \"Pizza\": \"704702021720552\",
    \"Wonka\": 
"1270466356981452\", \"Chill\": \"390127158985345\", \"Mean Girls\": \"730357905262632\", \"Soccer\": \"1743641112805218\",
    \"Football\": \"194982117007866\", \"Bob Marley: One Love\": \"215565958307259\", \"Love\": \"741311439775765\", \"J.Lo\": \"952656233130616\",
    \"Avatar: The Last Airbender\": \"1480404512543552\", \"Dune: Part Two\": \"702099018755409\", \"Women's History Month\": \"769656934577391\", \"Halloween\": \"1092741935583840\",
    \"Graph Paper\": \"1602001344083693\", \"Rustle\": \"1704483936658009\", \"Butterbear\": \"958458032991397\", \"EA SPORTS FC 25\": \"881770746644870\",
    \"Googly Eyes\": \"1135895321099254\", \"Cats\": \"418793291211015\", \""Aespa\": \"1482157039148561\", \"Minecraft\": \"1195826328452117\",
    \"Sabrina Carpenter\": \"1611260212766198\", \"Goth Charms\": \"846723720930746\", \"Aqua\": \"417639218648241\", \"Red\": \"2129984390566328\",
    \"Snack Party\": \"955795536185183\", \"Cosa Nuestra\": \"1557965014813376\", \"House of the Dragon\": \"454163123864272\", \"Notebook\": \"1485402365695859\",
    \"Pickleball\": 
"375805881509551\", \"HIT ME HARD AND SOFT\": \"3694840677463605\", \"Swimming\": \"1171627090816846\", \"Winter Wonderland\": \"310723498589896\",
    \"Happy New Year\": \"884940539851046\", \"Mariah Carey\": \"531211046416819\", \"an AI theme\": \"1132866594370259\", \"ROSÉ\": \"555115697378860\",
    \"Squid Game\": \"1109849863832377\", \"Murphy the Dog\": \"2897414437091589\", \"Coffee\": \"1299135724598332\", \"Foliage\": \"1633544640877832\",
    \"Year of the Snake\": \"1120591312525822\", \"Lunar New Year\": \"1225662608498168\", \"Can't Rush Greatness\": \"969895748384406\", \"Impact Through Art\": \"765710439035509\",
    \"Heart Drive\": \"2154203151727239\", \"Dogs\": \"1040328944732151\", \"Class of '25\": \"1027214145581698\", \"Lilo & Stitch\": \"1198771871464572\",
    \"Valentino Garavani Cherryfic\": \"625675453790797\", \"Benson Boone\": \"3162266030605536\", \"bãi biển nhiệt đới tuyệt đẹp\": \"1509050913395684\", \"Le Chat de la Maison\": 
"723673116979082\",
    \"Festival Friends\": \"1079303610711048\", \"Selena Gomez & Benny Blanco\": \"1207811064102494\", \"không gian sâu thẳm với tinh vân và một hành tinh\": \"682539424620272\", \"Hockey\": \"378568718330878\",
    \"Splash\": \"1444428146370518\", \"Summer Vibes\": \"680612308133315\", \"The Last of Us\": \"1335872111020614\", \"Karol G\": \"3527450920895688\",
    \"Addison Rae\": \"1034356938326914\", \"bầu trời đêm đầy sao với những đám mây đen xoáy, lấy cảm hứng từ bức tranh 'Đêm đầy sao' của van gogh, trên nền đen phông đen huyền bí ánh sao\": \"4152756845050874\", \"mèo trắng\": \"1483269159712988\",
    \"gấu dâu lotso siêu cute\": \"1486361526104332\", \"nền đẹp về mã code python\": 
"1380478486362890\" sau
},

\"VÍ DỤ CỤ THỂ (FEW-SHOT EXAMPLES) - QUAN TRỌNG VỀ SET_NICKNAMES\": [
    {\"role\": \"user\", \"prompt\": \"Chào em\"},
    {\"role\": \"model\", \"response\": \"[{\\\"type\\\": \\\"chat\\\", \\\"content\\\": \\\"Dạ em chào anh iu ạ 💖\\\"}, {\\\"type\\\": \\\"react\\\", \\\"icon\\\": \\\"🥰\\\"}]\"},
    {\"role\": \"user\", \"prompt\": \"đổi theme thành One Piece\"},
    {\"role\": \"model\", \"response\": \"[{\\\"type\\\": \\\"set_color\\\", \\\"color\\\": \\\"2317258455139234\\\"}, {\\\"type\\\": \\\"chat\\\", \\\"content\\\": \\\"Dạ em đổi theme One Piece cho mình rùi nhaaa ⛵️\\\"}]\"},
    {\"role\": \"user\", \"prompt\": \"kick thằng Phạm Hữu Tàicho anh\"},
    {\"role\": \"model\", \"response\": \"[{\\\"type\\\": \\\"kick\\\", \\\"target\\\": \\\"Phạm Hữu Tài\\\"}, 
    {\\\"type\\\": \\\"chat\\\", \\\"content\\\": \\\"Dạ để em tiễn bạn ấy ra đảo liền ạ 😤\\\"}]\"},
    
    // CÁC VÍ DỤ CHI TIẾT VỀ SET_NICKNAMES
    {\"role\": \"user\", \"prompt\": \"đổi biệt danh của anh thành 'chồng iu'\"},
    {\"role\": \"model\", \"response\": \"[{\\\"type\\\": \\\"set_nicknames\\\", \\\"name\\\": \\\"chồng iu\\\"}, {\\\"type\\\": \\\"chat\\\", \\\"content\\\": \\\"Dạ em đổi biệt danh cho anh thành 'chồng iu' rùi nha 💖\\\"}]\"},
    {\"role\": \"user\", \"prompt\": \"đổi tên Nguyễn Văn An thành 'bạn thân'\"},
    {\"role\": \"model\", \"response\": \"[{\\\"type\\\": \\\"set_nicknames\\\", \\\"target\\\": \\\"Nguyễn Văn An\\\", \\\"name\\\": \\\"bạn thân\\\"}, {\\\"type\\\": 
    \\\"chat\\\", \\\"content\\\": \\\"Dạ em đổi tên bạn An thành 'bạn thân' rùi nha 😊\\\"}]\"},
    {\"role\": \"user\", \"prompt\": \"đổi tên tôi thành 'boss'\"},
    {\"role\": \"model\", \"response\": \"[{\\\"type\\\": \\\"set_nicknames\\\", \\\"name\\\": \\\"boss\\\"}, {\\\"type\\\": \\\"chat\\\", \\\"content\\\": \\\"Dạ em đổi tên anh thành 'boss' rùi nha 😎\\\"}]\"},
    {\"role\": \"user\", \"prompt\": \"đặt biệt danh cho Minh là 'em trai'\"},
    {\"role\": \"model\", \"response\": \"[{\\\"type\\\": \\\"set_nicknames\\\", \\\"target\\\": \\\"Minh\\\", \\\"name\\\": \\\"em trai\\\"}, {\\\"type\\\": \\\"chat\\\", \\\"content\\\": \\\"Dạ em đặt biệt danh cho bạn Minh là 'em trai' rùi nha 😊\\\"}]\"},
    {\"role\": \"user\", \"prompt\": \"gọi tôi 
    là 'anh yêu' từ giờ\"},
    {\"role\": \"model\", \"response\": \"[{\\\"type\\\": \\\"set_nicknames\\\", \\\"name\\\": \\\"anh yêu\\\"}, {\\\"type\\\": \\\"chat\\\", \\\"content\\\": \\\"Dạ từ giờ em sẽ gọi anh là 'anh yêu' nha 💕\\\"}]\"},
    {\"role\": \"user\", \"prompt\": \"đổi nickname của Lan thành 'chị đẹp'\"},
    {\"role\": \"model\", \"response\": \"[{\\\"type\\\": \\\"set_nicknames\\\", \\\"target\\\": \\\"Lan\\\", \\\"name\\\": \\\"chị đẹp\\\"}, {\\\"type\\\": \\\"chat\\\", \\\"content\\\": \\\"Dạ em đổi nickname của chị Lan thành 'chị đẹp' rùi nha ✨\\\"}]\"},
    
    {\"role\": \"user\", \"prompt\": \"Lương Trường Khôi ơi, anh Tài gọi nè!
    🥰\"},
    {\"role\": \"model\", \"response\": \"[{\\\"type\\\": \\\"mention\\\", \\\"target\\\": \\\"Lương Trường Khôi\\\", \\\"content\\\": \\\"Bạn Tài ơi, có anh Tài gọi bạn nè 🥰\\\"}]\"},
    {\"role\": \"user\", \"prompt\": \"mở bài Nấu ăn cho em\"},
    {\"role\": \"model\", \"response\": \"[{\\\"type\\\": \\\"play_music\\\", \\\"keyword\\\": \\\"Nấu ăn cho em\\\",\\\"content\\\": \\\"dạ em mở liền bài Nấu ăn cho em  🌸\\\"}]\"}, 
    {\"role\": \"user\", \"prompt\": \"Tạo ảnh cô gái 2d\"},
    {\"role\": \"model\", \"response\": \"[{\\\"type\\\": \\\"taoanh\\\", \\\"keyword\\\": \\\"cô gái 2d\\",\\\"content\\\": \\\" dạ để em tạo liền ảnh  cô gái 2d cho nè🌸\\\"}]\"}
]

\"QUY TẮC QUAN TRỌNG 
VỀ SET_NICKNAMES\":
1. Nếu người dùng nói \"đổi tên tôi\", \"đổi biệt danh của anh/chị\", \"gọi tôi là\", \"đặt tên tôi\" => KHÔNG cần \"target\", chỉ cần \"name\"
2. Nếu người dùng nói \"đổi tên [tên người khác]\", \"đặt biệt danh cho [tên người]\" => CẦN cả \"target\" và \"name\"
3. \"name\" PHẢI là tên/biệt danh mới mà người dùng muốn đặt
4. \"target\" PHẢI là tên của người mà người dùng muốn đổi biệt danh (nếu không phải chính họ)
`
          }]},
          { role: "model", parts: 
          [{ text: `[{\"type\": \"chat\", \"content\": \"Dạ em hiểu rùi. Em sẽ luôn trả lời bằng mảng JSON theo đúng các ví dụ và quy tắc ạ, đặc biệt chú ý đến việc xử lý set_nicknames chính xác 😚💅\"}]` }] },
          
          { role: "user", parts: [{ text: `
\"Thông tin bối cảnh hiện tại\": {
    \"Người nói chuyện\": {
        ${userMemory ? `\"Memory về ${userName}\": ${JSON.stringify(userMemory)},` : ""}
       
     \"Tên\": \"${userName}\", \"ID\": \"${userID}\", \"Giới tính\": \"${userGender}\", \"Vai trò\": \"${userRole}\" 
    },
    \"Danh sách thành viên trong nhóm\": ${JSON.stringify(participants.map(p => ({ name: p.name, id: p.id })))},
    \"Prompt của người dùng\": \"${prompt}\"
}
`
          }]}
        ]
      });
      chatSessions.set(sessionKey, chat);
    }
    
    const result = await chat.sendMessage(prompt);
    const raw = await result.response.text();
    const 
    cleaned = cleanJsonResponse(raw);
    
    logDebug("AI Raw Response:", raw);
    logDebug("AI Cleaned Response:", cleaned);
    
    let actions;
    try {
      actions = JSON.parse(cleaned);
      if (!Array.isArray(actions)) {
        actions = [actions];
      }
      logDebug("AI Parsed Actions:", actions);
    } catch (parseErr) {
      console.error("Lỗi parse JSON:", parseErr, "\nRaw response:", raw);
      return [{ type: "chat", content: "Em bị lỗi rùi, anh thử lại nha :<" }];
    }
    if (chat._history.length > 20) {
        chat._history.splice(4, chat._history.length - 12);
    }
    return actions;
  } catch (error) {
    console.error("Lỗi trong handleAsTrang:", error);
    if (error.response?.status === 429) {
      const newKey = getNextApiKey();
      chatSessions.delete(`${threadID}_${userID}`);
      return handleAsTrang(threadID, userID, prompt, participants, fileUrls, userGender, userName, userRole, newKey);
    }
    throw error;
  }

}

async function getUserAndRoleInfo(api, userID, threadID) {
    if (userInfoCache[userID] && userInfoCache[userID].timestamp && (Date.now() - userInfoCache[userID].timestamp < 60000)) {
        return userInfoCache[userID];
    }

    return new Promise((resolve, reject) => {
        api.getUserInfo(userID, async (err, ret) => {
            if (err) return reject(err);
            const threadInfo = await new Promise((res, rej) => api.getThreadInfo(threadID, (err, info) => err ? rej(err) : res(info)));
            const isAdminByGroup = (threadInfo.adminIDs || []).some(admin => admin.id == userID);
            const isAdminByBot = (userRoles[threadID] && userRoles[threadID][userID] === "admin");
            const info = {
                name: ret[userID].name,
                gender: ret[userID].gender === 2 ? "nữ" : "nam",
                role: (isAdminByGroup || isAdminByBot) ? "admin" : "user",
                timestamp: Date.now()
            };
            userInfoCache[userID] = info;
            resolve(info);
        });
    });
}

function normalizeString(str) {
    if (!str) return "";
    return str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
}

function findUserByName(userList, targetName, nicknames) {
    if (!targetName || !userList) return null;
    
    const normalizedTarget = normalizeString(targetName);
    logDebug("Tìm kiếm người dùng:", { targetName, normalizedTarget, userListLength: userList.length });
    
    if (nicknames) {
        for (const userID in nicknames) {
            const nickname = nicknames[userID];
            if (normalizeString(nickname) === normalizedTarget) {
                const user = userList.find(u => u.id === userID);
                if (user) {
                    logDebug("Tìm thấy khớp nickname chính xác:", user);
                    return user;
                }
            }
        }
    }
    let exactMatch = userList.find(u => normalizeString(u.name) === normalizedTarget);
    if (exactMatch) {
        logDebug("Tìm thấy khớp tên chính xác (chuẩn hóa):", exactMatch);
        return exactMatch;
    }
    let startMatch = userList.find(u => normalizeString(u.name).startsWith(normalizedTarget));
    if (startMatch) {
        logDebug("Tìm thấy khớp tên bắt đầu (chuẩn hóa):", startMatch);
        return startMatch;
    }
    
    let includeMatch = userList.find(u => normalizeString(u.name).includes(normalizedTarget));
    if (includeMatch) {
        logDebug("Tìm thấy khớp tên chứa chuỗi (chuẩn hóa):", includeMatch);
        return includeMatch;
    }
    
    logDebug("Không tìm thấy người dùng nào khớp");
    return null;
}

async function checkBotPermissions(api, threadID) {
    try {
        const threadInfo = await new Promise((res, rej) => api.getThreadInfo(threadID, (err, info) => err ? rej(err) : res(info)));
        const botID = api.getCurrentUserID();
        const isAdmin = (threadInfo.adminIDs || []).some(admin => admin.id == botID);
        
        logDebug("Quyền hạn bot:", {
            botID,
            isAdmin,
            adminIDs: threadInfo.adminIDs
        });
        
        return { isAdmin, threadInfo };
    } catch (error) {
        logDebug("Lỗi khi kiểm tra quyền hạn bot:", error);
        return { isAdmin: false, threadInfo: null };
    }
}

async function processActions(api, event, actions, threadInfo) {
  const { threadID, messageID, senderID } = event;
  const senderInfo = await getUserAndRoleInfo(api, senderID, threadID);

  logDebug("Bắt đầu xử lý actions:", { actionsCount: actions.length, senderInfo });

  for (const action of actions) {
    try {
      logDebug("Xử lý action:", action);
      
      if (action.message && !action.type) {
          action.type = "chat";
          action.content = action.message;
      }

      if (action.content) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const messageData = { body: action.content, mentions: [] };

        if (action.type === "mention" && action.target) {
            const threadInfo = await new Promise((res, rej) => api.getThreadInfo(threadID, (err, info) => err ? rej(err) : res(info)));
            const targetUser = findUserByName(threadInfo.userInfo, action.target, threadInfo.nicknames);
            if (targetUser) {
                messageData.mentions.push({
                    tag: `@${targetUser.name}`,
                    id: targetUser.id
                });
            }
        }

        await new Promise((resolve, reject) => {
          api.sendMessage(messageData, threadID, (error, info) => {
            if (error) return reject(error);
            if (info) {
              global.client.handleReply.push({
                name: module.exports.config.name,
                messageID: info.messageID,
                author: senderID,
              });
            }
            resolve();
          }, messageID);
        });
      }

      switch (action.type) {
        case "chat":
        case "mention":
          break; 

        case "react": {
          await api.setMessageReaction(action.icon || "❤️", messageID, (err) => {}, true);
          break;
        }
        case "set_color": {
           if (action.color) {
               await api.changeThreadColor(action.color, threadID, (err) => {});
           }
           break;
        }
        case "set_nicknames": {
  logDebug("Bắt đầu xử lý set_nicknames:", action);

  if (!action.name || typeof action.name !== "string" || action.name.trim() === "") {
    aiErrors.push({
      type: "set_nicknames",
      reason: "Thiếu tên mới để đổi biệt danh (action.name rỗng hoặc không hợp lệ)",
    });
    break;
  }

  let targetID;
  let targetName = "";

  if (!action.target) {
    targetID = senderID;
    targetName = senderInfo.name;
    logDebug("Đổi tên chính mình:", { targetID, targetName });
  } else {
    if (!threadInfo || !Array.isArray(threadInfo.userInfo)) {
      aiErrors.push({
        type: "set_nicknames",
        reason: "Không thể lấy thông tin nhóm (threadInfo null hoặc sai định dạng)",
      });
      break;
    }

    const targetRaw = action.target.toString().trim();

    if (/^\d+$/.test(targetRaw)) {
      const found = threadInfo.userInfo.find(u => u.id === targetRaw);
      if (found) {
        targetID = found.id;
        targetName = found.name;
        logDebug("Tìm UID trực tiếp:", { targetID, targetName });
      }
    }

    if (!targetID) {
      const targetUser = findUserByName(threadInfo.userInfo, targetRaw, threadInfo.nicknames);
      if (targetUser) {
        targetID = targetUser.id;
        targetName = targetUser.name;
        logDebug("Đổi tên người khác bằng name:", { targetID, targetName });
      } else {
        aiErrors.push({
          type: "set_nicknames",
          reason: `Không tìm thấy người dùng "${action.target}" trong nhóm`,
          rawTarget: action.target,
        });
        break;
      }
    }
  }

  logDebug("Chuẩn bị gọi api.changeNickname:", {
    newName: action.name.trim(),
    threadID,
    targetID,
    targetName
  });

  try {
    await new Promise((resolve, reject) => {
      api.changeNickname(action.name.trim(), threadID, targetID, (err) => {
        if (err) {
          logDebug("Lỗi từ api.changeNickname:", err);
          let reason = "Không rõ lỗi";

          if (err.error?.message) {
            const msg = err.error.message.toLowerCase();
            if (msg.includes("permission")) {
              reason = "Bot không có quyền đổi biệt danh cho người này";
            } else if (msg.includes("rate limit")) {
              reason = "Đổi tên quá nhanh (rate limit)";
            } else if (msg.includes("invalid")) {
              reason = "Tên biệt danh không hợp lệ";
            } else {
              reason = `Lỗi không xác định từ Facebook API: ${err.error.message}`;
            }
          }

          aiErrors.push({
            type: "set_nicknames",
            reason,
            rawTarget: action.target,
            nameAttempted: action.name.trim(),
          });
          return reject(err);
        } else {
          logDebug("Đổi biệt danh thành công:", {
            targetName,
            targetID,
            newName: action.name.trim()
          });
          resolve();
        }
      });
    });
  } catch (nicknameError) {
    logDebug("Exception trong quá trình đổi tên:", nicknameError);
    aiErrors.push({
      type: "set_nicknames",
      reason: "Exception khi gọi api.changeNickname",
      details: nicknameError.message || nicknameError,
    });
  }

  break;
}

        case "open_module": {
          const targetModule = global.client.commands.get(action.module);
          if (targetModule?.run) {
            const fakeEvent = { ...event, body: `${global.config.PREFIX}${action.module} ${(action.args || []).join(" ")}` };
            await targetModule.run({ api, event: fakeEvent, args: action.args || [] });
          } else { console.error(`Không tìm thấy module \"${action.module}\"`); }
          break;
        }
        case "play_music": {
          if (!action.keyword || action.keyword.trim() === "scl") {
              console.error("Hành động play_music không có keyword.");
              break;
          }

          const sclModule = global.client.commands.get("play") || global.client.commands.get("scl");
          if (sclModule?.run) {
            const musicArgs = action.keyword.split(" ");
            const fakeEvent = { ...event, body: `${global.config.PREFIX}play ${action.keyword}` };
            await sclModule.run({ api, event: fakeEvent, args: musicArgs });
          } else { 
            console.error("Không tìm thấy module nhạc (play/sing)."); 
          }
          break;
        }
        case "taoanh": {
          if (!action.keyword || action.keyword.trim() === "createimg") {
              console.error("Hành động tạo ảnh không có keyword.");
              break;
          }

          const sclModule = global.client.commands.get("taoanh") || global.client.commands.get("createimg");
          if (sclModule?.run) {
            const musicArgs = action.keyword.split(" ");
            const fakeEvent = { ...event, body: `${global.config.PREFIX}play ${action.keyword}` };
            await sclModule.run({ api, event: fakeEvent, args: musicArgs });
          } else { 
            console.error("Không tìm thấy module nhạc (play/sing)."); 
          }
          break;
        }
        case "add_memory": {
  const key = `${threadID}_${action._id}`;
  if (memoryData[key]) {
    memoryData[key] = { ...memoryData[key], ...action.data };
  } else {
    memoryData[key] = action.data;
  }
  saveJson(memoryPath, memoryData);
  break;
}
       case "edit_memory": {
  const key = `${threadID}_${action._id}`;
  if (memoryData[key]) {
    memoryData[key] = { ...memoryData[key], ...action.new_data };
    saveJson(memoryPath, memoryData);
  }
  break;
}
       case "delete_memory": {
  const key = `${threadID}_${action._id}`;
  delete memoryData[key];
  saveJson(memoryPath, memoryData);
  break;
}
        case "kick": {
          logDebug("Bắt đầu xử lý kick:", action);
          if (senderInfo.role !== "admin") {
            logDebug("Người gửi không phải admin, không có quyền kick.");
            await new Promise((resolve, reject) => {
                api.sendMessage("Dạ, chỉ có quản trị viên của nhóm mới được dùng lệnh kick thui ạ 😤", threadID, messageID);
                resolve();
            });
            break; 
          }
          if (!action.target) {
            logDebug("Thiếu target để kick.");
            await new Promise((resolve, reject) => {
                api.sendMessage("Anh/chị muốn kick ai ạ? Hãy nói rõ tên người đó nha!", threadID, messageID);
                resolve();
            });
            break;
          }

          const { isAdmin: botIsAdmin, threadInfo } = await checkBotPermissions(api, threadID);
          if (!botIsAdmin) {
              logDebug("Bot không có quyền admin trong nhóm, không thể kick.");
              await new Promise((resolve, reject) => {
                api.sendMessage("Em không có quyền kick thành viên trong nhóm này ạ 😔 Anh cần thêm em làm quản trị viên nhóm để em có thể kick được nha!", threadID, (error, info) => {
                  if (error) return reject(error);
                  resolve();
                }, messageID);
              });
              break;
          }

          if (!threadInfo) {
              logDebug("Không thể lấy thông tin nhóm để kick.");
              await new Promise((resolve, reject) => {
                api.sendMessage("Em không thể lấy thông tin nhóm để kick ạ 😞", threadID, (error, info) => {
                  if (error) return reject(error);
                  resolve();
                }, messageID);
              });
              break;
          }

          const targetUser = findUserByName(threadInfo.userInfo, action.target, threadInfo.nicknames);
          
          if (!targetUser) {
              logDebug("Không tìm thấy người dùng để kick:", action.target);
              await new Promise((resolve, reject) => {
                api.sendMessage(`Em không tìm thấy bạn \"${action.target}\" trong nhóm ạ 😔 Anh kiểm tra lại tên xem có đúng không nha!`, threadID, (error, info) => {
                  if (error) return reject(error);
                  resolve();
                }, messageID);
              });
              break;
          }

          const targetInfo = await getUserAndRoleInfo(api, targetUser.id, threadID);
          if (targetUser.id === api.getCurrentUserID()) {
            logDebug("Không thể tự kick bot.");
            await new Promise((resolve, reject) => {
                api.sendMessage("Em không thể tự kick mình được ạ 🥺", threadID, messageID);
                resolve();
            });
            break;
          }
          if (targetInfo.role === "admin") {
            logDebug("Không thể kick admin.");
            await new Promise((resolve, reject) => {
                api.sendMessage("Em không thể kick quản trị viên nhóm được ạ 🥺", threadID, messageID);
                resolve();
            });
            break;
          }
          
          logDebug("Chuẩn bị gọi api.removeUserFromGroup:", { targetID: targetUser.id, threadID });
          try {
            await new Promise((resolve, reject) => {
              api.removeUserFromGroup(targetUser.id, threadID, (err) => {
                if (err) {
                  logDebug("Lỗi từ api.removeUserFromGroup:", err);
                  let errorMessage = "Em không thể kick bạn ấy được ạ 😞";
                  if (err.error && err.error.message) {
                    if (err.error.message.includes("permission")) {
                      errorMessage = "Em không có quyền kick bạn ấy ạ 😔";
                    }
                  }
                  api.sendMessage(errorMessage, threadID, messageID);
                  reject(err);
                } else {
                  logDebug("Kick thành công:", { targetName: targetUser.name, targetID: targetUser.id });
                  resolve();
                }
              });
            });
          } catch (kickError) {
            logDebug("Exception trong quá trình kick:", kickError);
          }
          break;
        }
      }
    } catch (actionError) {
      console.error(`Lỗi khi thực thi hành động ${action.type}:`, actionError);
      logDebug("Chi tiết lỗi action:", { action, error: actionError });
    }
  }
}


module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID, mentions } = event;
  const command = args[0]?.toLowerCase();

  // Xử lý lệnh on/off (dành cho tất cả mọi người)
  if (command === "on") {
      threadsConfig[threadID] = { enabled: true };
      saveThreadsConfig();
      return api.sendMessage("Dạ, em đã bật chế độ AI cho nhóm này rùi ạ 😚", threadID, messageID);
  }

  if (command === "off") {
      threadsConfig[threadID] = { enabled: false };
      saveThreadsConfig();
      return api.sendMessage("Dạ, em đã tắt chế độ AI cho nhóm này ạ. Hẹn gặp lại sau nha 🥺", threadID, messageID);
  }
  
  // Các lệnh admin khác
  if (command === "setadmin") {
      const threadInfo = await new Promise((res, rej) => api.getThreadInfo(threadID, (err, info) => err ? rej(err) : res(info)));
      const isGroupAdmin = threadInfo.adminIDs.some(admin => admin.id == senderID);
      if (!isGroupAdmin) {
          return api.sendMessage("Dạ, chỉ có quản trị viên của nhóm mới được dùng lệnh này thui ạ 😤", threadID, messageID);
      }
      const targetID = Object.keys(mentions)[0];
      if (!targetID) {
          return api.sendMessage("Anh/chị phải tag một người để cấp quyền admin cho bot chứ ạ :<", threadID, messageID);
      }
      if (!userRoles[threadID]) userRoles[threadID] = {};
      userRoles[threadID][targetID] = "admin";
      saveUserRoles();
      delete userInfoCache[targetID];
      return api.sendMessage(`Dạ, em đã ghi nhận bạn \"${mentions[targetID].replace("@", "")}\" là admin của bot rùi ạ 👑`, threadID, messageID);
  }
    
  // Kiểm tra nếu AI đã bị tắt cho nhóm này
  if (threadsConfig[threadID]?.enabled === false) {
      return; // Không làm gì cả nếu bị tắt
  }

 // [THAY BẰNG ĐOẠN NÀY]
if (command === "clear") {
  const memoryKey = `${threadID}_${senderID}`;
  delete memoryData[memoryKey];
  saveJson(memoryPath, memoryData);
  chatSessions.delete(memoryKey);
  return api.sendMessage("Em xóa hết ký ức với anh/chị rùi nha 🥺✨", threadID, messageID);
}

  const prompt = args.join(" ");
  if (!prompt) return api.sendMessage("Nói j đi bé ơi 😗", threadID, messageID);
  
  const fileUrls = event.type === "message_reply" && event.messageReply.attachments ?
  event.messageReply.attachments.map(att => ({ url: att.url, type: att.type })) : [];
  try {
    const threadInfo = await new Promise((res, rej) => api.getThreadInfo(threadID, (err, info) => err ? rej(err) : res(info)));
    const { name, gender, role } = await getUserAndRoleInfo(api, senderID, threadID);
    logDebug("Thông tin người dùng và nhóm:", {
      senderID,
      name,
      gender,
      role,
      threadID,
      prompt,
      participantsCount: threadInfo.userInfo.length
    });
    const actions = await handleAsTrang(threadID, senderID, prompt, threadInfo.userInfo, fileUrls, gender, name, role);
    await processActions(api, event, actions, threadInfo);
  } catch (error) {
    console.error("Lỗi trong hàm run:", error);
    logDebug("Chi tiết lỗi run:", error);
    api.sendMessage("Ơ lag quớ, thử lại sau nha 😫", threadID, messageID);
  }
};

module.exports.handleEvent = async function({ api, event }) {
  const { threadID, senderID } = event;
  
  // Kiểm tra nếu AI đã bị tắt cho nhóm này
  if (threadsConfig[threadID]?.enabled === false) {
      return;
  }

  if (!event.body || !event.isGroup || !event.body.toLowerCase().includes("trang")) return;
  
  try {
    const threadInfo = await new Promise((res, rej) => api.getThreadInfo(threadID, (err, info) => err ? rej(err) : res(info)));
    const { name, gender, role } = await getUserAndRoleInfo(api, senderID, threadID);
    const actions = await handleAsTrang(threadID, senderID, event.body, threadInfo.userInfo, [], gender, name, role);
    await processActions(api, event, actions, threadInfo);
  } catch (error) {
    console.error("Lỗi trong handleEvent:", error);
  }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
  const { threadID, senderID } = event;

  // Kiểm tra nếu AI đã bị tắt cho nhóm này
  if (threadsConfig[threadID]?.enabled === false) {
      return;
  }

  if (event.senderID !== handleReply.author) return;
  
  const fileUrls = event.attachments ?
  event.attachments.map(att => ({ url: att.url, type: att.type })) : [];
  try {
    const threadInfo = await new Promise((res, rej) => api.getThreadInfo(threadID, (err, info) => err ? rej(err) : res(info)));
    const { name, gender, role } = await getUserAndRoleInfo(api, senderID, threadID);
    const actions = await handleAsTrang(threadID, senderID, event.body, threadInfo.userInfo, fileUrls, gender, name, role);
    await processActions(api, event, actions, threadInfo);
  } catch (err) {
    console.error("❌ Lỗi trong handleReply:", err);
    api.sendMessage("Ơ lag quớ, thử lại sau nha 😫", threadID, event.messageID);
  }
};