const BioLink = require('../../model/BioLink');
const CreatorAsset = require('../../model/CreatorAsset');

// ==================== BIOLINK HANDLER ====================
// Handles: AI-powered BioLink creation, update, and listing via chat
// Zero dependency on other handlers — fully self-contained

// ── Default templates (used when AI creates a biolink) ──────────────
const DEFAULT_THEMES = {
    modern: { backgroundColor: '#0b1220', textColor: '#e5e7eb', accentColor: '#3b82f6', styleType: 'default' },
    minimal: { backgroundColor: '#0b1220', textColor: '#e5e7eb', accentColor: '#3b82f6', styleType: 'default' },
    glass: { backgroundColor: '#000000', textColor: '#ffffff', accentColor: 'rgba(51, 51, 51, 0.8)', styleType: 'glass' },
    creative: { backgroundColor: 'linear-gradient(180deg, #ff6b9d 0%, #4ecdc4 100%)', textColor: '#ffffff', accentColor: '#ffffff', styleType: 'perspective' },
    hydra: { backgroundColor: '#334639', textColor: '#e5e7eb', accentColor: '#d7d9d6', styleType: 'default' },
    cinematic: { backgroundColor: '#0b1724', textColor: '#e5e7eb', accentColor: '#3b82f6', styleType: 'default' }
};

const THEME_ALIASES = {
    'dark': 'minimal', 'clean': 'minimal', 'simple': 'minimal',
    'futuristic': 'glass', 'transparent': 'glass', 'glassmorphism': 'glass',
    '3d': 'creative', 'colorful': 'creative', 'gradient': 'creative',
    'poster': 'cinematic', 'movie': 'cinematic', 'film': 'cinematic',
    'nature': 'hydra', 'green': 'hydra', 'organic': 'hydra',
    'modern': 'modern', 'contemporary': 'modern', 'trendy': 'modern'
};

// ── Helper: resolve theme from user's style preference ──────────────
function resolveTheme(styleHint) {
    if (!styleHint) return 'modern';
    const lower = styleHint.toLowerCase().trim();
    if (DEFAULT_THEMES[lower]) return lower;
    for (const [alias, themeId] of Object.entries(THEME_ALIASES)) {
        if (lower.includes(alias)) return themeId;
    }
    return 'modern';
}

// ── Helper: resolve biolink user ID prefix ────────────────────────
async function resolveBiolinkUserId(userId) {
    try {
        const { Token } = require('../../model/Instaautomation');
        const instaToken = await Token.findOne({ userId }).lean();
        if (instaToken) return `insta_${userId}`;

        const YoutubeAutomation = require('../../model/YoutubeAutomation');
        const ytData = await YoutubeAutomation.findOne({ channelId: userId }).lean();
        if (ytData) return `yt_${userId}`;
    } catch {}
    return userId; // fallback
}

// ── Helper: detect social media links from connected platforms ──────
async function gatherSocialLinks(userId) {
    const links = [];

    try {
        // Check Instagram connection
        const { Token } = require('../../model/Instaautomation');
        const instaToken = await Token.findOne({ userId }).lean();
        if (instaToken && instaToken.userId) {
            // Try to get username from profile
            let igUsername = instaToken.userId;
            try {
                const axios = require('axios');
                const profileRes = await axios.get(`https://graph.instagram.com/v24.0/me`, {
                    params: { fields: 'username', access_token: instaToken.accessToken }
                });
                if (profileRes.data?.username) igUsername = profileRes.data.username;
            } catch { /* fallback to userId */ }

            links.push({
                id: `social_ig_${Date.now()}`,
                title: 'Instagram',
                url: `https://instagram.com/${igUsername}`,
                platform: 'instagram',
                icon: 'instagram',
                isActive: true,
                clickCount: 0
            });
        }
    } catch { /* Instagram not connected — skip */ }

    try {
        // Check YouTube connection
        const YoutubeAutomation = require('../../model/YoutubeAutomation');
        const ytData = await YoutubeAutomation.findOne({ channelId: userId }).lean();
        if (ytData && ytData.channelId) {
            links.push({
                id: `social_yt_${Date.now()}`,
                title: 'YouTube',
                url: `https://youtube.com/channel/${ytData.channelId}`,
                platform: 'youtube',
                icon: 'youtube',
                isActive: true,
                clickCount: 0
            });
        }
    } catch { /* YouTube not connected — skip */ }

    return links;
}

