const { generateContentWithFallback } = require('./geminiClient');

/**
 * Categorize an incoming DM into predefined priority tags
 * @param {string} messageText 
 * @returns {Promise<string>} e.g., 'Collaboration', 'Support', 'Fan Mail', 'Spam', 'Other'
 */
async function triageMessage(messageText) {
    if (!messageText || messageText.trim() === '') return 'Other';
    if (!process.env.GEMINI_API_KEY) {
        console.warn('[Inbox Triage] GEMINI_API_KEY missing, defaulting tag to Other');
        return 'Other';
    }

    try {
        const prompt = `
            You are an AI assistant managing an Instagram creator's inbox.
            Your job is to read an incoming direct message (DM) and categorize it into exactly ONE of the following tags:
            1. "Collaboration": The person is asking for a brand deal, sponsorship, promo, rates, or partnership.
            2. "Support": The person is asking for help with a product, course, link, or having an issue.
            3. "Fan Mail": The person is just expressing love, admiration, or saying thanks.
            4. "Spam": The message looks like bot spam, crypto scams, or generic automated messages.
            5. "Other": The message does not strongly fit any of the above categories.

            Reply ONLY with the exact string of the category name (e.g., "Collaboration" or "Spam").
            Do not include any other text or punctuation.

            Message to classify: "${messageText}"
        `;

        const result = await generateContentWithFallback(prompt);
        const responseText = result.response.text().trim();

        // Clean up the output just in case
        const validTags = ['Collaboration', 'Support', 'Fan Mail', 'Spam', 'Other'];
        const matchedTag = validTags.find(tag => responseText.toLowerCase().includes(tag.toLowerCase()));

        return matchedTag || 'Other';
    } catch (error) {
        console.error('[Inbox Triage] Error categorizing message:', error.message);
        return 'Other'; // fallback
    }
}

/**
 * Generates brand analysis, suggested rate card, and a drafted reply for Collaboration DMs
 */
