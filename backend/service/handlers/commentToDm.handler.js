const { CommentToDmSetting } = require('../../model/Instaautomation');
const { fetchFilteredMedia } = require('../mediaUtils');

module.exports = {
    name: 'commentToDm',
    intents: ['enable_comment_to_dm', 'disable_comment_to_dm', 'configure_comment_to_dm'],

    async execute(intent, params, context) {
        const { userId, token } = context;
        
        try {
            if (intent === 'enable_comment_to_dm') {
                const keyword = params.keyword || '';
                const messageOverride = params.message || '';
                
                await CommentToDmSetting.findOneAndUpdate(
                    { userId },
                    { userId, enabled: true, mode: 'default', ...(keyword && {keyword}), ...(messageOverride && {message: messageOverride}) },
                    { upsert: true, new: true }
                );
                
                const media = await fetchFilteredMedia(token, userId);
                
                const replyText = keyword ? `if they comment "${keyword}"` : 'to commenters';
                return {
                    success: true,
                    message: `Comment to DM automation is now active! Ready to send automated DMs ${replyText}.`,
                    data: { enabled: true, mode: 'default', automationType: 'comment_to_dm', keyword, message: messageOverride, media }
                };
            }
            
            if (intent === 'configure_comment_to_dm') {
                const update = {};
                if (params.keyword !== undefined) update.keyword = params.keyword;
                if (params.message !== undefined) update.message = params.message;
                if (params.enabled !== undefined) update.enabled = params.enabled;

                const setting = await CommentToDmSetting.findOneAndUpdate(
                    { userId },
                    { userId, ...update },
                    { upsert: true, new: true }
                );

                return {
                    success: true,
                    message: `Comment to DM updated! ${Object.keys(update).map(k => `${k}: ${update[k]}`).join(', ')}`,
                    data: { ...setting.toObject(), automationType: 'comment_to_dm' }
                };
            }
            
            if (intent === 'disable_comment_to_dm') {
                await CommentToDmSetting.findOneAndUpdate(
                    { userId },
                    { enabled: false },
                    { upsert: true }
                );
                
                return {
                    success: true,
                    message: 'Comment to DM automation disabled.',
                    data: { enabled: false, automationType: 'comment_to_dm' }
                };
            }

            return { success: false, message: 'Unknown action.' };
        } catch (error) {
            console.error('[Handler:commentToDm] Error:', error.message);
            return { success: false, message: `Failed to update Comment to DM setting: ${error.message}` };
        }
    }
};
