require('dotenv').config();
const mongoose = require('mongoose');
const aiService = require('./service/aiService');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myautomation');
    console.log('Connected DB');
    
    // We will test generateSmartDMReply with minimal data
    try {
        const reply = await aiService.generateSmartDMReply(
            'fake_user_id', 
            'wow', 
            'test_user', 
            [], 
            false, 
            ['THE CREATOR WROTE THIS EXACT MESSAGE: "here is the link"']
        );
        console.log('SUCCESS:', reply);
    } catch(e) {
        console.error('FAILED:', e);
    }
    process.exit(0);
}
test();
