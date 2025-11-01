module.exports.config = {
  name: "shortcut",
  version: "4.0.0",
  hasPermssion: 0,
usePrefix: false,
  credits: "Niio-team (Niiozic)",
  description: "Shortcut full chức năng",
  commandCategory: "Tiện ích",
  usages: "[all/delete/empty/tag/join/leave/autosend]\n{time} -> get time\n{name} -> get name user\n{nameThread} -> get name box\n{soThanhVien} -> get số thành viên nhóm\n{link} -> get link user\n{authorName} -> get name người add or kick\n{authorId} -> get link người add or kick\n{trangThai} -> lúc out sẽ hiện tự out or bị qtv kick\n{qtv} -> có tv tham gia hoặc out sẽ tag toàn bộ qtv",
  cooldowns: 0,
  dependencies: {
      "fs-extra": "",
      "path": ""
  }
}
global.nodemodule = {
  "path": require("path")
  // Thêm các module khác nếu cần
};
let format_attachment = type => ({
  photo: 'png', video: 'mp4', audio: 'mp3', animated_image: 'gif',
})[type] || 'bin';
const { readFileSync, writeFileSync, unlinkSync } = require('fs')
const stream_url = url => require('axios').get(url, { responseType: 'stream' }).then(res => res.data);
const { resolve } = global.nodemodule["path"];
const path = resolve(__dirname, '..', 'commands', `data`, "shortcutdata.json");
module.exports.onLoad = function ({ api }) {
    if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify([]), "utf-8");
    const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    global.moduleData.shortcut = new Map(data.map(item => [item.threadID, item.shortcuts]));

    setInterval(async () => {
        const now = moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss');
        for (const [threadID, shortcuts] of global.moduleData.shortcut.entries()) {
            for (const shortcut of shortcuts) {
                if (shortcut.input_type === 'autosend' && shortcut.hours === now) {
                    const output = shortcut.output.split('|').random();
                    let msg = { body: output };
                    const attachmentResult = await getAttachment(shortcut.uri);
                    if (attachmentResult.attachment) {
                        msg.attachment = attachmentResult.attachment;
                    }
                    api.sendMessage(msg, threadID);
                }
            }
        }
    }, 1000);
}

async function getAttachment(uri) {
    const videoTypes = ['vdgai', 'vdanime', 'vdcosplay', 'vdtrai'];
    if (videoTypes.includes(uri)) {
        if (global[uri] && global[uri].length > 0) {
            return { attachment: [global[uri].shift()] };
        } else {
            return { error: `Kho video cho shortcut '${uri}' hiện đang trống.` };
        }
    } else if (/^https:\/\//.test(uri)) {
        return { attachment: [await stream_url(uri)] };
    }
    return {}; // Không có attachment
}

