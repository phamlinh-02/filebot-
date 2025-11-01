"use strict";

var utils = require("../utils");
var log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  function setMessageReaction(reaction, messageID, callback, forceCustom = false) {
    var resolveFunc = function () { };
    var rejectFunc = function () { };
    var returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err) {
        if (err) return rejectFunc(err);
        resolveFunc();
      };
    }

    if (!messageID) {
      callback({ error: "Message ID không được để trống" });
      return returnPromise;
    }

    // Xử lý reaction text sang emoji
    reaction = parseReaction(reaction);

    // Prepare data request
    var variables = {
      data: {
        client_mutation_id: ctx.clientMutationId++,
        actor_id: ctx.userID,
        action: reaction == "" ? "REMOVE_REACTION" : "ADD_REACTION",
        message_id: messageID,
        reaction: reaction || ""
      }
    };

    var qs = {
      doc_id: "1491398900900362",
      variables: JSON.stringify(variables),
      dpr: 1
    };

    defaultFuncs
      .postFormData("https://www.facebook.com/webgraphql/mutation/", ctx.jar, {}, qs)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(function (resData) {
        if (!resData) {
          throw { error: "setReaction returned empty object." };
        }
        if (resData.error) {
          throw resData;
        }
        callback();
      })
      .catch(function (err) {
        log.error("setReaction", err);
        return callback(err);
      });

    return returnPromise;
  }

  // Hàm xử lý chuyển đổi reaction text sang emoji
  function parseReaction(reaction) {
    // Nếu là emoji hoặc rỗng thì giữ nguyên
    if (!reaction || isEmoji(reaction)) return reaction;

    // Map các shortcut phổ biến
    const reactionMap = {
      "like": "👍",
      "love": "❤️",
      "heart": "❤",
      "haha": "😆",
      "wow": "😮", 
      "sad": "😢",
      "angry": "😠",
      ":like:": "👍",
      ":love:": "❤️",
      ":haha:": "😆",
      ":wow:": "😮",
      ":sad:": "😢", 
      ":angry:": "😠",
      "none": "",
      "remove": "",
      "clear": ""
    };

    // Trả về emoji tương ứng hoặc giữ nguyên nếu không có trong map
    return reactionMap[reaction.toLowerCase()] || reaction;
  }

  // Hàm kiểm tra một string có phải là emoji không - sử dụng regex đơn giản
  function isEmoji(str) {
    const emojiPattern = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/;
    return emojiPattern.test(str);
  }

  return function (reaction, messageID, callback, forceCustom = false) {
    try {
      return setMessageReaction(reaction, messageID, callback, forceCustom);
    } catch (error) {
      log.error("setMessageReaction", error);
      if (callback) callback(error);
      throw error;
    }
  };
};