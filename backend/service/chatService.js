const { generateContentWithFallback, repairAIOutput } = require('./geminiClient');
const fs = require('fs');
const path = require('path');
const ChatHistory = require('../model/ChatHistory');

// ==================== HANDLER REGISTRY (Auto-Discovery) ====================
const handlerRegistry = new Map();  // intent -> handler
const handlers = [];                // all handler instances

function loadHandlers() {
    const handlersDir = path.join(__dirname, 'handlers');

    if (!fs.existsSync(handlersDir)) {
        console.error('[ChatService] Handlers directory not found:', handlersDir);
        return;
    }

    const files = fs.readdirSync(handlersDir).filter(f => f.endsWith('.handler.js'));

    for (const file of files) {
        try {
            const handler = require(path.join(handlersDir, file));
            handlers.push(handler);

            for (const intent of handler.intents) {
                handlerRegistry.set(intent, handler);
            }

            console.log(`[ChatService] Loaded handler: ${handler.name} (${handler.intents.join(', ')})`);
        } catch (err) {
            console.error(`[ChatService] Failed to load handler ${file}:`, err.message);
        }
    }

    console.log(`[ChatService] ${handlers.length} handlers loaded, ${handlerRegistry.size} intents registered.`);
}

// Load handlers on startup
loadHandlers();

// ==================== GET ALL REGISTERED INTENTS ====================
function getIntentList() {
    const intentDocs = [];

    for (const handler of handlers) {
        for (const intent of handler.intents) {
            intentDocs.push(`- ${intent} (handler: ${handler.name})`);
        }
    }

    return intentDocs.join('\n');
}

// ==================== GEMINI INTENT PARSER ====================
// The brain: understands vague/partial/multi-language input and extracts structured intents

