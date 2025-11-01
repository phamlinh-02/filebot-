module.exports.config = {
  name: 'checkfb',
  version: '1.2.0',
  hasPermssion: 0,
  credits: 'Tùng',
  description: 'Kiểm tra ngày tạo tài khoản Facebook',
  commandCategory: 'Thông Tin',
  usages: '[link|uid] or reply',
  cooldowns: 5
};

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const TOKENS_PATHS = [
  path.resolve(__dirname, './../../utils/tokens.json'),
];

async function getUidFromLinkFFB(link) {
  try {
    const res = await axios.get(`https://ffb.vn/api/tool/get-id-fb?idfb=${encodeURIComponent(link)}`);
    if (res.data && res.data.error === 0 && res.data.id) {
      return res.data.id.toString();
    }
  } catch (e) {
    console.error("getUidFromLinkFFB error:", e.message);
  }
  return null;
}

function loadTokens() {
  for (const p of TOKENS_PATHS) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        try {
          return JSON.parse(raw);
        } catch {
          continue;
        }
      }
    } catch {}
  }
  return null;
}

function formatDateISOToDMYHMS(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const pad = (n) => (n < 10 ? '0' + n : n);
    const HH = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    const DD = pad(d.getDate());
    const MM = pad(d.getMonth() + 1);
    const YYYY = d.getFullYear();
    return `${HH}:${mm}:${ss} ${DD}/${MM}/${YYYY}`;
  } catch {
    return iso;
  }
}

async function fetchProfileInfo(id, token) {
  try {
    const fields = 'id,name,created_time';
    const res = await axios.get(
      `https://graph.facebook.com/${encodeURIComponent(id)}?fields=${fields}&access_token=${token}`
    );
    return res.data;
  } catch (e) {
    if (e.response?.data?.error) throw new Error(JSON.stringify(e.response.data.error));
    throw e;
  }
}

module.exports.run = async ({ api, event, args }) => {
  try {
    const tokens = loadTokens();
    if (!tokens || !tokens.EAAD6V7) {
      return api.sendMessage(
        '⚠️ Không tìm thấy token `EAAD6V7` trong utils/tokens.json.\nVui lòng thêm token vào file.',
        event.threadID
      );
    }
    const accessToken = tokens.EAAD6V7;

    let target = null;
    // ✅ Nếu reply thì lấy UID người reply
    if (event.type === 'message_reply' && event.messageReply?.senderID) {
      target = event.messageReply.senderID.toString();
    }

    // ✅ Nếu nhập args
if (!target && args?.length > 0) {
  const raw = args.join(' ').trim();
  if (/^\d{5,}$/.test(raw)) {
    target = raw; // UID trực tiếp
  } else {
    const uid = await getUidFromLinkFFB(raw);
    if (uid) {
      target = uid;
    } else {
      return api.sendMessage(
        '❌ Không thể lấy UID từ link này.',
        event.threadID,
        event.messageID
      );
    }
  }
}

    // ✅ Nếu không nhập gì thì lấy chính người dùng lệnh
    if (!target) target = event.senderID.toString();

    // ✅ Lấy thông tin profile từ Graph API
    let profile;
    try {
      profile = await fetchProfileInfo(target, accessToken);
    } catch (e) {
      return api.sendMessage(`❌ Lỗi khi truy vấn Facebook API:\n${e.message}`, event.threadID);
    }
    if (!profile) return api.sendMessage('❌ Không lấy được thông tin từ Facebook API.', event.threadID);

    const name = profile.name || 'Không rõ';
    const id = profile.id || target;
    const created = profile.created_time || null;

    let text = `📋 Thông tin tài khoản:\nTên: ${name}\nID: ${id}\n`;
    if (created) {
      text += `Ngày tạo (raw): ${created}\nNgày tạo (định dạng): ${formatDateISOToDMYHMS(created)}`;
    } else {
      text += 'Ngày tạo: ❌ Không tìm thấy (API không trả về hoặc token không đủ quyền).';
    }
    return api.sendMessage(text, event.threadID);
  } catch (err) {
    console.error(err);
    return api.sendMessage('❌ Đã xảy ra lỗi khi chạy lệnh.', event.threadID);
  }
};