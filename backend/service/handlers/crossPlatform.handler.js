const { AutoReplySetting, DmAutoReplySetting, CommentToDmSetting, GamifyFunnelSetting } = require('../../model/Instaautomation');
const CreatorPreference = require('../../model/CreatorPreference');

// ==================== CROSS-PLATFORM HANDLER ====================
// Handles: enable/disable automation across ALL connected platforms at once
// Example: "automate comments for all social media", "enable everything"

module.exports = {
    name: 'crossPlatform',
    intents: [
        'enable_all_automation',     // "turn on everything" / "automate all platforms"
        'disable_all_automation',    // "turn off everything" / "stop all"
        'set_platform_preference'    // "enable only youtube" / "instagram only"
    ],

    async execute(intent, params, context) {
        const { userId } = context;

        try {
            // ==================== ENABLE ALL AUTOMATION ====================
            if (intent === 'enable_all_automation') {
                const mode = params.mode || 'ai_smart';
                const delay = params.delay || 10;
                const results = [];

                // Check which platforms are connected
                const instaConnected = !!context.token;
                // YouTube: check if yt settings or channel exist
                // For now, always try both and let failures be graceful

                // Enable Instagram comment auto-reply
                try {
                    await AutoReplySetting.findOneAndUpdate(
                        { userId },
                        { userId, enabled: true, delaySeconds: delay, replyMode: mode },
                        { upsert: true }
                    );
                    results.push({ platform: 'Instagram', feature: 'Comment Auto-Reply', success: true });
                } catch (e) {
                    results.push({ platform: 'Instagram', feature: 'Comment Auto-Reply', success: false, error: e.message });
                }

                // Enable Instagram DM auto-reply
                try {
                    await DmAutoReplySetting.findOneAndUpdate(
                        { userId },
                        { userId, enabled: true, delaySeconds: delay, replyMode: mode },
                        { upsert: true }
                    );
                    results.push({ platform: 'Instagram', feature: 'DM Auto-Reply', success: true });
                } catch (e) {
                    results.push({ platform: 'Instagram', feature: 'DM Auto-Reply', success: false, error: e.message });
                }

                // Enable Comment to DM
                try {
                    await CommentToDmSetting.findOneAndUpdate(
                        { userId },
                        { userId, enabled: true, mode: 'default' },
                        { upsert: true }
                    );
                    results.push({ platform: 'Instagram', feature: 'Comment to DM', success: true });
                } catch (e) {
                    results.push({ platform: 'Instagram', feature: 'Comment to DM', success: false, error: e.message });
                }

                // Enable Gamified Funnel
                try {
                    await GamifyFunnelSetting.findOneAndUpdate(
                        { userId },
                        { userId, enabled: true, mode: 'default' },
                        { upsert: true }
                    );
                    results.push({ platform: 'Instagram', feature: 'Gamified Funnel', success: true });
                } catch (e) {
                    results.push({ platform: 'Instagram', feature: 'Gamified Funnel', success: false, error: e.message });
                }

                // Update platform preferences
                await CreatorPreference.findOneAndUpdate(
                    { userId },
                    { userId, 'platforms.instagram': true, 'platforms.youtube': true },
                    { upsert: true }
                );

                const successCount = results.filter(r => r.success).length;
                const summary = results.map(r => {
                    const icon = r.success ? '✅' : '❌';
                    return `${icon} ${r.platform} — ${r.feature}`;
                }).join('\n');

                return {
                    success: successCount > 0,
                    message: `🚀 **All automation enabled!** (${successCount}/${results.length} features)\n\n${summary}\n\nAll connected platforms are now set to ${mode === 'ai_smart' ? 'AI Smart' : mode} mode.`,
                    data: { results, mode, enabled: true, automationType: 'all_automation' }
                };
            }

            // ==================== DISABLE ALL AUTOMATION ====================
            if (intent === 'disable_all_automation') {
                const results = [];

                // ==================== CRITICAL FIX: Find ALL possible user IDs ====================
                // The webhook uses igBusinessAccountId, but the chat sends OAuth userId.
                // We MUST disable settings under BOTH IDs to prevent leaks.
                const Token = require('../../model/Instaautomation').Token;
                const allUserIds = new Set([userId]); // Start with the chat userId

                try {
                    // Find token by userId to get igBusinessAccountId
                    const token = await Token.findOne({ userId });
                    if (token && token.igBusinessAccountId) {
                        allUserIds.add(token.igBusinessAccountId);
                    }
                    // Also try reverse: maybe the userId IS the igBusinessAccountId
                    const tokenReverse = await Token.findOne({ igBusinessAccountId: userId });
                    if (tokenReverse) {
                        allUserIds.add(tokenReverse.userId);
                    }
                    // Fallback: if only one token exists, add all its IDs
                    const allTokens = await Token.find({}).lean();
                    if (allTokens.length === 1) {
                        allUserIds.add(allTokens[0].userId);
                        if (allTokens[0].igBusinessAccountId) {
                            allUserIds.add(allTokens[0].igBusinessAccountId);
                        }
                    }
                } catch (tokenErr) {
                    console.error('[DisableAll] Token lookup error:', tokenErr.message);
                }

                const userIdArray = Array.from(allUserIds);
                console.log(`[DisableAll] Will disable settings for ALL user IDs: ${userIdArray.join(', ')}`);

                // Disable Instagram comment auto-reply + viral tag for ALL IDs
                try {
                    await AutoReplySetting.updateMany(
                        { userId: { $in: userIdArray } },
                        { enabled: false, viralTagEnabled: false }
                    );
                    results.push({ platform: 'Instagram', feature: 'Comment Auto-Reply + Viral Tag', success: true });
                } catch (e) {
                    results.push({ platform: 'Instagram', feature: 'Comment Auto-Reply', success: false });
                }

                // Disable Instagram DM auto-reply + autonomous + story mention + inbox triage for ALL IDs
                try {
                    await DmAutoReplySetting.updateMany(
                        { userId: { $in: userIdArray } },
                        { enabled: false, autonomousMode: false, storyMentionEnabled: false, inboxTriageEnabled: false }
                    );
                    results.push({ platform: 'Instagram', feature: 'DM Auto-Reply + Autonomous + Story Mentions', success: true });
                } catch (e) {
                    results.push({ platform: 'Instagram', feature: 'DM Auto-Reply', success: false });
                }

                // Disable Comment to DM for ALL IDs
                try {
                    await CommentToDmSetting.updateMany(
                        { userId: { $in: userIdArray } },
                        { enabled: false }
                    );
                    results.push({ platform: 'Instagram', feature: 'Comment to DM', success: true });
                } catch (e) {
                    results.push({ platform: 'Instagram', feature: 'Comment to DM', success: false });
                }

                // Disable Gamified Funnel for ALL IDs
                try {
                    await GamifyFunnelSetting.updateMany(
                        { userId: { $in: userIdArray } },
                        { enabled: false }
                    );
                    results.push({ platform: 'Instagram', feature: 'Gamified Funnel', success: true });
                } catch (e) {
                    results.push({ platform: 'Instagram', feature: 'Gamified Funnel', success: false });
                }

                // ==================== CANCEL ALL PENDING IN-MEMORY TIMEOUTS ====================
                try {
                    const instaRouter = require('../../route/instaautomationapi');
                    if (typeof instaRouter.cancelAllPendingAutomation === 'function') {
                        const cancelled = instaRouter.cancelAllPendingAutomation();
                        console.log(`[DisableAll] Cancelled pending: ${cancelled.cancelledComments} comments, ${cancelled.cancelledDMs} DMs, ${cancelled.cancelledC2D || 0} C2D`);
                    }
                } catch (cancelErr) {
                    console.error('[DisableAll] Failed to cancel pending timeouts:', cancelErr.message);
                }

                const summary = results.map(r => {
                    const icon = r.success ? '✅' : '❌';
                    return `${icon} ${r.platform} — ${r.feature} OFF`;
                }).join('\n');

                return {
                    success: true,
                    message: `⛔ **All automation stopped!**\n\n${summary}\n\nEverything is paused — including pending replies. Just say "turn on everything" to re-enable.`,
                    data: { results, enabled: false, automationType: 'all_automation' }
                };
            }

            // ==================== SET PLATFORM PREFERENCE ====================
            if (intent === 'set_platform_preference') {
                const instagram = params.instagram !== undefined ? params.instagram : true;
                const youtube = params.youtube !== undefined ? params.youtube : true;

                await CreatorPreference.findOneAndUpdate(
                    { userId },
                    { userId, 'platforms.instagram': instagram, 'platforms.youtube': youtube },
                    { upsert: true }
                );

                const active = [];
                if (instagram) active.push('📸 Instagram');
                if (youtube) active.push('🎬 YouTube');

                return {
                    success: true,
                    message: `🌐 Platform preference updated! Automation will run on: ${active.length > 0 ? active.join(' + ') : '⚠️ No platforms selected'}`,
                    data: { instagram, youtube }
                };
            }

            return { success: false, message: 'Unknown cross-platform action.' };
        } catch (error) {
            console.error('[Handler:crossPlatform] Error:', error.message);
            return { success: false, message: `Cross-platform operation failed: ${error.message}` };
        }
    }
};
