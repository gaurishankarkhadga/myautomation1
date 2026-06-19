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

        const { YTToken } = require('../../model/YoutubeAutomation');
        const ytData = await YTToken.findOne({ channelId: userId }).lean();
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
                const profileRes = await axios.get(`https://graph.instagram.com/me`, {
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
        const { YTToken } = require('../../model/YoutubeAutomation');
        const ytData = await YTToken.findOne({ channelId: userId }).lean();
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
        if (['product', 'merch', 'course', 'ebook', 'service'].includes(asset.type)) {
            const rawUrl = (asset.url || '').trim();
            const normalizedUrl = rawUrl && !/^https?:\/\//i.test(rawUrl) ? `https://${rawUrl}` : rawUrl;
            products.push({
                id: `prod_${asset._id}`,
                name: asset.title,
                description: asset.description || '',
                price: asset.price || '',
                image: asset.imageUrl || '',
                url: normalizedUrl,
                category: asset.type
            });
        } else if (['link', 'affiliate_link'].includes(asset.type)) {
            if (!asset.url) continue; // skip links without a URL since it's required by linkSchema
            const rawUrl = asset.url.trim();
            const normalizedUrl = !/^https?:\/\//i.test(rawUrl) ? `https://${rawUrl}` : rawUrl;
            const typeIcons = { link: 'link', affiliate_link: 'tag' };
            links.push({
                id: `asset_${asset._id}`,
                title: asset.title,
                url: normalizedUrl,
                platform: 'website',
                icon: typeIcons[asset.type] || 'link',
                isActive: true,
                clickCount: 0
            });
        }
    }

    return { links, products };
}

// Helper: Download platform profile image to local uploads directory to prevent CDN expiration
async function downloadProfileImage(url, userId) {
    if (!url || !url.startsWith('http')) return url;
    try {
        const axios = require('axios');
        const path = require('path');
        const fs = require('fs');
        const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'biolinks');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const cleanUserId = userId.replace(/[^a-zA-Z0-9_]/g, '');
        const filename = `avatar-platform-${cleanUserId}.jpg`;
        const destPath = path.join(uploadsDir, filename);
        
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        
        const writer = fs.createWriteStream(destPath);
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        
        return `/uploads/biolinks/${filename}`;
    } catch (error) {
        console.error('[Avatar Sync] Failed to download profile image in handler:', error.message);
        return url; // fallback to original URL on failure
    }
}

// ── Helper: get profile info ────────────────────────────────────────
async function getProfileInfo(userId) {
    const profile = { displayName: 'Creator', tagline: '', avatar: '' };

    try {
        // 1. Check Instagram connection
        const { Token } = require('../../model/Instaautomation');
        const instaToken = await Token.findOne({ userId }).lean();
        if (instaToken) {
            const axios = require('axios');
            const profileRes = await axios.get(`https://graph.instagram.com/me`, {
                params: { fields: 'username,name,profile_picture_url', access_token: instaToken.accessToken }
            });
            if (profileRes.data) {
                profile.displayName = profileRes.data.name || profileRes.data.username || profile.displayName;
                profile.avatar = await downloadProfileImage(profileRes.data.profile_picture_url || '', `insta_${userId}`);
                profile.tagline = `@${profileRes.data.username || ''}`;
            }
            return profile;
        }

        // 2. Check YouTube connection
        const { YTToken } = require('../../model/YoutubeAutomation');
        const ytToken = await YTToken.findOne({ channelId: userId }).lean();
        if (ytToken) {
            profile.displayName = ytToken.channelTitle || profile.displayName;
            profile.tagline = ytToken.channelTitle ? `@${ytToken.channelTitle.replace(/\s+/g, '')}` : '';
            if (ytToken.accessToken) {
                try {
                    const youtubeService = require('../youtubeService');
                    const authClient = youtubeService.createAuthClient(
                        ytToken.accessToken,
                        ytToken.refreshToken,
                        ytToken.expiresAt
                    );
                    const channelInfo = await youtubeService.getChannelInfo(authClient);
                    if (channelInfo && channelInfo.thumbnailUrl) {
                        profile.avatar = await downloadProfileImage(channelInfo.thumbnailUrl, `yt_${userId}`);
                    }
                } catch (err) {
                    console.error('Error fetching YouTube channel avatar in getProfileInfo:', err.message);
                }
            }
            return profile;
        }
    } catch (err) {
        console.error('Error in getProfileInfo helper:', err.message);
    }

    return profile;
}