// ── Helper: gather creator's existing assets as biolink content ──────
async function gatherAssets(userId) {
    const assets = await CreatorAsset.find({ userId, isActive: true })
        .sort({ priority: -1, createdAt: -1 })
        .lean();

    const links = [];
    const products = [];

    for (const asset of assets) {
        if (['product', 'merch'].includes(asset.type)) {
            products.push({
                id: `prod_${asset._id}`,
                name: asset.title,
                description: asset.description || '',
                price: asset.price || '',
                image: asset.imageUrl || '',
                url: asset.url || '',
                category: asset.type
            });
        } else if (['link', 'course', 'ebook', 'service', 'affiliate_link'].includes(asset.type)) {
            const typeIcons = { link: 'link', course: 'book', ebook: 'book', service: 'briefcase', affiliate_link: 'tag' };
            links.push({
                id: `asset_${asset._id}`,
                title: asset.title,
                url: asset.url || '',
                platform: 'website',
                icon: typeIcons[asset.type] || 'link',
                isActive: true,
                clickCount: 0
            });
        }
    }

    return { links, products };
}

// ── Helper: get profile info ────────────────────────────────────────
async function getProfileInfo(userId) {
    const profile = { displayName: 'Creator', tagline: '', avatar: '' };

    try {
        const { Token } = require('../../model/Instaautomation');
        const instaToken = await Token.findOne({ userId }).lean();
        if (instaToken) {
            const axios = require('axios');
            const profileRes = await axios.get(`https://graph.instagram.com/v24.0/me`, {
                params: { fields: 'username,name,profile_picture_url', access_token: instaToken.accessToken }
            });
            if (profileRes.data) {
                profile.displayName = profileRes.data.name || profileRes.data.username || profile.displayName;
                profile.avatar = profileRes.data.profile_picture_url || '';
                profile.tagline = `@${profileRes.data.username || ''}`;
            }
        }
    } catch { /* fallback to defaults */ }

    return profile;
}

