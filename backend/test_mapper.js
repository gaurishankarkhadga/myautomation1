const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect('mongodb+srv://kiran:gshankar413@cluster0.yvxpg.mongodb.net/creatorhubtesting?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
    const { AutoReplySetting, DmAutoReplySetting, Token, CommentToDmSetting } = require('./model/Instaautomation');
    
    // We want to see how many users share the same token OR how the $ne query maps users.
    const allTokens = await Token.find({}).lean();
    console.log('Total tokens:', allTokens.length);
    
    // Let's test the EXACT code that resolveUserIdMapping runs
    // Imagine webhook hits for their instagram page ID (let's say 17841478194355579 which is ONE of the IDs)
    const igUserId = "17841478194355579";
    
    const hasOwnToken = await Token.findOne({ userId: igUserId });
    const otherToken = await Token.findOne({ userId: { $ne: igUserId } });
    const sourceId = otherToken ? otherToken.userId : null;
    
    console.log("igUserId:", igUserId);
    console.log("hasOwnToken:", !!hasOwnToken);
    console.log("sourceId resolved to:", sourceId);
    
    // The bug: it resolves to "26784030441232364" (or whichever is first in the DB)
    // If it's a completely random user, it syncs THEIR settings to this webhook ID!
    
    mongoose.disconnect();
});
