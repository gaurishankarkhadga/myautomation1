const { DmAutoReplySetting } = require('../../model/Instaautomation');

module.exports = {
    name: 'inboxTriage',
    intents: ['enable_inbox_triage', 'disable_inbox_triage'],

    async execute(intent, params, context) {
        const { userId } = context;

        try {
            let dmSettings = await DmAutoReplySetting.findOne({ userId });
            
            if (!dmSettings) {
                // Create default if not exists
                dmSettings = new DmAutoReplySetting({ userId });
            }

            if (intent === 'enable_inbox_triage') {
                dmSettings.inboxTriageEnabled = true;
                await dmSettings.save();

                return {
                    success: true,
                    message: `✅ Inbox AI Triage \u0026 Brand Negotiator is now ON! I will automatically monitor your incoming DMs and handle brand negotiation opportunities for you.`,
                    data: { inboxTriageEnabled: true }
                };
            }

            if (intent === 'disable_inbox_triage') {
                dmSettings.inboxTriageEnabled = false;
                await dmSettings.save();

                return {
                    success: true,
                    message: `🛑 Inbox AI Triage \u0026 Brand Negotiator is now OFF! I will no longer process your incoming DMs for brand deals.`,
                    data: { inboxTriageEnabled: false }
                };
            }

            return { success: false, message: 'Unknown action.' };
        } catch (error) {
            console.error('[Handler:inboxTriage] Error:', error.message);
            return { success: false, message: `Operation failed: ${error.message}` };
        }
    }
};