module.exports.events = async function ({ api, event }) {
  const { threadID, logMessageType, logMessageData, participantIDs, author } = event;
  const data = global.moduleData.shortcut.get(threadID)

  if (!data) return;

  switch (logMessageType) {
      case 'log:subscribe': {
          const thread_info = await api.getThreadInfo(threadID);
          const admins = thread_info.adminIDs.map(e => [e.id, global.data.userName.get(e.id)]);
          const join = data.find(e => e.input_type == 'join');

          if (!join) return;

          const msg = {
              body: join.output
                  .replace(/{nameThread}/g, thread_info.threadName + '')
                  .replace(/{link}/g, logMessageData.addedParticipants.map(e => `https://www.facebook.com/profile.php?id=${e.userFbId}`).join('\n'))
                  .replace(/{soThanhVien}/g, participantIDs.length)
                  .replace(/{name}/g, logMessageData.addedParticipants.map(e => e.fullName).join(', '))
                  .replace(/{time}/g, require('moment-timezone')().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY - HH:mm:ss'))
                  .replace(/{authorName}/g, global.data.userName.get(author))
                  .replace(/{authorId}/g, `https://www.facebook.com/profile.php?id=` + author)
                  .replace(/{qtv}/g, `@${admins.map(e => e[1]).join('\n@')}`)
          };

          // === KHỐI LOGIC GỬI ATTACHMENT ĐÃ ĐƯỢC SỬA LỖI VÀ ĐỒNG BỘ ===
          try {
              msg.mentions = [];
              if (/{qtv}/.test(join.output)) msg.mentions = admins.map(e => ({ id: e[0], tag: e[1] }));
              if (/{name}/.test(join.output)) logMessageData.addedParticipants.map(e => msg.mentions.push({ id: e.userFbId, tag: e.fullName }));
              
              const videoType = join.uri;
              if (['vdgai', 'vdanime', 'vdcosplay', 'vdtrai'].includes(videoType)) {
                  if (global[videoType] && global[videoType].length > 0) {
                      msg.attachment = [global[videoType].shift()];
                  } else {
                      console.log(`[SHORTCUT JOIN] Kho video '${videoType}' rỗng.`);
                  }
              } else if (/^https:\/\//.test(videoType)) {
                  msg.attachment = [await stream_url(videoType)];
              }
          } catch (err) {
              console.error("[SHORTCUT JOIN] Lỗi khi xử lý attachment:", err);
          };
          // =============================================================

          api.sendMessage(msg, threadID);
      };
          break;
      case 'log:unsubscribe': {
          const thread_info = await api.getThreadInfo(threadID);
          const admins = thread_info.adminIDs.map(e => [e.id, global.data.userName.get(e.id)]);
          const leave = data.find(e => e.input_type == 'leave');

          if (!leave) return;

          const msg = {
              body: leave.output
                  .replace(/{nameThread}/g, global.data.threadInfo.get(threadID)?.threadName + '')
                  .replace(/{link}/g, 'https://www.facebook.com/profile.php?id=' + logMessageData.leftParticipantFbId)
                  .replace(/{soThanhVien}/g, participantIDs.length - 1)
                  .replace(/{name}/g, global.data.userName.get(logMessageData.leftParticipantFbId))
                  .replace(/{time}/g, require('moment-timezone')().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY - HH:mm:ss'))
                  .replace(/{trangThai}/g, logMessageData.leftParticipantFbId == author ? `đã tự out khỏi nhóm` : `đã bị kick khỏi nhóm`)
                  .replace(/{authorName}/g, global.data.userName.get(author))
                  .replace(/{authorId}/g, `https://www.facebook.com/profile.php?id=${author}`)
                  .replace(/{qtv}/g, `@${admins.map(e => e[1]).join('\n@')}`)
          };
          
          // === KHỐI LOGIC GỬI ATTACHMENT ĐÃ ĐƯỢC SỬA LỖI VÀ ĐỒNG BỘ ===
          try {
              msg.mentions = [];
              if (/{qtv}/.test(leave.output)) msg.mentions = admins.map(e => ({ id: e[0], tag: e[1] }));
              if (/{name}/.test(leave.output)) msg.mentions.push({ tag: global.data.userName.get(logMessageData.leftParticipantFbId), id: logMessageData.leftParticipantFbId });

              const videoType = leave.uri;
              if (['vdgai', 'vdanime', 'vdcosplay', 'vdtrai'].includes(videoType)) {
                  if (global[videoType] && global[videoType].length > 0) {
                      msg.attachment = [global[videoType].shift()];
                  } else {
                      console.log(`[SHORTCUT LEAVE] Kho video '${videoType}' rỗng.`);
                  }
              } else if (/^https:\/\//.test(videoType)) {
                  msg.attachment = [await stream_url(videoType)];
              }
          } catch (err) {
              console.error("[SHORTCUT LEAVE] Lỗi khi xử lý attachment:", err);
          };
          // =============================================================

          api.sendMessage(msg, threadID);
      };
          break;
      default:
          break;
  }
};
module.exports.handleEvent = async function ({ event, api, Users }) {
    const { threadID, messageID, body, senderID, mentions: Mentions = {} } = event;
    if (!body || api.getCurrentUserID() == senderID) return;
    
    const shortcuts = global.moduleData.shortcut.get(threadID);
    if (!shortcuts) return;

    const mentions = Object.keys(Mentions);
    let dataThread;

    // >> LOGIC SỬA LỖI <<
    // 1. Ưu tiên tìm shortcut dạng tag nếu có người được đề cập trong tin nhắn
    if (mentions.length > 0) {
        dataThread = shortcuts.find(item => item.input_type === 'tag' && mentions.includes(item.tag_id));
    }

    // 2. Nếu không tìm thấy shortcut dạng tag, tìm shortcut dạng văn bản thông thường
    if (!dataThread) {
        dataThread = shortcuts.find(item => (item.input || '').toLowerCase() == body.toLowerCase() && !['autosend', 'join', 'leave', 'tag'].includes(item.input_type));
    }
    // >> KẾT THÚC SỬA LỖI <<

    if (dataThread) {
        let output = dataThread.output.replace(/\{name}/g, await Users.getNameUser(senderID));
        let msg = { body: output }; 

        // Sử dụng hàm getAttachment đã được cải tiến của shortcut.txt
        const attachmentResult = await getAttachment(dataThread.uri); 
        if (attachmentResult.error) {
            // Khi kho rỗng, báo lỗi cho người dùng
            return api.sendMessage(attachmentResult.error, threadID, messageID);
        } else if (attachmentResult.attachment) {
            msg.attachment = attachmentResult.attachment; 
        }

        return api.sendMessage(msg, threadID, messageID); 
    }
}

module.exports.onLoad = function ({ api }) {
    const { existsSync, writeFileSync, mkdirSync, readFileSync } = require("fs-extra");
    if (!global.moduleData.shortcut) global.moduleData.shortcut = new Map();
    if (!existsSync(path)) writeFileSync(path, JSON.stringify([]), "utf-8");
    const data = JSON.parse(readFileSync(path, "utf-8"));
    for (const threadData of data) global.moduleData.shortcut.set(threadData.threadID, threadData.shortcuts);
    if (!global.hJajnaMai828kaiw)
        global.hJajnaMai828kaiw = setInterval(async function () {
            const now = require('moment-timezone')().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss');
            for (let [threadID, thread_data] of global.moduleData.shortcut) {
                for (let e of thread_data) (async _ => {
                    if (e.input_type === 'autosend') {
                        if (e.hours === now) {
                            const outputs = e.output.split('|');
                            const output = outputs[Math.random() * outputs.length << 0];
                            const msg = { body: output };
                            
                            // === KHỐI LOGIC GỬI ATTACHMENT ĐÃ ĐƯỢC SỬA LỖI VÀ ĐỒNG BỘ ===
                            try {
                                const videoType = e.uri;
                                if (['vdgai', 'vdanime', 'vdcosplay', 'vdtrai'].includes(videoType)) {
                                    if (global[videoType] && global[videoType].length > 0) {
                                        msg.attachment = [global[videoType].shift()];
                                    } else {
                                        console.log(`[SHORTCUT AUTOSEND] Kho video '${videoType}' rỗng.`);
                                    }
                                } else if (/^https:\/\//.test(videoType)) {
                                    msg.attachment = [await stream_url(videoType)];
                                }
                            } catch (err) { 
                                // Thêm log lỗi để dễ dàng gỡ lỗi
                                console.error("[SHORTCUT AUTOSEND] Lỗi khi xử lý attachment:", err);
                            };
                            // =============================================================

                            api.sendMessage(msg, threadID);
                        }
                    }
                })();
            }
        }, 1000);
}

module.exports.handleReply = async function ({ event = {}, api, handleReply }) {
    if (handleReply.author != event.senderID) return;
    try {
        const { threadID, messageID, senderID, body, attachments = [] } = event;
        const name = this.config.name;

        // =======================================================================
        // CÁC TÙY CHỌN VÀ HƯỚỚNG DẪN MỚI
        // =======================================================================
        const attachmentInstruction = "📌 Reply tin nhắn này bằng tệp video/ảnh/mp3/gif.\nHoặc nhập một trong các tùy chọn sau:\n - 's' (để không gửi tệp)\n - 'vdgai' (video gái ngẫu nhiên)\n - 'vdanime' (video anime ngẫu nhiên)\n - 'vdcosplay' (video cosplay ngẫu nhiên)\n - 'vdtrai' (video trai ngẫu nhiên)";
        const allowedKeywords = ['s', 'vdgai', 'vdanime', 'vdcosplay', 'vdtrai'];
        // =======================================================================

        switch (handleReply.type) {
            case "requireInput": {
                if (body.length == 0) return api.sendMessage("❎ Câu trả lời không được để trống", threadID, messageID);
                const data = global.moduleData.shortcut.get(threadID) || [];
                if (data.some(item => item.input == body)) return api.sendMessage("❎ Input đã tồn tại từ trước", threadID, messageID);
                api.unsendMessage(handleReply.messageID);
                return api.sendMessage("📌 Reply tin nhắn này để nhập câu trả lời khi sử dụng từ khóa", threadID, (error, info) => {
                    global.client.handleReply.push({
                        type: "requireOutput",
                        name,
                        author: senderID,
                        messageID: info.messageID,
                        input: body
                    });
                }, messageID);
            }
            case "requireOutput": {
                if (body.length == 0) return api.sendMessage("❎ Câu trả lời không được để trống", threadID, messageID);
                api.unsendMessage(handleReply.messageID);
                return api.sendMessage(attachmentInstruction, threadID, (error, info) => {
                    global.client.handleReply.push({
                        type: "requireAttachment", // Đổi tên để rõ ràng hơn
                        name,
                        author: senderID,
                        messageID: info.messageID,
                        input: handleReply.input,
                        output: body,
                        input_type: handleReply.input_type,
                        tag_id: handleReply.tag_id,
                    });
                }, messageID);
            }
            case "requireAttachment": { // Tên mới: requireAttachment
                let uri = body;
                // Nếu reply không phải là keyword cho phép
                if (!allowedKeywords.includes(body.toLowerCase())) {
                    if (attachments.length === 0) return api.sendMessage('⚠️ Bạn chưa đính kèm tệp và cũng không chọn tùy chọn hợp lệ.', threadID, messageID);
                    const typeMap = { "photo": "jpg", "video": "mp4", "audio": "m4a", "animated_image": "gif" };
                    const type = typeMap[attachments[0].type] || "txt";
                    try {
                        // Giả sử bạn có hàm upload tệp tên là catbox
                        uri = await catbox(attachments[0].url, type);
                    } catch (e) {
                        console.error(e);
                        return api.sendMessage('⚠️ Không thể upload tệp lên server.', threadID, messageID);
                    };
                };

                const readData = readFileSync(path, "utf-8");
                const data = JSON.parse(readData);
                const dataThread = data.find(item => item.threadID == threadID) || { threadID, shortcuts: [] };
                const dataGlobal = global.moduleData.shortcut.get(threadID) || [];
                
                const object = { 
                    input: handleReply.input, 
                    output: handleReply.output, 
                    uri: uri.toLowerCase(), // Lưu keyword dưới dạng chữ thường
                    input_type: handleReply.input_type, 
                    tag_id: handleReply.tag_id 
                };

                dataThread.shortcuts.push(object);
                dataGlobal.push(object);

                if (!data.some(item => item.threadID == threadID)) data.push(dataThread);
                else {
                    const index = data.findIndex(item => item.threadID == threadID);
                    data[index] = dataThread;
                }

                global.moduleData.shortcut.set(threadID, dataGlobal);
                writeFileSync(path, JSON.stringify(data, null, 4), "utf-8");
                api.unsendMessage(handleReply.messageID);
                return api.sendMessage(`📝 Đã thêm thành công shortcut mới:\n\n- Input: ${handleReply.input}\n- Output: ${handleReply.output}\n- Attachment: ${uri}`, threadID, messageID);
            }
            case "delShortcut": {
                const shortcutsData = JSON.parse(readFileSync(path));
                const dataThread = shortcutsData.find(item => item.threadID == threadID);
                const dataGlobal = global.moduleData.shortcut.get(threadID) || [];
                const inputDel = [];

                for (let i of event.args.map(Number).filter(isFinite)) {
                    const dataDel = dataGlobal[i-1];

                        inputDel.push(`${ i }.${
                              ({
                          tag: _ => `@{${global.data.userName.get(dataDel.tag_id)}}`,
                          autosend: _ => `${dataDel.hours} autosend`,
                          join: _ => `join noti`,
                          leave: _ => `leave noti`
                      }[dataDel?.input_type] || (_ => dataDel?.input || `STT invalid`))()
                              } `);
                  if (dataDel)dataGlobal[i-1] = null;
                }
                const filDataGlobal = dataGlobal.filter(e=>e!=null);

                dataThread.shortcuts = filDataGlobal;
                global.moduleData.shortcut.set(threadID, filDataGlobal);
                writeFileSync(path, JSON.stringify(shortcutsData,0,4));

              return api.sendMessage('✅ Đã xóa thành công\n\n' + inputDel.join('\n'),threadID)
            }
            case 'autosend': {
                if (!body)return api.sendMessage('⚠️ Chưa nhập nội dung', threadID, messageID);

                api.sendMessage('📌 Vui lòng reply tin nhắn này kèm giờ\nVD: 12:00:00', threadID, (err, data)=>{
                    global.client.handleReply.push({
                        ...data,
                        author: senderID,
                        name: name,
                        type: 'autosend.input_time',
                        data: {
                            output: body,
                        },
                    });
                }, messageID)
                break;
            }
            case 'autosend.input_time': {
                if (!require('moment-timezone')(body, 'HH:mm:ss').isValid() || body.length !== '00:00:00'.length)return api.sendMessage('⚠️ Time không hợp lệ', threadID, messageID);

                api.sendMessage(attachmentInstruction, threadID, (err, data)=>{
                    global.client.handleReply.push({
                        ...data,
                        author: senderID,
                        name: name,
                        type: 'autosend.input_attachment',
                        data: {
                            ...handleReply.data,
                            hours: body,
                        },
                    });
                }, messageID);
                break;
            }
            case 'autosend.input_attachment': {
                let uri = body;
                if (!allowedKeywords.includes(body.toLowerCase())){
                    if (attachments.length === 0)return api.sendMessage('⚠️ Chưa nhập tệp đính kèm', threadID, messageID);
                    const typeMap = { "photo": "jpg", "video": "mp4", "audio": "m4a", "animated_image": "gif" };
                    const type = typeMap[attachments[0].type] || "txt";
                    try {
                        uri = await catbox(attachments[0].url, type);
                    } catch(e) {
                        console.error(e);
                        return api.sendMessage('⚠️ Không thể upload', threadID, messageID);
                    };
                };

                const new_data = {
                    input_type: 'autosend',
                    ...handleReply.data,
                    uri: uri.toLowerCase(),
                };
                const global_data = global.moduleData.shortcut.get(threadID) || [];
                const data = JSON.parse(readFileSync(path));

                if (!data.some(e=>e.threadID == threadID))data.push({ threadID, shortcuts: [] });

                const thread_data = data.find(e=>e.threadID == threadID);

                global_data.push(new_data);
                thread_data.shortcuts.push(new_data);
                global.moduleData.shortcut.set(threadID, global_data);
                writeFileSync(path, JSON.stringify(data,0,4));

                api.sendMessage('✅ Đã thêm auto send', threadID, messageID);
                break;
            }
            case 'join':
            case 'leave': {
                if (!handleReply.data.output) {
                    if (!body)return api.sendMessage('⚠️ Chưa nhập nội dung', threadID, messageID);
                    api.sendMessage(attachmentInstruction, threadID, (err, data)=>{
                        global.client.handleReply.push({
                            ...data,
                            author: senderID,
                            name: name,
                            type: handleReply.type,
                            data: {
                                output: body,
                            },
                        });
                    }, messageID);
                } else {
                    let uri = body;
                    if (!allowedKeywords.includes(body.toLowerCase())){
                        if (attachments.length === 0)return api.sendMessage('⚠️ Chưa nhập tệp đính kèm', threadID, messageID);
                        const typeMap = { "photo": "jpg", "video": "mp4", "audio": "m4a", "animated_image": "gif" };
                        const type = typeMap[attachments[0].type] || "txt";
                        try {
                            uri = await catbox(attachments[0].url, type);
                        } catch(e) {
                            console.error(e);
                            return api.sendMessage('⚠️ Không thể upload', threadID, messageID);
                        };
                    };

                    const new_data = {
                        input_type: handleReply.type,
                        ...handleReply.data,
                        uri: uri.toLowerCase(),
                    };
                    const global_data = global.moduleData.shortcut.get(threadID) || [];
                    const data = JSON.parse(readFileSync(path));

                    if (!data.some(e=>e.threadID == threadID))data.push({ threadID, shortcuts: [] });

                    const thread_data = data.find(e=>e.threadID == threadID);
                    const index = global_data.findIndex(e=>e.input_type === handleReply.type);

                    if (index !== -1) {
                        global_data.splice(index, 1);
                        thread_data.shortcuts.splice(index, 1);
                    };

                    global_data.push(new_data);
                    thread_data.shortcuts.push(new_data);
                    global.moduleData.shortcut.set(threadID, global_data);
                    writeFileSync(path, JSON.stringify(data,0,4));

                    api.sendMessage('✅ Đã thêm short '+handleReply.type, threadID, messageID);
                }
                break;
            }
            default:
                break;
        }
    } catch (e) {
        console.log(e)
    }
}
module.exports.run = function ({ event, api, args }) {
try{
  const { readFileSync, writeFileSync, existsSync } = global.nodemodule["fs-extra"];
  const { resolve } = global.nodemodule["path"];
  const { threadID, messageID, senderID, mentions = {} } = event;
  const name = this.config.name;

  const path = resolve(__dirname, '..', 'commands', `data`, "shortcutdata.json");

  switch (args[0]) {
      case 'join':
      case 'leave': {
          api.sendMessage(`📌 Vui lòng reply tin nhắn này và nhập nội dung`, threadID, (err, data)=>{
              global.client.handleReply.push({
                  ...data,
                  author: senderID,
                  name: exports.config.name,
                  type: args[0],
                  data: {},
              })
          }, messageID);
      }
      break;
      case 'autosend': {
          api.sendMessage(`📌 Vui lòng reply tin nhắn này và nhập nội dung tự động gửi(thêm | mỗi nội dung để random) \nVD: chào buổi sáng | buổi sáng tốt lành`, threadID, (err, data)=>{
              global.client.handleReply.push({
                  ...data,
                  author: senderID,
                  name: exports.config.name,
                  type: 'autosend',
              })
          }, messageID);
      }
          break;
      case "remove":
      case "delete":
      case "del":
      case "-d": {
          const readData = readFileSync(path, "utf-8");
          var data = JSON.parse(readData);
          const indexData = data.findIndex(item => item.threadID == threadID);
          if (indexData == -1) return api.sendMessage("❎ hiện tại nhóm của bạn chưa có shortcut nào được set", threadID, messageID);
          var dataThread = data.find(item => item.threadID == threadID) || { threadID, shortcuts: [] };
          var dataGlobal = global.moduleData.shortcut.get(threadID) || [];
          //var indexNeedRemove;

          if (dataThread.shortcuts.length == 0) return api.sendMessage("❎ hiện tại nhóm của bạn chưa có shortcut nào được set", threadID, messageID);
/*
          if (isNaN(args[1])) indexNeedRemove = args[1];
          else indexNeedRemove = dataThread.shortcuts.findIndex(item => item.input == (args.slice(1, args.length)).join(" ") || item.id == (args.slice(1, args.length)).join(" "));

          dataThread.shortcuts.splice(indexNeedRemove, 1);
          dataGlobal.splice(indexNeedRemove, 1);
*/
          let rm = args.slice(1).map($=>+($-1)).filter(isFinite);

          dataThread.shortcuts = dataThread.shortcuts.filter(($,i)=>!rm.includes(i));
          dataGlobal = dataGlobal.filter(($,i)=>!rm.includes(i));
          global.moduleData.shortcut.set(threadID, dataGlobal);
          data[indexData] = dataThread;
          writeFileSync(path, JSON.stringify(data, null, 4), "utf-8");

          return api.sendMessage("✅ Đã xóa thành công\n\n", threadID, messageID);
      }

      case "list":
      case "all":
      case "-a": {
          const data = global.moduleData.shortcut.get(threadID) || [];
          var array = [];
          if (data.length == 0) return api.sendMessage("❎ hiện tại nhóm của bạn chưa có shortcut nào được set", threadID, messageID);
          else {
              var n = 1;
              for (const single of data) {
                  //const path = resolve(__dirname, '..', 'events' ,"shortcut", "shortcut",`${ single.id } `);
                  //var existPath = false;
                  //if (existsSync(path)) existPath = true;
                  array.push(`${ n++ }. ${ single.uri !== 's' ? "yes" : "no" } • ${
                  ({
                      tag: _ => `@{${global.data.userName.get(single.tag_id)}}`,
                      autosend: _ => `${single.hours} autosend`,
                      join: _ => `join noti`,
                      leave: _ => `leave noti`
                  }[single.input_type] || (_ => single.input))()
              } -> ${ single.output } `);
              }
              return api.sendMessage(`📝 Dưới đây là toàn bộ shortcut nhóm có: \n\n${ array.join("\n") } \n\n'yes' là có tệp gửi kèm\n'no' là không có tệp gửi kèm\n\nReply (phản hồi) theo stt để xóa shortcut`, threadID, function (error, info) {
               global.client.handleReply.push({
                  type: "delShortcut",
                  name,
                  author: senderID,
                  messageID: info.messageID
              });
          });
          }
      }
      case 'tag': {
          let tag_id = Object.keys(mentions)[0] || senderID;

          const data = global.moduleData.shortcut.get(threadID) || [];
          if (data.some(item => item.tag_id == tag_id)) return api.sendMessage("❎ tag đã tồn tại từ trước", threadID, messageID);

          api.sendMessage("📌 Reply tin nhắn này để nhập câu trả lời khi được tag", threadID, function (error, info) {
               global.client.handleReply.push({
                  type: "requireOutput",
                  name,
                  author: senderID,
                  messageID: info.messageID,
                  input_type: 'tag',
                  tag_id,
              });
          }, messageID);
      };
          break;
      default: {
          return api.sendMessage("📌 Reply tin nhắn này để nhập từ khóa cho shortcut", threadID, function (error, info) {
              return global.client.handleReply.push({
                  type: "requireInput",
                  name,
                  author: senderID,
                  messageID: info.messageID
              });
          }, messageID);
      }
  }

}catch(e){
  console.log(e)
}
                }
async function catbox(link, type) {
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const filePath = path.join(__dirname, 'cache', `${Date.now()}.${type}`);
const response = await axios({ method: 'GET', url: link, responseType: 'stream' });
const writer = fs.createWriteStream(filePath);
response.data.pipe(writer);
await new Promise((resolve, reject) => writer.on('finish', resolve).on('error', reject));
const formData = new FormData();
formData.append('reqtype', 'fileupload');
formData.append('fileToUpload', fs.createReadStream(filePath));
const uploadResponse = await axios.post('https://catbox.moe/user/api.php', formData, {
  headers: formData.getHeaders(),
});
fs.unlinkSync(filePath);
return uploadResponse.data;
}