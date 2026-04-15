const { generateContentWithFallback } = require('../geminiClient');
const CreatorPersona = require('../../model/CreatorPersona');
const CreatorAsset = require('../../model/CreatorAsset');

// ==================== VIRALITY ENGINE HANDLER ====================
// Handles: Multi-agent generation of heavily researched viral scripts & hooks
// utilizing competitor analysis and the creator's exact assets.

module.exports = {
    name: 'viralityEngine',
    intents: ['generate_viral_script'],

    async execute(intent, params, context) {
        const { userId } = context;
        let topic = params.topic || "a trending topic in my niche";

        try {
            // 1. Fetch Creator Context
            const persona = await CreatorPersona.findOne({ userId });
            const niche = persona?.niche || "Content Creation";
            const tone = persona?.toneOfVoice || "casual and authentic";
            
            // 2. Fetch Creator Assets (The core differentiator "Context-aware Selling")
            const assets = await CreatorAsset.find({ userId, isActive: true })
                .sort({ priority: -1, createdAt: -1 })
                .lean();
                
            let assetContext = "The creator has no specific products hooked up yet. Focus on building general engagement.";
            if (assets && assets.length > 0) {
                const assetListStr = assets.slice(0, 5).map(a => 
                    `- [${a.type.toUpperCase()}] ${a.title} ($${a.price || 'Free'}) - ${a.description || ''} (URL: ${a.url})`
                ).join('\n');
                assetContext = `The creator has specific digital assets available to sell. \nYour ultimate goal is to generate a script that naturally funnels viewers into wanting one of these assets, driving a 'Comment-To-DM' trigger.\n\nAVAILABLE ASSETS:\n${assetListStr}`;
            }

            // 3. Multi-Agent System Prompt Execution
            const systemPrompt = `
You are the Ultimate Multi-Agent Virality Engine for Sotix. You possess the combined intelligence of an elite Competitor Analyst, a Viral Hook Scientist, and a Retention Conversion Engineer. 

CREATOR PROFILE:
- Niche: ${niche}
- Tone: ${tone}

CREATOR'S ASSETS (The Funnel Trap):
${assetContext}

TASK:
The creator wants to make a short-form video (Reel/TikTok/Short) about: "${topic}".
You must output a highly engineered Master Blueprint in pristine Markdown formatting.

REQUIRED ARCHITECTURE OF YOUR RESPONSE (Strict Format):

### 🔍 Competitor Analysis & Gap
*(Act as the Competitor Analyst)*
Summarize in 2-3 bullet points what generic creators in the "${niche}" space are doing wrong for this topic, and identify the exact "psychological gap" we will exploit to stand out.

### 🎣 The Hook Matrix
*(Act as the Hook Scientist)*
Provide 3 highly distinct, pattern-interrupting hooks (0-3 seconds). 
1. **The Negative Hook:** (e.g., "Stop doing X...")
2. **The Curiosity Gap:** (e.g., "The secret nobody tells you about...")
3. **The Direct Flex:** (e.g., "How I achieved X without Y...")

### 📜 The Master Script
*(Act as the Retention Engineer)*
Write the ultimate 15-30 second script body.
Use the Problem -> Agitate -> Solution framework. 
Use extremely punchy sentences (under 10 words). Write exactly what they must say.

### 💰 The Automation Closer
*(Act as the CTA Closer)*
Write a final 5-second Call-To-Action explicitly designed to sell the creator's best matching asset listed above (or generic engagement if no assets exist). The CTA MUST ask the viewer to COMMENT a specific keyword so our Comment-To-DM bot can instantly send them the link to the asset.

### ===CAROUSEL_DATA===
Finally, you MUST output exactly 5 JSON objects in a strictly valid JSON array representing reference videos for the creator.
- Ensure the first 3 have "type": "viral" (top competitor videos).
- Ensure the last 2 have "type": "related" (related trending ideas for the creator).
- Use this JSON format:
[
  { "type": "viral", "id": "v1", "title": "5 Hooks to try...", "creator": "@topcompetitor", "views": "2.4M", "thumbnail": "gradient" },
  { "type": "related", "id": "r1", "title": "My take on...", "creator": "@yourname", "views": "Trending", "thumbnail": "gradient" }
]
Output NOTHING after the JSON array.
`;

            // Run the LLM
            console.log(`[ViralityEngine] Executing multi-agent pipeline for ${userId} on topic: "${topic}"`);
            const result = await generateContentWithFallback(systemPrompt);
            const generatedContent = result.response.text();

            // Parse out the JSON data if it exists
            let carouselData = [];
            let displayMessage = generatedContent;
            
            if (generatedContent.includes('===CAROUSEL_DATA===')) {
                const parts = generatedContent.split('===CAROUSEL_DATA===');
                displayMessage = parts[0].trim();
                try {
                    // Extract anything that looks like a JSON array from the second part
                    const jsonMatch = parts[1].match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        carouselData = JSON.parse(jsonMatch[0]);
                    }
                } catch (err) {
                    console.error('[ViralityEngine] Failed to parse carousel JSON', err.message);
                }
            }

            return {
                success: true,
                message: displayMessage || "I've analyzed your niche and prepared a viral blueprint below.",
                data: {
                    niche_analyzed: niche,
                    assets_injected: assets.length,
                    carousel: carouselData
                }
            };

        } catch (error) {
            console.error('[Handler:viralityEngine] Error:', error.message);
            return { 
                success: false, 
                message: `I encountered an error while spinning up the Virality Engine: ${error.message}` 
            };
        }
    }
};
