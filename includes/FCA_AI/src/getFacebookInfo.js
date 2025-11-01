"use strict";
var utils = require("../utils");
var log = require("npmlog");

module.exports = function(defaultFuncs, api, ctx) {
  return function getFacebookInfo(url, callback) {
    var resolveFunc = () => {};
    var rejectFunc = () => {};
    var returnPromise = new Promise((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject; 
    });

    if (!callback) {
      callback = (err, data) => {
        if (err) return rejectFunc(err);
        resolveFunc(data); 
      };
    }

    function extractID(url) {
      const patterns = [
        /(?:photos|videos|posts|stories)(?:\/|%2F)(\d+)/i,
        /fbid=(\d+)/i,
        /\/(\d+)/
      ];
      
      for (let pattern of patterns) {
        let match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    }

    const form = {
      doc_id: "5587632691339264",
      variables: JSON.stringify({
        feedbackSource: 0,    
        id: extractID(url),
        scale: 1
      })
    };

    defaultFuncs
      .post("https://www.facebook.com/api/graphql/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(res => {
        if (!res.data) throw {error: "Invalid response"};
        
        let info = {
          id: res.data.node.id,
          text: res.data.node.message?.text,
          media: res.data.node.attachments?.map(att => ({
            type: att.media.__typename,
            url: att.media.playable_url || att.media.image?.uri
          })) || [],
          author: {
            id: res.data.node.author?.id,
            name: res.data.node.author?.name
          }
        };

        return callback(null, info);
      })
      .catch(callback);

    return returnPromise;
  };
};