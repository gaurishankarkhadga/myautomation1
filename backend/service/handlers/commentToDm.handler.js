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
                const dmMessage = params.dmMessage || params.dm_message || params.message || '';
                const commentReply = params.commentReply || params.comment_reply || '';
                const useAssets = params.useAssets !== false; // default true
                const targetMedia = params.targetMedia || params.target || 'all';

                const updateData = {
                    userId,
                    enabled: true,
                    mode: 'default',
                    useAssets
                };
                
                if (keyword) updateData.keyword = keyword;
                if (dmMessage) {
                    updateData.dmMessage = dmMessage;
                    updateData.message = dmMessage; // keep legacy field in sync
                }
                if (commentReply) updateData.commentReply = commentReply;
                if (targetMedia) updateData.targetMedia = targetMedia;

                await CommentToDmSetting.findOneAndUpdate(
                    { userId },
                    updateData,
                    { upsert: true, new: true }
                );
                
                let media = [];
                try {
                    media = await fetchFilteredMedia(token, userId);
                } catch { }
                
                // Build confirmation message
                const parts = [];
                parts.push('✅ Comment-to-DM is now active!');
                if (keyword) parts.push(`Trigger keyword: "${keyword}"`);
                else parts.push('Triggers on: all comments');
                if (commentReply) parts.push(`Comment reply: "${commentReply}"`);
                if (dmMessage) parts.push(`DM message: "${dmMessage}"`);
                else if (useAssets) parts.push('DM: AI will auto-share your assets/links');
                else parts.push('DM: AI will generate a personalized reply');

                return {
                    success: true,
                    message: parts.join('\n'),
                    data: {
                        enabled: true,
                        mode: 'default',
                        automationType: 'comment_to_dm',
                        keyword,
                        dmMessage,
                        commentReply,
                        useAssets,
                        targetMedia,
                        media
                    }
                };
            }
            
            if (intent === 'configure_comment_to_dm') {
                const update = {};
                if (params.keyword !== undefined) update.keyword = params.keyword;
                if (params.dmMessage !== undefined || params.dm_message !== undefined || params.message !== undefined) {
                    update.dmMessage = params.dmMessage || params.dm_message || params.message;
                    update.message = update.dmMessage; // keep legacy in sync
                }
                if (params.commentReply !== undefined || params.comment_reply !== undefined) {
                    update.commentReply = params.commentReply || params.comment_reply;
                }
                if (params.enabled !== undefined) update.enabled = params.enabled;
                if (params.useAssets !== undefined) update.useAssets = params.useAssets;
                if (params.targetMedia !== undefined) update.targetMedia = params.targetMedia;

                const setting = await CommentToDmSetting.findOneAndUpdate(
                    { userId },
                    { userId, ...update },
                    { upsert: true, new: true }
                );

                return {
                    success: true,
                    message: `Comment-to-DM updated! ${Object.keys(update).map(k => `${k}: ${update[k]}`).join(', ')}`,
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
                    message: 'Comment-to-DM automation disabled.',
                    data: { enabled: false, automationType: 'comment_to_dm' }
                };
            }

            return { success: false, message: 'Unknown action.' };
        } catch (error) {
            console.error('[Handler:commentToDm] Error:', error.message);
            return { success: false, message: `Failed to update Comment to DM: ${error.message}` };
        }
    }
};
