const express = require('express');
const router = express.Router();
const chatService = require('../service/chatService');

// ==================== CHAT API ROUTES ====================

// POST /api/chat/message — Process a chat message
router.post('/message', async (req, res) => {
    try {
        const { userId, message, token } = req.body;

        if (!userId || !message) {
            return res.status(400).json({
                success: false,
                error: 'userId and message are required'
            });
        }

        if (message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Message cannot be empty'
            });
        }

        console.log(`[ChatAPI] Message from ${userId}: "${message}"`);

        const result = await chatService.processMessage(userId, message.trim(), token);

        res.json(result);
    } catch (error) {
        console.error('[ChatAPI] Error processing message:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to process message',
            message: error.message,
            response: 'Sorry, something went wrong. Please try again!',
            toasts: [{
                type: 'error',
                title: 'Error',
                message: 'Failed to process your message. Please try again.'
            }],
            actions: []
        });
    }
});

// GET /api/chat/history/:userId — Get chat history
router.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        const result = await chatService.getChatHistory(userId, limit);

        res.json(result);
    } catch (error) {
        console.error('[ChatAPI] Error fetching history:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chat history',
            message: error.message
        });
    }
});

// DELETE /api/chat/history/:userId — Clear chat history
router.delete('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'userId is required' });
        }
        const result = await chatService.clearChatHistory(userId);
        res.json(result);
    } catch (error) {
        console.error('[ChatAPI] Error clearing history:', error.message);
        res.status(500).json({ success: false, error: 'Failed to clear chat history' });
    }
});

// DELETE /api/chat/message/:messageId — Delete a specific message
router.delete('/message/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId } = req.body;
        if (!userId || !messageId) {
            return res.status(400).json({ success: false, error: 'userId and messageId are required' });
        }
        const result = await chatService.deleteMessage(userId, messageId);
        res.json(result);
    } catch (error) {
        console.error('[ChatAPI] Error deleting message:', error.message);
        res.status(500).json({ success: false, error: 'Failed to delete message' });
    }
});

// GET /api/chat/active-count/:userId — Get count of active automations (for sidebar badge)
router.get('/active-count/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const AutoReplySetting = require('../model/Instaautomation').AutoReplySetting;
        const DmAutoReplySetting = require('../model/Instaautomation').DmAutoReplySetting;
        const CommentToDmSetting = require('../model/Instaautomation').CommentToDmSetting;

        const [commentSettings, dmSettings, c2dSettings] = await Promise.all([
            AutoReplySetting.findOne({ userId }).lean(),
            DmAutoReplySetting.findOne({ userId }).lean(),
            CommentToDmSetting.findOne({ userId }).lean()
        ]);

        let activeCount = 0;
        const activeList = [];

        if (commentSettings?.enabled) {
            activeCount++;
            activeList.push('💬 Comments');
        }
        if (dmSettings?.enabled) {
            activeCount++;
            activeList.push('✉️ DMs');
        }
        if (c2dSettings?.enabled) {
            activeCount++;
            activeList.push('📲 C2D');
        }

        res.json({ success: true, activeCount, activeList });
    } catch (error) {
        res.json({ success: true, activeCount: 0, activeList: [] });
    }
});

// GET /api/chat/briefing-check/:userId — Check if morning briefing should be shown
router.get('/briefing-check/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const DmAutoReplySetting = require('../model/Instaautomation').DmAutoReplySetting;
        const settings = await DmAutoReplySetting.findOne({ userId }).lean();

        const lastBriefing = settings?.lastBriefingAt;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const shouldShow = !lastBriefing || new Date(lastBriefing) < today;

        res.json({
            success: true,
            shouldShowBriefing: shouldShow,
            lastBriefingAt: lastBriefing || null,
            autonomousMode: settings?.autonomousMode !== false,
            customRulesCount: settings?.customInstructions?.filter(i => i.active).length || 0
        });
    } catch (error) {
        res.json({ success: true, shouldShowBriefing: false });
    }
});

// GET /api/chat/quota — Get Gemini API usage
router.get('/quota', async (req, res) => {
    try {
        const { getGeminiUsage } = require('../service/quotaService');
        const { getAvailableKeysCount } = require('../service/geminiClient');
        const used = await getGeminiUsage();
        const limit = 1500 * getAvailableKeysCount(); // 1500 requests per key per day
        res.json({ success: true, used, limit, remaining: Math.max(0, limit - used) });
    } catch (error) {
        res.json({ success: true, used: 0, limit: 1500, remaining: 1500 });
    }
});

module.exports = router;
