const axios = require('axios');
const CreatorPreference = require('../model/CreatorPreference');

const GRAPH_BASE_URL = 'https://graph.instagram.com/v21.0';

/**
 * Fetches media from Instagram and filters it based on the user's CreatorPreference (Content Target).
 * If no token is provided or API fails, returns an empty array.
 */
async function fetchFilteredMedia(token, userId) {
    if (!token) return [];
    
    try {
        // Fetch preferences to know the correct target
        const prefs = userId ? await CreatorPreference.findOne({ userId }).lean() : null;
        const targetType = prefs?.contentTarget?.type || 'all';
        const maxPosts = prefs?.contentTarget?.maxPosts || 5;
        const specificPostId = prefs?.contentTarget?.specificPostId;

        // Fetch basic recent media
        const res = await axios.get(`${GRAPH_BASE_URL}/me/media`, {
            params: {
                fields: 'id,caption,media_type,thumbnail_url,timestamp,permalink',
                access_token: token,
                limit: 15 // Fetch a bit more to allow searching
            }
        });
        
        const rawMedia = res.data?.data || [];
        if (rawMedia.length === 0) return [];

        // Apply filtering logic
        if (targetType === 'all') {
            return maxPosts > 0 ? rawMedia.slice(0, maxPosts) : rawMedia.slice(0, 5);
        }
        
        if (targetType === 'recent' || targetType === 'first') {
            return [rawMedia[0]].filter(Boolean);
        }
        
        if (targetType === 'previous' || targetType === 'second') {
            return [rawMedia[1]].filter(Boolean);
        }
        
        if (targetType === 'specific' && specificPostId) {
            const specificMedia = rawMedia.find(m => m.id === specificPostId);
            return specificMedia ? [specificMedia] : [rawMedia[0]];
        }
        
        // Fallback
        return rawMedia.slice(0, 5);
    } catch (error) {
        console.error('[mediaUtils] Error fetching media:', error.message);
        return [];
    }
}

module.exports = {
    fetchFilteredMedia
};
