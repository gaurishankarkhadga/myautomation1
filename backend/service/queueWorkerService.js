const { WebhookEvent, Conversation } = require('../model/Instaautomation');
// We will import the actual processing logic from instaautomationapi.js
// but for now we create the skeleton for the queue processor.

let isProcessingQueue = false;

async function processNextEvent(processEventFunction) {
    if (isProcessingQueue) return;
    
    try {
        isProcessingQueue = true;
        
        // Find next unprocessed event
        const event = await WebhookEvent.findOneAndUpdate(
            { eventType: 'incoming_webhook', processed: false },
            { processed: true }, // Mark as processed immediately to prevent double-processing
            { sort: { receivedAt: 1 }, new: false }
        );

        if (!event) {
            isProcessingQueue = false;
            return;
        }

        console.log(`[QueueWorker] Processing webhook event ${event._id}...`);
        
        // Call the main processing logic (passed from instaautomationapi)
        try {
            await processEventFunction(event.payload);
            console.log(`[QueueWorker] Successfully processed event ${event._id}`);
        } catch (processErr) {
            console.error(`[QueueWorker] Error processing event ${event._id}:`, processErr.message);
            // In a production system, we might set processed: false and increment a retry count here
        }

        isProcessingQueue = false;
        
        // Process next immediately
        setImmediate(() => processNextEvent(processEventFunction));

    } catch (err) {
        console.error('[QueueWorker] Critical error:', err.message);
        isProcessingQueue = false;
    }
}

/**
 * Trigger the queue to start processing if it isn't already
 */
function triggerQueue(processEventFunction) {
    if (!isProcessingQueue) {
        setImmediate(() => processNextEvent(processEventFunction));
    }
}

/**
 * Helper to lock a conversation to prevent double-texting on rapid-fire messages.
 * Returns true if locked successfully, false if it's already locked.
 */
async function acquireConversationLock(conversationId, lockDurationSeconds = 5) {
    try {
        const now = new Date();
        const lockedUntil = new Date(now.getTime() + lockDurationSeconds * 1000);
        
        const conv = await Conversation.findOneAndUpdate(
            { 
                conversationId: conversationId,
                $or: [
                    { lockedUntil: null },
                    { lockedUntil: { $lte: now } }
                ]
            },
            { lockedUntil: lockedUntil },
            { new: true }
        );
        
        return !!conv; // True if we acquired the lock
    } catch (err) {
        console.error('[QueueWorker] Error acquiring conversation lock:', err.message);
        return false;
    }
}

module.exports = {
    triggerQueue,
    acquireConversationLock
};
