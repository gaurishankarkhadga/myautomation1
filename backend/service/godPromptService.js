const { generateContentWithFallback } = require('./geminiClient');
const { parseCleanReply } = require('./aiService');
const { CreatorPersona, DmAutoReplySetting, CreatorAsset } = require('../model/Instaautomation');

/**
 * Parses a single "God Prompt" from a creator and automatically extracts and seeds
 * their entire backend configuration (Persona, Business Rules, Assets).
 */
async function processGodPrompt(userId, promptText) {
    if (!promptText || !process.env.GEMINI_API_KEY) {
        throw new Error("Missing prompt text or Gemini API key");
    }

    try {
        console.log(`[GodPrompt] Processing master prompt for user ${userId}...`);

        const systemPrompt = `
You are the Sotix Setup Engine. A creator has provided a single paragraph describing their entire business model, tone, and product.
Your job is to extract this unstructured text into a highly structured JSON configuration.

CREATOR'S PROMPT:
"${promptText}"

Extract and infer the following:
1. PERSONA: Their name (if mentioned), their tone (casual, formal, hype), if they prefer lowercase, emoji usage, and 3 vibe keywords.
2. NEGOTIATION RULES: Their minimum cash target for brand deals, if they accept barter, blocked industries, etc. If not mentioned, infer reasonable defaults based on their niche.
3. ASSET: The product they are selling, the price, the link, and a short description to pitch it to fans.

Return ONLY a valid JSON object exactly matching this structure. No markdown wrappers, no backticks.
{
  "persona": {
    "name": "string or null",
    "communicationStyle": "string (e.g., casual, hype, professional)",
    "lowercasePreference": boolean,
    "emojiUsage": "string (e.g., moderate, heavy, none)",
    "toneKeywords": ["keyword1", "keyword2"]
  },
  "businessRules": {
    "minimumCashTarget": number or null,
    "barterAcceptance": boolean,
    "blockedIndustries": ["industry1"],
    "acceptedDeliverables": ["Reels", "Stories"]
  },
  "asset": {
    "title": "string",
    "price": "string (e.g., $150)",
    "url": "string (valid URL format)",
    "description": "string"
  }
}
`;

        const result = await generateContentWithFallback(systemPrompt);
        let rawResponse = result.response.text();
        let jsonText = parseCleanReply(rawResponse);
        
        // Failsafe JSON cleanup
        if (jsonText.startsWith('```json')) jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '');
        else if (jsonText.startsWith('```')) jsonText = jsonText.replace(/^```/, '').replace(/```$/, '');

        const config = JSON.parse(jsonText.trim());

        // 1. Seed CreatorPersona
        if (config.persona) {
            await CreatorPersona.findOneAndUpdate(
                { userId },
                {
                    userId,
                    name: config.persona.name || '',
                    communicationStyle: config.persona.communicationStyle || 'casual',
                    lowercasePreference: config.persona.lowercasePreference || false,
                    emojiUsage: config.persona.emojiUsage || 'moderate',
                    toneKeywords: config.persona.toneKeywords || []
                },
                { upsert: true, new: true }
            );
        }

        // 2. Seed DmAutoReplySetting (Negotiation Matrix)
        if (config.businessRules) {
            const currentSetting = await DmAutoReplySetting.findOne({ userId }) || new DmAutoReplySetting({ userId });
            if (!currentSetting.negotiationPreferences) currentSetting.negotiationPreferences = {};
            
            if (config.businessRules.minimumCashTarget) currentSetting.negotiationPreferences.minimumCashTarget = config.businessRules.minimumCashTarget;
            if (config.businessRules.barterAcceptance !== undefined) currentSetting.negotiationPreferences.barterAcceptance = config.businessRules.barterAcceptance;
            if (config.businessRules.blockedIndustries?.length) currentSetting.negotiationPreferences.blockedIndustries = config.businessRules.blockedIndustries;
            if (config.businessRules.acceptedDeliverables?.length) currentSetting.negotiationPreferences.acceptedDeliverables = config.businessRules.acceptedDeliverables;
            
            currentSetting.autonomousMode = true; // Turn it on!
            currentSetting.inboxTriageEnabled = true; // Required for the engine
            
            await currentSetting.save();
        }

        // 3. Seed CreatorAsset
        if (config.asset && config.asset.title && config.asset.url) {
            await CreatorAsset.findOneAndUpdate(
                { userId, url: config.asset.url },
                {
                    userId,
                    title: config.asset.title,
                    price: config.asset.price || 'Free',
                    url: config.asset.url,
                    description: config.asset.description || '',
                    status: 'active'
                },
                { upsert: true, new: true }
            );
        }

        console.log(`[GodPrompt] Successfully configured backend for user ${userId}`);
        return { success: true, config };

    } catch (error) {
        console.error('[GodPrompt] Error processing God Prompt:', error.message);
        throw error;
    }
}

module.exports = {
    processGodPrompt
};
