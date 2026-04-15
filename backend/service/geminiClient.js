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
 * The system will try each model across all keys before moving to the next model.
 */
const MODEL_PRIORITY = [
    'gemini-3.1-flash-lite-preview',
    'gemma-4-31b-it',
    'gemini-2.5-flash'
];

/**
 * Universal Prompt Hardener
 * Wraps any raw prompt with clear structural cues that ALL models understand,
 * regardless of training style (Gemini 2.5, Gemma, lite previews, etc.)
 */
function hardenPrompt(rawPrompt) {
    const trimmed = rawPrompt.trim();
    // If already structured (has TASK: header), don't double-wrap
    if (trimmed.startsWith('TASK:') || trimmed.startsWith('<SYSTEM>')) {
        return rawPrompt;
    }

    // [ROOT FIX] Detect if this is a "Mimicry/Persona" task
    // "You ARE" or "Instagram creator" or "persona" or "negotiation" focus as creator
    const isMimicryTask = /You ARE|creator|persona|mimic|negotiat/i.test(trimmed);

    if (isMimicryTask) {
        return `<SYSTEM>
Adopt the persona identity, tone, and knowledge style EXACTLY as described. 
NEVER explain yourself or "think out loud." 
NEVER use AI assistant language (e.g., "Certainly," "As a persona," "I've drafted," "Thinking:").
Respond ONLY with the final required output.
</SYSTEM>

<TASK>
${trimmed}
</TASK>`;
    }

    // Add universal structural guard for general tasks. Using <SYSTEM> tags helps ALL models focus.
    return `<SYSTEM>
You are an AI assistant. Read the task below carefully and respond EXACTLY as asked.
Do NOT add explanations, greetings, or extra text. Follow the output format specified.
</SYSTEM>

<TASK>
${trimmed}
</TASK>`;
}

/**
 * Simplified fallback prompt
 * When a complex prompt fails, this strips it down to just the core question.
 * This maximizes understanding on lighter models.
 */
function simplifyPrompt(rawPrompt) {
    // Extract the last "USER MESSAGE:" or the final line/key instruction from the prompt
    const lines = rawPrompt.split('\n').filter(l => l.trim().length > 0);

    // Find the user message line if it exists
    const userMessageLine = lines.findIndex(l => l.includes('USER MESSAGE:') || l.includes('Creator says:') || l.includes('creator says'));

    if (userMessageLine !== -1) {
        const userText = lines.slice(userMessageLine).join('\n');
        return `<SYSTEM>
You are a smart AI assistant. Understand the user's request and respond EXACTLY as the format requires.
Follow output format strictly. Return ONLY what is asked.
</SYSTEM>

<TASK>
${userText.trim()}

IMPORTANT: Return ONLY the exact output format shown. No explanations. No extra text.
</TASK>`;
    }

    // Generic simplification — just strip fluff and add guardrails
    return `<SYSTEM>You are a helpful AI. Follow instructions exactly. Return ONLY what is asked.</SYSTEM>\n\n${lines.slice(-10).join('\n')}`;
}

/**
 * Clean and repair JSON output from AI models.
 * Some models (especially lite/preview) wrap JSON in markdown or add extra text.
 */
function repairAIOutput(text) {
    if (!text) return text;
    let cleaned = text.trim();

    // Remove markdown code fences: ```json ... ``` or ``` ... ```
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    }

    // Remove leading/trailing quotes if the model wrapped the whole thing in quotes
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1);
    }

    // Remove common AI preambles that break JSON
    const preambles = [
        /^(?:Here is|Here's|The answer is|Output:|Result:|Response:)[:\s]*/i,
        /^Sure[,!]?\s*/i,
        /^Certainly[,!]?\s*/i,
        /^Of course[,!]?\s*/i,
    ];
    for (const pattern of preambles) {
        cleaned = cleaned.replace(pattern, '');
    }

    return cleaned.trim();
}

