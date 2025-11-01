"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function(defaultFuncs, api, ctx) {
    
    const methods = {
        graphql: async function(userID) {
            const form = {
                av: ctx.userID,
                fb_api_caller_class: "RelayModern",
                fb_api_req_friendly_name: "CometUserFollowMutation", 
                doc_id: "7111027605271938",
                variables: JSON.stringify({
                    input: {
                        attribution_id_v2: "ProfileCometTimelineListViewRoot.react,comet.profile.timeline.list,via_cold_start," + Date.now(),
                        is_tracking_encrypted: true,
                        subscribe_location: "PROFILE",
                        subscribee_id: userID,
                        tracking: null,
                        actor_id: ctx.userID,
                        client_mutation_id: Math.round(Math.random() * 19).toString()
                    },
                    scale: 1
                })
            };

            return defaultFuncs
                .post("https://www.facebook.com/api/graphql/", ctx.jar, form)
                .then(utils.parseAndCheckLogin(ctx, defaultFuncs));
        },

        mqtt: async function(userID) {
            return new Promise((resolve, reject) => {
                const form = {
                    av: ctx.userID,
                    fb_api_req_friendly_name: "follow",
                    fb_api_caller_class: "RelayModern",
                    doc_id: "4619896381447695", 
                    variables: JSON.stringify({
                        input: {
                            subscribe_location: "PROFILE",
                            subscribee_id: userID,
                            actor_id: ctx.userID,
                            client_mutation_id: utils.getSignatureID()
                        }
                    })
                };

                try {
                    ctx.mqttClient.publish("/ls_req", JSON.stringify({
                        app_id: "2220391788200892",
                        payload: JSON.stringify({
                            tasks: [{
                                label: 'follow_user',
                                payload: JSON.stringify(form),
                                task_id: Math.random() * 1001 << 0
                            }],
                            epoch_id: utils.generateOfflineThreadingID()
                        }),
                        request_id: ++ctx.req_ID,
                        type: 3
                    }));

                    ctx.callback_Task[ctx.req_ID] = {
                        callback: (err, data) => {
                            if (err) reject(err);
                            else resolve(data);
                        },
                        type: "followUser"
                    };
                } catch (error) {
                    reject(error);
                }
            });
        },

        ajax: async function(userID) {
            const form = {
                user_id: userID,
                location: 1,
                feed_story: true,
                fb_api_caller_class: "RelayModern",
                fb_api_req_friendly_name: "follow"
            };

            return defaultFuncs
                .post('https://www.facebook.com/ajax/follow/follow_profile.php', ctx.jar, form)
                .then(utils.parseAndCheckLogin(ctx, defaultFuncs));
        },

        url: async function(userID) {
            const form = {
                profile_id: userID,
                location: 'profile',
                feed_story: true,
                __a: 1,
                fb_dtsg: ctx.fb_dtsg,
                jazoest: ctx.jazoest
            };

            return defaultFuncs
                .post(`https://www.facebook.com/profile/follow_profile/?id=${userID}`, ctx.jar, form)
                .then(utils.parseAndCheckLogin(ctx, defaultFuncs));
        }
    };

    return function followUser(userID, callback) {
        let resolveFunc = function() {};
        let rejectFunc = function() {};
        const returnPromise = new Promise((resolve, reject) => {
            resolveFunc = resolve;
            rejectFunc = reject;
        });

        if (!callback) {
            callback = function(err, data) {
                if (err) return rejectFunc(err);
                resolveFunc(data);
            };
        }

        // Validate input
        if (!userID || isNaN(userID)) {
            const error = new Error("Invalid userID. Must be numeric string or number");
            log.error("followUser", error);
            callback(error);
            return returnPromise;
        }

        // Danh sách các phương thức theo thứ tự ưu tiên
        const methodOrder = ['graphql', 'mqtt', 'ajax', 'url'];
        let currentMethodIndex = 0;

        const tryNextMethod = async () => {
            if (currentMethodIndex >= methodOrder.length) {
                const error = new Error("All follow methods failed");
                log.error("followUser", error);
                return callback(error);
            }

            const currentMethod = methodOrder[currentMethodIndex];
            log.info("followUser", `Trying method: ${currentMethod}`);

            try {
                const result = await methods[currentMethod](userID);
                
                if (result && !result.error) {
                    log.info("followUser", `Successfully followed user ${userID} using ${currentMethod} method`);
                    return callback(null, {
                        success: true,
                        userID: userID,
                        method: currentMethod,
                        timestamp: Date.now()
                    });
                } else {
                    throw new Error(result.error || "Unknown error");
                }
            } catch (error) {
                log.error("followUser", `${currentMethod} method failed:`, error);
                currentMethodIndex++;
                return tryNextMethod();
            }
        };

        // Bắt đầu với phương thức đầu tiên
        tryNextMethod();
        return returnPromise;
    };
};