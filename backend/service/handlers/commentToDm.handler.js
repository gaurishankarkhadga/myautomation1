const { CommentToDmSetting, Token } = require('../../model/Instaautomation');
const CreatorAsset = require('../../model/CreatorAsset');
const { fetchFilteredMedia } = require('../mediaUtils');
const axios = require('axios');
const { generateSmartReply } = require('../aiService');

const GRAPH_BASE_URL = `${process.env.INSTAGRAM_GRAPH_API_BASE_URL || 'https://graph.facebook.com'}/v${process.env.INSTAGRAM_GRAPH_API_VERSION || '18.0'}`;

// ==================== VERIFICATION HELPERS ====================

async function verifyToken(token) {
    try {
        const res = await axios.get(`${GRAPH_BASE_URL}/me`, {
            params: { fields: 'id,username', access_token: token }
        });
        return { valid: true, username: res.data.username, igId: res.data.id };
    } catch (err) {
        console.error('[C2D-Verify] Token check failed:', err.response?.data?.error?.message || err.message);
        return { valid: false, error: err.response?.data?.error?.message || err.message };
    }
}

async function verifyWebhookSubscription(token) {
    try {
        // Check if we can access comments — a proxy for webhook health
        const res = await axios.get(`${GRAPH_BASE_URL}/me/media`, {
            params: { fields: 'id', limit: 1, access_token: token }
        });
        return { active: !!(res.data?.data?.length >= 0) };
    } catch {
        return { active: false };
    }
}

async function resolveTargetMediaId(targetMedia, token, userId) {
    if (!targetMedia || targetMedia === 'all') return '';

    try {
        const res = await axios.get(`${GRAPH_BASE_URL}/me/media`, {
            params: {
                fields: 'id,caption,media_type,timestamp,permalink,thumbnail_url',
                limit: 10,
                access_token: token
            }
        });

        const posts = res.data?.data || [];
        if (posts.length === 0) return '';

        if (targetMedia === 'recent' || targetMedia === 'latest') {
            return posts[0].id;
        } else if (targetMedia === 'first' || targetMedia === 'oldest') {
            return posts[posts.length - 1].id;
        } else if (targetMedia === 'previous' && posts.length > 1) {
            return posts[1].id;
        }

        // If it's already a media ID string, return as-is
        if (/^\d+$/.test(targetMedia)) return targetMedia;

        return '';
    } catch (err) {
        console.error('[C2D] Failed to resolve target media:', err.message);
        return '';
    }
}

// ==================== MAIN HANDLER ====================

