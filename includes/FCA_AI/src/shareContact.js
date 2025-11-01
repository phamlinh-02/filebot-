/* eslint-disable linebreak-style */
"use strict";

var utils = require("../utils");

module.exports = function(defaultFuncs, api, ctx) {
  return function shareContact(text, senderID, threadID, callback) {
    let resolveFunc = function() {};
    let rejectFunc = function() {};
    
    const returnPromise = new Promise(function(resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!senderID || !threadID) {
      const error = new Error("senderID and threadID are required parameters");
      if (callback) callback(error);
      return Promise.reject(error);
    }

    const safeCallback = function(err, data) {
      if (callback && typeof callback === 'function') {
        callback(err, data);
      }
      if (err) {
        rejectFunc(err);
      } else {
        resolveFunc(data);
      }
    };

    try {
      if (!ctx.mqttClient) {
        throw new Error("MQTT client not initialized");
      }

      const reqID = ++ctx.req_ID;
      const messageData = {
        app_id: "2220391788200892",
        payload: JSON.stringify({
          tasks: [{
            label: 359,
            payload: JSON.stringify({
              contact_id: senderID,
              sync_group: 1,
              text: text || "",
              thread_id: threadID
            }),
            queue_name: 'xma_open_contact_share',
            task_id: Math.floor(Math.random() * 1001),
            failure_count: null,
          }],
          epoch_id: require('../utils').generateOfflineThreadingID(),
          version_id: '7214102258676893',
        }),
        request_id: reqID,
        type: 3
      };

      if (!ctx.callback_Task) {
        ctx.callback_Task = {};
      }
      ctx.callback_Task[reqID] = {
        callback: safeCallback,
        type: "shareContact"
      };

      ctx.mqttClient.publish('/ls_req', JSON.stringify(messageData), {
        qos: 1,
        retain: false
      });

    } catch (err) {
      safeCallback(err);
    }

    return returnPromise;
  };
};