module.exports = {
    name: 'biolink',
    intents: ['create_biolink', 'update_biolink', 'list_biolinks'],

    async execute(intent, params, context) {
        const { userId } = context;

        try {
            const biolinkUserId = await resolveBiolinkUserId(userId);

            // ==================== CREATE BIOLINK ====================
            if (intent === 'create_biolink') {
                // 1. Resolve theme
                const themeId = resolveTheme(params.style || params.theme || params.look || '');
                const themeSettings = DEFAULT_THEMES[themeId] || DEFAULT_THEMES.modern;

                // 2. Gather social media links from connected platforms
                const socialLinks = await gatherSocialLinks(userId);

                // 3. Gather existing assets (courses, products, links)
                const { links: assetLinks, products } = await gatherAssets(userId);

                // 4. Get profile info
                const profile = await getProfileInfo(userId);

                // Apply user-provided overrides
                if (params.name || params.displayName) profile.displayName = params.name || params.displayName;
                if (params.tagline) profile.tagline = params.tagline;
                if (params.bio) profile.bio = params.bio;

                // 5. Combine all links (social first, then assets)
                const allLinks = [...socialLinks, ...assetLinks];

                // 6. Create the biolink
                const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
                const biolink = new BioLink({
                    userId: biolinkUserId,
                    username: `creator_${uniqueSuffix}`,
                    profile: {
                        displayName: profile.displayName,
                        tagline: profile.tagline || 'Creator • Content Maker',
                        bio: profile.bio || '',
                        avatar: profile.avatar || ''
                    },
                    links: allLinks,
                    products: products,
                    theme: themeId,
                    elements: [],
                    settings: {
                        backgroundColor: themeSettings.backgroundColor,
                        textColor: themeSettings.textColor,
                        accentColor: themeSettings.accentColor,
                        borderRadius: '12px',
                        spacing: '16px'
                    },
                    analytics: { views: 0, clicks: 0 },
                    isPublished: false
                });

                await biolink.save();

                // Build response summary
                const parts = [];
                if (socialLinks.length > 0) parts.push(`${socialLinks.length} social media link(s)`);
                if (assetLinks.length > 0) parts.push(`${assetLinks.length} asset link(s)`);
                if (products.length > 0) parts.push(`${products.length} product(s)`);
                const contentSummary = parts.length > 0 ? parts.join(', ') : 'empty canvas';

                return {
                    success: true,
                    message: `🎨 **BioLink created!** Theme: ${themeId}\n\nAuto-added: ${contentSummary}\n\n📝 Profile: ${profile.displayName}\n🔗 Edit it at /biolink (click BioLinks in sidebar)\n\n_Tip: You can publish it from the editor to get a shareable link!_`,
                    data: { biolinkId: biolink._id, theme: themeId, linkCount: allLinks.length, productCount: products.length }
                };
            }

            // ==================== UPDATE BIOLINK ====================
            if (intent === 'update_biolink') {
                // Find the most recent biolink for this user
                const biolink = await BioLink.findOne({ userId: biolinkUserId }).sort({ lastModified: -1, updatedAt: -1 });

                if (!biolink) {
                    return {
                        success: false,
                        message: 'You don\'t have any biolinks yet. Say "create a biolink" to get started!'
                    };
                }

                const updates = {};
                if (params.style || params.theme) {
                    const themeId = resolveTheme(params.style || params.theme);
                    updates.theme = themeId;
                    updates.settings = { ...biolink.settings.toObject?.() || biolink.settings, ...DEFAULT_THEMES[themeId] };
                }
                if (params.name || params.displayName) {
                    updates['profile.displayName'] = params.name || params.displayName;
                }
                if (params.tagline) updates['profile.tagline'] = params.tagline;
                if (params.bio) updates['profile.bio'] = params.bio;

                updates.lastModified = new Date();
                await BioLink.findByIdAndUpdate(biolink._id, { $set: updates });

                return {
                    success: true,
                    message: `✅ BioLink updated! ${Object.keys(updates).filter(k => k !== 'lastModified').map(k => `**${k}** changed`).join(', ')}`,
                    data: { biolinkId: biolink._id }
                };
            }

            // ==================== LIST BIOLINKS ====================
            if (intent === 'list_biolinks') {
                const biolinks = await BioLink.find({ userId: biolinkUserId })
                    .sort({ lastModified: -1, updatedAt: -1 })
                    .lean();

                if (biolinks.length === 0) {
                    return {
                        success: true,
                        message: 'You don\'t have any biolinks yet. Just say "create a biolink with modern look" and I\'ll set one up for you! 🎨',
                        data: { biolinks: [], count: 0 }
                    };
                }

                const list = biolinks.map((b, i) => {
                    const status = b.isPublished ? '🟢 Published' : '⚪ Draft';
                    const linkCount = (b.links || []).length;
                    const prodCount = (b.products || []).length;
                    return `${i + 1}. **${b.profile?.displayName || b.username}** (${b.theme}) — ${status}\n   🔗 ${linkCount} links, 📦 ${prodCount} products${b.isPublished ? ` | /p/${b.username}` : ''}`;
                }).join('\n\n');

                return {
                    success: true,
                    message: `You have **${biolinks.length}** biolink(s):\n\n${list}`,
                    data: { biolinks, count: biolinks.length }
                };
            }

            return { success: false, message: 'Unknown biolink action.' };
        } catch (error) {
            console.error('[Handler:biolink] Error:', error.message);
            return { success: false, message: `BioLink operation failed: ${error.message}` };
        }
    }
};