// ── Helper: sync active BioLink with latest CreatorAssets ────────────
async function syncBiolinkWithAssets(userId) {
    try {
        const biolinkUserId = await resolveBiolinkUserId(userId);
        const biolink = await BioLink.findOne({ userId: biolinkUserId }).sort({ lastModified: -1, updatedAt: -1 });
        
        if (!biolink) {
            return { success: false, message: 'No active BioLink found to sync.' };
        }

        const { links: assetLinks, products } = await gatherAssets(userId);

        // Keep only social/custom links (non-asset links) in biolink.links
        const existingSocialAndCustomLinks = (biolink.links || []).filter(link => !link.id || !link.id.startsWith('asset_'));

        // Combine them
        const updatedLinks = [...existingSocialAndCustomLinks, ...assetLinks];

        biolink.links = updatedLinks;
        biolink.products = products;
        biolink.lastModified = new Date();

        await biolink.save();
        return { success: true, biolink };
    } catch (err) {
        console.error('[syncBiolinkWithAssets] Failed:', err.message);
        return { success: false, message: err.message };
    }
}

module.exports = {
    name: 'biolink',
    intents: ['create_biolink', 'update_biolink', 'list_biolinks'],
    syncBiolinkWithAssets,

    async execute(intent, params, context) {
        const { userId } = context;

        try {
            const biolinkUserId = await resolveBiolinkUserId(userId);

            // ==================== CREATE BIOLINK ====================
            if (intent === 'create_biolink') {
                // Always create a new biolink — one creator can have unlimited biolinks

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
                        styleType: themeSettings.styleType || 'default',
                        borderRadius: '12px',
                        spacing: '16px',
                        layoutStyle: ['default', 'socialsTop', 'socialsBottom', 'socialsTopBottom'].includes(params.layoutStyle) ? params.layoutStyle : (params.layoutStyle ? 'socialsTop' : 'default')
                    },
                    
                    analytics: { views: 0, clicks: 0 },
                    isPublished: true,
                    publishedAt: new Date()
                });

                await biolink.save();

                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                const publicUrl = `${frontendUrl}/p/${biolink.username}`;

                // Build response summary
                const parts = [];
                if (socialLinks.length > 0) parts.push(`${socialLinks.length} social media link(s)`);
                if (assetLinks.length > 0) parts.push(`${assetLinks.length} asset link(s)`);
                if (products.length > 0) parts.push(`${products.length} product(s)`);
                const contentSummary = parts.length > 0 ? parts.join(', ') : 'empty canvas';

                return {
                    success: true,
                    message: `🎨 **BioLink created & Published!** Theme: ${themeId}\n\nAuto-added: ${contentSummary}\n📝 Profile: ${profile.displayName}\n\n🔗 **Your Live BioLink URL:**\n${publicUrl}\n\n_Tip: You can customize it further at /biolink (click BioLinks in sidebar)._`,
                    data: { biolinkId: biolink._id, theme: themeId, linkCount: allLinks.length, productCount: products.length, url: publicUrl }
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
                let settingsObj = biolink.settings ? (biolink.settings.toObject?.() || biolink.settings) : {};
                let settingsModified = false;

                if (params.style || params.theme) {
                    const themeId = resolveTheme(params.style || params.theme);
                    updates.theme = themeId;
                    settingsObj = { ...settingsObj, ...DEFAULT_THEMES[themeId] };
                    settingsModified = true;
                }
                if (params.layoutStyle) {
                    settingsObj.layoutStyle = ['default', 'socialsTop', 'socialsBottom', 'socialsTopBottom'].includes(params.layoutStyle) ? params.layoutStyle : 'socialsTop';
                    settingsModified = true;
                }
                if (settingsModified) {
                    updates.settings = settingsObj;
                }

                if (params.name || params.displayName) {
                    updates['profile.displayName'] = params.name || params.displayName;
                }
                if (params.tagline) updates['profile.tagline'] = params.tagline;
                if (params.bio) updates['profile.bio'] = params.bio;

                updates.lastModified = new Date();
                await BioLink.findByIdAndUpdate(biolink._id, { $set: updates });

                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                const publicUrl = `${frontendUrl}/p/${biolink.username}`;

                return {
                    success: true,
                    message: `✅ BioLink updated! ${Object.keys(updates).filter(k => k !== 'lastModified').map(k => `**${k}** changed`).join(', ')}`,
                    data: { biolinkId: biolink._id, url: publicUrl }
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

                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                const list = biolinks.map((b, i) => {
                    const status = b.isPublished ? '🟢 Published' : '⚪ Draft';
                    const linkCount = (b.links || []).length;
                    const prodCount = (b.products || []).length;
                    const publicUrl = `${frontendUrl}/p/${b.username}`;
                    return `${i + 1}. **${b.profile?.displayName || b.username}** (${b.theme}) — ${status}\n   🔗 ${linkCount} links, 📦 ${prodCount} products${b.isPublished ? `\n   🌐 ${publicUrl}` : ''}`;
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
            // Sanitized user-friendly error
            return { success: false, message: `I encountered a minor formatting issue while building the BioLink. Could you provide those details again?` };
        }
    }
};
