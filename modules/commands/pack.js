// pack.js – Quản lý package npm (list / install / remove)
// ✨ Bản 3: hỗ trợ reply → "del <số>" để xoá nhanh
// Cách dùng trực tiếp:
//   pack list
//   pack install <tên‑gói>
//   pack remove <tên‑gói|số‑tt>
// + Sau khi bot gửi danh sách, chỉ cần REPLY:  del <số‑tt>
//   (không cần gõ lại prefix "pack")
// ※ Nên restart bot sau khi cài/xoá để nạp module.

const { exec } = require("child_process");

module.exports.config = {
  name: "pack",
  version: "1.2.0",
  hasPermssion: 2,
  credits: "ChatGPT",
  description: "Liệt kê, cài đặt, xoá npm package (hỗ trợ reply del <số>)",
  commandCategory: "Admin",
  usages: "pack list | pack install <pkg> | pack remove <pkg|#> | reply del <#>",
  cooldowns: 5
};

// Helper: gửi tin nhắn
function send(api, threadID, messageID, text) {
  return api.sendMessage(text, threadID, messageID);
}

// Helper: lấy danh sách package depth 0
function getPackageList() {
  return new Promise((resolve, reject) => {
    exec("npm ls --depth=0 --json", { cwd: process.cwd(), maxBuffer: 1024 * 500 }, (err, stdout) => {
      if (err && !stdout) return reject(err);
      try {
        const json = JSON.parse(stdout);
        const deps = json.dependencies || {};
        const list = Object.entries(deps).map(([n, info]) => ({ name: n, version: info.version || "?" }));
        resolve(list);
      } catch (e) {
        reject(e);
      }
    });
  });
}

module.exports.run = async ({ event, api, args }) => {
  const { threadID, messageID } = event;

  if (!args[0]) {
    return send(api, threadID, messageID, "❗ Dùng: pack list | pack install <package> | pack remove <package|số‑tt>");
  }

  const action = args[0].toLowerCase();
  const target = args.slice(1).join(" ");

  // ——— LIST ———
  if (action === "list") {
    send(api, threadID, messageID, "🔄 Đang lấy danh sách package…");
    try {
      const list = await getPackageList();
      if (!list.length) return send(api, threadID, messageID, "(Chưa có package nào)");
      const lines = list.map((p, idx) => `${idx + 1}. ${p.name}@${p.version}`);
      api.sendMessage(`📦 Package đã cài (${list.length})\n` + lines.join("\n") + "\n\n↪️ Reply: del <số‑tt> để xoá nhanh", threadID, (err, info) => {
        if (err) return;
        // Lưu handleReply
        global.client.handleReply.push({
          name: module.exports.config.name,
          messageID: info.messageID,
          type: "list"
        });
      }, messageID);
    } catch (e) {
      send(api, threadID, messageID, `⚠️ Lỗi lấy danh sách: ${e.message}`);
    }
    return;
  }

  // ——— INSTALL ———
  if (action === "install") {
    if (!target) return send(api, threadID, messageID, "❗ Bạn chưa nhập tên package để cài");
    send(api, threadID, messageID, `🛠 Đang cài: ${target}…`);
    exec(`npm install ${target} --save`, { cwd: process.cwd() }, (err) => {
      if (err) return send(api, threadID, messageID, `❌ Cài đặt thất bại: ${err.message}`);
      send(api, threadID, messageID, `✅ Đã cài xong ${target}. Nhớ restart bot để áp dụng.`);
    });
    return;
  }

  // ——— REMOVE / DEL ———
  if (["remove", "uninstall", "delete", "del"].includes(action)) {
    if (!target) return send(api, threadID, messageID, "❗ Bạn chưa nhập package hoặc số thứ tự để xoá");

    await removePackage(api, threadID, messageID, target);
    return;
  }

  // ——— Mặc định ———
  send(api, threadID, messageID, "❗ Hành động không hợp lệ. Dùng: list / install / remove");
};

// Hàm gỡ package (dùng chung cho run & handleReply)
async function removePackage(api, threadID, messageID, target) {
  const isNumber = /^\d+$/.test(target);
  let pkgName = target;

  if (isNumber) {
    try {
      const list = await getPackageList();
      const idx = parseInt(target, 10) - 1;
      if (!list[idx]) return send(api, threadID, messageID, `❌ Số thứ tự ${target} không tồn tại.`);
      pkgName = list[idx].name;
    } catch (e) {
      return send(api, threadID, messageID, `⚠️ Lỗi lấy danh sách: ${e.message}`);
    }
  }

  send(api, threadID, messageID, `🗑 Đang xoá: ${pkgName}…`);
  exec(`npm uninstall ${pkgName} --save`, { cwd: process.cwd() }, (err) => {
    if (err) return send(api, threadID, messageID, `❌ Xoá thất bại: ${err.message}`);
    send(api, threadID, messageID, `✅ Đã xoá ${pkgName}. Nhớ restart bot để áp dụng.`);
  });
}

// ————————————————————————— HANDLE REPLY —————————————————————————
module.exports.handleReply = async ({ event, api, handleReply }) => {
  if (handleReply.type !== "list") return;

  const { threadID, messageID } = event;
  const body = event.body.trim();
  const match = body.match(/^(del|remove|rm)\s+(\d+)$/i);

  if (!match) {
    return send(api, threadID, messageID, "❗ Dùng: del <số‑thứ‑tự> khi reply danh sách.");
  }

  const number = match[2];
  await removePackage(api, threadID, messageID, number);
};
