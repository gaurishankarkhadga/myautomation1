/**
 * aiBiolinkService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * AI-powered BioLink organizer. Analyzes a creator's existing assets and
 * their latest social media content/trends to intelligently reorganize and
 * prioritize their BioLink products, links, and layout — WITHOUT creating
 * anything new. The creator's data stays in control; AI just optimizes it.
 */

const CreatorAsset = require('../model/CreatorAsset');
const BioLink = require('../model/BioLink');
const { Token, YTToken } = require('../model/Instaautomation').default
    ? require('../model/Instaautomation').default
    : (() => {
        try { return require('../model/Instaautomation'); } catch { return {}; }
    })();
const { generateContentWithFallback } = require('./geminiClient');
const axios = require('axios');

const GRAPH_BASE = `${process.env.INSTAGRAM_GRAPH_API_BASE_URL || 'https://graph.instagram.com'}/v${process.env.INSTAGRAM_GRAPH_API_VERSION || '24.0'}`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function cleanJsonString(input) {
    if (!input) return '{}';
    let cleaned = input.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
    else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
    return cleaned.trim();
}

// ─── Fetch latest Instagram content for context ─────────────────────────────

async function fetchLatestInstagramContext(userId) {
    try {
        // Resolve the token model dynamically to avoid circular imports
        const InstaModel = require('../model/Instaautomation');
        const TokenModel = InstaModel.Token || InstaModel.default?.Token;
        if (!TokenModel) return null;

        const tokenDoc = await TokenModel.findOne({ userId });
        if (!tokenDoc?.accessToken) return null;

        const res = await axios.get(`${GRAPH_BASE}/${userId}/media`, {
            params: {
                fields: 'id,caption,media_type,timestamp,permalink',
                limit: 5,
                access_token: tokenDoc.accessToken,
            },
            timeout: 8000,
        });

        const posts = res.data?.data || [];
        return posts.map(p => ({
            type: p.media_type,
            caption: p.caption?.substring(0, 300) || '',
            timestamp: p.timestamp,
            permalink: p.permalink,
        }));
    } catch (err) {
        console.log(`[AI-BioLink] Could not fetch Instagram context: ${err.message}`);
        return null;
    }
}

// ─── Core AI Organizer ───────────────────────────────────────────────────────

/**
 * Analyzes creator assets + social media activity and returns an ordered,
 * prioritized arrangement for the BioLink products and links.
 *
 * @param {string} userId  - Creator's userId
 * @param {string} prompt  - Optional hint from the creator (e.g. "I just dropped a fitness ebook")
 * @returns {{ organizedProducts, organizedLinks, themeRecommendation, tagline, summary }}
 */
