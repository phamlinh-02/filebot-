"use strict";
// var utils = require("../utils");

/*
@NethWs3Dev
*/

// @NethWs3Dev
module.exports = function (defaultFuncs, api, ctx){
  return function stopListenMqtt(callback) { 
    if (!ctx.mqttClient) {
      throw new Error("Not connected to MQTT");
    }
    // utils.log("stopListenMqtt", "Stopping...");
    
    ctx.mqttClient.unsubscribe("/webrtc");
    ctx.mqttClient.unsubscribe("/rtc_multi");
    ctx.mqttClient.unsubscribe("/onevc");
    ctx.mqttClient.publish("/browser_close", "{}");
    
    ctx.mqttClient.end(false, (...data) => {
      // utils.log("stopListenMqtt", "Stopped");
      ctx.mqttClient = null;

      if (typeof callback === "function") {
        callback(); 
      }
    });
  };
};
