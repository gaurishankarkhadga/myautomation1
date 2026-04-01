const {
    DmAutoReplySetting
} = require('../../model/Instaautomation');

module.exports = {
    name: 'customRule',
    intents: ['add_custom_instruction', 'list_custom_instructions', 'remove_custom_instruction', 'clear_custom_instructions'],

    async execute(intent, params, context) {
        const { userId } = context;

        try {
            // ==================== ADD A CUSTOM INSTRUCTION ====================
            if (intent === 'add_custom_instruction') {
                const instruction = params.instruction || params.rule || params.text;

                if (!instruction || instruction.trim().length === 0) {
                    return {
                        success: false,
                        message: 'Tell me the custom instruction you want me to follow. For example: "If someone asks about nutrition, reply in Hindi but still send the English link."'
                    };
                }

                const setting = await DmAutoReplySetting.findOneAndUpdate(
                    { userId },
                    {
                        userId,
                        $push: {
                            customInstructions: {
                                instruction: instruction.trim(),
                                active: true,
                                createdAt: new Date()
                            }
                        }
                    },
                    { upsert: true, new: true }
                );

                const totalRules = setting.customInstructions.length;

                return {
                    success: true,
                    message: `✅ Custom instruction saved! I now have ${totalRules} custom rule${totalRules > 1 ? 's' : ''} for your DMs.\n\n📝 **New Rule:** "${instruction.trim()}"`,
                    data: { totalRules, latestRule: instruction.trim(), automationType: 'custom_instruction' }
                };
            }

            // ==================== LIST ALL CUSTOM INSTRUCTIONS ====================
            if (intent === 'list_custom_instructions') {
                const setting = await DmAutoReplySetting.findOne({ userId });
                const instructions = setting?.customInstructions || [];

                if (instructions.length === 0) {
                    return {
                        success: true,
                        message: 'You don\'t have any custom instructions yet. Tell me something like: "Never mention prices in DMs" or "Always reply in Hindi to fans from India."'
                    };
                }

                const list = instructions.map((inst, i) => {
                    const status = inst.active ? '🟢' : '🔴';
                    return `${status} **${i + 1}.** ${inst.instruction}`;
                }).join('\n');

                return {
                    success: true,
                    message: `📋 **Your Custom DM Instructions (${instructions.length}):**\n\n${list}`,
                    data: { instructions: instructions.map(i => ({ instruction: i.instruction, active: i.active })) }
                };
            }

            // ==================== REMOVE A CUSTOM INSTRUCTION ====================
            if (intent === 'remove_custom_instruction') {
                const index = parseInt(params.index || params.number) - 1;

                const setting = await DmAutoReplySetting.findOne({ userId });
                const instructions = setting?.customInstructions || [];

                if (isNaN(index) || index < 0 || index >= instructions.length) {
                    return {
                        success: false,
                        message: `Please tell me which rule number to remove (1-${instructions.length}). Say "show my custom rules" to see them.`
                    };
                }

                const removed = instructions[index].instruction;
                instructions.splice(index, 1);
                setting.customInstructions = instructions;
                await setting.save();

                return {
                    success: true,
                    message: `🗑️ Removed custom instruction: "${removed}"\n\nYou have ${instructions.length} rule${instructions.length !== 1 ? 's' : ''} remaining.`,
                    data: { removedRule: removed, remainingRules: instructions.length }
                };
            }

            // ==================== CLEAR ALL CUSTOM INSTRUCTIONS ====================
            if (intent === 'clear_custom_instructions') {
                await DmAutoReplySetting.findOneAndUpdate(
                    { userId },
                    { customInstructions: [] },
                    { upsert: true }
                );

                return {
                    success: true,
                    message: '🧹 All custom instructions cleared! I\'m back to default AI behavior for your DMs.',
                    data: { totalRules: 0 }
                };
            }

            return { success: false, message: 'Unknown custom rule action.' };
        } catch (error) {
            console.error('[Handler:customRule] Error:', error.message);
            return { success: false, message: `Failed to manage custom instructions: ${error.message}` };
        }
    }
};
