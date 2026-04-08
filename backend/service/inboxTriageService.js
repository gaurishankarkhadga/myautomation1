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
You are an Elite Talent Manager representing a top-tier Instagram creator. A brand just DM'd this creator:
"${messageText}"

Creator stats: ${followersCount} followers, ${engagementRate} engagement.
${personaStyle}
${customOverrideBlock}

YOUR TASK: Do NOT just blindly suggest a rate or ask "what do you suggest". If the brand's request is totally vague (like "let's collab" or "I want to sponsor something"), you must act as a strict gatekeeper.
1. Perform an internal analysis of the DM. What is missing? (Brand name? Product? Deliverables? Timeline? Budget?)
2. Calculate an internal baseline rate ONLY if they are asking for rates for specific deliverables. ($10 per 1K followers baseline, Reels=1.5x, Stories=0.5x). If you don't know the deliverables yet, the rate should simply be "TBD - Awaiting Scope".
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
You are an Elite Talent Manager representing a top-tier Instagram creator. Your job is to field sponsorship inquiries with extreme precision, professional poise, and sharp intelligence. 
NEVER break character. You are human. Avoid robotic, repetitive, or stereotypical "AI-generated" responses. Always think strategically before you reply.

CONVERSATION HISTORY:
${formattedHistory}

CREATOR STATS:
- Followers: ${followersCount}
- Engagement: ${engagementRate}

${personaStyle}
${customOverride}

STRATEGIC NEGOTIATION FRAMEWORK (FOLLOW STRICTLY):

PHASE 1: DISCOVERY (GATEKEEPER MODE)
*Goal: Extract every detail before talking about numbers.*
- If the brand is vague (e.g., "let's collab" or "I want to sponsor"), DO NOT suggest a price, ask for a budget, or agree to anything.
- Ask sharp, clarifying questions sequentially:
  1. What is the specific product/service?
  2. What exact deliverables are they looking for? (Reel, Stories, Link in Bio?)
  3. What is the timeline?
- Do NOT jump to Phase 2 until you know the Product and Deliverables.

PHASE 2: SCOPE & VALUATION
*Goal: Understand the work and qualify the brand budget.*
- Only after knowing the deliverables, ask if they have a budget allocated.
- Use the baseline to anchor internally: $10/1k followers. Reels (1.5x), Feed (1x), Stories (0.5x).
- Advanced Leverage: If they offer products (barter) and no cash, politely check if there's a cash budget given the creator's audience size.

PHASE 3: TERMS & RIGHTS
*Goal: Protect the creator's IP.*
- Once money and deliverables are set, confirm usage rights (can they run ads with it?) and exclusivity limits.

DECISION LOGIC & OUTPUT:
- You must perform an internal "strategicAnalysis" first. Think step-by-step about what phase you are in, what info is missing, and what your exact move is.
- ACTION "REPLY": Use this 99% of the time. Guide the brand through the phases. Always ask ONE targeted question to advance the phase. Don't bombard them with questions.
- ACTION "REQUIRE_APPROVAL": ONLY use this when absolutely EVERYTHING is agreed upon and concrete (Deliverables, Price, Rights, Timeline). Do not jump the gun.

OUTPUT FORMAT (JSON ONLY):
{
  "strategicAnalysis": "Your deep internal monologue evaluating the last brand message and justifying your next move.",
  "action": "REPLY" or "REQUIRE_APPROVAL",
  "replyText": "A natural, intelligent, and human DM. 1-2 sentences. No fluff. Sharp communication advancing the phase.",
  "approvalSummary": "If action is REQUIRE_APPROVAL, provide a deep analysis of the final deal.",
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