async function parseIntents(message, context) {
    const intentList = getIntentList();

    const prompt = `You are the AI brain of CreatorHub — a social media management platform for creators.
Your job: understand ANYTHING the creator says (no matter how vague, messy, or creative) and convert it into structured action intents.

CRITICAL RULES:
1. Creators are NOT tech-savvy. They write casually: typos, slang, abbreviations, emojis, Hinglish (Hindi+English), mixed languages, or just vibes. ALWAYS figure out what they ACTUALLY mean.
2. If the message has MULTIPLE requests, split into SEPARATE intents and execute ALL of them.
3. Return a JSON array of intent objects: {"intent": "<name>", "params": {}, "confidence": 0.0-1.0}
4. If they're just chatting, greeting, or asking a question → use "general_chat".
5. When UNSURE, pick the MOST LIKELY intent with lower confidence (0.5-0.7). NEVER ignore a request.
6. INFER missing details smartly:
   - "turn on replies" → they mean AI smart mode (best default)
   - "recent video" / "latest reel" / "last post" → target: "recent"
   - "my first post" / "oldest video" → target: "first"
   - "previous one" / "second last" → target: "previous"
   - "for few hours" → default 6 hours
   - "some comments" / "not all" → default 50 comments
   - "sab kuch chalu kar" → enable_all_automation
   - "band karo" / "sab band" → disable_all_automation
7. If the creator mentions a NUMBER (like "100", "50", "24"), figure out if it's hours, comment count, or price from CONTEXT.
8. If the creator mentions a platform name ("youtube", "insta", "all"), map it to platform preferences.
9. Common abbreviations: "dm" = direct message, "yt" = youtube, "insta/ig" = instagram, "auto" = automation, "hrs" = hours
10. ULTRA-FLEXIBLE: If the creator gives a CUSTOM INSTRUCTION that doesn't fit any specific intent (e.g. "never mention prices", "reply in Hindi to Indian fans", "don't share links after 10pm"), use "add_custom_instruction" with the full instruction as the param.
11. If the creator asks "what happened", "morning update", "briefing", "catch me up", "what did you do" — use "get_morning_briefing".
12. COMMENT-TO-DM: If the creator talks about sending DMs to people who comment, auto-DMing commenters, "comment pe dm", "send dm when they comment", etc. → use "enable_comment_to_dm". This is DIFFERENT from enable_dm_autoreply (which handles incoming DMs). Comment-to-DM = someone COMMENTS → system sends them a DM.
   - Extract keyword if mentioned (e.g. "if they say 'interested'" → keyword: "interested")
   - Extract commentReply if mentioned (e.g. "reply 'sent' on comment" → commentReply: "sent! 🔥")
   - Extract dmMessage if mentioned (e.g. "send them 'check your inbox'" → dmMessage: "check your inbox")
   - Default: useAssets = true (auto-share creator's products/links in the DM)
   - IMPORTANT: If the creator mentions a TIME DURATION with comment-to-dm, include "hours" DIRECTLY in the params. Do NOT create a separate set_time_limit intent. Example: "dm commenters for 30 hours" → hours: 30 inside enable_comment_to_dm params
   - IMPORTANT: If the creator mentions a MAX COMMENT COUNT with comment-to-dm, include "maxComments" DIRECTLY in the params. Do NOT create a separate set_comment_limit intent.
   - If the creator mentions a specific post/reel (recent, latest, first), include "targetMedia" in the params

AVAILABLE INTENTS:
${intentList}
- deal_action_bulk (handles approval, rejection, or edit dispatch for 1 or multiple brand deals — params: {actions: [{brandName: "Nike", action: "approve", draftOverride: "Custom text?"}]})
- regenerate_deal_draft (asks the AI to rewrite a draft — params: {brandName: "Nike", instructions: "ask for $1000"})
- set_deal_rate_rule (overrides global rates — params: {brandIndustry: "sports", minRate: 1000})
- enable_comment_to_dm (send DM to commenters — params: {keyword?, commentReply?, dmMessage?, useAssets?, targetMedia?, hours?, maxComments?})
- disable_comment_to_dm (stop comment-to-DM)
- configure_comment_to_dm (update comment-to-DM settings)
- add_custom_instruction (for custom DM behavior rules — params: {instruction: "the full custom rule"})
- list_custom_instructions (show all custom rules)
- remove_custom_instruction (remove a rule by number — params: {index: 1})
- clear_custom_instructions (remove all custom rules)
- get_morning_briefing (24h activity summary, morning update, "what happened")
- general_chat (for general questions, greetings, help, feedback, or anything not matching above)

CONTEXT:
- Creator's userId: ${context.userId}
- Connected platforms: Instagram, YouTube (possibly)
- The creator manages their social media automation through this chat.

EXAMPLES (covering diverse real-world inputs):
User: "replies on" → [{"intent": "enable_comment_autoreply", "params": {"mode": "ai_smart"}, "confidence": 0.85}]
User: "stop dms" → [{"intent": "disable_dm_autoreply", "params": {}, "confidence": 0.9}]
User: "add course 29$ xyz.com" → [{"intent": "add_asset", "params": {"type": "course", "price": "29", "url": "xyz.com", "title": "Course"}, "confidence": 0.8}]
User: "what's happening" → [{"intent": "get_morning_briefing", "params": {}, "confidence": 0.85}]
User: "turn on replies and find deals" → [{"intent": "enable_comment_autoreply", "params": {"mode": "ai_smart"}, "confidence": 0.9}, {"intent": "find_brand_deals", "params": {}, "confidence": 0.9}]
User: "deal milao" → [{"intent": "find_brand_deals", "params": {}, "confidence": 0.85}]
User: "hello" → [{"intent": "general_chat", "params": {}, "confidence": 1.0}]
User: "only automate my recent video" → [{"intent": "set_content_target", "params": {"target": "recent"}, "confidence": 0.9}]
User: "reply to top 100 comments only" → [{"intent": "set_comment_limit", "params": {"maxReplies": 100}, "confidence": 0.9}]
User: "automate all platforms" → [{"intent": "enable_all_automation", "params": {"mode": "ai_smart"}, "confidence": 0.9}]
User: "only automate first video and reply to 50 comments for 12 hours" → [{"intent": "set_content_target", "params": {"target": "first"}, "confidence": 0.9}, {"intent": "set_comment_limit", "params": {"maxReplies": 50}, "confidence": 0.9}, {"intent": "set_time_limit", "params": {"hours": 12}, "confidence": 0.9}]

ADVANCED EXAMPLES (messy, creative, real-world):
User: "bhai sab chalu kr de 2 ghante ke liye" → [{"intent": "enable_all_automation", "params": {"mode": "ai_smart"}, "confidence": 0.85}, {"intent": "set_time_limit", "params": {"hours": 2}, "confidence": 0.85}]
User: "meri latest reel pe comments ka reply kr" → [{"intent": "enable_comment_autoreply", "params": {"mode": "ai_smart"}, "confidence": 0.85}, {"intent": "set_content_target", "params": {"target": "recent"}, "confidence": 0.85}]
User: "just do 50 and stop" → [{"intent": "set_comment_limit", "params": {"maxReplies": 50}, "confidence": 0.8}]
User: "i want auto reply on my dm and comments both for 6 hrs" → [{"intent": "enable_comment_autoreply", "params": {"mode": "ai_smart"}, "confidence": 0.9}, {"intent": "enable_dm_autoreply", "params": {"mode": "ai_smart"}, "confidence": 0.9}, {"intent": "set_time_limit", "params": {"hours": 6}, "confidence": 0.9}]
User: "pause for now" → [{"intent": "disable_all_automation", "params": {}, "confidence": 0.8}]
User: "kl se band kr dena" → [{"intent": "set_time_limit", "params": {"hours": 24}, "confidence": 0.7}]
User: "only yt" → [{"intent": "set_platform_preference", "params": {"instagram": false, "youtube": true}, "confidence": 0.85}]
User: "mere recent wale pe 100 comments kr de" → [{"intent": "set_content_target", "params": {"target": "recent"}, "confidence": 0.85}, {"intent": "set_comment_limit", "params": {"maxReplies": 100}, "confidence": 0.85}]
User: "how many replies have u done?" → [{"intent": "get_status", "params": {}, "confidence": 0.85}]
User: "can you handle my youtube too?" → [{"intent": "set_platform_preference", "params": {"instagram": true, "youtube": true}, "confidence": 0.8}]
User: "add my course link mysite.com/course price 49 and turn on smart dm" → [{"intent": "add_asset", "params": {"type": "course", "url": "mysite.com/course", "price": "49", "title": "Course"}, "confidence": 0.9}, {"intent": "enable_dm_autoreply", "params": {"mode": "ai_with_assets"}, "confidence": 0.9}]
User: "setting dikha" → [{"intent": "get_preferences", "params": {}, "confidence": 0.85}]
User: "sab reset kr de" → [{"intent": "reset_preferences", "params": {}, "confidence": 0.9}]
User: "create biolink with modern look" → [{"intent": "create_biolink", "params": {"style": "modern"}, "confidence": 0.95}]
User: "make a biolink with my social media and courses" → [{"intent": "create_biolink", "params": {"style": "modern"}, "confidence": 0.9}]
User: "show my biolinks" → [{"intent": "list_biolinks", "params": {}, "confidence": 0.9}]
User: "update my biolink theme to glass" → [{"intent": "update_biolink", "params": {"theme": "glass"}, "confidence": 0.9}]
User: "biolink bana do modern wala" → [{"intent": "create_biolink", "params": {"style": "modern"}, "confidence": 0.9}]
User: "if dm fails send 'hey will reply soon'" → [{"intent": "set_dm_fallback", "params": {"message": "hey will reply soon"}, "confidence": 0.9}]
User: "run for 1 hour only on latest post, 30 comments max" → [{"intent": "set_content_target", "params": {"target": "recent"}, "confidence": 0.9}, {"intent": "set_time_limit", "params": {"hours": 1}, "confidence": 0.9}, {"intent": "set_comment_limit", "params": {"maxReplies": 30}, "confidence": 0.9}]

CUSTOM INSTRUCTION EXAMPLES (ultra-flexible):
User: "never mention prices in DMs" → [{"intent": "add_custom_instruction", "params": {"instruction": "Never mention prices in DM replies"}, "confidence": 0.95}]
User: "reply in Hindi if fans are from India" → [{"intent": "add_custom_instruction", "params": {"instruction": "Reply in Hindi if the fan seems to be from India based on their message language"}, "confidence": 0.9}]
User: "don't share links after 10pm" → [{"intent": "add_custom_instruction", "params": {"instruction": "Do not share any product links in DM replies after 10 PM"}, "confidence": 0.9}]
User: "if someone asks about my course tell them it's sold out" → [{"intent": "add_custom_instruction", "params": {"instruction": "If someone asks about the course, tell them it is currently sold out"}, "confidence": 0.95}]
User: "show my custom rules" → [{"intent": "list_custom_instructions", "params": {}, "confidence": 0.9}]
User: "remove rule 2" → [{"intent": "remove_custom_instruction", "params": {"index": 2}, "confidence": 0.9}]
User: "clear all my custom instructions" → [{"intent": "clear_custom_instructions", "params": {}, "confidence": 0.9}]

COMMENT-TO-DM EXAMPLES (when creator wants to send DM to people who comment):
User: "when someone comments on my latest reel send them a DM" → [{"intent": "enable_comment_to_dm", "params": {"targetMedia": "recent"}, "confidence": 0.95}]
User: "when someone comments send them a DM directly and on comment reply just say sent" → [{"intent": "enable_comment_to_dm", "params": {"commentReply": "sent! check your DM 🔥"}, "confidence": 0.95}]
User: "comment pe dm bhejo" → [{"intent": "enable_comment_to_dm", "params": {}, "confidence": 0.9}]
User: "if they comment 'interested' dm them the link" → [{"intent": "enable_comment_to_dm", "params": {"keyword": "interested"}, "confidence": 0.95}]
User: "send dm to commenters saying check your inbox" → [{"intent": "enable_comment_to_dm", "params": {"dmMessage": "check your inbox! I sent you something cool 🔥"}, "confidence": 0.9}]
User: "auto dm on comments with my course link" → [{"intent": "enable_comment_to_dm", "params": {"useAssets": true}, "confidence": 0.9}]
User: "reply sent on comment and dm them the product" → [{"intent": "enable_comment_to_dm", "params": {"commentReply": "sent! 🔥", "useAssets": true}, "confidence": 0.95}]
User: "jisko bhi comment kare unko dm me link bhej de" → [{"intent": "enable_comment_to_dm", "params": {"useAssets": true}, "confidence": 0.9}]
User: "stop comment to dm" → [{"intent": "disable_comment_to_dm", "params": {}, "confidence": 0.9}]
User: "comment to dm band karo" → [{"intent": "disable_comment_to_dm", "params": {}, "confidence": 0.9}]
User: "enable comment to dm for keyword 'link'" → [{"intent": "enable_comment_to_dm", "params": {"keyword": "link"}, "confidence": 0.95}]
User: "when someone says 'how' in comments reply 'check DM' and send them my course" → [{"intent": "enable_comment_to_dm", "params": {"keyword": "how", "commentReply": "check DM! 🔥", "useAssets": true}, "confidence": 0.95}]
User: "comment pe DM automation on kr de latest video ke liye" → [{"intent": "enable_comment_to_dm", "params": {"targetMedia": "recent"}, "confidence": 0.9}]
User: "dm send karo comment walo ko and comment pe 'sent bro' reply karo" → [{"intent": "enable_comment_to_dm", "params": {"commentReply": "sent bro! check your DM 🔥"}, "confidence": 0.95}]
User: "turn on comment to dm auto with message 'hey here is the link you asked for'" → [{"intent": "enable_comment_to_dm", "params": {"dmMessage": "hey here is the link you asked for"}, "confidence": 0.95}]

COMMENT-TO-DM WITH TIME LIMIT (hours goes INSIDE enable_comment_to_dm — NOT a separate set_time_limit):
User: "when user comment give within 30 hour send link of my course also reply them like link sended" → [{"intent": "enable_comment_to_dm", "params": {"hours": 30, "commentReply": "Link sent! Check your DMs 🔥", "useAssets": true}, "confidence": 0.95}]
User: "dm commenters for 24 hours" → [{"intent": "enable_comment_to_dm", "params": {"hours": 24}, "confidence": 0.95}]
User: "comment pe dm 6 ghante ke liye" → [{"intent": "enable_comment_to_dm", "params": {"hours": 6}, "confidence": 0.9}]
User: "send dm to first 50 commenters and stop" → [{"intent": "enable_comment_to_dm", "params": {"maxComments": 50}, "confidence": 0.95}]
User: "auto dm commenters for 12 hours, max 100 comments, on my latest reel" → [{"intent": "enable_comment_to_dm", "params": {"hours": 12, "maxComments": 100, "targetMedia": "recent"}, "confidence": 0.95}]
User: "comment pe dm bhejo 30 ghante ke liye latest reel pe course link ke saath" → [{"intent": "enable_comment_to_dm", "params": {"hours": 30, "targetMedia": "recent", "useAssets": true}, "confidence": 0.95}]
User: "when someone comments send DM with my course link and reply sent stop after 2 hours" → [{"intent": "enable_comment_to_dm", "params": {"hours": 2, "commentReply": "sent! 🔥", "useAssets": true}, "confidence": 0.95}]
User: "auto dm for keyword interested for 48 hours on recent post" → [{"intent": "enable_comment_to_dm", "params": {"keyword": "interested", "hours": 48, "targetMedia": "recent"}, "confidence": 0.95}]
User: "dm 200 commenters then automatically stop" → [{"intent": "enable_comment_to_dm", "params": {"maxComments": 200}, "confidence": 0.95}]
DEAL NEGOTIATION EXAMPLES (startup-grade multi-deal CRM operations):
User: "Approve the Nike deal" → [{"intent": "deal_action_bulk", "params": {"actions": [{"brandName": "Nike", "action": "approve"}]}, "confidence": 0.95}]
User: "Reject the Sephora deal" → [{"intent": "deal_action_bulk", "params": {"actions": [{"brandName": "Sephora", "action": "reject"}]}, "confidence": 0.95}]
User: "Approve all deals above 500 dollars but reject the rest" → [{"intent": "deal_action_bulk", "params": {"actions": [{"brandName": "all", "action": "conditional_approve", "condition": ">500"}]}, "confidence": 0.9}]
User: "Change the Adidas draft to ask for 2000" → [{"intent": "regenerate_deal_draft", "params": {"brandName": "Adidas", "instructions": "Ask for $2000"}, "confidence": 0.95}]
User: "Offer a Reel instead of a Story" → [{"intent": "regenerate_deal_draft", "params": {"brandName": "recent", "instructions": "Change deliverables to 1 Reel instead of Story"}, "confidence": 0.9}]
User: "Approve Nike but tell Adidas to double their budget, and reject Puma" → [{"intent": "deal_action_bulk", "params": {"actions": [{"brandName": "Nike", "action": "approve"}, {"brandName": "Puma", "action": "reject"}]}, "confidence": 0.95}, {"intent": "regenerate_deal_draft", "params": {"brandName": "Adidas", "instructions": "Tell them to double their budget"}, "confidence": 0.95}]
User: "Set latest draft to use my media kit" → [{"intent": "regenerate_deal_draft", "params": {"brandName": "recent", "instructions": "Attach media kit link"}, "confidence": 0.9}]
User: "Set a global rule: never accept sports deals for under $1000" → [{"intent": "set_deal_rate_rule", "params": {"brandIndustry": "sports", "minRate": 1000}, "confidence": 0.95}]
User: "Generate a contract summary for the Nike deal" → [{"intent": "generate_contract_summary", "params": {"brandName": "Nike"}, "confidence": 0.95}]

MORNING BRIEFING EXAMPLES:
User: "good morning" → [{"intent": "get_morning_briefing", "params": {}, "confidence": 0.8}]
User: "catch me up" → [{"intent": "get_morning_briefing", "params": {}, "confidence": 0.9}]
User: "kya hua raat mein?" → [{"intent": "get_morning_briefing", "params": {}, "confidence": 0.9}]
User: "any updates?" → [{"intent": "get_morning_briefing", "params": {}, "confidence": 0.85}]
User: "morning briefing" → [{"intent": "get_morning_briefing", "params": {}, "confidence": 0.95}]

USER MESSAGE: "${message}"

Return ONLY a valid JSON array. No markdown, no explanation, no extra text. Just the JSON array.`;

    try {
        const result = await generateContentWithFallback(prompt);
        let responseText = result.response.text().trim();

        // Stage 1: Use the shared auto-repair utility (strips markdown, preambles, quotes)
        responseText = repairAIOutput(responseText);

        // Stage 2: Try direct JSON parse
        let intents;
        try {
            intents = JSON.parse(responseText);
        } catch (parseErr) {
            // Stage 3: Regex extraction — find a JSON array anywhere in the response
            const arrayMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
            if (arrayMatch) {
                try {
                    intents = JSON.parse(arrayMatch[0]);
                } catch (e2) {
                    intents = null;
                }
            }

            // Stage 4: Maybe the model returned a single object instead of an array
            if (!intents) {
                const objMatch = responseText.match(/\{[\s\S]*?\}/);
                if (objMatch) {
                    try {
                        const obj = JSON.parse(objMatch[0]);
                        if (obj.intent) intents = [obj]; // wrap single intent in array
                    } catch (e3) {
                        intents = null;
                    }
                }
            }
        }

        if (!intents || !Array.isArray(intents) || intents.length === 0) {
            // Stage 5: Smart fallback — if ALL parsing failed, treat as general_chat
            // so the creator still gets a helpful response
            console.error('[ChatService] Could not parse intents from AI response. Treating as general_chat.');
            console.error('[ChatService] Raw AI response snippet:', responseText.substring(0, 200));
            return [{ intent: 'general_chat', params: { originalMessage: message }, confidence: 0.5 }];
        }

        // Ensure each intent has the required fields
        intents = intents.map(i => ({
            intent: i.intent || 'general_chat',
            params: i.params || {},
            confidence: typeof i.confidence === 'number' ? i.confidence : 0.8
        }));

        console.log(`[ChatService] Parsed ${intents.length} intent(s) from: "${message}"`);
        return intents;
    } catch (error) {
        console.error('[ChatService] Intent parsing failed:', error.message);
        // Always recover gracefully — never crash, never leave the creator without a response
        return [{ intent: 'general_chat', params: { originalMessage: message }, confidence: 0.4 }];
    }
}

