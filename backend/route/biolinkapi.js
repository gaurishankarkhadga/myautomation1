const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Load model from model dir
const BioLink = require('../model/BioLink');

// ─── Multer setup ───────────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'biolinks');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Only image files are allowed'));
  }
});

const mediaUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/'))
      ? cb(null, true) : cb(new Error('Only image and video files are allowed'));
  }
});

const galleryUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 50 },
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Only image files are allowed'));
  }
});

// Auth middleware — reads platform headers and sets req.userId
const authenticateToken = (req, res, next) => {
  const instaUserId = req.headers['x-insta-userid'];
  const ytChannelId = req.headers['x-yt-channelid'];

  if (instaUserId) {
    req.userId = `insta_${instaUserId}`;
  } else if (ytChannelId) {
    req.userId = `yt_${ytChannelId}`;
  } else {
    req.userId = null; // Allow through for flexible open access
  }
  next();
};

// ─── GET ROUTES ─────────────────────────────────────────────

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Biolinks routes working!', timestamp: new Date().toISOString() });
});

// Get user biolink data
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const { id } = req.query || {};

    let biolink = null;
    if (id) {
      biolink = await BioLink.findOne({ _id: id });
      if (!biolink) return res.status(404).json({ error: 'BioLink not found' });
    } else {
      const query = req.userId ? { userId: req.userId } : {};
      biolink = await BioLink.findOne(query).sort({ lastModified: -1, updatedAt: -1 });
      if (!biolink) {
        const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
        biolink = new BioLink({
          userId: req.userId || 'anonymous',
          username: `user_${uniqueSuffix}`,
          profile: { displayName: 'My BioLink', tagline: 'Your tagline here', bio: '' },
          links: [], products: [], theme: 'minimal', elements: [],
          settings: { backgroundColor: '#ffffff', textColor: '#1e1b4b', accentColor: '#8b5cf6', borderRadius: '12px', spacing: '16px' },
          analytics: { views: 0, clicks: 0 }
        });
        await biolink.save();
      }
    }

    const listQuery = req.userId ? { userId: req.userId } : {};
    const biolinks = await BioLink.find(listQuery).sort({ lastModified: -1, updatedAt: -1 });
    const dummyUser = { username: biolink.username, displayName: biolink.profile.displayName };
    res.json({ biolink, biolinks, user: dummyUser });
  } catch (error) {
    console.error('Error fetching biolink data:', error);
    res.status(500).json({ error: 'Failed to fetch biolink data' });
  }
});

// Get analytics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const biolink = await BioLink.findOne().sort({ lastModified: -1 });
    if (!biolink) return res.status(404).json({ error: 'BioLink not found' });

    res.json({
      views: biolink.analytics.views,
      clicks: biolink.analytics.clicks,
      lastViewed: biolink.analytics.lastViewed,
      publishedAt: biolink.publishedAt,
      isPublished: biolink.isPublished
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Public biolink (GET) for viewing by username
router.get('/public/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const biolink = await BioLink.findOne({ username, isPublished: true });
    if (!biolink) return res.status(404).json({ error: 'BioLink not found' });

    biolink.analytics.views += 1;
    biolink.analytics.lastViewed = new Date();
    await biolink.save();

    res.json({ biolink });
  } catch (error) {
    console.error('Error fetching public biolink:', error);
    res.status(500).json({ error: 'Failed to fetch biolink' });
  }
});

// ─── POST ROUTES ────────────────────────────────────────────

// Save biolink
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const biolinkData = req.body || {};

    // Normalize elements if received as JSON string
    if (typeof biolinkData.elements === 'string') {
      try { biolinkData.elements = JSON.parse(biolinkData.elements); } catch (e) { /* ignore */ }
    }

    const buildUpdatePayload = (data) => {
      const payload = {};
      if (data.username && data.username !== 'user' && data.username !== '') payload.username = data.username;
      if (data.profile) payload.profile = { ...data.profile };
      if (Array.isArray(data.links)) payload.links = data.links;
      if (Array.isArray(data.products)) payload.products = data.products;
      if (Array.isArray(data.elements)) {
        payload.elements = data.elements.map(el => ({
          id: el.id || `element_${Date.now()}_${Math.random()}`,
          type: el.type || 'text',
          content: el.content || {},
          position: el.position || 0,
          isActive: el.isActive !== false
        }));
      }
      if (data.theme) payload.theme = data.theme;
      if (data.settings) payload.settings = { ...(data.settings || {}) };
      payload.lastModified = new Date();
      return payload;
    };

    let biolink = null;

    // Case 1: Has an _id — update that specific biolink
    if (biolinkData._id) {
      const updatePayload = buildUpdatePayload(biolinkData);
      biolink = await BioLink.findOneAndUpdate(
        { _id: biolinkData._id },
        { $set: updatePayload },
        { new: true }
      );
    }
    // Case 2: Explicitly creating a NEW biolink (_new flag) — always create fresh
    else if (biolinkData._new) {
      const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
      biolink = new BioLink({
        userId: req.userId || 'anonymous',
        username: `user_${uniqueSuffix}`,
        profile: biolinkData.profile || {},
        links: Array.isArray(biolinkData.links) ? biolinkData.links : [],
        products: Array.isArray(biolinkData.products) ? biolinkData.products : [],
        elements: Array.isArray(biolinkData.elements) ? biolinkData.elements.map(el => ({
          id: el.id || `element_${Date.now()}_${Math.random()}`,
          type: el.type || 'text',
          content: el.content || {},
          position: el.position || 0,
          isActive: el.isActive !== false
        })) : [],
        theme: biolinkData.theme || 'minimal',
        settings: biolinkData.settings || {}
      });
      await biolink.save();
    }
    // Case 3: No _id and no _new — legacy fallback (find by username or create)
    else {
      if (biolinkData.username && biolinkData.username !== 'user' && biolinkData.username !== '') {
        const existing = await BioLink.findOne({ username: biolinkData.username });
        if (existing && (!existing.userId || existing.userId === 'anonymous' || existing.userId === req.userId)) {
          const updatePayload = buildUpdatePayload(biolinkData);
          biolink = await BioLink.findOneAndUpdate(
            { _id: existing._id },
            { $set: updatePayload },
            { new: true }
          );
        }
      }
      if (!biolink) {
        const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
        biolink = new BioLink({
          userId: req.userId || 'anonymous',
          username: `user_${uniqueSuffix}`,
          profile: biolinkData.profile || {},
          links: Array.isArray(biolinkData.links) ? biolinkData.links : [],
          products: Array.isArray(biolinkData.products) ? biolinkData.products : [],
          elements: Array.isArray(biolinkData.elements) ? biolinkData.elements.map(el => ({
            id: el.id || `element_${Date.now()}_${Math.random()}`,
            type: el.type || 'text',
            content: el.content || {},
            position: el.position || 0,
            isActive: el.isActive !== false
          })) : [],
          theme: biolinkData.theme || 'minimal',
          settings: biolinkData.settings || {}
        });
        await biolink.save();
      }
    }

    res.json({ success: true, biolink });
  } catch (error) {
    console.error('Error saving biolink:', error);
    res.status(500).json({ error: 'Failed to save biolink', details: error.message });
  }
});