async function organizeBiolinkWithAI(userId, prompt = '') {
    console.log(`[AI-BioLink] Starting AI organization for userId: ${userId}`);

    // 1. Fetch all active creator assets
    const assets = await CreatorAsset.find({ userId, isActive: true }).lean();
    if (assets.length === 0) {
        return {
            success: false,
            message: 'No active assets found. Please add products or links in your Assets library first.',
        };
    }

    // 2. Fetch existing BioLink to understand current layout
    const existingBiolink = await BioLink.findOne({ userId }).lean();

    // 3. Fetch latest social media content for trend context
    const instagramPosts = await fetchLatestInstagramContext(userId);

    // 4. Build the AI prompt
    const assetSummary = assets.map((a, i) => ({
        index: i,
        id: a._id.toString(),
        type: a.type,
        title: a.title,
        description: a.description || '',
        price: a.price || '',
        tags: a.tags || [],
        isDefault: a.isDefault,
        priority: a.priority || 0,
    }));

    const recentContentSummary = instagramPosts
        ? instagramPosts.map(p => `[${p.type}] "${p.caption}"`).join('\n')
        : 'No social media content available for analysis.';

    const currentTheme = existingBiolink?.theme || 'glass';
    const currentTagline = existingBiolink?.profile?.tagline || '';

    const aiPrompt = `
You are an expert creator economy strategist and conversion optimizer.

A creator has connected their BioLink. Your job is to INTELLIGENTLY ORGANIZE their existing assets — 
DO NOT create or invent any new products. Only work with what they have.

=== CREATOR'S PROMPT (if any) ===
${prompt || '(No specific instruction given — use latest social media content to decide priorities)'}

=== THEIR LATEST SOCIAL MEDIA CONTENT (most recent first) ===
${recentContentSummary}

=== THEIR EXISTING ASSETS (these are the ONLY ones to organize) ===
${JSON.stringify(assetSummary, null, 2)}

=== CURRENT BIOLINK STATE ===
- Theme: ${currentTheme}
- Tagline: "${currentTagline}"

=== YOUR TASK ===
1. Analyze their latest content to identify WHAT their audience is currently excited about.
2. Prioritize assets that ALIGN with the current content trend or creator's prompt.
3. Suggest the ORDER of products/links for maximum click-through (most relevant = first).
4. Suggest a short, punchy tagline that reflects their current content momentum.
5. Recommend a theme: "glass", "neon", "dark", or "aurora" based on their niche.

Return ONLY this JSON (no markdown, no extra text):
{
  "organizedAssetOrder": [
    { "assetId": "the_exact_id_from_above", "reason": "why first" }
  ],
  "tagline": "Short punchy tagline based on current content trend",
  "themeRecommendation": "glass | neon | dark | aurora",
  "summary": "2-sentence explanation of what you did and why",
  "trendInsight": "What trend from their recent content drove these decisions"
}

CRITICAL RULES:
- organizedAssetOrder must ONLY contain IDs from the assets list above
- Keep organizedAssetOrder to a max of 8 items
- tagline must be under 60 characters
- summary must be under 200 characters
- Return ONLY the raw JSON object, no markdown fences
`;

    try {
        const result = await generateContentWithFallback(aiPrompt);
        const rawText = result.response.text();
        const cleaned = cleanJsonString(rawText);
        const aiOutput = JSON.parse(cleaned);

        // 5. Map organized asset IDs back to full asset objects
        const assetMap = Object.fromEntries(assets.map(a => [a._id.toString(), a]));
        const orderedAssets = (aiOutput.organizedAssetOrder || [])
            .map(item => assetMap[item.assetId])
            .filter(Boolean);

        // Fill in any assets not included by AI (append at end)
        const includedIds = new Set(orderedAssets.map(a => a._id.toString()));
        const remainingAssets = assets.filter(a => !includedIds.has(a._id.toString()));
        const finalAssets = [...orderedAssets, ...remainingAssets];

        // 6. Separate into products and links for BioLink schema compatibility
        const organizedProducts = finalAssets
            .filter(a => ['product', 'merch', 'ebook', 'service', 'course'].includes(a.type))
            .map(a => ({
                id: a._id.toString(),
                name: a.title,
                description: a.description,
                price: a.price,
                image: a.imageUrl || '',
                url: a.url || '',
                category: a.type,
            }));

        const organizedLinks = finalAssets
            .filter(a => ['link', 'affiliate_link', 'text_template'].includes(a.type))
            .map(a => ({
                id: a._id.toString(),
                title: a.title,
                url: a.url || '',
                platform: a.tags?.[0] || 'link',
                icon: 'platform',
                isActive: true,
                clickCount: 0,
            }));

        console.log(`[AI-BioLink] Organization complete. ${organizedProducts.length} products, ${organizedLinks.length} links ordered.`);

        return {
            success: true,
            organizedProducts,
            organizedLinks,
            tagline: aiOutput.tagline || currentTagline,
            themeRecommendation: aiOutput.themeRecommendation || 'glass',
            summary: aiOutput.summary || '',
            trendInsight: aiOutput.trendInsight || '',
        };

    } catch (err) {
        console.error('[AI-BioLink] AI organization failed:', err.message);
        // Graceful fallback — return assets in their current priority order
        const fallbackProducts = assets
            .filter(a => ['product', 'merch', 'ebook', 'service', 'course'].includes(a.type))
            .sort((a, b) => (b.priority || 0) - (a.priority || 0))
            .map(a => ({
                id: a._id.toString(),
                name: a.title,
                description: a.description,
                price: a.price,
                image: a.imageUrl || '',
                url: a.url || '',
                category: a.type,
            }));

        const fallbackLinks = assets
            .filter(a => ['link', 'affiliate_link', 'text_template'].includes(a.type))
            .sort((a, b) => (b.priority || 0) - (a.priority || 0))
            .map(a => ({
                id: a._id.toString(),
                title: a.title,
                url: a.url || '',
                platform: a.tags?.[0] || 'link',
                icon: 'platform',
                isActive: true,
                clickCount: 0,
            }));

        return {
            success: true,
            organizedProducts: fallbackProducts,
            organizedLinks: fallbackLinks,
            tagline: currentTagline,
            themeRecommendation: 'glass',
            summary: 'Organized by priority (AI unavailable).',
            trendInsight: '',
        };
    }
}

module.exports = { organizeBiolinkWithAI };
