const {
    DmAutoReplySetting,
    DmAutoReplyLog,
    AutoReplyLog,
    Conversation
} = require('../../model/Instaautomation');
const { generateContentWithFallback } = require('../geminiClient');

module.exports = {
    name: 'morningBriefing',
    intents: ['get_morning_briefing'],

    async execute(intent, params, context) {
        const { userId } = context;

        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // Fetch all activity in last 24h in parallel
            const [dmLogs, commentLogs, conversations, settings] = await Promise.all([
                DmAutoReplyLog.find({ scheduledAt: { $gte: twentyFourHoursAgo } }).lean(),
                AutoReplyLog.find({ scheduledAt: { $gte: twentyFourHoursAgo } }).lean(),
                Conversation.find({ lastMessageTime: { $gte: twentyFourHoursAgo.getTime() } }).lean(),
                DmAutoReplySetting.findOne({ userId })
            ]);

            // Count stats
            const dmsSent = dmLogs.filter(d => d.status === 'sent').length;
            const dmsFailed = dmLogs.filter(d => d.status === 'failed').length;
            const commentReplies = commentLogs.filter(c => c.status === 'sent').length;
            const commentsFailed = commentLogs.filter(c => c.status === 'failed').length;
            const totalConversations = conversations.length;

            // Count triage categories
            const triageCounts = {};
            conversations.forEach(c => {
                const tag = c.priorityTag || 'Untriaged';
                triageCounts[tag] = (triageCounts[tag] || 0) + 1;
            });

            // Pending Deals (Needs Approval)
            const pendingDeals = conversations.filter(c =>
                c.negotiationData && c.negotiationData.status === 'drafted'
            );

            // Ghosted Deals (Follow up needed - 48h passed)
            const now = new Date();
            const ghostedDeals = conversations.filter(c =>
                c.negotiationData && c.negotiationData.status === 'negotiating' && c.negotiationData.followUpDate && new Date(c.negotiationData.followUpDate) <= now
            );

            // Custom instructions count
            const customRulesCount = settings?.customInstructions?.filter(i => i.active).length || 0;

            // Assets shared
            const assetsShared = dmLogs.reduce((acc, log) => acc + (log.assetsShared?.length || 0), 0);

            // Build data summary for AI
            const dataSummary = {
                dmsSent,
                dmsFailed,
                commentReplies,
                commentsFailed,
                totalConversations,
                triageCounts,
                pendingDeals: pendingDeals.length,
                ghostedDeals: ghostedDeals.length,
                assetsShared,
                customRulesCount
            };

            // Generate a natural, conversational briefing using Gemini
            const prompt = `You are the creator's personal AI manager. Generate a SHORT, punchy morning briefing based on this 24-hour activity data:

${JSON.stringify(dataSummary, null, 2)}

Rules:
- Be conversational and warm, like a friend texting them
- Use emojis naturally (max 3-4 total)
- Lead with the most impactful stat
- If there are pending brand deals, mention them as exciting news
- If there are ghosted deals (brands that haven't replied in 48h), tell the creator to "follow up with them".
- If activity is low/zero, be encouraging ("Quiet day — perfect time to drop new content!")
- Keep it under 4 sentences
- NEVER list raw numbers like a report — weave them into natural sentences
- If assets were shared, mention the ROI angle ("Your links got shared X times")

Output ONLY the briefing text. No labels, no markdown headers.`;

            let briefingText;
            try {
                const result = await generateContentWithFallback(prompt, 'gemini-2.5-flash');
                briefingText = result.response.text().trim();
            } catch {
                // Fallback to a simple summary if AI fails
                const parts = [];
                if (dmsSent > 0) parts.push(`📩 Sent ${dmsSent} DM replies`);
                if (commentReplies > 0) parts.push(`💬 Replied to ${commentReplies} comments`);
                if (pendingDeals.length > 0) parts.push(`🤝 ${pendingDeals.length} brand deal draft${pendingDeals.length > 1 ? 's' : ''} waiting`);
                if (assetsShared > 0) parts.push(`📦 Shared ${assetsShared} product links`);

                briefingText = parts.length > 0
                    ? `Good morning! Here's what happened while you were away:\n${parts.join('\n')}`
                    : 'Good morning! Quiet day yesterday — perfect time to drop new content and let the AI handle the engagement! 🚀';
            }

            // Update last briefing timestamp
            if (settings) {
                settings.lastBriefingAt = new Date();
                await settings.save();
            }

            // Build deal alerts for frontend
            const dealAlerts = pendingDeals.map(d => ({
                brandName: d.negotiationData.brandName,
                suggestedRate: d.negotiationData.suggestedRate,
                draftReply: d.negotiationData.draftReply,
                conversationId: d.conversationId
            }));

            return {
                success: true,
                message: briefingText,
                data: {
                    automationType: 'morning_briefing',
                    stats: dataSummary,
                    dealAlerts,
                    hasPendingDeals: dealAlerts.length > 0
                }
            };
        } catch (error) {
            console.error('[Handler:morningBriefing] Error:', error.message);
            return {
                success: true,
                message: 'Good morning! I had a small hiccup pulling your stats, but I\'m online and ready to work. What do you need today? 🚀',
                data: { automationType: 'morning_briefing', stats: {}, dealAlerts: [] }
            };
        }
    }
};