// Publish biolink
router.post('/publish', authenticateToken, async (req, res) => {
  try {
    const { username, id } = req.body || {};

    if (!username) return res.status(400).json({ error: 'Username is required' });
    if (!id) return res.status(400).json({ error: 'BioLink ID is required. Please save before publishing.' });

    // Check if username is taken by a DIFFERENT biolink
    const excludeId = new mongoose.Types.ObjectId(id);
    const existing = await BioLink.findOne({
      username,
      _id: { $ne: excludeId }
    });
    if (existing) return res.status(400).json({ error: 'Username already taken' });

    // Find the specific biolink to publish — never fall back to a random one
    const biolink = await BioLink.findById(id);
    if (!biolink) return res.status(404).json({ error: 'BioLink not found. Please save it first.' });

    biolink.username = username;
    biolink.isPublished = true;
    biolink.publishedAt = new Date();
    biolink.lastModified = new Date();

    await biolink.save();
    res.json({
      success: true, biolink,
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/p/${username}`
    });
  } catch (error) {
    console.error('Error publishing biolink:', error);
    res.status(500).json({ error: 'Failed to publish biolink' });
  }
});

// Upload avatar
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { id } = req.body || {};
    let biolink = id ? await BioLink.findById(id) : null;
    if (!biolink) biolink = await BioLink.findOne().sort({ lastModified: -1 });
    if (!biolink) return res.status(404).json({ error: 'BioLink not found' });

    biolink.profile.avatar = `/uploads/biolinks/${req.file.filename}`;
    biolink.lastModified = new Date();
    await biolink.save();

    res.json({ success: true, avatarUrl: `/uploads/biolinks/${req.file.filename}` });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Upload product image
router.post('/product-image', authenticateToken, upload.single('productImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ success: true, imageUrl: `/uploads/biolinks/${req.file.filename}` });
  } catch (error) {
    console.error('Error uploading product image:', error);
    res.status(500).json({ error: 'Failed to upload product image' });
  }
});

// Upload video
router.post('/video', authenticateToken, mediaUpload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ success: true, videoUrl: `/uploads/biolinks/${req.file.filename}` });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// Gallery images upload
router.post('/gallery/upload', authenticateToken, galleryUpload.array('images', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No images uploaded' });
    const imageUrls = req.files.map(f => `/uploads/biolinks/${f.filename}`);
    res.json({ success: true, images: imageUrls, count: imageUrls.length });
  } catch (error) {
    console.error('Error uploading gallery images:', error);
    res.status(500).json({ error: 'Failed to upload gallery images' });
  }
});

// Track click
router.post('/click', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const biolink = await BioLink.findOne({ username, isPublished: true });
    if (!biolink) return res.status(404).json({ error: 'BioLink not found' });

    biolink.analytics.clicks += 1;
    await biolink.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// Check username availability
router.post('/check', async (req, res) => {
  try {
    const { username, excludeId } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const query = { username };
    // Exclude the current biolink so its own username doesn't show as "taken"
    if (excludeId) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }
    const existing = await BioLink.findOne(query);
    res.json({ available: !existing, username });
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ error: 'Failed to check username', available: false });
  }
});

// View public biolink (POST)
router.post('/view', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const biolink = await BioLink.findOne({ username, isPublished: true });
    if (!biolink) return res.status(404).json({ error: 'BioLink not found' });

    biolink.analytics.views += 1;
    biolink.analytics.lastViewed = new Date();
    await biolink.save();

    res.json({ biolink });
  } catch (error) {
    console.error('Error fetching public biolink:', error);
    res.status(500).json({ error: 'Failed to fetch biolink' });
  }
});

// ─── DELETE ROUTES ──────────────────────────────────────────

router.delete('/remove', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID is required for removal' });

    const result = await BioLink.findOneAndDelete({ _id: id });
    if (!result) return res.status(404).json({ error: 'BioLink not found' });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting biolink:', error);
    res.status(500).json({ error: 'Failed to delete biolink' });
  }
});

console.log('[BioLink] Router initialized');
module.exports = router;
