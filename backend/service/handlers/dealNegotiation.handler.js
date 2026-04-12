const axios = require('axios');
const { Conversation, Token, DmAutoReplyLog, DmAutoReplySetting, BrainAnalytics } = require('../../model/Instaautomation');
const inboxTriageService = require('../inboxTriageService');
const { emitToUser } = require('../socketService');

// Instagram Graph API setup
const GRAPH_BASE = `${process.env.INSTAGRAM_GRAPH_API_BASE_URL || 'https://graph.instagram.com'}/v${process.env.INSTAGRAM_GRAPH_API_VERSION || '24.0'}`;

/**
 * Helper to dispatch DM via Instagram API safely.
 * Returns { success, message, data }
 */
async function dispatchMessage(recipientIGSID, igBusinessAccountId, textMessage) {
    try {
        const tokenDoc = await Token.findOne({ $or: [
            { igBusinessAccountId: igBusinessAccountId }, 
            { userId: igBusinessAccountId },
            { igBusinessAccountId: recipientIGSID },
            { userId: recipientIGSID }
        ]});
        if (!tokenDoc || !tokenDoc.accessToken) {
            return { success: false, message: 'Instagram token not found.' };
        }

        // Use the correct page-scoped ID for sending
        const sendAsId = tokenDoc.igBusinessAccountId || igBusinessAccountId;

        const response = await axios.post(
            `${GRAPH_BASE}/${sendAsId}/messages`,
            {
                recipient: { id: recipientIGSID },
                message: { text: textMessage }
            },
            {
                params: { access_token: tokenDoc.accessToken },
                headers: { 'Content-Type': 'application/json' }
            }
        );

        return { success: true, data: response.data };
    } catch (error) {
        console.error('[DealNegotiator] Dispatch failed:', error.response?.data?.error?.message || error.message);
        return { success: false, message: error.response?.data?.error?.message || error.message };
    }
}

/**
 * Utility to find a target conversation based on a dynamic target string.
 */
async function findTargetConversation(userId, targetStr, dealId = null) {
    let query = { 
        userId: userId, // [FIX] Strict Multi-Tenant Enforcement
    };
    if (dealId) {
        query._id = dealId;
    } else {
        query['negotiationData.status'] = { $in: ['drafted', 'negotiating'] };
        if (targetStr && targetStr.toLowerCase() !== 'all' && targetStr.toLowerCase() !== 'recent') {
            const regexStr = targetStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape
            query['negotiationData.brandName'] = { $regex: new RegExp(regexStr, 'i') };
        }
    }

    // Attempt to find by specific brand, else just pick the most recently active drafted deal
    let deals = await Conversation.find(query).sort({ lastMessageTime: -1 }).limit(10);
    
    if (deals.length === 0) return [];
    if (dealId) return deals;
    
    if (targetStr && targetStr.toLowerCase() === 'all') {
        return deals;
    }
    
    // Default to the most recent one if "recent" or specific name
    return [deals[0]];
}

