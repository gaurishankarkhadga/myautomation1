const { GoogleGenerativeAI } = require('@google/generative-ai');
const { incrementGeminiUsage } = require('./quotaService');

// Parse keys from both possible env vars
const keysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
const apiKeys = keysString
    .split(',')
    .map(k => k.trim().replace(/^["']|["']$/g, ''))
    .filter(k => k);

if (apiKeys.length === 0) {
    console.warn('[GeminiClient] WARNING: No Gemini API keys found in environment variables.');
} else {
    console.log(`[GeminiClient] Initialized with ${apiKeys.length} API key(s) for automatic failover.`);
}

let currentKeyIndex = 0;

/**
 * Priority list of models from best to backup.
 */
const MODEL_PRIORITY = [
    'gemini-3.1-flash-lite-preview',
    'gemma-4-31b-it',
    'gemini-2.5-flash'
];

function getNextModel(modelName, keyIndex) {
    if (apiKeys.length === 0) throw new Error('No Gemini API keys configured.');
    const key = apiKeys[keyIndex];
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Intelligent Matrix Failover: 
 * Tries the prioritized models across all available API keys.
 */
async function generateContentWithFallback(prompt, forcedModel = null, modelIdx = 0, keyAttempt = 0) {
    // If a specific model is forced by the caller, use it. Otherwise, use the priority list.
    const modelsToTry = forcedModel ? [forcedModel] : MODEL_PRIORITY;
    
    // Check if we've exhausted all models
    if (modelIdx >= modelsToTry.length) {
        throw new Error('[GeminiClient] Critical failure: All models and keys returned errors or high load timeouts.');
    }

    const currentModelName = modelsToTry[modelIdx];
    
    // Calculate key to use (round-robin start, then sequence through remaining keys)
    const keyIndex = (currentKeyIndex + keyAttempt) % apiKeys.length;
    const model = getNextModel(currentModelName, keyIndex);

    try {
        console.log(`[GeminiClient] Trying ${currentModelName} on Key ${keyIndex + 1}...`);
        
        // Timeout safeguard check (some preview models can hang if busy)
        const generatePromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_LIMIT')), 15000));
        
        const result = await Promise.race([generatePromise, timeoutPromise]);
        
        // If successful, update global round-robin index for spread load
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        await incrementGeminiUsage(); 
        return result;

    } catch (error) {
        const errorMessage = error.message || '';
        const isRateLimit = errorMessage.includes('429') || errorMessage.includes('Too Many Requests');
        const isInvalidKey = errorMessage.includes('400') || errorMessage.includes('API key not valid');
        const isUnavailable = errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('TIMEOUT_LIMIT') || errorMessage.includes('504') || errorMessage.includes('Gateway Timeout');

        // Logic: Try ALL keys for the current model. If all fail, move to the NEXT model.
        if (keyAttempt < apiKeys.length - 1) {
            console.warn(`[GeminiClient] ${currentModelName} failed on Key ${keyIndex + 1} (${isUnavailable ? 'Busy/Timeout' : isRateLimit ? 'Limit' : 'Error'}). Trying next key...`);
            return await generateContentWithFallback(prompt, forcedModel, modelIdx, keyAttempt + 1);
        } else {
            console.warn(`[GeminiClient] ${currentModelName} failed across ALL keys. Falling back to the next model in priority list...`);
            return await generateContentWithFallback(prompt, forcedModel, modelIdx + 1, 0);
        }
    }
}

function getAvailableKeysCount() {
    return apiKeys.length || 1;
}

module.exports = {
    generateContentWithFallback,
    getAvailableKeysCount
};
