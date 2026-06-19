const {
    AutoReplySetting
} = require('../../model/Instaautomation');
const { fetchFilteredMedia } = require('../mediaUtils');

module.exports = {
    name: 'commentAutoReply',
    intents: ['enable_comment_autoreply', 'disable_comment_autoreply', 'configure_comment_autoreply'],

    async execute(intent, params, context) {
        const { userId, token } = context;

        try {
            if (intent === 'enable_comment_autoreply') {
                const rawMode = (params.mode || 'ai_smart').toLowerCase();
                const allowedModes = ['reply_only', 'reply_and_hide', 'ai_smart'];
                const mode = allowedModes.includes(rawMode) ? rawMode : 'ai_smart'; // Fallback

                const parsedDelay = parseInt(params.delay !== undefined ? params.delay : params.delaySeconds);
                const delay = (!isNaN(parsedDelay) && parsedDelay > 0) ? parsedDelay : 15;
                const message = params.message || '';

                await AutoReplySetting.findOneAndUpdate(
                    { userId },
                    {
                        userId,
                        enabled: true,
                        delaySeconds: Math.min(Math.max(delay, 5), 300),
                        message,
                        replyMode: mode
                    },
                    { upsert: true, new: true }
                );

                const modeLabels = {
                    'reply_only': 'Reply Only',
                    'reply_and_hide': 'Smart Hide (auto-removes spam)',
                    'ai_smart': 'AI Smart (persona-based)'
                };

                // Fetch media for preview
                const media = await fetchFilteredMedia(token, userId);

                return {
                    success: true,
                    message: `Comment auto-reply enabled! Mode: ${modeLabels[mode] || mode}, Delay: ${delay}s`,
                    data: { enabled: true, mode, delay, automationType: 'comment_reply', media }
                };
            }

            if (intent === 'disable_comment_autoreply') {
                await AutoReplySetting.findOneAndUpdate(
                    { userId },
                    { enabled: false },
                    { upsert: true }
                );

                return {
                    success: true,
                    message: 'Comment auto-reply has been turned off.',
                    data: { enabled: false, automationType: 'comment_reply' }
                };
            }

            if (intent === 'configure_comment_autoreply') {
                const update = {};
                if (params.mode) {
                    const rawMode = params.mode.toLowerCase();
                    const allowedModes = ['reply_only', 'reply_and_hide', 'ai_smart'];
                    update.replyMode = allowedModes.includes(rawMode) ? rawMode : 'ai_smart';
                }
                const inputDelay = params.delay !== undefined ? params.delay : params.delaySeconds;
                if (inputDelay !== undefined) {
                    const parsedDelay = parseInt(inputDelay);
                    if (!isNaN(parsedDelay)) {
                        update.delaySeconds = Math.min(Math.max(parsedDelay, 5), 300);
                    }
                }
                if (params.message !== undefined) update.message = params.message;
                if (params.enabled !== undefined) update.enabled = params.enabled;

                const setting = await AutoReplySetting.findOneAndUpdate(
                    { userId },
                    { userId, ...update },
                    { upsert: true, new: true }
                );

                return {
                    success: true,
                    message: `Comment auto-reply updated! ${Object.keys(update).map(k => `${k}: ${update[k]}`).join(', ')}`,
                    data: setting.toObject()
                };
            }

            return { success: false, message: 'Unknown comment auto-reply action.' };
        } catch (error) {
            console.error('[Handler:commentAutoReply] Error:', error.message);
            // Sanitized user-friendly error
            return { success: false, message: `I encountered a minor issue updating your comment settings. Let's try rephrasing that!` };
        }
    }
};