// ==================== EXECUTE INTENTS (Parallel) ====================
async function executeIntents(intents, context) {
    const results = [];

    // Separate general_chat from actionable intents
    const actionIntents = intents.filter(i => i.intent !== 'general_chat');
    const chatIntents = intents.filter(i => i.intent === 'general_chat');

    // Execute all actionable intents sequentially
    if (actionIntents.length > 0) {
        for (const intentObj of actionIntents) {
            const handler = handlerRegistry.get(intentObj.intent);

            if (!handler) {
                results.push({
                    intent: intentObj.intent,
                    success: false,
                    message: `I don't know how to handle "${intentObj.intent}" yet. This feature may be coming soon!`,
                    data: null
                });
                continue;
            }

            try {
                const result = await handler.execute(intentObj.intent, intentObj.params || {}, context);
                results.push({
                    intent: intentObj.intent,
                    ...result
                });
            } catch (error) {
                console.error(`[ChatService] Handler error for ${intentObj.intent}:`, error.message);
                results.push({
                    intent: intentObj.intent,
                    success: false,
                    message: `Something went wrong with ${handler.name}: ${error.message}`,
                    data: null
                });
            }
        }
    }

    return { actionResults: results, hasChat: chatIntents.length > 0, chatIntents };
}

// ==================== FORMAT RESPONSE ====================
async function formatResponse(message, actionResults, hasChat, context) {
    const toasts = [];

    // Generate toasts from action results
    for (const result of actionResults) {
        toasts.push({
            type: result.success ? 'success' : 'error',
            title: formatIntentTitle(result.intent),
            message: result.message.substring(0, 100)
        });
    }

    // If we only had actions (no general chat), build response from results
    if (!hasChat && actionResults.length > 0) {
        if (actionResults.length === 1) {
            return {
                response: actionResults[0].message,
                toasts,
                actions: actionResults
            };
        }

        // Multiple actions — summarize
        const summary = actionResults.map((r, i) => {
            const icon = r.success ? '✅' : '❌';
            return `${icon} **${formatIntentTitle(r.intent)}**: ${r.message}`;
        }).join('\n\n');

        const successCount = actionResults.filter(r => r.success).length;
        const header = successCount === actionResults.length
            ? `Done! All ${actionResults.length} tasks completed:`
            : `Completed ${successCount}/${actionResults.length} tasks:`;

        return {
            response: `${header}\n\n${summary}`,
            toasts,
            actions: actionResults
        };
    }

    // General chat (with or without actions)
    let chatResponse = '';

    try {
        const contextInfo = actionResults.length > 0
            ? `\n\nI also just executed these actions for the creator:\n${actionResults.map(r => `- ${formatIntentTitle(r.intent)}: ${r.success ? 'Success' : 'Failed'} — ${r.message}`).join('\n')}`
            : '';

        const chatPrompt = `You are CreatorHub AI — the creator's AI employee, not a chatbot.
Talk like a chill coworker, not a corporate assistant. Use emojis naturally. Be SHORT.
${contextInfo}

HARD RULES:
- MAX 2 sentences for simple questions
- MAX 3 sentences for complex questions/feature explanations
- NEVER start with "Great question!" or "Absolutely!" or "I'd be happy to help"
- Talk like texting — casual, direct, helpful
- If they ask "how" to do something → give the exact command they should type

Your capabilities: comment auto-reply, DM auto-reply, asset management, brand deal finding, persona analysis, content targeting, time/comment limits, custom AI instructions, morning briefings, biolinks, cross-platform automation.

Creator says: "${message}"

Reply SHORT and helpful.`;

        const result = await generateContentWithFallback(chatPrompt);
        chatResponse = result.response.text().trim();
    } catch (error) {
        console.error('[ChatService] Chat response generation failed:', error.message);
        chatResponse = "Hey! I had a small hiccup processing that. Could you try rephrasing? 😊";
    }

    // If there were also actions, prepend their results
    if (actionResults.length > 0) {
        const actionSummary = actionResults.map(r => {
            const icon = r.success ? '✅' : '❌';
            return `${icon} ${r.message}`;
        }).join('\n');

        chatResponse = `${actionSummary}\n\n${chatResponse}`;
    }

    return {
        response: chatResponse,
        toasts,
        actions: actionResults
    };
}

