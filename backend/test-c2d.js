require('dotenv').config();
const mongoose = require('mongoose');
const { CommentToDmSetting, AutoReplySetting, DmAutoReplySetting } = require('./model/Instaautomation');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myautomation');
    console.log('Connected DB');
    
    // Check user 26784030441232364
    const userId = "26784030441232364";
    const c2d = await CommentToDmSetting.findOne({ userId });
    console.log('C2D Settings:', !!c2d?.enabled, 'Expires:', c2d?.expiresAt);

    const auto = await AutoReplySetting.findOne({ userId });
    console.log('AutoReply:', !!auto?.enabled);

    const dmAuto = await DmAutoReplySetting.findOne({ userId });
    console.log('DM AutoReply:', !!dmAuto?.enabled);

    process.exit(0);
}
test();