function getNextModel(modelName, keyIndex) {
    if (apiKeys.length === 0) throw new Error('No Gemini API keys configured.');
    const key = apiKeys[keyIndex];
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Intelligent Matrix Failover with Universal Prompt Hardening:
 * 1. Hardens the prompt for universal model comprehension
 * 2. Tries all API keys for the current model
 * 3. If all keys fail → automatically falls back to the next model in priority list
 * 4. On final model failure → retries with a SIMPLIFIED version of the prompt
 */
async function generateContentWithFallback(prompt, forcedModel = null, modelIdx = 0, keyAttempt = 0, simplified = false) {
    const modelsToTry = forcedModel ? [forcedModel, ...MODEL_PRIORITY.filter(m => m !== forcedModel)] : MODEL_PRIORITY;

    // Critical failure — all models and keys exhausted
    if (modelIdx >= modelsToTry.length) {
        // Last resort: try the simplified prompt from scratch
        if (!simplified) {
            console.warn('[GeminiClient] All models/keys failed. Retrying with simplified prompt...');
            const simplifiedPrompt = simplifyPrompt(prompt);
            return await generateContentWithFallback(simplifiedPrompt, forcedModel, 0, 0, true);
        }
        throw new Error('[GeminiClient] Critical failure: All models, keys, and simplified retries exhausted.');
    }

    const currentModelName = modelsToTry[modelIdx];
    const keyIndex = (currentKeyIndex + keyAttempt) % apiKeys.length;
    const model = getNextModel(currentModelName, keyIndex);

    // Apply Universal Prompt Hardening on first attempt (not on simplified retry)
    const finalPrompt = simplified ? prompt : hardenPrompt(prompt);

    try {
        console.log(`[GeminiClient] Trying ${currentModelName} on Key ${keyIndex + 1}${simplified ? ' [simplified]' : ''}...`);

        // Timeout safeguard — some preview models hang under load
        const generatePromise = model.generateContent(finalPrompt);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT_LIMIT')), 15000)
        );

        const result = await Promise.race([generatePromise, timeoutPromise]);

        // Intercept the response to auto-repair the text output
        const originalText = result.response.text.bind(result.response);
        result.response.text = () => repairAIOutput(originalText());

        // If successful, advance round-robin key for next request
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        await incrementGeminiUsage();
        return result;

    } catch (error) {
        const errorMessage = error.message || '';
        const isRateLimit = errorMessage.includes('429') || errorMessage.includes('Too Many Requests');
        const isInvalidKey = errorMessage.includes('400') || errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID');
        const isUnavailable = errorMessage.includes('503') || errorMessage.includes('Service Unavailable') ||
            errorMessage.includes('TIMEOUT_LIMIT') || errorMessage.includes('504') || errorMessage.includes('Gateway Timeout');
        const isNotFound = errorMessage.includes('404') || errorMessage.includes('not found');

        if (isNotFound) {
            // Model doesn't exist — skip immediately to next model, no key rotation needed
            console.warn(`[GeminiClient] ${currentModelName} — model not available (404). Skipping to next model...`);
            return await generateContentWithFallback(prompt, forcedModel, modelIdx + 1, 0, simplified);
        }

        // Try all keys for the current model first
        if (keyAttempt < apiKeys.length - 1) {
            console.warn(`[GeminiClient] ${currentModelName} failed on Key ${keyIndex + 1} (${isUnavailable ? 'Busy/Timeout' : isRateLimit ? 'Rate Limit' : 'Error'}). Trying next key...`);
            return await generateContentWithFallback(prompt, forcedModel, modelIdx, keyAttempt + 1, simplified);
        } else {
            // All keys failed for this model — move to next model
            console.warn(`[GeminiClient] ${currentModelName} failed across ALL keys. Falling back to next model in priority list...`);
            return await generateContentWithFallback(prompt, forcedModel, modelIdx + 1, 0, simplified);
        }
    }
}

function getAvailableKeysCount() {
    return apiKeys.length || 1;
}

module.exports = {
    generateContentWithFallback,
    getAvailableKeysCount,
    repairAIOutput // Export for use in services that do their own JSON parsing
};
