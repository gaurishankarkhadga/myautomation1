/**
 * Shared Instagram Graph API configuration
 */
const GRAPH_BASE_URL = `${process.env.INSTAGRAM_GRAPH_API_BASE_URL || 'https://graph.facebook.com'}/v${process.env.INSTAGRAM_GRAPH_API_VERSION || '18.0'}`;

module.exports = {
    GRAPH_BASE_URL
};
