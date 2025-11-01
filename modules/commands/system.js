const si = require("systeminformation");
const pidusage = require("pidusage");
const os = require("os");

module.exports.config = {
  name: "system",
  version: "5.1", // Cập nhật version để phản ánh định dạng mới
  hasPermssion: 2,
  credits: "ĐÉO CÓ (Chỉnh sửa định dạng bởi Gemini)",
  description: "Hiển thị thông tin hệ thống theo định dạng text file",
  commandCategory: "Admin",
  usages: "",
  cooldowns: 5,
  dependencies: {
    "systeminformation": "",
    "pidusage": ""
  }
};

/**
 * Hàm phụ trợ: Định dạng Byte thành KB/MB/GB
 */
function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

/**
 * Hàm phụ trợ: Định dạng giây thành H:M:S
 */
function formatUptime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs}h ${mins}m ${secs}s`;
}

module.exports.run = async ({ api, event }) => {
  const { threadID, messageID } = event;
  const startTime = Date.now();

  api.sendMessage("⏳ Đang thu thập và định dạng cấu hình hệ thống...", threadID, messageID);

  try {
    // 1. Thu thập dữ liệu
    const [
      cpu, mem, osInfo, disks, usage, battery, ping, 
      baseboard, graphics, memLayout, system
    ] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.osInfo(),
      si.diskLayout(),
      pidusage(process.pid),
      si.battery(),
      si.inetLatency(),
      si.baseboard(),
      si.graphics(),
      si.memLayout(),
      si.system()
    ]);

    // 2. Xử lý dữ liệu và tạo chuỗi con

    // Chi tiết RAM
    const ramInfo = memLayout.map((m, i) => {
      const sizeGB = (m.size / 1024 / 1024 / 1024).toFixed(1);
      const type = m.type || "?";
      const speed = m.clockSpeed || "?";
      const manufacturer = m.manufacturer || "?";
      return `- Chi tiết thanh ${i + 1}: ${sizeGB} GB (${type}, ${speed} MHz, Hãng: ${manufacturer})`;
    }).join("\n");

    // Ổ đĩa
    const diskList = disks.map((d, i) => {
      const sizeGB = (d.size / 1024 / 1024 / 1024).toFixed(0);
      const name = d.name || "N/A";
      const interfaceType = d.interfaceType || "?";
      return `- Ổ ${i + 1}: ${name} - ${interfaceType}, ${sizeGB} GB`;
    }).join("\n");
    
    // Giả lập dữ liệu cũ: Chỉ lấy GPU đầu tiên nếu có nhiều
    const gpuData = graphics.controllers[0];
    const gpuVram = gpuData && gpuData.vram ? gpuData.vram + " MB" : "Không rõ";
    const gpuName = gpuData ? `${gpuData.vendor || "Không rõ"} ${gpuData.model || "Không rõ"}` : "Không có GPU rời";

    // Màn hình (Chỉ lấy màn hình chính)
    const primaryDisplay = graphics.displays.find(d => d.main) || graphics.displays[0];
    const displayModel = primaryDisplay ? primaryDisplay.model || "Generic PnP Monitor" : "Không rõ";

    // 3. Xây dựng chuỗi kết quả (msg) theo định dạng yêu cầu

    const msg =
`=========================================
THÔNG TIN CẤU HÌNH HỆ THỐNG - ${system.model || "Không rõ"}
=========================================

1. CẤU HÌNH CƠ BẢN
--------------------
- Hãng/Model: ${system.manufacturer || "Không rõ"} ${system.model || "Không rõ"}
- Bo mạch chủ: ${baseboard.manufacturer} ${baseboard.model || "Không rõ"}
- Hệ điều hành: ${osInfo.platform} (Phiên bản ${osInfo.build || osInfo.release}, ${osInfo.arch})
- Uptime máy: ${formatUptime(os.uptime())}

2. BỘ XỬ LÝ & ĐỒ HỌA (CPU/GPU)
-------------------------------
- CPU: ${cpu.manufacturer} ${cpu.brand}
    - Cấu hình: ${cpu.cores} nhân / ${cpu.physicalCores} luồng
    - Tốc độ cơ bản: ${cpu.speed} GHz
    - Mức sử dụng: ${usage.cpu.toFixed(1)}%
- GPU: ${gpuName}
    - VRAM: ${gpuVram}

3. BỘ NHỚ & LƯU TRỮ (RAM/Ổ ĐĨA)
--------------------------------
- Tổng RAM: ${(mem.total / 1024 / 1024 / 1024).toFixed(1)} GB (Trống: ${(mem.available / 1024 / 1024 / 1024).toFixed(1)} GB)
- Loại RAM: ${memLayout[0] ? memLayout[0].type || "?" : "Không rõ"}, ${memLayout[0] ? memLayout[0].clockSpeed || "?" : "Không rõ"} MHz
${ramInfo}
- Ổ đĩa: ${diskList}

4. TRẠNG THÁI VÀ THIẾT BỊ
---------------------------
- Màn hình: ${displayModel} (Chính)
- Pin: ${battery.hasBattery ? `${battery.percent !== null ? battery.percent + "%" : "Không rõ"} (${battery.isCharging ? "Đang sạc" : "Không sạc"})` : "Không có Pin"}
- Ping mạng: ${ping !== null ? ping + " ms" : "Không rõ"}
- Uptime bot: ${formatUptime(process.uptime())}
- Phản hồi Bot: ${(Date.now() - startTime)} ms`;

    return api.sendMessage(msg, threadID, messageID);
  } catch (err) {
    return api.sendMessage(`⚠️ Lỗi khi lấy thông tin hệ thống:\n${err.message}`, threadID, messageID);
  }
};
