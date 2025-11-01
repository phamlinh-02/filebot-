module.exports = function ({ api, models, Users, Threads, Currencies }) {
    return function ({ event }) {
        if (!event.messageReply) return;
        
        // <<< SỬA 1: Thêm `events` để có thể tìm kiếm trong module sự kiện >>>
        const { handleReply, commands, events } = global.client;

        const { messageID, threadID, messageReply } = event;
        if (handleReply.length !== 0) {
            const indexOfHandle = handleReply.findIndex(e => e.messageID === messageReply.messageID);
            if (indexOfHandle < 0) return;

            const indexOfMessage = handleReply[indexOfHandle];

            // <<< SỬA 2: Tìm module ở cả 2 nơi (commands trước, events sau) >>>
            const handleNeedExec = commands.get(indexOfMessage.name) || events.get(indexOfMessage.name);
            
            if (!handleNeedExec) {
                // Giữ lại thông báo lỗi rõ ràng mà chúng ta đã tạo
                return api.sendMessage('Lệnh hoặc sự kiện cho tin nhắn trả lời này không còn tồn tại.', threadID, messageID);
            }

            // Kiểm tra xem module có hàm handleReply không
            if (typeof handleNeedExec.handleReply !== 'function') {
                 return api.sendMessage(`Module "${indexOfMessage.name}" không hỗ trợ chức năng trả lời.`, threadID, messageID);
            }

            try {
                var getText2;
                if (handleNeedExec.languages && typeof handleNeedExec.languages === 'object') {
                    getText2 = (...value) => {
                        const reply = handleNeedExec.languages[global.config.language] || {};
                        var lang = reply[value[0]] || '';
                        for (var i = value.length - 1; i >= 0; i--) {
                            const expReg = RegExp('%' + i, 'g');
                            lang = lang.replace(expReg, value[i]);
                        }
                        return lang;
                    };
                } else {
                    getText2 = () => {};
                }

                const Obj = {
                    api,
                    event,
                    models,
                    Users,
                    Threads,
                    Currencies,
                    handleReply: indexOfMessage,
                    getText: getText2,
                };

                handleNeedExec.handleReply(Obj);
                return;
            } catch (error) {
                console.error(`Lỗi khi thực thi handleReply của module ${indexOfMessage.name}:`, error);
                return api.sendMessage(`Đã xảy ra lỗi khi thực thi chức năng trả lời: ${error}`, threadID, messageID);
            }
        }
    };
};