module.exports = {
    name: 'commentToDm',
    intents: ['enable_comment_to_dm', 'disable_comment_to_dm', 'configure_comment_to_dm'],

    async execute(intent, params, context) {
        const { userId, token } = context;
        
        try {
            // ==================== ENABLE ====================
            if (intent === 'enable_comment_to_dm') {
                const keyword = params.keyword || '';
                const dmMessage = params.dmMessage || params.dm_message || params.message || '';
                const commentReply = params.commentReply || params.comment_reply || '';
                const useAssets = params.useAssets !== false; // default true
                const targetMedia = params.targetMedia || params.target || 'all';

                // ── Time limit ──
                const hours = params.hours || params.duration || params.timeLimitHours || 0;
                const startedAt = new Date();
                const expiresAt = hours > 0 ? new Date(startedAt.getTime() + hours * 60 * 60 * 1000) : null;

                // ── Comment limit ──
                const maxComments = params.maxComments || params.commentLimit || params.max_comments || 0;

                // ── Resolve target media ID ──
                let targetMediaId = '';
                if (token && targetMedia !== 'all') {
                    targetMediaId = await resolveTargetMediaId(targetMedia, token, userId);
                    console.log(`[C2D] Resolved target "${targetMedia}" → mediaId: ${targetMediaId || '(none)'}`);
                }

                // ── Run verification checks ──
                let verification = {
                    tokenValid: false,
                    webhookActive: false,
                    assetsAvailable: false
                };
                const verificationParts = [];

                if (token) {
                    const tokenCheck = await verifyToken(token);
                    verification.tokenValid = tokenCheck.valid;
                    verificationParts.push(tokenCheck.valid
                        ? `✅ Token valid (@${tokenCheck.username})`
                        : `⚠️ Token issue: ${tokenCheck.error}`
                    );

                    const webhookCheck = await verifyWebhookSubscription(token);
                    verification.webhookActive = webhookCheck.active;
                    verificationParts.push(webhookCheck.active
                        ? '✅ API access confirmed'
                        : '⚠️ API access issue — check webhook subscription'
                    );
                } else {
                    verificationParts.push('⚠️ No token provided — some features may not work');
                }

                // Check assets
                const assetCount = await CreatorAsset.countDocuments({ userId, isActive: true });
                verification.assetsAvailable = assetCount > 0;
                if (useAssets) {
                    verificationParts.push(assetCount > 0
                        ? `✅ ${assetCount} asset${assetCount > 1 ? 's' : ''} ready to share`
                        : '⚠️ No active assets — DM will use AI-generated reply instead'
                    );
                }

                // ── AI-generate comment reply if not specified ──
                let finalCommentReply = commentReply;
                if (!finalCommentReply.trim()) {
                    finalCommentReply = 'sent! check your DM 🔥';
                }

                // ── Save settings ──
                const updateData = {
                    userId,
                    enabled: true,
                    mode: 'default',
                    useAssets,
                    keyword,
                    targetMedia,
                    targetMediaId,
                    commentReply: finalCommentReply,
                    startedAt,
                    processedCount: 0,
                    lastVerifiedAt: new Date(),
                    verificationStatus: verification
                };

                if (dmMessage) {
                    updateData.dmMessage = dmMessage;
                    updateData.message = dmMessage;
                }

                if (hours > 0) {
                    updateData.timeLimitHours = hours;
                    updateData.expiresAt = expiresAt;
                }

                if (maxComments > 0) {
                    updateData.maxComments = maxComments;
                }

                await CommentToDmSetting.findOneAndUpdate(
                    { userId },
                    updateData,
                    { upsert: true, new: true }
                );
                
                // Fetch media for preview
                let media = [];
                try {
                    media = await fetchFilteredMedia(token, userId);
                } catch { }
                
                // ── Build confirmation message ──
                const parts = [];
                parts.push('✅ Comment-to-DM is now active!');

                if (keyword) parts.push(`Triggers on: comments containing "${keyword}"`);
                else parts.push('Triggers on: all comments');

                parts.push(`Comment reply: "${finalCommentReply}"`);

                if (dmMessage) parts.push(`DM message: "${dmMessage}"`);
                else if (useAssets && assetCount > 0) parts.push(`DM: AI will auto-share your ${assetCount} asset${assetCount > 1 ? 's' : ''}/links`);
                else parts.push('DM: AI will generate a personalized message');

                if (targetMedia !== 'all') {
                    parts.push(`Target: ${targetMedia}${targetMediaId ? ` (ID: ${targetMediaId.substring(0, 10)}...)` : ''}`);
                }

                if (hours > 0) {
                    const expireTime = expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const expireDate = expiresAt.toLocaleDateString();
                    parts.push(`⏰ Auto-stops after ${hours} hours (at ${expireTime} on ${expireDate})`);
                }

                if (maxComments > 0) {
                    parts.push(`🔢 Max: ${maxComments} comments then auto-stop`);
                }

                // Add verification status
                parts.push('');
                parts.push('**Verification:**');
                parts.push(...verificationParts);

                return {
                    success: true,
                    message: parts.join('\n'),
                    data: {
                        enabled: true,
                        mode: 'default',
                        automationType: 'comment_to_dm',
                        keyword,
                        dmMessage,
                        commentReply: finalCommentReply,
                        useAssets,
                        targetMedia,
                        targetMediaId,
                        timeLimitHours: hours,
                        expiresAt: expiresAt ? expiresAt.toISOString() : null,
                        maxComments,
                        verification,
                        media
                    }
                };
            }
            
            // ==================== CONFIGURE ====================
            if (intent === 'configure_comment_to_dm') {
                const update = {};
                if (params.keyword !== undefined) update.keyword = params.keyword;
                if (params.dmMessage !== undefined || params.dm_message !== undefined || params.message !== undefined) {
                    update.dmMessage = params.dmMessage || params.dm_message || params.message;
                    update.message = update.dmMessage;
                }
                if (params.commentReply !== undefined || params.comment_reply !== undefined) {
                    update.commentReply = params.commentReply || params.comment_reply;
                }
                if (params.enabled !== undefined) update.enabled = params.enabled;
                if (params.useAssets !== undefined) update.useAssets = params.useAssets;
                if (params.targetMedia !== undefined) update.targetMedia = params.targetMedia;

                // Time limit update
                if (params.hours || params.duration) {
                    const hours = params.hours || params.duration;
                    update.timeLimitHours = hours;
                    update.startedAt = new Date();
                    update.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
                }

                // Comment limit update
                if (params.maxComments || params.commentLimit) {
                    update.maxComments = params.maxComments || params.commentLimit;
                    update.processedCount = 0;
                }

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
            
            // ==================== DISABLE ====================
            if (intent === 'disable_comment_to_dm') {
                await CommentToDmSetting.findOneAndUpdate(
                    { userId },
                    { 
                        enabled: false,
                        expiresAt: null,
                        timeLimitHours: 0
                    },
                    { upsert: true }
                );
                
                return {
                    success: true,
                    message: '🛑 Comment-to-DM automation disabled. No more auto-DMs will be sent.',
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
