const { CommentToDmSetting } = require('../../model/Instaautomation');
const { fetchFilteredMedia } = require('../mediaUtils');

module.exports = {
    name: 'commentToDm',
    intents: ['enable_comment_to_dm', 'disable_comment_to_dm'],

    async execute(intent, params, context) {
        const { userId, token } = context;
        
        try {
            if (intent === 'enable_comment_to_dm') {
                await CommentToDmSetting.findOneAndUpdate(
                    { userId },
                    { userId, enabled: true, mode: 'default' },
                    { upsert: true, new: true }
                );
                
                const media = await fetchFilteredMedia(token, userId);
                
                return {
                    success: true,
                    message: 'Comment to DM automation is now active! Ready to send automated DMs to commenters.',
                    data: { enabled: true, mode: 'default', automationType: 'comment_to_dm', media }
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
