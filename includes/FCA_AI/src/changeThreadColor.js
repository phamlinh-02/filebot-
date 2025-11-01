"use strict";

var utils = require("../utils");
var log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return function changeThreadColor(color, threadID, callback) {
    var resolveFunc = function () {};
    var rejectFunc = function () {};
    var returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err) {
        if (err) return rejectFunc(err);
        resolveFunc(null);
      };
    }

    // --- (1) Chuẩn hoá giá trị màu/id an toàn ---
    // Hỗ trợ: string, number, hoặc object có theme_id/color_id/id
    let raw;
    try {
      if (color == null) raw = "";
      else if (typeof color === "string" || typeof color === "number") raw = String(color);
      else if (typeof color === "object") {
        raw = color.theme_id || color.color_id || color.id || String(color);
      } else {
        raw = String(color);
      }
    } catch (_) {
      raw = String(color);
    }
    var validatedColor = raw.toString().toLowerCase(); // API muốn lowercase

    // --- (2) Kiểm tra hợp lệ (tuỳ chọn) ---
    // Mặc định: strict = true (hành vi cũ). Muốn pass-through: set strictThreadColorValidation = false
    var colorList = Object.keys(api.threadColors || {}).map(function (name) {
      return api.threadColors[name];
    });
    var strict = !(api && api.options && api.options.strictThreadColorValidation === false);

    if (colorList.length === 0) {
      // Không có danh sách màu từ core -> cảnh báo, vẫn gửi lên server
      log.warn("changeThreadColor", "threadColors is empty; sending value to server: %s", validatedColor);
    } else if (!colorList.includes(validatedColor)) {
      if (strict) {
        throw {
          error:
            "The color you are trying to use is not a valid thread color. Use api.threadColors to find acceptable values.",
          provided: validatedColor
        };
      } else {
        log.warn(
          "changeThreadColor",
          "Provided color is not in api.threadColors (pass-through mode). value=%s",
          validatedColor
        );
      }
    }

    var form = {
      dpr: 1,
      queries: JSON.stringify({
        o0: {
          // doc_id cũ vẫn hoạt động trên nhiều core; nếu cần bạn có thể cập nhật tại đây
          doc_id: "1727493033983591",
          query_params: {
            data: {
              actor_id: ctx.userID,
              client_mutation_id: "0",
              source: "SETTINGS",
              theme_id: validatedColor,
              thread_id: threadID
            }
          }
        }
      })
    };

    defaultFuncs
      .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(function (resData) {
        if (resData[resData.length - 1].error_results > 0) throw resData[0].o0.errors;
        return callback();
      })
      .catch(function (err) {
        // Log lỗi đọc được (không [object Object])
        try {
          log.error("changeThreadColor", JSON.stringify(err, null, 2));
        } catch {
          log.error("changeThreadColor", err);
        }
        return callback(err);
      });

    return returnPromise;
  };
};