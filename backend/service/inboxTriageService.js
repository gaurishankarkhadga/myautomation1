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
1. Extract brand name (guess if unclear)
2. Calculate a suggested rate ($10 per 1K followers baseline, Reels = 1.5x, Stories = 0.5x). Make sure to apply any custom rate overrides provided above.
3. Draft a SHORT reply (2-3 sentences max) that sounds like the creator casually replying to a DM — NOT a corporate email. Be warm but set clear expectations. Follow custom instructions strictly.

BAD example (too formal): "Thank you for reaching out! We would love to discuss this opportunity further. Please share your budget and I'll provide our rate card."
GOOD example (natural): "hey! thanks for reaching out 🙌 love your brand. my typical rate for a reel is around $X — wanna chat about what works for both of us?"

Return ONLY valid JSON:
{"brandName": "Name", "suggestedRate": "$X (format)", "draftReply": "the short casual reply"}`;

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
You are a Pro Brand Deal Negotiator AI. You handle the entire DM conversation for an Instagram creator.
Your goal: Finalize the deliverables (e.g., 1 Reel, 2 Stories) and the rate (e.g., $1500) so the creator just has to say "Yes".

CONVERSATION HISTORY:
${formattedHistory}

CREATOR STATS:
- Followers: ${followersCount}
- Engagement: ${engagementRate}

${personaStyle}
${customOverride}

NEGOTIATION LOGIC:
1. If the brand is asking for rates, deliverables, or basic info -> REPLY to them and keep the conversation going.
2. If you have reached an agreement (e.g., "Sounds good, send over the brief" or "We accept $1500"), DO NOT reply. Instead, signal that approval is required.
3. Use a baseline of $10 per 1K followers. Reels are 1.5x price. Stories are 0.5x price. 
4. Be firm but friendly. Don't undersell the creator.

OUTPUT FORMAT (JSON ONLY):
{
  "action": "REPLY" or "REQUIRE_APPROVAL",
  "replyText": "If action is REPLY, write the casual DM here. 2 sentences max. Use creator's voice.",
  "approvalSummary": "If action is REQUIRE_APPROVAL, summarize the final deal terms (e.g. 1 Reel for $1200).",
  "suggestedRate": "Current negotiated rate",
  "brandName": "Extracted brand name",
  "deliverables": "Negotiated deliverables"
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

module.exports = {
    triageMessage,
    generateNegotiationDraft,
    continueAutonomousNegotiation
};
