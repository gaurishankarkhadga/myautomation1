require('dotenv').config({ path: '/home/gaurishankar/Desktop/IDEAT/myautomation/backend/.env' });
const mongoose = require('mongoose');
const { WebhookEvent } = require('./model/Instaautomation');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    const events = await WebhookEvent.find().sort({ receivedAt: -1 }).limit(10);
    console.log('--- RECENT WEBHOOK EVENTS ---');
    events.forEach(e => console.log(`Time: ${e.receivedAt}, Object: ${e.object}, Count: ${e.entryCount}`));
    process.exit(0);
}
test();
