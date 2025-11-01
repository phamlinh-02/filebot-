"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return function changeThreadColorAI(prompt, threadID, callback) {
    let resolveFunc = function () {};
    let rejectFunc = function () {};
    const returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err) {
        if (err) {
          return rejectFunc(err);
        }
        resolveFunc();
      };
    }

    const form = {
      av: ctx.userID,
      fb_dtsg: ctx.fb_dtsg,
      fb_api_req_friendly_name: "useGenerateAIThemeMutation",
      variables: JSON.stringify({
        input: {
          client_mutation_id: "4",
          actor_id: ctx.userID,
          bypass_cache: true,
          caller: "MESSENGER",
          num_themes: 1,
          prompt: prompt
        }
      }),
      doc_id: "23873748445608673"
    };

    defaultFuncs
      .post("https://www.facebook.com/api/graphql/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(function (res) {
        if (res.errors) {
          throw new utils.CustomError(res.errors);
        }
        const themes = res.data?.xfb_generate_ai_themes_from_prompt?.themes;
        if (!themes || !themes.length) {
          throw new utils.CustomError("No themes generated");
        }

        const themeId = themes[0].id;
        if (!themeId) {
          throw new utils.CustomError("No theme ID found in response");
        }
        api.changeThreadColor(themeId, threadID, callback);
      })
      .catch(function (err) {
        log.error("changeThreadColorAI", err);
        return callback(err);
      });

    return returnPromise;
  };
};