async function generateNegotiationDraft(messageText, followersCount, engagementRate = '3%', creatorPersona = null, customInstructions = null, negotiationPreferences = null) {
    if (!messageText || !process.env.GEMINI_API_KEY) return null;

    try {
        // Build persona context if available
        let personaStyle = '';
        if (creatorPersona) {
            personaStyle = `
The creator's communication style:
- Tone: ${creatorPersona.communicationStyle || 'casual and friendly'}
- They type: ${creatorPersona.lowercasePreference ? 'in lowercase' : 'normally'}
- Emoji usage: ${creatorPersona.emojiUsage || 'moderate'}
- Reply length: ~${creatorPersona.averageReplyLength || 40} chars
- Their vibe: ${(creatorPersona.toneKeywords || []).join(', ') || 'friendly, chill'}

WRITE THE DRAFT IN THIS EXACT STYLE — not formal, not corporate.`;
        }

        let customOverrideBlock = '';
        if (customInstructions) {
            customOverrideBlock = `
🔥🔥🔥 CRITICAL OVERRIDE INSTRUCTIONS FROM CREATOR 🔥🔥🔥
Follow these exact instructions when generating the rate and the draft reply:
"${customInstructions}"
`;
        }

        let preferencesBlock = '';
        if (negotiationPreferences) {
            preferencesBlock = `
CREATOR'S NON-NEGOTIABLE LAWS (15-POINT MATRIX):
These are the creator's absolute rules. Use them to evaluate this initial inquiry and set your strategy.
- Accepted Deliverables: ${negotiationPreferences.acceptedDeliverables?.join(', ') || 'Any'}
- Min Cash Target: ${negotiationPreferences.minimumCashTarget ? '$'+negotiationPreferences.minimumCashTarget : 'Open'}
- Max Asking Target: ${negotiationPreferences.maximumAskTarget ? '$'+negotiationPreferences.maximumAskTarget : 'Open'}
- Barter Accepted: ${negotiationPreferences.barterAcceptance === false ? 'NEVER — cash only, reject barter immediately' : 'Yes'}
- Payment Terms: ${negotiationPreferences.paymentTerms || 'Standard'}
- Usage Rights Limits: ${negotiationPreferences.usageRightsLimits || 'Standard'}
- Exclusivity Limits: ${negotiationPreferences.exclusivityLimits || 'Standard'}
- Revisions Included: ${negotiationPreferences.revisionsIncluded || 'Standard'}
- Delivery Timeline: ${negotiationPreferences.deliveryTimeline || 'Standard'}
- Required Free Product: ${negotiationPreferences.requiredFreeProduct ? 'Yes, must send product' : 'No'}
- Affiliate Links: ${negotiationPreferences.affiliateLinks ? 'Allowed' : 'No commission-only deals'}
- Blocked Industries: ${negotiationPreferences.blockedIndustries?.join(', ') || 'None'}
- Contract Sign-Off: ${negotiationPreferences.contractSignOff || 'Flexible'}
- Content Format: ${negotiationPreferences.contentFormat || 'Standard'}
- Brief Requirement: ${negotiationPreferences.creativeBriefRequirement || 'Required'}

IMPORTANT: If the brand's initial message mentions a blocked industry, reject immediately. 
If they mention barter/free product only and barter is NOT accepted, make it clear cash is required.
Factor the minimum rate into your suggested rate calculation.`;
        }

        const prompt = `
You are an Elite Talent Manager representing a top-tier Instagram creator. A brand just DM'd this creator:
"${messageText}"

Creator stats: ${followersCount} followers, ${engagementRate} engagement.
${personaStyle}
${customOverrideBlock}
${preferencesBlock}

YOUR TASK: Do NOT just blindly suggest a rate or ask "what do you suggest". If the brand's request is totally vague (like "let's collab" or "I want to sponsor something"), you must act as a strict gatekeeper.
1. Perform an internal analysis of the DM. What is missing? (Brand name? Product? Deliverables? Timeline? Budget?)
2. Calculate an internal baseline rate ONLY if they are asking for rates for specific deliverables. ($10 per 1K followers baseline, Reels=1.5x, Stories=0.5x). If you don't know the deliverables yet, the rate should simply be "TBD - Awaiting Scope". NEVER go below the creator's minimum cash target if set.
3. Draft a SHORT, sharp, natural reply (1-2 sentences) in the creator's voice to extract the missing information. Do NOT quote prices yet. Ask for the scope or the specific product first. Be professional but firm.

Return ONLY valid JSON:
{
  "strategicAnalysis": "Your internal logic on what is missing and what your exact goal is for this first reply.",
  "brandName": "Extracted brand name (or 'Unknown')", 
  "suggestedRate": "Calculated rate (or 'TBD')", 
  "draftReply": "The sharp 1-2 sentence reply asking for specifics", 
  "collaborationType": "Extracted type (or 'Unknown')"
}`;

        const result = await generateContentWithFallback(prompt);
        let responseText = result.response.text().trim();
        
        // Ensure JSON extraction
        if (responseText.startsWith("\`\`\`json")) {
            responseText = responseText.replace(/^\`\`\`json/, "").replace(/\`\`\`$/, "").trim();
        } else if (responseText.startsWith("\`\`\`")) {
            responseText = responseText.replace(/^\`\`\`/, "").replace(/\`\`\`$/, "").trim();
        }

        const data = JSON.parse(responseText);
        return data;
    } catch (error) {
        console.error('[Inbox Triage] Error generating negotiation draft:', error.message);
        return null; // fallback
    }
}

/**
 * Handles end-to-end autonomous negotiation for Brand Deals.
 * Decides whether to reply directly to the DM or flag for creator approval once terms are set.
 */
async function continueAutonomousNegotiation(history, followersCount, engagementRate = '3%', creatorPersona = null, customInstructions = null, negotiationPreferences = null) {
    if (!history || history.length === 0 || !process.env.GEMINI_API_KEY) return null;

    try {
        // Build persona context
        let personaStyle = '';
        if (creatorPersona) {
            personaStyle = `
CREATOR PERSONA (USE THIS VOICE):
- Name/Identity: ${creatorPersona.name || 'The Creator'}
- Tone: ${creatorPersona.communicationStyle || 'casual and friendly'}
- Typing style: ${creatorPersona.lowercasePreference ? 'prefers lowercase' : 'standard casing'}
- Emoji usage: ${creatorPersona.emojiUsage || 'moderate'}
- Vibe: ${(creatorPersona.toneKeywords || []).join(', ') || 'friendly, chill'}

COMMUNICATION RULE: You are managing this inbox. Speak as the creator's manager OR as the creator themselves depending on the previous flow. Be professional but chill.`;
        }

        let customOverride = '';
        if (customInstructions) {
            customOverride = `
EXTREMELY IMPORTANT - CREATOR'S CUSTOM RULES:
"${customInstructions}"
Follow these rules above everything else.`;
        }

        let preferencesBlock = '';
        if (negotiationPreferences) {
            preferencesBlock = `
CREATOR'S NON-NEGOTIABLE LAWS (15-POINT MATRIX):
You MUST enforce these settings perfectly. If a brand offers something outside these laws, you politely counter-offer.
- Accepted Deliverables: ${negotiationPreferences.acceptedDeliverables?.join(', ') || 'Any'}
- Min Cash Target: ${negotiationPreferences.minimumCashTarget ? '$'+negotiationPreferences.minimumCashTarget : 'Open'}
- Max Asking Target: ${negotiationPreferences.maximumAskTarget ? '$'+negotiationPreferences.maximumAskTarget : 'Open'}
- Barter Accepted: ${negotiationPreferences.barterAcceptance === false ? 'No, cash only' : 'Yes'}
- Payment Terms: ${negotiationPreferences.paymentTerms || 'Standard'}
- Usage Rights Limits: ${negotiationPreferences.usageRightsLimits || 'Standard'}
- Exclusivity Limits: ${negotiationPreferences.exclusivityLimits || 'Standard'}
- Revisions Included: ${negotiationPreferences.revisionsIncluded || 'Standard'}
- Delivery Timeline: ${negotiationPreferences.deliveryTimeline || 'Standard'}
- Required Free Product: ${negotiationPreferences.requiredFreeProduct ? 'Yes' : 'No'}
- Affiliate Links: ${negotiationPreferences.affiliateLinks ? 'Allowed' : 'No commission-only deals'}
- Blocked Industries: ${negotiationPreferences.blockedIndustries?.join(', ') || 'None'}
- Contract Sign-Off: ${negotiationPreferences.contractSignOff || 'Flexible'}
- Content Format: ${negotiationPreferences.contentFormat || 'Standard'}
- Brief Requirement: ${negotiationPreferences.creativeBriefRequirement || 'Required'}`;
        }

        const formattedHistory = history.map(h => `${h.role === 'user' ? 'Brand' : 'You'}: ${h.text}`).join('\n');

        const prompt = `
You are an Elite Talent Manager representing a top-tier Instagram creator. Your job is to field sponsorship inquiries with extreme precision, professional poise, and sharp intelligence. 
NEVER break character. You are human. Avoid robotic, repetitive, or stereotypical "AI-generated" responses. Always think strategically before you reply.

CONVERSATION HISTORY:
${formattedHistory}

CREATOR STATS:
- Followers: ${followersCount}
- Engagement: ${engagementRate}

${personaStyle}
${customOverride}
${preferencesBlock}

STRATEGIC NEGOTIATION FRAMEWORK & SET COMPULSORY QUESTIONS (FOLLOW STRICTLY):

You act as a filter. You do not generate an end-to-end deal until EVERY SINGLE ONE of these set compulsory questions is satisfied by the brand. 
You must ask these naturally in a conversational flow, one at a time, protecting the creator's time:

[ ] Q1. Brand & Proper Brief Detail: Who exactly is the brand and what is the specific product/service? (If vague, ask them to send over a quick brief or product link).
[ ] Q2. Deliverables: Exactly how many units are required? (e.g., 1 Reel, 2 Story slides, 1 YT integration).
[ ] Q3. Compensation/Budget: What is the exact cash budget allocated for this campaign? (Or explicitly agree to a barter value).
[ ] Q4. Timeline: What is the exact timeline or deadline for the post to go live?
[ ] Q5. Usage Rights: Do they need paid ad usage rights/whitelisting with this content? If yes, for how long?
[ ] Q6. Exclusivity: Are they requesting exclusivity against competitors? If yes, for how long?

DECISION LOGIC & FILTERING:
- You must perform an internal "strategicAnalysis" first. Evaluate the conversation history using your compulsory question filter. Which "Q" is missing?
- If the compulsory questions are NOT fully satisfied, your action MUST be "REPLY".
- ACTION "REPLY": Draft a natural, human-like DM. Do NOT interrogate. Smoothly ask for the next missing piece of information (e.g., "Sounds like a great fit! Could you share a quick brief or link so I can see what the product is about?"). 
- ACTION "REQUIRE_APPROVAL": ONLY trigger this approval message when all Q1-Q6 are completely satisfied. This signifies a successful end-to-end deal generation.

OUTPUT FORMAT (JSON ONLY):
{
  "strategicAnalysis": "Deep internal monologue evaluating the checklist. List exactly what is missing before you can approve.",
  "checklistStatus": {"brandContext": false, "deliverables": false, "budget": false, "timeline": false, "rights": false, "exclusivity": false},
  "action": "REPLY" or "REQUIRE_APPROVAL",
  "replyText": "A natural, intelligent, and human DM. 1-2 sentences. Keep the conversation moving to get the missing items. No fluff.",
  "approvalSummary": "If action is REQUIRE_APPROVAL, provide a deep, complete analysis of all 6 checklist items for the creator.",
  "brandName": "Extracted brand name",
  "deliverables": "Negotiated units (or 'Unknown')",
  "suggestedRate": "Current rate/budget (or 'TBD')"
}`;

        const result = await generateContentWithFallback(prompt);
        let responseText = result.response.text().trim();
        
        // Sanitize JSON
        if (responseText.includes('```json')) {
            responseText = responseText.split('```json')[1].split('```')[0].trim();
        } else if (responseText.includes('```')) {
            responseText = responseText.split('```')[1].split('```')[0].trim();
        }

        return JSON.parse(responseText);
    } catch (error) {
        console.error('[Inbox Triage] Error in autonomous negotiation:', error.message);
        return null;
    }
}

/**
 * Generates a comprehensive, deep analysis and final agreement for a deal.
 */
async function generateFinalAgreement(dealHistory, creatorStats, persona, customInstructions) {
    if (!dealHistory || !dealHistory.length) return "No conversation history found to build agreement.";

    const formattedHistory = dealHistory.map(h => `${h.role === 'assistant' ? 'You' : 'Brand'}: ${h.text}`).join('\n');

    const prompt = `
You are an expert Talent Manager. Analyze this conversation history between a creator and a brand:

HISTORY:
${formattedHistory}

CREATOR STATS:
${JSON.stringify(creatorStats)}

CUSTOM PREFERENCES:
${customInstructions}

TASKS:
1. Analyze the brand's core needs and the creator's provided value.
2. Outline the EXACT negotiated terms (Deliverables, Final Rate, Timelines, Rights).
3. Draft a formal yet clear "Final Agreement Summary" ready for the creator's seal of approval.
4. Make it look professional but simple to understand. Not like a legal document, but a clear brand deal plan.

Output ONLY the formatted agreement text.`;

    try {
        const result = await generateContentWithFallback(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error('[Inbox Triage] Error generating final agreement:', error.message);
        return "Failed to generate comprehensive agreement summary.";
    }
}

module.exports = {
    triageMessage,
    generateNegotiationDraft,
    continueAutonomousNegotiation,
    generateFinalAgreement
};
