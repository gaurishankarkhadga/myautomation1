require('dotenv').config();
const axios = require('axios');

async function test() {
    console.log('Sending mock webhook...');
    try {
        const payload = {
            object: 'instagram',
            entry: [{
                id: '26784030441232364',
                changes: [{
                    field: 'comments',
                    value: {
                        id: 'test_comment_123',
                        text: 'wow',
                        from: { id: '999999999', username: 'test_user_fan' },
                        media: { id: '18386968303086238', media_product_type: 'REELS' },
                        timestamp: Date.now() / 1000
                    }
                }]
            }]
        };

        const res = await axios.post('http://localhost:5000/api/instagram/webhook', payload);
        console.log('Webhook Response:', res.status, res.data);
    } catch(e) {
        console.error('Webhook failed:', e.response?.data || e.message);
    }
    process.exit(0);
}
test();
