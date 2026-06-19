const {
    DmAutoReplySetting
} = require('../../model/Instaautomation');
const { fetchFilteredMedia } = require('../mediaUtils');

module.exports = {
    name: 'dmAutoReply',
    intents: ['enable_dm_autoreply', 'disable_dm_autoreply', 'configure_dm_autoreply', 'set_dm_fallback'],

    async execute(intent, params, context) {
        const { userId, token } = context;

        try {
            if (intent === 'enable_dm_autoreply') {
                const rawMode = (params.mode || 'ai_with_assets').toLowerCase();
                const allowedModes = ['static', 'ai_smart', 'ai_with_assets'];
                const mode = allowedModes.includes(rawMode) ? rawMode : 'ai_with_assets'; // Fallback

                const parsedDelay = parseInt(params.delay !== undefined ? params.delay : params.delaySeconds);
                const delay = (!isNaN(parsedDelay) && parsedDelay > 0) ? parsedDelay : 10;
                const message = params.message || '';

                await DmAutoReplySetting.findOneAndUpdate(
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
                    'static': 'Static (fixed message)',
                    'ai_smart': 'AI Smart (persona-based)',
                    'ai_with_assets': 'AI + Assets (shares products & links)'
                };

                // Fetch media for preview
                const media = await fetchFilteredMedia(token, userId);

                return {
                    success: true,
                    message: `DM auto-reply enabled! Mode: ${modeLabels[mode] || mode}, Delay: ${delay}s`,
                    data: { enabled: true, mode, delay, automationType: 'dm_reply', media }
                };
            }

            if (intent === 'disable_dm_autoreply') {
                await DmAutoReplySetting.findOneAndUpdate(
                    { userId },
                    { enabled: false, autonomousMode: false },
                    { upsert: true }
                );

                return {
                    success: true,
                    message: 'DM auto-reply has been turned off.',
                    data: { enabled: false, automationType: 'dm_reply' }
                };
            }

            if (intent === 'configure_dm_autoreply') {
                const update = {};
                if (params.mode) {
                    const rawMode = params.mode.toLowerCase();
                    const allowedModes = ['static', 'ai_smart', 'ai_with_assets'];
                    update.replyMode = allowedModes.includes(rawMode) ? rawMode : 'ai_with_assets';
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

                const setting = await DmAutoReplySetting.findOneAndUpdate(
                    { userId },
                    { userId, ...update },
                    { upsert: true, new: true }
                );

                return {
                    success: true,
                    message: `DM auto-reply updated! ${Object.keys(update).map(k => `${k}: ${update[k]}`).join(', ')}`,
                    data: setting.toObject()
                };
            }

            if (intent === 'set_dm_fallback') {
                const fallbackMsg = params.message || params.fallback || params.text;

                if (!fallbackMsg || fallbackMsg.trim().length === 0) {
                    return {
                        success: false,
                        message: 'What should I use as your fallback DM message? Just tell me the message you want sent when AI can\'t generate a reply.'
                    };
                }

                await DmAutoReplySetting.findOneAndUpdate(
                    { userId },
                    { userId, message: fallbackMsg.trim() },
                    { upsert: true }
                );

                return {
                    success: true,
                    message: `✅ Fallback message set! If AI ever fails, I'll send: "${fallbackMsg.trim()}"`,
                    data: { fallbackMessage: fallbackMsg.trim() }
                };
            }

            return { success: false, message: 'Unknown DM auto-reply action.' };
        } catch (error) {
            console.error('[Handler:dmAutoReply] Error:', error.message);
            // Sanitized user-friendly error
            return { success: false, message: `I encountered a minor issue updating your DM settings. Let's try rephrasing that!` };
        }
    }
};