// ==================== INTENT TITLE FORMATTER ====================
function formatIntentTitle(intent) {
    const titles = {
        'enable_comment_autoreply': 'Comment Auto-Reply',
        'disable_comment_autoreply': 'Comment Auto-Reply',
        'configure_comment_autoreply': 'Comment Settings',
        'enable_dm_autoreply': 'DM Auto-Reply',
        'disable_dm_autoreply': 'DM Auto-Reply',
        'configure_dm_autoreply': 'DM Settings',
        'set_dm_fallback': 'DM Fallback',
        'add_asset': 'Asset Added',
        'list_assets': 'Your Assets',
        'delete_asset': 'Asset Deleted',
        'toggle_asset': 'Asset Toggle',
        'subscribe_webhooks': 'Webhooks',
        'get_profile': 'Profile',
        'analyze_persona': 'Persona Analysis',
        'find_brand_deals': 'Brand Deals',
        'list_brand_deals': 'Brand Deals',
        'enable_comment_to_dm': 'Comment to DM',
        'disable_comment_to_dm': 'Comment to DM',
        'configure_comment_to_dm': 'Comment to DM',
        'enable_gamify_funnel': 'Gamified Funnel',
        'disable_gamify_funnel': 'Gamified Funnel',
        'configure_gamify_funnel': 'Gamified Funnel',
        'get_status': 'Status',
        'get_comments_log': 'Comment Log',
        'get_dm_log': 'DM Log',
        'set_content_target': 'Content Target',
        'set_time_limit': 'Time Limit',
        'set_comment_limit': 'Comment Limit',
        'get_preferences': 'Preferences',
        'reset_preferences': 'Reset Preferences',
        'enable_all_automation': 'All Automation',
        'disable_all_automation': 'All Automation',
        'set_platform_preference': 'Platform Preference',
        'create_biolink': 'BioLink Created',
        'update_biolink': 'BioLink Updated',
        'list_biolinks': 'Your BioLinks',
        'add_custom_instruction': 'Custom Rule Added',
        'list_custom_instructions': 'Custom Rules',
        'remove_custom_instruction': 'Custom Rule Removed',
        'clear_custom_instructions': 'Custom Rules Cleared',
        'get_morning_briefing': 'Morning Briefing',
        'general_chat': 'Chat'
    };

    return titles[intent] || intent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ==================== MAIN PROCESS FUNCTION ====================
async function processMessage(userId, message, token) {
    const context = { userId, token };

    console.log(`\n[ChatService] ====== Processing: "${message}" (user: ${userId}) ======`);

    // Step 1: Parse intents from the message
    const intents = await parseIntents(message, context);
    console.log(`[ChatService] Intents:`, JSON.stringify(intents));

    // Step 2: Execute all intents
    const { actionResults, hasChat, chatIntents } = await executeIntents(intents, context);
    console.log(`[ChatService] Actions: ${actionResults.length}, HasChat: ${hasChat}`);

    // Step 3: Format the response
    const { response, toasts, actions } = await formatResponse(message, actionResults, hasChat, context);

    // Step 4: Save to chat history
    try {
        let chatHistory = await ChatHistory.findOne({ userId });

        if (!chatHistory) {
            chatHistory = new ChatHistory({ userId, messages: [] });
        }

        // Add user message
        chatHistory.messages.push({
            role: 'user',
            content: message,
            actions: [],
            toasts: [],
            timestamp: new Date()
        });

        // Add assistant response
        chatHistory.messages.push({
            role: 'assistant',
            content: response,
            actions: actions.map(a => ({
                intent: a.intent,
                success: a.success,
                message: a.message,
                data: a.data
            })),
            toasts,
            timestamp: new Date()
        });

        // Keep only last 100 messages to prevent bloat
        if (chatHistory.messages.length > 100) {
            chatHistory.messages = chatHistory.messages.slice(-100);
        }

        await chatHistory.save();
    } catch (err) {
        console.error('[ChatService] Failed to save chat history:', err.message);
    }

    console.log(`[ChatService] ====== Done ======\n`);

    return {
        success: true,
        response,
        actions,
        toasts
    };
}

// ==================== GET CHAT HISTORY ====================
async function getChatHistory(userId, limit = 50) {
    try {
        const chatHistory = await ChatHistory.findOne({ userId });

        if (!chatHistory) {
            return { success: true, messages: [] };
        }

        const messages = chatHistory.messages.slice(-limit);

        return { success: true, messages };
    } catch (error) {
        console.error('[ChatService] Failed to get history:', error.message);
        return { success: false, messages: [], error: error.message };
    }
}

// ==================== DELETE CHAT HISTORY ====================
async function clearChatHistory(userId) {
    try {
        const chatHistory = await ChatHistory.findOne({ userId });
        if (!chatHistory) {
            return { success: true, message: 'History already empty' };
        }
        chatHistory.messages = [];
        await chatHistory.save();
        return { success: true, message: 'Chat history cleared' };
    } catch (error) {
        console.error('[ChatService] Failed to clear history:', error.message);
        return { success: false, error: 'Failed to clear history' };
    }
}

// ==================== DELETE SINGLE MESSAGE ====================
async function deleteMessage(userId, messageId) {
    try {
        const chatHistory = await ChatHistory.findOne({ userId });
        if (!chatHistory) {
            return { success: false, error: 'Chat history not found' };
        }
        
        const initialLength = chatHistory.messages.length;
        chatHistory.messages = chatHistory.messages.filter(msg => msg._id.toString() !== messageId);
        
        if (chatHistory.messages.length === initialLength) {
            return { success: false, error: 'Message not found' };
        }
        
        await chatHistory.save();
        return { success: true, message: 'Message deleted' };
    } catch (error) {
        console.error('[ChatService] Failed to delete message:', error.message);
        return { success: false, error: 'Failed to delete message' };
    }
}

module.exports = {
    processMessage,
    getChatHistory,
    clearChatHistory,
    deleteMessage,
    loadHandlers  // Exposed for testing/reloading
};
