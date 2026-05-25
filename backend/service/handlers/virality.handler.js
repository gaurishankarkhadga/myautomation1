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

### ===SEARCH_QUERY===
Provide a single, highly optimized YouTube search query (max 5 words) that will find the absolute best, most viral shorts/reels from top competitors for this exact topic. Output ONLY the query string here.
`;

            // Run the LLM
            console.log(`[ViralityEngine] Executing multi-agent pipeline for ${userId} on topic: "${topic}"`);
            const result = await generateContentWithFallback(systemPrompt);
            const generatedContent = result.response.text();

            let carouselData = [];
            let displayMessage = generatedContent;
            let searchQuery = `${topic} ${niche} shorts`; // default fallback
            
            // Extract Search Query
            if (generatedContent.includes('===SEARCH_QUERY===')) {
                const parts = generatedContent.split('===SEARCH_QUERY===');
                displayMessage = parts[0].trim();
                searchQuery = parts[1].trim().replace(/['"]/g, '').split('\n')[0].trim();
            }

            // 4. Advanced Dynamic Competitor Video Fetching (YouTube API)
            try {
                if (process.env.Youtube_Api_Key) {
                    console.log(`[ViralityEngine] Fetching real competitor videos for query: "${searchQuery}"`);
                    const youtube = google.youtube({
                        version: 'v3',
                        auth: process.env.Youtube_Api_Key
                    });

                    // Fetch top viral shorts
                    const searchRes = await youtube.search.list({
                        part: 'snippet',
                        q: searchQuery,
                        maxResults: 5,
                        type: 'video',
                        order: 'viewCount', // Get the highest viewed videos
                        videoDuration: 'short' // Target YouTube Shorts / Reels equivalents
                    });

                    if (searchRes.data.items && searchRes.data.items.length > 0) {
                        const videoIds = searchRes.data.items.map(item => item.id.videoId);
                        
                        // Fetch actual view counts
                        const statsRes = await youtube.videos.list({
                            part: 'statistics',
                            id: videoIds.join(',')
                        });

                        carouselData = searchRes.data.items.map((item, index) => {
                            const stats = statsRes.data.items.find(s => s.id === item.id.videoId);
                            let viewCountStr = "Trending";
                            
                            if (stats && stats.statistics.viewCount) {
                                const views = parseInt(stats.statistics.viewCount);
                                if (views >= 1000000) viewCountStr = (views / 1000000).toFixed(1) + 'M';
                                else if (views >= 1000) viewCountStr = (views / 1000).toFixed(1) + 'K';
                                else viewCountStr = views.toString();
                            }
                            
                            return {
                                type: index < 3 ? "viral" : "related",
                                id: item.id.videoId,
                                title: item.snippet.title.replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
                                creator: '@' + item.snippet.channelTitle.replace(/\s+/g, ''),
                                views: viewCountStr,
                                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                                url: `https://www.youtube.com/watch?v=${item.id.videoId}`
                            };
                        });
                    }
                } else {
                    console.warn("[ViralityEngine] No Youtube_Api_Key found in .env, skipping real video fetch.");
                }
            } catch (ytError) {
                console.error('[ViralityEngine] YouTube API Fetch Error:', ytError.message);
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
