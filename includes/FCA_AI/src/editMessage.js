/* eslint-disable linebreak-style */
"use strict";

var utils = require("../utils");

module.exports = function (defaultFuncs, api, ctx) {
    return function editMessage(messageID, changedText, threadID, callback) {
        if (!messageID || !changedText || !threadID) {
            throw new Error("Missing required parameters.");
        }

        try {
            ctx.mqttClient.publish('/ls_req', 
                JSON.stringify({
                    app_id: "2220391788200892",
                    payload: JSON.stringify({
                        tasks: [{
                            label: '742',
                            payload: JSON.stringify({
                                message_id: messageID,
                                text: changedText
                            }),
                            queue_name: 'edit_message',
                            task_id: Math.floor(Math.random() * 1001),
                            failure_count: null,
                        }],
                        epoch_id: utils.generateOfflineThreadingID(),
                        version_id: '7992185107461798',
                    }),
                    request_id: ctx.req_ID ? ++ctx.req_ID : (ctx.req_ID = 1),
                    type: 3
                }),
                {
                    qos: 1,
                    retain: false
                }
            );

            if (callback) callback(null);
            return true;
        } catch (error) {
            if (callback) callback(error);
            return false;
        }
    };
};