module.exports = {
    name: 'dealNegotiation',
    intents: ['deal_action_bulk', 'regenerate_deal_draft', 'set_deal_rate_rule', 'generate_contract_summary'],

    async execute(intent, params, context) {
        const { userId } = context;

        // Validate context and userId
        if (!userId) {
            console.error('[Handler:dealNegotiation] Missing userId in context');
            return { success: false, message: 'User context missing. Please refresh and try again.' };
        }

        // Validate params
        if (!params || typeof params !== 'object') {
            console.error('[Handler:dealNegotiation] Invalid params:', params);
            return { success: false, message: 'Invalid parameters received.' };
        }

        try {
            // ==================== DEAL ACTION BULK ====================
            if (intent === 'deal_action_bulk') {
                const actions = params.actions || [];
                if (!Array.isArray(actions) || actions.length === 0) {
                    return { success: false, message: 'No concrete deal actions identified. Try: "Approve the Nike deal"' };
                }

                let resultsLog = [];
                for (const act of actions) {
                    const targetDeals = await findTargetConversation(userId, act.brandName, act.dealId);
                    
                    if (targetDeals.length === 0) {
                        resultsLog.push(`❌ ${act.brandName ? act.brandName : 'Deal'}: Not found in active negotiations.`);
                        continue;
                    }

                    for (const deal of targetDeals) {
                        const brandName = deal.negotiationData.brandName;
                        if (act.action === 'approve') {
                            const messageToSend = act.draftOverride || deal.negotiationData.draftReply;
                            
                            const dispatchRes = await dispatchMessage(deal.senderId, deal.userId || deal.recipientId, messageToSend);
                            
                            if (dispatchRes.success) {
                                // If it was already in drafted status (meaning negotiated), move to won/contract_prep
                                if (deal.negotiationData.status === 'drafted' || deal.priorityTag === 'Collaboration') {
                                    deal.negotiationData.status = 'won';
                                } else {
                                    deal.negotiationData.status = 'negotiating';
                                }

                                deal.negotiationData.history.push({ 
                                    action: 'sent', 
                                    text: `APPROVED: ${messageToSend}`, 
                                    timestamp: new Date() 
                                });
                                await deal.save();
                                
                                await DmAutoReplyLog.create({
                                    userId: userId,
                                    senderId: deal.senderId,
                                    messageText: '[DEAL APPROVED]',
                                    replyText: messageToSend,
                                    status: 'sent',
                                    action: 'brand_deal_negotiation',
                                    scheduledAt: new Date(),
                                    repliedAt: new Date()
                                });

                                await BrainAnalytics.create({
                                    userId: userId,
                                    conversationId: deal.conversationId,
                                    brandName: brandName,
                                    actionType: 'negotiation_draft',
                                    generatedText: messageToSend,
                                    suggestedRate: deal.negotiationData.suggestedRate,
                                    dealWinStatus: 'won'
                                });
                                emitToUser(userId, 'deal_updated', { dealId: deal._id, status: 'won', action: 'approve' });

                                resultsLog.push(`✅ **${brandName}**: Deal approved and confirmation sent! Status updated to WON.`);
                            } else {
                                resultsLog.push(`❌ **${brandName}**: Approval message failed to send (${dispatchRes.message})`);
                            }
                        } else if (act.action === 'reject') {
                            deal.negotiationData.status = 'rejected';
                            deal.negotiationData.history.push({ action: 'rejected', text: 'System rejection logged.', timestamp: new Date() });
                            await deal.save();

                            await BrainAnalytics.create({
                                userId: userId,
                                conversationId: deal.conversationId,
                                brandName: brandName,
                                actionType: 'negotiation_draft',
                                generatedText: deal.negotiationData.draftReply || 'rejected',
                                dealWinStatus: 'rejected'
                            });
                            emitToUser(userId, 'deal_updated', { dealId: deal._id, status: 'rejected', action: 'reject' });
                            resultsLog.push(`⛔ **${brandName}**: Dropped from pipeline.`);
                        } else if (act.action === 'conditional_approve') {
                             // E.g. Approve deals >$500. Advanced logic hooks here.
                             resultsLog.push(`⚠️ **${brandName}**: Conditional logic requires manual review for now.`);
                        }
                    }
                }

                return {
                    success: true,
                    message: `Processed your deal commands:\n\n${resultsLog.join('\n')}`,
                    data: { actionsProcessed: actions.length }
                };
            }

            // ==================== REGENERATE DEAL DRAFT ====================
            if (intent === 'regenerate_deal_draft') {
                const targetBrand = params.brandName || 'recent';
                const instructions = params.instructions || 'Rewrite it to sound better.';

                if (!instructions || instructions.trim().length === 0) {
                    return { success: false, message: 'Please provide instructions for how to rewrite the draft.' };
                }
                
                const targetDeals = await findTargetConversation(userId, targetBrand, params.dealId);
                if (targetDeals.length === 0) {
                    return { success: false, message: `Could not find an active drafted deal for "${targetBrand}".` };
                }

                const deal = targetDeals[0];
                const originalMessage = deal.lastMessage?.text || "Unknown Context";
                const originalRate = deal.negotiationData.suggestedRate;

                // Push old draft to history before replacing
                deal.negotiationData.history.push({
                    action: 'ai_regeneration',
                    text: deal.negotiationData.draftReply,
                    timestamp: new Date()
                });

                // Generate new draft — fetch creator's rules so the regeneration respects them
                const CreatorPersona = require('../../model/CreatorPersona');
                const [persona, dmSettingsForDraft] = await Promise.all([
                    CreatorPersona.findOne({ userId }).lean(),
                    DmAutoReplySetting.findOne({ userId }).lean()
                ]);

                const newDraftData = await inboxTriageService.generateNegotiationDraft(
                    originalMessage, 
                    'Context Override', 
                    originalRate, 
                    persona,
                    instructions,
                    dmSettingsForDraft?.negotiationPreferences || null
                );

                if (newDraftData && newDraftData.draftReply) {
                    deal.negotiationData.draftReply = newDraftData.draftReply;
                    if (newDraftData.suggestedRate) deal.negotiationData.suggestedRate = newDraftData.suggestedRate;
                    await deal.save();

                    emitToUser(userId, 'deal_updated', { dealId: deal._id, status: deal.negotiationData.status, action: 'regenerate' });

                    // Generate a silent, UI-only toast to refresh the frontend data
                    return {
                        success: true,
                        message: `Okay, I've rewritten the draft for **${deal.negotiationData.brandName}** based on your instruction: "${instructions}".`,
                        // Return the mutated data payload so the UI can auto-update
                        data: {
                            regeneratedDeal: {
                                brandName: deal.negotiationData.brandName,
                                suggestedRate: deal.negotiationData.suggestedRate,
                                draftReply: deal.negotiationData.draftReply,
                                conversationId: deal.conversationId
                            }
                        }
                    };
                } else {
                    return { success: false, message: `Failed to regenerate draft. Please try again.` };
                }
            }

            // ==================== SET DEAL RATE RULE ====================
            if (intent === 'set_deal_rate_rule') {
                const brandIndustry = params.brandIndustry || 'all';
                const minRate = parseInt(params.minRate) || 0;

                if (minRate <= 0) {
                    return { success: false, message: 'Please provide a valid minimum rate amount (e.g., "Set minimum rate to $500 for fashion brands").' };
                }

                // We leverage custom rules stored in DmAutoReplySetting seamlessly
                const settings = await DmAutoReplySetting.findOne({ userId });
                if (settings) {
                    settings.customInstructions.push({
                        instruction: `If negotiating a brand deal in the ${brandIndustry} space, firmly reject any offers below $${minRate}.`,
                        active: true,
                        createdAt: new Date()
                    });
                    await settings.save();
                    return { success: true, message: `Understood. I've added a global rule to negotiate at least $${minRate} with ${brandIndustry} brands.` };
                } else {
                    return { success: false, message: `Could not find your automation settings to apply this rule.` };
                }
            }

            // ==================== GENERATE CONTRACT SUMMARY ====================
            if (intent === 'generate_contract_summary') {
                const targetBrand = params.brandName || 'recent';
                const targetDeals = await findTargetConversation(userId, targetBrand, params.dealId);
                if (targetDeals.length === 0) return { success: false, message: `Could not find a deal for "${targetBrand}" to build a contract for.` };
                
                const deal = targetDeals[0];
                deal.negotiationData.status = 'contract_prep';

                // Fetch creator context for the agreement
                const settings = await DmAutoReplySetting.findOne({ userId });
                const creatorStats = { followers: '100k', engagement: '5%' }; // Placeholder or fetched
                const customInstructions = (settings?.customInstructions || []).map(ci => ci.instruction).join('\n');
                const history = (deal.negotiationData.history || []).map(h => ({
                    role: h.action === 'sent' ? 'assistant' : 'user',
                    text: h.text
                }));

                const contractText = await inboxTriageService.generateFinalAgreement(
                    history,
                    creatorStats,
                    null, // persona
                    customInstructions
                );

                await deal.save();

                return { 
                    success: true, 
                    message: `I have analyzed the conversation and prepared a comprehensive deal agreement plan for **${deal.negotiationData.brandName}**:\n\n${contractText}`,
                    data: { contractText }
                };
            }

        } catch (error) {
            console.error('[Handler:dealNegotiation] Critical error:', error.message, error.stack);
            return {
                success: false,
                message: `Failed to process your deal command: ${error.message}. Please try again or rephrase your request.`
            };
        }
    }
};
