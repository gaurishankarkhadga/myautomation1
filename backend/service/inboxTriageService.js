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
 * Uses organic conversation flow powered by Brain Memory (past won deals)
 * instead of rigid checklist satisfaction.
 */
async function continueAutonomousNegotiation(history, followersCount, engagementRate = '3%', creatorPersona = null, customInstructions = null, negotiationPreferences = null, pastWonDeals = []) {
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
        let rulesListForTracking = '';
        if (negotiationPreferences) {
            const rules = [];
            rules.push(`R1. Deliverable Type: Brand must request one of [${negotiationPreferences.acceptedDeliverables?.join(', ') || 'Any'}]`);
            rules.push(`R2. Min Cash: Budget must be at least $${negotiationPreferences.minimumCashTarget || '0'}`);
            rules.push(`R3. Max Ask: Creator's ideal ask is $${negotiationPreferences.maximumAskTarget || 'Open'}`);
            rules.push(`R4. Barter: ${negotiationPreferences.barterAcceptance === false ? 'Cash only — no barter deals' : 'Barter is acceptable'}`);
            rules.push(`R5. Payment Terms: ${negotiationPreferences.paymentTerms || 'Standard'}`);
            rules.push(`R6. Usage Rights: ${negotiationPreferences.usageRightsLimits || 'Standard'}`);
            rules.push(`R7. Exclusivity: ${negotiationPreferences.exclusivityLimits || 'Standard'}`);
            rules.push(`R8. Revisions: ${negotiationPreferences.revisionsIncluded || 'Standard'}`);
            rules.push(`R9. Delivery Timeline: ${negotiationPreferences.deliveryTimeline || 'Standard'}`);
            rules.push(`R10. Free Product: ${negotiationPreferences.requiredFreeProduct ? 'Brand must send free product' : 'Not required'}`);
            rules.push(`R11. Affiliate: ${negotiationPreferences.affiliateLinks ? 'Affiliate links allowed' : 'No commission-only deals'}`);
            rules.push(`R12. Blocked Industries: ${negotiationPreferences.blockedIndustries?.join(', ') || 'None'}`);
            rules.push(`R13. Contract: ${negotiationPreferences.contractSignOff || 'Flexible'}`);
            rules.push(`R14. Content Format: ${negotiationPreferences.contentFormat || 'Standard'}`);
            rules.push(`R15. Brief Requirement: ${negotiationPreferences.creativeBriefRequirement || 'Required'}`);
            
            rulesListForTracking = rules.map(r => `- ${r}`).join('\n');
            
            preferencesBlock = `
CREATOR'S 15 SPONSORSHIP RULES (YOUR SILENT INTERNAL CHECKLIST):
These are the creator's deal requirements. You must silently track which ones have been satisfied by the brand's messages.
DO NOT ask about these rules directly. DO NOT list them or mention them to the brand. They are YOUR internal compass.
${rulesListForTracking}`;
        }

        // Build Brain Memory block from past won deals
        let brainMemoryBlock = '';
        if (pastWonDeals.length > 0) {
            const memoryLines = pastWonDeals.map((d, i) => 
                `  Deal ${i+1}: Brand="${d.brandName || 'Unknown'}" | Rate=$${d.suggestedRate || '?'} | WinningText="${(d.generatedText || '').substring(0, 120)}..."`
            ).join('\n');
            brainMemoryBlock = `
BRAIN MEMORY — PAST SUCCESSFUL DEALS (internal pricing benchmark only):
${memoryLines}
Use these ONLY to judge if the brand's offer is fair. NEVER mention past deals to the brand.`;
        }

        const formattedHistory = history.map(h => `${h.role === 'user' ? 'Brand' : 'You'}: ${h.text}`).join('\n');

        const prompt = `
You are an Elite Talent Manager representing a top-tier Instagram creator. A brand has messaged the creator's Instagram DMs about a sponsorship. You are having a REAL, live conversation with them.

GOLDEN RULES:
1. Be NATURAL and HUMAN. You are a real person managing this inbox. Never ever sound like AI or a chatbot.
2. ONE question per message. Never overwhelm the brand.
3. Let the brand talk. They approached you. Listen first, respond to what THEY said.
4. If the brand is confused or speaks another language, simplify and keep the conversation alive.
5. NEVER pressure the brand. No urgency. Just a normal, chill chat.
6. Keep replies SHORT — 1-2 sentences max. Like a real DM.
7. SIMPLE ENGLISH ONLY. Use basic everyday words. No corporate jargon. No complex vocabulary. Write exactly how a normal person texts a friend.
8. FIRST PRIORITY: If the brand hasn't introduced themselves or their product yet, your FIRST reply must ask who they are and what they need. Keep it casual.
9. BANNED WORDS — NEVER use these words or phrases. They sound fake and AI-generated:
   "sounds good", "awesome", "great", "absolutely", "fantastic", "perfect", "wonderful", "amazing", "exciting", "thrilled", "delighted", "certainly", "of course", "I'd love to", "that's great to hear", "sounds like a plan", "let's make it happen", "I appreciate", "looking forward"
   Instead use normal human words like: "ok cool", "got it", "nice", "yeah that works", "sure", "no worries", "alright", "makes sense", "ok let me know"

CONVERSATION HISTORY (this conversation only):
${formattedHistory}

CREATOR STATS:
- Followers: ${followersCount}
- Engagement: ${engagementRate}

${personaStyle}
${customOverride}
${preferencesBlock}
${brainMemoryBlock}

YOUR BEHIND-THE-SCENES JOB:
You have a silent internal checklist (the Creator's 15 Sponsorship Rules above). As the brand talks, you silently scan their messages and mark which rules have been naturally satisfied.

HOW IT WORKS:
1. Read the ENTIRE conversation history carefully.
2. In your "strategicAnalysis", silently list which rules (R1, R2, R3... R15) are already satisfied based on what the brand has said so far. Mark them as DONE or PENDING.
3. CONVERSATION START: If the brand has NOT yet shared their brand name, product, or what they want — your ONLY job is to casually ask for those basic details. Do not jump ahead to budget, timeline, or anything else yet.
4. Find the NEXT most natural rule to satisfy. Do NOT go in order (R1, R2, R3...). Pick whichever rule naturally fits the flow of conversation.
5. Ask about that missing info casually — like a real person would. Example: "when are you looking to post this?" — NOT "What is your exact timeline?"
6. NEVER REPEAT THE SAME QUESTION. If you already asked about something (like script/brief) and the brand said "I'll send it later" or "I'll share it" — ACCEPT that answer, silently mark the rule as DONE (pending delivery), and MOVE ON to the next rule. Do NOT ask again. Keep the conversation going with other topics.
7. If a rule can be assumed from context (e.g., brand didn't mention exclusivity, so standard applies), silently mark it as DONE with your assumption.
8. Rules about blocked industries, affiliate links, contract sign-off, brief requirements — these are internal filters. If the brand violates one, politely decline. Otherwise, silently mark as DONE.

WHEN TO CLOSE THE DEAL:
- ONLY set action to "REQUIRE_APPROVAL" when ALL 15 rules are satisfied (either confirmed by brand or reasonably assumed) AND the brand's LAST message shows clear agreement (e.g., "yes", "ok", "let's do it", "agreed").
- If the brand's last message is a question, confusion, or anything other than agreement → action must be "REPLY". Keep chatting.
- NEVER close a deal prematurely. If even one critical rule (budget, deliverables, timeline) is still unknown, keep chatting.

OUTPUT FORMAT (JSON ONLY — no extra text):
{
  "strategicAnalysis": "Internal analysis: list each rule R1-R15 as DONE or PENDING with brief reason. Then state which rule you are targeting next.",
  "satisfiedRules": ["R1", "R4", "R12"],
  "pendingRules": ["R2", "R3", "R5", "R6", "R7", "R8", "R9", "R10", "R11", "R13", "R14", "R15"],
  "action": "REPLY" or "REQUIRE_APPROVAL",
  "replyText": "Your smooth, polite, human DM. 1-2 sentences max. Casual and warm.",
  "approvalSummary": "If REQUIRE_APPROVAL: Complete deal summary with all 15 rules and their satisfied values for the creator.",
  "brandName": "Extracted brand name or 'Unknown'",
  "deliverables": "What the brand wants (or 'TBD')",
  "suggestedRate": "Budget discussed (or 'TBD')"
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

/**
 * Generates a natural, human fan engagement reply when an audience member DMs.
 * This is the opposite of the negotiation engine — warm, helpful, creator-like.
 */
async function generateFanReply(messageText, priorityTag, creatorPersona = null, conversationHistory = []) {
    if (!messageText || !process.env.GEMINI_API_KEY) return null;

    try {
        let personaStyle = '';
        if (creatorPersona) {
            personaStyle = `
CREATOR PERSONA — YOU ARE THIS PERSON:
- Name: ${creatorPersona.name || 'The Creator'}
- Tone: ${creatorPersona.communicationStyle || 'casual and friendly'}
- Typing: ${creatorPersona.lowercasePreference ? 'lowercase only' : 'normal'}
- Emoji: ${creatorPersona.emojiUsage || 'moderate'}
- Vibe: ${(creatorPersona.toneKeywords || []).join(', ') || 'friendly, chill'}`;
        }

        const historyBlock = conversationHistory.length > 0
            ? `\nRECENT CHAT HISTORY:\n${conversationHistory.slice(-6).map(h => `${h.role === 'user' ? 'Fan' : 'You'}: ${h.text}`).join('\n')}`
            : '';

        const prompt = `
You are an Instagram creator replying to a fan/follower in your DMs. This is NOT a brand deal. This is a real person who follows you and messaged you.

${personaStyle}
${historyBlock}

MESSAGE TYPE: ${priorityTag}
FAN'S MESSAGE: "${messageText}"

RULES:
1. Reply as the CREATOR, not as a manager. Be warm, real, and personal.
2. Keep it SHORT — 1-2 sentences max. Like a real DM reply.
3. Use simple everyday language. No fancy words.
4. BANNED WORDS: "sounds good", "awesome", "great", "absolutely", "fantastic", "I appreciate", "looking forward". Use normal words instead.
5. If they ask for help with a product/course/link — be helpful and direct.
6. If it's fan mail / love — be grateful but casual. Not over-the-top.
7. If it's spam or weird — reply with something short and neutral, or just "👍".
8. Match the creator's exact vibe and typing style.
9. NEVER reveal you are AI. You ARE the creator.

Reply with ONLY the DM text. No JSON, no quotes, just the message.`;

        const result = await generateContentWithFallback(prompt);
        return result.response.text().trim().replace(/^["']|["']$/g, '');
    } catch (error) {
        console.error('[Fan Reply] Error generating fan reply:', error.message);
        return null;
    }
}

module.exports = {
    triageMessage,
    generateNegotiationDraft,
    continueAutonomousNegotiation,
    generateFinalAgreement,
    generateFanReply
};
