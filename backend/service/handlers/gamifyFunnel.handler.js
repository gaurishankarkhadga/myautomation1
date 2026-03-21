const { GamifyFunnelSetting } = require('../../model/Instaautomation');
const { fetchFilteredMedia } = require('../mediaUtils');

module.exports = {
    name: 'gamifyFunnel',
    intents: ['enable_gamify_funnel', 'disable_gamify_funnel', 'configure_gamify_funnel'],

    async execute(intent, params, context) {
        const { userId, token } = context;
        
        try {
            if (intent === 'enable_gamify_funnel') {
                const keyword = params.keyword || '';
                const messageOverride = params.message || '';

                await GamifyFunnelSetting.findOneAndUpdate(
                    { userId },
                    { userId, enabled: true, mode: 'default', ...(keyword && {keyword}), ...(messageOverride && {message: messageOverride}) },
                    { upsert: true, new: true }
                );
                
                const media = await fetchFilteredMedia(token, userId);
                
                return {
                    success: true,
                    message: 'Gamified Funnel automation is now active! Ready to boost engagement through interactive campaigns.',
                    data: { enabled: true, mode: 'default', automationType: 'gamify_funnel', keyword, message: messageOverride, media }
                };
            }
            
            if (intent === 'configure_gamify_funnel') {
                const update = {};
                if (params.keyword !== undefined) update.keyword = params.keyword;
                if (params.message !== undefined) update.message = params.message;
                if (params.enabled !== undefined) update.enabled = params.enabled;

                const setting = await GamifyFunnelSetting.findOneAndUpdate(
                    { userId },
                    { userId, ...update },
                    { upsert: true, new: true }
                );

                return {
                    success: true,
                    message: `Gamified Funnel updated! ${Object.keys(update).map(k => `${k}: ${update[k]}`).join(', ')}`,
                    data: { ...setting.toObject(), automationType: 'gamify_funnel' }
                };
            }
            
            if (intent === 'disable_gamify_funnel') {
                await GamifyFunnelSetting.findOneAndUpdate(
                    { userId },
                    { enabled: false },
                    { upsert: true }
                );
                
                return {
                    success: true,
                    message: 'Gamified Funnel automation disabled.',
                    data: { enabled: false, automationType: 'gamify_funnel' }
                };
            }

            return { success: false, message: 'Unknown action.' };
        } catch (error) {
            console.error('[Handler:gamifyFunnel] Error:', error.message);
            return { success: false, message: `Failed to update Gamified Funnel setting: ${error.message}` };
        }
    }
};
