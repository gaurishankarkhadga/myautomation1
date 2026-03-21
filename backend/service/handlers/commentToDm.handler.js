module.exports = {
    name: 'commentToDm',
    intents: ['enable_comment_to_dm', 'disable_comment_to_dm'],

    async execute(intent, params, context) {
        if (intent === 'enable_comment_to_dm') {
            return {
                success: false, // Not fully implemented yet, but keeping structure for preview
                message: '🚀 Coming Soon: Comment to DM automation is under development!',
                data: { enabled: true, mode: 'default', automationType: 'comment_to_dm', media: [] }
            };
        }
        
        if (intent === 'disable_comment_to_dm') {
            return {
                success: true,
                message: 'Comment to DM automation disabled.',
                data: { enabled: false, automationType: 'comment_to_dm' }
            };
        }

        return { success: false, message: 'Unknown action.' };
    }
};
