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

        const result = await generateContentWithFallback(prompt, 'gemini-1.5-flash');
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
async function generateNegotiationDraft(messageText, followersCount, engagementRate = '3%') {
    if (!messageText || !process.env.GEMINI_API_KEY) return null;

    try {
        const prompt = `
            You are an expert Talent Manager for an Instagram creator.
            Read this incoming brand deal / sponsorship inquiry via DM:
            "${messageText}"

            The creator you represent has ${followersCount} followers and a ${engagementRate} engagement rate.

            Do the following:
            1. Extract the brand name (or agency name). If unknown, guess based on context or return "Unknown Brand".
            2. Calculate a "Suggested Rate". A standard baseline is $10 per 1,000 followers per post, but adjust slightly based on the request (Reels cost more than Stories).
            3. Draft a professional, polite response setting boundaries, thanking them, and smoothly dropping the suggested rate or asking for their budget first. Do not use placeholders like [Your Name]. Sign off natively.

            Return ONLY a valid JSON object:
            {
                "brandName": "Extracted Brand",
                "suggestedRate": "$1,500 (1 Reel + 1 Story)",
                "draftReply": "The actual text they can send back."
            }
        `;

        const result = await generateContentWithFallback(prompt, 'gemini-1.5-flash');
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

module.exports = {
    triageMessage,
    generateNegotiationDraft
};
