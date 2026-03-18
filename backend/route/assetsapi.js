const express = require('express');
const router = express.Router();
const CreatorAsset = require('../model/CreatorAsset');

// ==================== ASSETS REST API ====================
// Standalone CRUD routes for the Assets Sidebar panel
// Separate from chat handler — used for direct UI interactions

// ── Default premade text templates ──────────────────────────────────
const DEFAULT_TEMPLATES = [
    { category: 'bio', title: '🎨 Creator Bio', description: '🎨 Creator • Content Maker • Follow for more!', type: 'text_template' },
    { category: 'bio', title: '✨ Minimalist Bio', description: 'Creating things that matter.', type: 'text_template' },
    { category: 'bio', title: '🚀 Growth Bio', description: 'Building in public • Sharing what I learn • Join the journey 🚀', type: 'text_template' },
    { category: 'cta', title: '🔥 Course CTA', description: '🔥 Check out my latest course →', type: 'text_template' },
    { category: 'cta', title: '🛍️ Shop CTA', description: '🛍️ Shop my favorites →', type: 'text_template' },
    { category: 'cta', title: '💼 Collab CTA', description: '💼 Open for collaborations! DM me →', type: 'text_template' },
    { category: 'cta', title: '📩 Newsletter CTA', description: '📩 Join my newsletter for exclusive content →', type: 'text_template' },
    { category: 'dm_reply', title: '🙏 Thank You', description: 'Thanks for reaching out! I\'ll get back to you soon 🙏', type: 'text_template' },
    { category: 'dm_reply', title: '🔗 Link Share', description: 'Hey! Here\'s the link you asked for: {url}', type: 'text_template' },
    { category: 'dm_reply', title: '⏰ Busy Reply', description: 'Hey! I\'m a bit busy right now but will reply soon. Thanks for your patience! ⏰', type: 'text_template' },
    { category: 'social', title: '👇 Follow Prompt', description: 'Follow me on all platforms 👇', type: 'text_template' },
    { category: 'social', title: '🔔 Subscribe Prompt', description: 'Subscribe & turn on notifications for more content 🔔', type: 'text_template' }
];

// ── GET /api/assets/templates/default — Get default premade templates ─
// MUST be before /:userId to avoid matching 'templates' as a userId
router.get('/templates/default', async (req, res) => {
    try {
        res.json({ success: true, templates: DEFAULT_TEMPLATES });
    } catch (error) {
        console.error('[AssetsAPI] Error fetching templates:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch templates' });
    }
});

// ── GET /api/assets/:userId — List all assets ───────────────────────
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { type, activeOnly } = req.query;

        const filter = { userId };
        if (type) filter.type = type;
        if (activeOnly === 'true') filter.isActive = true;

        const assets = await CreatorAsset.find(filter)
            .sort({ type: 1, priority: -1, createdAt: -1 })
            .lean();

        // Group by type for sidebar display
        const grouped = {};
        for (const asset of assets) {
            if (!grouped[asset.type]) grouped[asset.type] = [];
            grouped[asset.type].push(asset);
        }

        res.json({ success: true, assets, grouped, count: assets.length });
    } catch (error) {
        console.error('[AssetsAPI] Error listing assets:', error.message);
        res.status(500).json({ success: false, error: 'Failed to list assets' });
    }
});

// ── POST /api/assets — Create asset ─────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const { userId, type, title, description, url, imageUrl, price, tags, affiliateCode, category, isDefault, priority } = req.body;

        if (!userId || !title) {
            return res.status(400).json({ success: false, error: 'userId and title are required' });
        }

        const asset = await CreatorAsset.create({
            userId,
            type: type || 'link',
            title: title.trim(),
            description: description || '',
            url: url || '',
            imageUrl: imageUrl || '',
            price: price || '',
            tags: tags || [],
            affiliateCode: affiliateCode || '',
            category: category || '',
            isDefault: isDefault || false,
            priority: priority || 0,
            isActive: true
        });

        res.json({ success: true, asset });
    } catch (error) {
        console.error('[AssetsAPI] Error creating asset:', error.message);
        res.status(500).json({ success: false, error: 'Failed to create asset' });
    }
});

// ── PUT /api/assets/:id — Update asset ──────────────────────────────
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated directly
        delete updates._id;
        delete updates.createdAt;

        const asset = await CreatorAsset.findByIdAndUpdate(
            id,
            { $set: { ...updates, updatedAt: new Date() } },
            { new: true }
        );

        if (!asset) {
            return res.status(404).json({ success: false, error: 'Asset not found' });
        }

        res.json({ success: true, asset });
    } catch (error) {
        console.error('[AssetsAPI] Error updating asset:', error.message);
        res.status(500).json({ success: false, error: 'Failed to update asset' });
    }
});

// ── DELETE /api/assets/:id — Delete asset ───────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await CreatorAsset.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({ success: false, error: 'Asset not found' });
        }

        res.json({ success: true, deletedId: id });
    } catch (error) {
        console.error('[AssetsAPI] Error deleting asset:', error.message);
        res.status(500).json({ success: false, error: 'Failed to delete asset' });
    }
});

// ── PATCH /api/assets/:id/toggle — Toggle active/inactive ───────────
router.patch('/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await CreatorAsset.findById(id);

        if (!asset) {
            return res.status(404).json({ success: false, error: 'Asset not found' });
        }

        asset.isActive = !asset.isActive;
        await asset.save();

        res.json({ success: true, asset, isActive: asset.isActive });
    } catch (error) {
        console.error('[AssetsAPI] Error toggling asset:', error.message);
        res.status(500).json({ success: false, error: 'Failed to toggle asset' });
    }
});

console.log('[Assets] Router initialized');
module.exports = router;

