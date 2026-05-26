const { generateContentWithFallback } = require('../geminiClient');
const CreatorPersona = require('../../model/CreatorPersona');
const CreatorAsset = require('../../model/CreatorAsset');
const { google } = require('googleapis');

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

NICHE ADAPTATION PROTOCOL:
You must instantly adapt your entire writing style to fit the exact niche: "${niche}". 
- If Fitness: Use high-energy pacing, aggressive hooks, and physical demonstration B-roll cues.
- If Finance/Business: Use authoritative, data-driven pacing with chart/text-on-screen cues.
- If Vlog/Lifestyle: Use conversational storytelling, fast-cuts, and behind-the-scenes intimacy.
- If Comedy/Entertainment: Focus on setup-punchline timing and relatable scenarios.

TASK:
The creator wants to make a short-form video (YouTube Short/TikTok) about: "${topic}".
You must output a highly engineered Master Blueprint in pristine Markdown formatting.

REQUIRED ARCHITECTURE OF YOUR RESPONSE (Strict Format):

### 🔍 Deep Competitor Analysis & Gap
*(Act as the Elite Competitor Analyst)*
Provide a ruthless, data-driven analysis of what generic creators in the "${niche}" space are doing wrong for this topic. 
Identify the exact "psychological gap" we will exploit. Provide a 95% certainty thesis on why this specific angle will achieve virality for this specific niche.

### 🎣 The Hook Matrix
*(Act as the Hook Scientist)*
Provide 3 highly distinct, pattern-interrupting hooks tailored specifically to the "${niche}" audience. 
1. **The Negative Hook:** (e.g., "Stop doing X...")
2. **The Curiosity Gap:** (e.g., "The secret nobody tells you about...")
3. **The Direct Flex:** (e.g., "How I achieved X without Y...")

