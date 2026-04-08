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
async function generateNegotiationDraft(messageText, followersCount, engagementRate = '3%', creatorPersona = null, customInstructions = null) {
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

        const prompt = `
A brand just DM'd this creator on Instagram:
"${messageText}"

Creator stats: ${followersCount} followers, ${engagementRate} engagement.
${personaStyle}
${customOverrideBlock}

Do 3 things:
1. Extract brand name and specific collaboration request (e.g. Reel, Feed post, Story, YouTube, or general partnership).
2. Calculate a suggested rate based on the follow count ($10 per 1K followers baseline). Adjust for type: Reels/Long-form (1.5x), Feed posts (1x), Stories (0.5x). If the request is non-standard, use your judgement as a pro manager.
3. Draft a SHORT, natural reply (2-3 sentences) in the creator's voice. Set clear expectations but keep it friendly.

Return ONLY valid JSON:
{"brandName": "Name", "suggestedRate": "$X (format)", "draftReply": "the short casual reply", "collaborationType": "Extracted type"}`;

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
async function continueAutonomousNegotiation(history, followersCount, engagementRate = '3%', creatorPersona = null, customInstructions = null) {
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

        const formattedHistory = history.map(h => `${h.role === 'user' ? 'Brand' : 'You'}: ${h.text}`).join('\n');

        const prompt = `
You are an elite Brand Deal Negotiator representing an Instagram creator as their human manager (or the creator themselves). You manage their DM conversation.
NEVER break character. NEVER use phrases like "As an AI model" or suggest you are artificial. 
Your tone must be human, smooth, and clear. Avoid robotic or typical "AI generated" fluff. You are speaking directly to a brand.

CONVERSATION HISTORY:
${formattedHistory}

CREATOR STATS:
- Followers: ${followersCount}
- Engagement: ${engagementRate}

${personaStyle}
${customOverride}

NEGOTIATION FUNNEL & LOGIC:
1. DISCOVERY PHASE: Never agree immediately to a deal without full context. Ask clarifying questions one at a time.
   - What exact deliverables do they want? (Reels, Stories, YouTube?)
   - Are they offering a cash deal, a barter (free products only), or a mix? 
     * Note: If they offer only barter, politely ask if they accept barter deals or what their cash budget might be, based on the creator stats.
   - What is the timeline and deadline?
   - Do they require usage rights, whitelisting, or exclusivity?

2. NEGOTIATION PHASE: Use the creator's follower count to confidently negotiate rates.
   - Cash baseline: $10 per 1K followers. Reels = 1.5x baseline. Stories = 0.5x baseline.
   - If they offer below the baseline, smoothly counter-offer based on the creator's value. 
   - Never undersell the creator. Stand firm on the rate unless the brand offers extraordinary value (e.g. huge long term brand partnership).

3. FINALIZING THE DEAL: Do not jump straight to contract generation unless everything (Deliverables, Price, Timeline, Perks, Usage rights) is completely clear and agreed upon by the brand.
   - If terms are not yet strictly clear, your action is 'REPLY' and you ask the next discovery question.
   - If all terms are absolutely clear and the brand has agreed, your action is 'REQUIRE_APPROVAL'. You DO NOT reply to the brand in this case.

OUTPUT FORMAT (JSON ONLY):
{
  "action": "REPLY" or "REQUIRE_APPROVAL",
  "replyText": "If action is REPLY, write the casual natural DM here. 1-2 sentences max. Use creator's voice and keep the conversation moving forward by asking ONE clear question at a time.",
  "approvalSummary": "If action is REQUIRE_APPROVAL, output a highly detailed, professional review for the creator. Detail the exact Deliverables, Price, Timeline, Perks, Exclusivity/Rights, and outline what the brand expects versus what the creator provides. Present this as a final, comprehensive deal plan ready for the creator's signature.",
  "suggestedRate": "The currently discussed or proposed rate (e.g. $1500 or Barter + $500)",
  "brandName": "Extracted brand name",
  "deliverables": "Negotiated deliverables (e.g. 1 Reel, 2 Stories)"
}
`;

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
