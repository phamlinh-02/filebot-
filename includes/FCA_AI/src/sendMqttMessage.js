"use strict";

var utils = require("../utils");
var log = require("npmlog");
var bluebird = require("bluebird");
var fs = require('fs-extra');

// Định nghĩa hiệu ứng tin nhắn
const MESSAGE_EFFECTS = {
    HEART: {
        id: "369239263222822",
        unified_id: "369239263222822",
        effect_name: "heart"
    },
    CELEBRATION: {
        id: "370940413392601",
        unified_id: "370940413392601",
        effect_name: "celebration"
    },
    CONFETTI: {
        id: "369239343222814",
        unified_id: "369239343222814",
        effect_name: "confetti"
    },
    LOVE: {
        id: "369239383222810",
        unified_id: "369239383222810",
        effect_name: "love"
    },
    FIRE: {
        id: "369239433222805",
        unified_id: "369239433222805",
        effect_name: "fire"
    }
};

module.exports = function(defaultFuncs, api, ctx) {
    // Hàm upload attachment
    function uploadAttachment(attachments, callback) {
        var uploads = [];

        for (var i = 0; i < attachments.length; i++) {
            if (!utils.isReadableStream(attachments[i])) {
                callback({ error: "Attachment must be a readable stream" });
                return;
            }

            var form = {
                upload_1024: attachments[i],
                voice_clip: "false",
                fb_api_req_friendly_name: "MessageFileUploader",
            };

            uploads.push(
                defaultFuncs
                    .postFormData("https://upload.facebook.com/ajax/mercury/upload.php", ctx.jar, form)
                    .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
                    .then(function (resData) {
                        if (!resData || !resData.payload || !resData.payload.metadata) {
                            throw { error: "Upload failed" };
                        }
                        return resData.payload.metadata[0];
                    })
            );
        }

        // Process tất cả uploads
        bluebird
            .all(uploads)
            .then(function (resData) {
                callback(null, resData);
            })
            .catch(function (err) {
                log.error("uploadAttachment", err);
                callback(err);
            });
    }

    function handleAttachment(msg, form, callback, cb) {
        if (msg.attachment) {
            form.image_ids = [];
            form.gif_ids = [];
            form.file_ids = [];
            form.video_ids = [];
            form.audio_ids = [];

            if (!Array.isArray(msg.attachment)) {
                msg.attachment = [msg.attachment];
            }

            uploadAttachment(msg.attachment, function(err, files) {
                if (err) return callback(err);

                files.forEach(function(file) {
                    const key = Object.keys(file)[0];
                    const type = `${key}s`;
                    if (form[type]) form[type].push(file[key]);
                });

                return cb();
            });
        } else {
            return cb();
        }
    }

    function send(form, threadID, messageAndOTID, callback) {
        var msgType = utils.getType(threadID);
        var ThreadID = msgType === "Array" ? threadID[0] : threadID;

        if (ThreadID.length <= 15 || global.Fca.isUser.includes(ThreadID)) {
            form["specific_to_list[0]"] = "fbid:" + ThreadID;
            form["specific_to_list[1]"] = "fbid:" + ctx.userID;
            form["other_user_fbid"] = ThreadID;
        } 
        else if (ThreadID.length >= 15 && ThreadID.indexOf(1) != 0 || global.Fca.isThread.includes(ThreadID)) {
            form["thread_fbid"] = ThreadID;
        }
        else {
            if (global.Fca.Data.event.isGroup) {
                form["thread_fbid"] = ThreadID;
                global.Fca.isThread.push(ThreadID); 
            }
            else {
                form["specific_to_list[0]"] = "fbid:" + ThreadID;
                form["specific_to_list[1]"] = "fbid:" + ctx.userID;
                form["other_user_fbid"] = ThreadID;
                global.Fca.isUser.push(ThreadID);
            }
        }

        if (ctx.globalOptions.pageID) {
            form.author = "fbid:" + ctx.globalOptions.pageID;
            form["specific_to_list[1]"] = "fbid:" + ctx.globalOptions.pageID;
        }

        var messageRequest = {
            type: "message",
            payload: form
        };

        const requestData = {
            app_id: "2220391788200892",
            payload: JSON.stringify({
                payload: JSON.stringify(form),
                tasks: [{
                    label: 46,
                    payload: JSON.stringify(form),
                    queue_name: ThreadID,
                    task_id: Math.random() * 1001 << 0,
                    failure_count: null
                }],
                epoch_id: messageAndOTID,
                version_id: '7553237234719461'
            }),
            request_id: ++ctx.req_ID,
            type: 3
        };

        ctx.mqttClient.publish('/ls_req', JSON.stringify(requestData), { qos: 1 });

        ctx.callback_Task[ctx.req_ID] = {
            type: "sendMqttMessage",
            callback: function(err, data) {
                if (err) return callback(err);
                callback(null, {
                    threadID: ThreadID,
                    messageID: messageAndOTID,
                    timestamp: Date.now()
                });
            }
        };
    }

    return function sendMessage(msg, threadID, replyToMessage, callback) {
        var resolveFunc = function() {};
        var rejectFunc = function() {};
        
        var returnPromise = new Promise(function(resolve, reject) {
            resolveFunc = resolve;
            rejectFunc = reject;
        });

        if (!callback && utils.getType(replyToMessage) === "Function") {
            callback = replyToMessage;
            replyToMessage = null;
        }

        if (!callback) {
            callback = function(err, data) {
                if (err) return rejectFunc(err);
                resolveFunc(data);
            };
        }

        var msgType = utils.getType(msg);
        if (msgType !== "String" && msgType !== "Object") {
            callback({ error: "Message must be a string or object" });
            return returnPromise;
        }

        var messageAndOTID = utils.generateOfflineThreadingID();

        var form = {
            client: "mercury",
            action_type: "ma-type:user-generated-message",
            author: "fbid:" + ctx.userID,
            timestamp: Date.now(),
            timestamp_absolute: "Today",
            timestamp_relative: utils.generateTimestampRelative(),
            timestamp_time_passed: "0",
            is_unread: false,
            is_cleared: false,
            is_forward: false,
            is_filtered_content: false,
            is_filtered_content_bh: false,
            is_filtered_content_account: false,
            is_filtered_content_quasar: false,
            is_filtered_content_invalid_app: false,
            is_spoof_warning: false,
            source: "source:chat:web",
            "source_tags[0]": "source:chat",
            body: msgType === "String" ? msg : msg.body || "",
            html_body: false,
            ui_push_phase: "V3",
            status: "0",
            offline_threading_id: messageAndOTID,
            message_id: messageAndOTID,
            threading_id: utils.generateThreadingID(ctx.clientID),
            "ephemeral_ttl_mode:": "0",
            manual_retry_cnt: "0",
            has_attachment: !!(msg.attachment || msg.url || msg.sticker),
            signatureID: utils.getSignatureID(),
            replied_to_message_id: replyToMessage
        };

        handleAttachment(msg, form, callback, function() {
            if (msg.messageEffect) {
                const effect = MESSAGE_EFFECTS[msg.messageEffect.toUpperCase()];
                if (effect) {
                    form.tags = [{
                        id: effect.id,
                        offset: 0,
                        length: form.body.length,
                        type: "message_effect"
                    }];

                    form.message_effects = {
                        effect_id: effect.id,
                        effect_unified_id: effect.unified_id,
                        effect_type: "MESSAGE_EFFECT",
                        effect_name: effect.effect_name
                    };
                }
            }

            if (msg.mentions) {
                form.profile_xmd = msg.mentions.map(mention => ({
                    id: mention.id,
                    offset: msg.body.indexOf(mention.tag),
                    length: mention.tag.length,
                    type: "p"
                }));
            }

            send(form, threadID, messageAndOTID, callback);
        });

        return returnPromise;
    };
};