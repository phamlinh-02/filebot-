"use strict";

var utils = require("../utils");
var log = require("npmlog");

module.exports = function(defaultFuncs, api, ctx) {
  /**
   * Unsends (deletes) a message by message ID.
   * @param {string} messageID Message ID to unsend.
   * @param {Function} callback Called when the message is unsent.
   */
  return async function unsendMessage(messageID, callback) {
    var resolveFunc = function(){};
    var rejectFunc = function(){};
    var returnPromise = new Promise(function(resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function(err) {
        if (err) return rejectFunc(err);
        resolveFunc();
      };
    }

    // Các phương thức unsend khác nhau
    const unsendMethods = {
      // Phương thức 1: GraphQL API (phương thức chính)
      async graphql() {
        try {
          const form = {
            message_id: messageID,
            client_mutation_id: messageID
          };

          const res = await defaultFuncs
            .post("https://www.facebook.com/messaging/unsend_message/", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

          if (res.error) throw res;
          return true;
        } catch (error) {
          log.error("Failed to unsend using GraphQL:", error);
          return false;
        }
      },

      // Phương thức 2: Messenger API
      async messenger() {
        try {
          const form = {
            message_id: messageID,
            source: "source:messenger:web"
          };

          const res = await defaultFuncs
            .post("https://www.messenger.com/messaging/unsend_message/", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

          if (res.error) throw res;
          return true;
        } catch (error) {
          log.error("Failed to unsend using Messenger:", error);
          return false;
        }
      },

      // Phương thức 3: Legacy API 
      async legacy() {
        try {
          const form = {
            message_id: messageID,
            action_type: "unsend_message",
            is_async: true
          };

          const res = await defaultFuncs
            .post("https://www.facebook.com/ajax/mercury/delete_messages.php", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

          if (res.error) throw res;
          return true;
        } catch (error) {
          log.error("Failed to unsend using Legacy:", error);
          return false;
        }
      },

      // Phương thức 4: Mobile API
      async mobile() {
        try {
          const form = {
            message_id: messageID
          };

          const res = await defaultFuncs
            .post("https://m.facebook.com/messages/unsend_message/", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

          if (res.error) throw res;
          return true;
        } catch (error) {
          log.error("Failed to unsend using Mobile:", error);
          return false;
        }
      }
    };

    // Thử từng phương thức theo thứ tự cho đến khi thành công
    try {
      // Thử phương thức chính (GraphQL) trước
      if (await unsendMethods.graphql()) {
        return callback();
      }

      // Nếu thất bại, thử Messenger API
      if (await unsendMethods.messenger()) {
        return callback();
      }

      // Nếu thất bại, thử Legacy API
      if (await unsendMethods.legacy()) {
        return callback();
      }

      // Cuối cùng thử Mobile API
      if (await unsendMethods.mobile()) {
        return callback();
      }

      // Nếu tất cả đều thất bại
      throw {error: "Không thể gỡ tin nhắn bằng bất kỳ phương thức nào"};

    } catch (err) {
      log.error("unsendMessage", err);
      return callback(err);
    }

    return returnPromise;
  };
};