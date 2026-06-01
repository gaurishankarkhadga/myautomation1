/**
 * aiBiolinkService.js
 * AI-powered BioLink organizer. Analyzes existing assets + latest social media
 * content/trends to intelligently reorganize and prioritize the BioLink layout.
 * DOES NOT create new content — only optimizes existing assets.
 */

const CreatorAsset = require('../model/CreatorAsset');
const BioLink = require('../model/BioLink');
const { generateContentWithFallback } = require('./geminiClient');
const axios = require('axios');

const GRAPH_BASE = `${process.env.INSTAGRAM_GRAPH_API_BASE_URL || 'https://graph.instagram.com'}/v${process.env.INSTAGRAM_GRAPH_API_VERSION || '24.0'}`;

// ─── Theme settings map (MUST match BioLinkEditPanel.jsx themes array) ────────
// When AI recommends a theme, these settings are applied to biolink.settings
const THEME_SETTINGS_MAP = {
    glass:      { backgroundColor: '#000000',  textColor: '#ffffff', accentColor: 'rgba(51,51,51,0.8)',                              styleType: 'glass' },
    neon:       { backgroundColor: '#060010',  textColor: '#e0d4ff', accentColor: '#7c3aed',                                         styleType: 'glass' },
    dark:       { backgroundColor: '#0b1220',  textColor: '#e5e7eb', accentColor: '#3b82f6',                                         styleType: 'default' },
    aurora:     { backgroundColor: '#0d1117',  textColor: '#ffffff', accentColor: 'linear-gradient(135deg,#a855f7,#3b82f6)',         styleType: 'glass' },
    minimal:    { backgroundColor: '#0b1220',  textColor: '#e5e7eb', accentColor: '#3b82f6',                                         styleType: 'default' },
    hydra:      { backgroundColor: '#334639',  textColor: '#e5e7eb', accentColor: '#d7d9d6',                                         styleType: 'default' },
    cinematic:  { backgroundColor: '#0b1724',  textColor: '#e5e7eb', accentColor: '#3b82f6',                                         styleType: 'default' },
    modern:     { backgroundColor: '#111827',  textColor: '#ffffff', accentColor: 'rgba(255,255,255,0.1)',                            styleType: 'timeline' },
    creative:   { backgroundColor: 'linear-gradient(180deg,#ff6b9d 0%,#4ecdc4 100%)', textColor: '#ffffff', accentColor: '#ffffff',   styleType: 'perspective' },
};

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
 * Also applies the correct theme settings so the visual theme actually changes.
 *
 * @param {string} userId  - Creator's userId
 * @param {string} prompt  - Optional hint from the creator
 * @returns {{ success, organizedProducts, organizedLinks, themeRecommendation, tagline, summary }}
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
You are an expert creator economy strategist and BioLink conversion optimizer.

A creator has connected their BioLink page. Your job is to INTELLIGENTLY ORGANIZE their existing
assets based on current social media trends. DO NOT create or invent new products — only optimize what exists.

=== BIOLINK DATA STRUCTURE (how assets are saved) ===
- "product", "merch", "ebook", "service", "course" → shown in SHOP tab as product cards
- "link", "affiliate_link" → shown in LINKS tab as clickable rows with icons
- "text_template" → used as content blocks

=== CREATOR INSTRUCTION (if any) ===
${prompt || '(No specific instruction — use latest content to decide priorities)'}

=== LATEST SOCIAL MEDIA CONTENT (most recent first) ===
${recentContentSummary}

=== EXISTING ASSETS (ONLY organize these) ===
${JSON.stringify(assetSummary, null, 2)}

=== CURRENT STATE ===
- Active theme: ${currentTheme}
- Current tagline: "${currentTagline}"

=== YOUR TASKS ===
1. Identify what their audience is currently excited about from recent posts.
2. Order assets so the MOST RELEVANT ones appear first for maximum conversion.
3. Write a punchy tagline (max 55 chars) that matches their current content energy.
4. Pick the best visual theme from: glass, neon, dark, aurora, minimal, cinematic.
   - glass/aurora → creators with premium/luxury products
   - neon → gaming, tech, futuristic content creators
   - minimal/dark → clean minimal creators, coaches, educators
   - cinematic → filmmakers, storytellers, brand builders
5. Write a 2-sentence summary of what you organized and why.

Return ONLY this JSON object (no markdown, no code fences, no extra text):
{
  "organizedAssetOrder": [
    { "assetId": "exact_id_from_above", "reason": "why prioritized" }
  ],
  "tagline": "Short punchy tagline max 55 chars",
  "themeRecommendation": "glass",
  "summary": "2 sentences max 200 chars",
  "trendInsight": "Key trend from recent content driving these decisions"
}

RULES:
- organizedAssetOrder MUST only reference IDs from the assets list above — nothing invented
- Max 8 items in organizedAssetOrder
- Return ONLY valid JSON, nothing else
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

        // 7. Resolve full theme settings from theme ID (fixes Issue 1: theme not applying visually)
        const resolvedTheme = aiOutput.themeRecommendation || 'glass';
        const themeSettings = THEME_SETTINGS_MAP[resolvedTheme] || THEME_SETTINGS_MAP.glass;

        console.log(`[AI-BioLink] Organization complete. ${organizedProducts.length} products, ${organizedLinks.length} links. Theme: ${resolvedTheme}`);

        return {
            success: true,
            organizedProducts,
            organizedLinks,
            tagline: aiOutput.tagline || currentTagline,
            themeRecommendation: resolvedTheme,
            themeSettings,
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
