const { GamifyFunnelSetting } = require('../../model/Instaautomation');
const { fetchFilteredMedia } = require('../mediaUtils');

module.exports = {
    name: 'gamifyFunnel',
    intents: ['enable_gamify_funnel', 'disable_gamify_funnel'],

    async execute(intent, params, context) {
        const { userId, token } = context;
        
        try {
            if (intent === 'enable_gamify_funnel') {
                await GamifyFunnelSetting.findOneAndUpdate(
                    { userId },
                    { userId, enabled: true, mode: 'default' },
                    { upsert: true, new: true }
                );
                
                const media = await fetchFilteredMedia(token, userId);
                
                return {
                    success: true,
                    message: 'Gamified Funnel automation is now active! Ready to boost engagement through interactive campaigns.',
                    data: { enabled: true, mode: 'default', automationType: 'gamify_funnel', media }
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