### ⏱️ The Viral Timeline (Master Script)
*(Act as the $10,000/mo Short-Form Scriptwriter)*
Write the ultimate 15-30 second script body. Do NOT write like a chatbot. Write exactly what the creator must say, broken down by exact timestamps. Include bracketed visual/B-roll cues tailored to the niche.
- \`[0:00 - 0:03]\` THE HOOK: [Visual: ...] (Insert the best spoken hook here)
- \`[0:03 - 0:08]\` THE AGITATION: [Visual: ...] (Twist the knife, make the problem hurt)
- \`[0:08 - 0:15]\` THE PAYOFF: [Visual: ...] (Deliver the core value/solution rapidly)
- \`[0:15 - 0:20]\` THE CLOSER: [Visual: ...] (The CTA to comment for the asset)

### 💰 The Automation Closer
*(Act as the CTA Closer)*
Explicitly state the Call-To-Action. The CTA MUST ask the viewer to COMMENT a specific keyword so our Comment-To-DM bot can instantly send them the link to the asset.

### ===SEARCH_QUERY===
Provide a short, highly optimized search query (2-4 words) that will find the absolute best, most viral YouTube Shorts from competitors for this exact topic. Output ONLY the query here.

### ===CAROUSEL_DATA===
Finally, you MUST output exactly 5 JSON objects in a strictly valid JSON array representing highly realistic reference videos for the creator. This acts as a robust fallback.
- Ensure the first 3 have "type": "viral" (top competitor videos).
- Ensure the last 2 have "type": "related" (related trending ideas for the creator).
- Use this JSON format:
[
  { "type": "viral", "id": "v1", "title": "5 Hooks to try...", "creator": "@topcompetitor", "views": "2.4M", "thumbnail": "gradient", "url": "" },
  { "type": "related", "id": "r1", "title": "My take on...", "creator": "@yourname", "views": "Trending", "thumbnail": "gradient", "url": "" }
]
Output NOTHING after the JSON array.
`;

            // Run the LLM
            console.log(`[ViralityEngine] Executing multi-agent pipeline for ${userId} on topic: "${topic}"`);
            const result = await generateContentWithFallback(systemPrompt);
            const generatedContent = result.response.text();

            let carouselData = [];
            let displayMessage = generatedContent;
            let searchQuery = niche.replace(/\s+/g, ' ').toLowerCase(); // default fallback
            
            // 1. Extract Search Query if present
            if (generatedContent.includes('===SEARCH_QUERY===')) {
                const parts = generatedContent.split('===SEARCH_QUERY===');
                displayMessage = parts[0].trim(); // Cut off everything after SEARCH_QUERY
                const queryPart = parts[1].split('===CAROUSEL_DATA===')[0];
                searchQuery = queryPart.trim().replace(/['">]/g, '').split('\n')[0].trim();
            } else if (generatedContent.includes('===CAROUSEL_DATA===')) {
                // If it missed SEARCH_QUERY but has CAROUSEL_DATA, cut off at CAROUSEL_DATA
                displayMessage = generatedContent.split('===CAROUSEL_DATA===')[0].trim();
            }

            // 2. Aggressive JSON stripping: If the AI leaked a raw JSON array into the display message, remove it.
            // This regex finds a large JSON array block at the end of the text.
            displayMessage = displayMessage.replace(/\[\s*\{\s*"type"\s*:\s*"(?:viral|related)"[\s\S]*?\]\s*$/, '').trim();
            // Also strip out any stray "Output NOTHING after the JSON array" text
            displayMessage = displayMessage.replace(/Output NOTHING after the JSON array\.?/i, '').trim();

            // Function to parse the AI fallback JSON
            const applyFallbackData = () => {
                console.log("[ViralityEngine] Applying AI fallback carousel data due to YouTube API absence/failure.");
                try {
                    const arrayMatch = generatedContent.match(/\[\s*\{\s*"type"\s*:\s*"(?:viral|related)"[\s\S]*?\]/);
                    if (arrayMatch) {
                        carouselData = JSON.parse(arrayMatch[0]);
                    } else if (generatedContent.includes('===CAROUSEL_DATA===')) {
                        const jsonMatch = generatedContent.split('===CAROUSEL_DATA===')[1].match(/\[[\s\S]*\]/);
                        if (jsonMatch) carouselData = JSON.parse(jsonMatch[0]);
                    }
                } catch (err) {
                    console.error('[ViralityEngine] AI JSON fallback parse failed', err.message);
                }
            };

            // 4. Advanced Dynamic Competitor Video Fetching (YouTube Data API)
            try {
                if (process.env.Youtube_Api_Key) {
                    console.log(`[ViralityEngine] Fetching real YouTube Shorts via API for query: "${searchQuery}"`);
                    
                    const youtube = google.youtube({
                        version: 'v3',
                        auth: process.env.Youtube_Api_Key
                    });

                    // Search for videos
                    const searchRes = await youtube.search.list({
                        part: 'snippet',
                        q: searchQuery + " #shorts", // Force shorts
                        type: 'video',
                        maxResults: 5,
                        order: 'viewCount', // Get most viral
                        videoDuration: 'short' // Strict vertical/short length
                    });

                    if (searchRes.data.items && searchRes.data.items.length > 0) {
                        const videoIds = searchRes.data.items.map(item => item.id.videoId).join(',');
                        
                        // Get video stats (views)
                        const statsRes = await youtube.videos.list({
                            part: 'statistics',
                            id: videoIds
                        });

                        const statsMap = {};
                        statsRes.data.items.forEach(item => {
                            statsMap[item.id] = item.statistics.viewCount;
                        });

                        carouselData = searchRes.data.items.map((item, index) => {
                            let viewsStr = "Trending";
                            if (statsMap[item.id.videoId]) {
                                const views = parseInt(statsMap[item.id.videoId]);
                                if (views >= 1000000) viewsStr = (views / 1000000).toFixed(1) + 'M';
                                else if (views >= 1000) viewsStr = (views / 1000).toFixed(1) + 'K';
                                else viewsStr = views.toString();
                            }

                            const cleanTitle = item.snippet.title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").split('|')[0].trim();
                            
                            return {
                                type: index < 3 ? "viral" : "related",
                                id: item.id.videoId,
                                title: cleanTitle.length > 50 ? cleanTitle.substring(0, 50) + '...' : cleanTitle,
                                creator: '@' + item.snippet.channelTitle.replace(/\s+/g, ''),
                                views: viewsStr,
                                thumbnail: item.snippet.thumbnails.high.url,
                                url: `https://www.youtube.com/watch?v=${item.id.videoId}` // The real URL for the modal
                            };
                        });
                        
                        if (carouselData.length === 0) applyFallbackData();
                    } else {
                        console.log(`[ViralityEngine] No YouTube results found for "${searchQuery}". Executing fallback.`);
                        applyFallbackData();
                    }
                } else {
                    console.warn("[ViralityEngine] Missing Youtube_Api_Key in .env. Executing AI fallback.");
                    applyFallbackData();
                }
            } catch (apiError) {
                console.error('[ViralityEngine] YouTube API Fetch Error:', apiError.message);
                applyFallbackData();
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
            
            let errorMessage = `I encountered an error while spinning up the Virality Engine: ${error.message}`;
            
            // Specifically detect if the Gemini API failed due to quota/credits ending
            const errStr = error.message.toLowerCase();
            if (errStr.includes('exhausted') || errStr.includes('429') || errStr.includes('quota') || errStr.includes('too many requests')) {
                errorMessage = "⚠️ **Gemini Credits Ended**\n\nYour Gemini API credits have been exhausted or you have hit a strict rate limit across all keys. Please check your Google AI Studio quota or add a new API key to continue generating viral scripts.";
            }

            return {
                success: false,
                message: errorMessage
            };
        }
    }
};
