require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');




const app = express();



// ==================== CORS ====================
const allowedOrigins = [...new Set([
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean))];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('[CORS] Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Insta-UserId', 'X-YT-ChannelId']
}));

// ==================== BODY PARSING ====================
// Raw body for webhook signature verification
app.use('/api/instagram/webhook', express.raw({ type: 'application/json' }));

// Parse JSON for all other routes
app.use((req, res, next) => {
  if (req.path === '/api/instagram/webhook' && req.method === 'POST') {
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body;
      req.body = JSON.parse(req.body.toString());
    }
    return next();
  }
  express.json()(req, res, next);
});

// ==================== MONGODB CONNECTION ====================
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('[MongoDB] Connected successfully');

    // ==================== ONE-TIME DB CLEANUP ====================
    // Fix: autonomousMode was defaulting to true, causing DM replies even when automation was "stopped".
    // Force ALL existing settings to autonomousMode=false so "stop all" actually works.
    try {
      const { DmAutoReplySetting, AutoReplySetting, CommentToDmSetting: C2DSetting } = require('./model/Instaautomation');
      
      const dmResult = await DmAutoReplySetting.updateMany(
        { autonomousMode: true },
        { autonomousMode: false }
      );
      if (dmResult.modifiedCount > 0) {
        console.log(`[Startup-Fix] ⚠️ Forced autonomousMode=false on ${dmResult.modifiedCount} DM settings (was causing replies even when stopped)`);
      }
      
      console.log('[Startup-Fix] ✅ Database safety check complete');
    } catch (cleanupErr) {
      console.error('[Startup-Fix] Cleanup error (non-fatal):', cleanupErr.message);
    }
  })
  .catch((err) => {
    console.error('[MongoDB] Connection error:', err.message);
    process.exit(1);
  });

// ==================== ROUTES ====================
const instaRoutes = require('./route/instaautomationapi');
app.use('/api/instagram', instaRoutes);

const youtubeRoutes = require('./route/youtubeapi');
app.use('/api/youtube', youtubeRoutes);

const chatRoutes = require('./route/chatapi');
app.use('/api/chat', chatRoutes);

const biolinkRoutes = require('./route/biolinkapi');
app.use('/api/biolinks', biolinkRoutes);

const assetsRoutes = require('./route/assetsapi');
app.use('/api/assets', assetsRoutes);

// Serve uploaded biolink files (avatars, product images, videos)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    message: 'Instagram Graph API server running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
    webhookVerifyTokenSet: !!process.env.WEBHOOK_VERIFY_TOKEN,
    webhookUrl: `${process.env.BACKEND_URL || ('http://localhost:' + (process.env.PORT || 8000))}/api/instagram/webhook`
  });
});

// ==================== ERROR HANDLERS ====================
app.use((err, req, res, next) => {
  console.error('[Error] Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// ==================== CRON JOBS ====================
const cron = require('node-cron');
const { WebhookEvent, Token, CommentToDmSetting } = require('./model/Instaautomation');
const axios = require('axios');

cron.schedule('*/5 * * * *', async () => {
  console.log('[Cron] Checking for scheduled viral tag replies...');
  try {
    const pendingEvents = await WebhookEvent.find({
      eventType: 'viral_tag_scheduled_reply',
      processed: false,
      scheduledAt: { $lte: new Date() }
    }).limit(100); // [FIX] Added pagination to prevent OOM on viral spikes

    if (pendingEvents.length === 0) return;

    console.log(`[Cron] Processing ${pendingEvents.length} pending viral tag replies with rate-limit protection...`);

    for (let i = 0; i < pendingEvents.length; i++) {
        const event = pendingEvents[i];
      try {
        const tokenData = await Token.findOne({ userId: event.userId });
        if (!tokenData) {
          console.error(`[Cron] No token for user ${event.userId}`);
          event.processed = true;
          await event.save();
          continue;
        }

        // Send the comment
        const { mediaId, message } = event.payload;
        await axios.post(
          `https://graph.instagram.com/v24.0/${mediaId}/comments`,
          { message },
          {
            params: { access_token: tokenData.accessToken }
          }
        );

        console.log(`[Cron] Successfully posted viral tag reply to media ${mediaId}`);
        event.processed = true;
        await event.save();

        // [FIX] Intentional delay to respect rate limits and yield event loop
        await new Promise(resolve => setTimeout(resolve, 800));

      } catch (err) {
        // [FIX] If we hit a 429 Rate Limit, we must abort the entire batch
        if (err.response && err.response.status === 429) {
            console.error('[Cron] 🛑 INSTAGRAM RATE LIMIT (429) REACHED. Aborting batch processing for this cycle.');
            break; 
        }

        console.error(`[Cron] Error processing event ${event._id}:`, err.response?.data || err.message);
        // Mark as processed anyway so we don't infinitely retry failed ones immediately
        event.processed = true;
        await event.save();
      }
    }
  } catch (err) {
    console.error('[Cron] Job error:', err.message);
  }
});

// ==================== COMMENT-TO-DM AUTO-EXPIRY CRON ====================
cron.schedule('*/5 * * * *', async () => {
  try {
    // Find all active Comment-to-DM settings that have expired
    const expiredByTime = await CommentToDmSetting.find({
      enabled: true,
      expiresAt: { $ne: null, $lte: new Date() }
    });

    // Find all active settings where comment limit has been reached
    const expiredByCount = await CommentToDmSetting.find({
      enabled: true,
      maxComments: { $gt: 0 },
      $expr: { $gte: ['$processedCount', '$maxComments'] }
    });

    const toDisable = [...expiredByTime, ...expiredByCount];
    
    if (toDisable.length === 0) return;

    console.log(`[Cron:C2D] Found ${toDisable.length} expired Comment-to-DM automations. Disabling...`);

    for (const setting of toDisable) {
      const reason = setting.expiresAt && new Date() > new Date(setting.expiresAt)
        ? `Time limit expired (${setting.timeLimitHours}h)`
        : `Comment limit reached (${setting.processedCount}/${setting.maxComments})`;
      
      await CommentToDmSetting.findByIdAndUpdate(setting._id, { enabled: false });
      console.log(`[Cron:C2D] Disabled for user ${setting.userId}: ${reason}`);
    }
  } catch (err) {
    console.error('[Cron:C2D] Error:', err.message);
  }
});

// ==================== START SERVER ====================
const http = require('http');
const { initSocket } = require('./service/socketService');

const PORT = process.env.PORT || 8000;
const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

server.listen(PORT, () => {
  console.log('\n[Server] Instagram Graph API Server');
  console.log(`[Server] Running on: http://localhost:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`[Server] Webhooks enabled. Sockets enabled.`);
});

module.exports = server;
