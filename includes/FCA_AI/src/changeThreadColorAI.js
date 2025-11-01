"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function changeThreadColorAI(threadID, senderID, { prompt = "anime", type = "prompt", themeID = null }, callback) {
    const cb = callback || function () {};

    try {
      if(type == "prompt"){
        // 1. Generate AI Theme
        const genForm = {
          av: ctx.userID,
          __user: ctx.userID,
          fb_dtsg: ctx.fb_dtsg,
          jazoest: ctx.jazoest,
          lsd: ctx.lsd,
          fb_api_caller_class: "RelayModern",
          fb_api_req_friendly_name: "useGenerateAIThemeMutation",
          variables: JSON.stringify({
            input: {
              actor_id: ctx.userID,
              client_mutation_id: "1",
              bypass_cache: true,
              caller: "MESSENGER",
              num_themes: 1,
              prompt: prompt
            }
          }),
          server_timestamps: true,
          doc_id: "23873748445608673",
          fb_api_analytics_tags: ["qpl_active_flow_ids=25309433"]
        };

        log.info("AITheme", `Generating theme for prompt: ${prompt}`);

        const genRes = await defaultFuncs.post(
          "https://www.facebook.com/api/graphql/",
          ctx.jar,
          genForm,
          null,
          null,
          {
            "Cookie": ctx.jar.getCookieString("https://www.facebook.com"),
            "X-FB-Friendly-Name": "useGenerateAIThemeMutation",
            "X-FB-LSD": ctx.lsd,
            "X-Asbd-Id": "359341"
          }
        ).then(utils.parseAndCheckLogin(ctx, defaultFuncs));

        console.log(JSON.stringify(genRes, null, 2));

        const data = genRes?.data?.xfb_generate_ai_themes_from_prompt?.themes?.[0];

        const themeID = data?.id;
        if (!themeID) throw new Error("Could not extract theme_id");

        log.info("AITheme", `🎨 Generated theme_id = ${themeID}`);

        return cb(null, { themeID, name: data.accessibility_label, img: { dark: data.alternative_themes[0].background_asset.image.uri, light: data.background_asset.image.uri } } );
      }

      if(type == "apply"){
        if (!themeID) throw new Error("themeID is required for apply type");

        // 2. Apply Theme
        const applyForm = {
          dpr: 1,
          queries: JSON.stringify({
            o0: {
              doc_id: "1727493033983591",
              query_params: {
                data: {
                  actor_id: senderID,
                  client_mutation_id: "0",
                  source: "SETTINGS",
                  theme_id: String(themeID),
                  thread_id: threadID
                }
              }
            }
          })
        };

        log.info("AITheme", `Applying theme_id ${themeID} to thread ${threadID}`);

        const applyRes = await defaultFuncs.post(
          "https://www.facebook.com/api/graphqlbatch/",
          ctx.jar,
          applyForm
        ).then(utils.parseAndCheckLogin(ctx, defaultFuncs));

        if (applyRes[1]?.successful_results === 1) {
          log.info("AITheme", "✅ Applied AI Theme successfully");
          return cb(null, applyRes);
        } else {
          throw new Error("Failed to apply theme");
        }
      }
    } catch (err) {
      log.error("AITheme", "❌ Error: " + err.message);
      return cb(err);
    }
  };
};
