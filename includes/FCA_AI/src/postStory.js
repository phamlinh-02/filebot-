"use strict";

const utils = require("../utils");
const log = require("npmlog");
const fs = require("fs-extra");

module.exports = function(defaultFuncs, api, ctx) {
  /**
   * Post story đơn giản chỉ cần truyền vào attachment
   * @param {Object} attachment - File attachment (stream/buffer)
   * @param {Object} options - Các tùy chọn bổ sung
   * @returns {Promise}
   */
  function postStory(attachment, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // Validate attachment
        if (!attachment) {
          throw new Error('Attachment is required');
        }

        let attachmentData;
        if (Buffer.isBuffer(attachment)) {
          // Nếu là buffer thì tạo stream từ buffer
          attachmentData = attachment;
        } else if (typeof attachment === 'string' && fs.existsSync(attachment)) {
          // Nếu là đường dẫn file
          attachmentData = fs.createReadStream(attachment);
        } else if (attachment.readable) {
          // Nếu đã là stream
          attachmentData = attachment;
        } else {
          throw new Error('Invalid attachment type');
        }

        // Form data cơ bản
        const form = {
          file: attachmentData,
          voice_clip: 'true',
          story_status: options.caption || "",
          audience: JSON.stringify({
            privacy: {
              allow: options.allowList || [],
              deny: options.denyList || [],
              order: options.privacyOrder || [],
              base_state: options.privacy || "EVERYONE"
            }
          })
        };

        // Upload attachment lên Facebook
        const response = await defaultFuncs
          .postFormData("https://upload.facebook.com/ajax/mercury/upload.php", ctx.jar, form)
          .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

        if (!response || response.error) {
          throw response.error || new Error('Failed to upload attachment');
        }

        // Lấy metadata từ response
        const metadata = response.payload.metadata[0];
        
        // Chuẩn bị data cho story
        const storyData = {
          input: {
            message: {
              text: options.caption || "",
              ranges: []
            },
            source: options.source || "MOBILE",
            audiences: {
              stories: [{
                "privacy_data": {
                  "privacy_state": options.privacy || "EVERYONE",
                  "allow": options.allowList || [],
                  "deny": options.denyList || []
                }
              }]
            },
            attachments: [{
              "photo": metadata.photo_id ? {
                "id": metadata.photo_id,
                "can_viewer_edit": true
              } : null,
              "video": metadata.video_id ? {
                "id": metadata.video_id,
                "can_viewer_edit": true
              } : null,
            }],
            actor_id: ctx.userID,
            client_mutation_id: ctx.clientMutationId++
          }
        };

        // Post story
        const storyResponse = await defaultFuncs
          .post("https://www.facebook.com/api/graphql/", ctx.jar, {
            doc_id: "2421899371426364", // Story creation doc_id
            variables: JSON.stringify(storyData)
          })
          .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

        if (!storyResponse || storyResponse.error) {
          throw storyResponse.error || new Error('Failed to post story');
        }

        resolve({
          success: true,
          story_id: storyResponse.data?.story_create?.story?.id,
          story_url: storyResponse.data?.story_create?.story?.url,
          timestamp: Date.now()
        });

      } catch (error) {
        log.error("postStory", error);
        reject(error);
      }
    });
  }

  return postStory;
};