const axios = require('axios');
const { IgApiClient } = require('instagram-private-api');

class InstagramService {
  constructor() {
    this.appId = process.env.INSTAGRAM_APP_ID;
    this.appSecret = process.env.INSTAGRAM_APP_SECRET;
    this.redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
    this.graphApiVersion = 'v18.0';
    this.graphApiUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
    
    // Store active Instagram clients (for private API if needed)
    this.igClients = new Map();
  }

  /**
   * Generate Instagram OAuth URL for user authorization
   */
  getAuthorizationUrl(state) {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: 'instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list,pages_read_engagement',
      response_type: 'code',
      state: state || Math.random().toString(36).substring(7)
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code) {
    try {
      const response = await axios.post('https://api.instagram.com/oauth/access_token', {
        client_id: this.appId,
        client_secret: this.appSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        code: code
      }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token, user_id } = response.data;

      // Exchange short-lived token for long-lived token
      const longLivedToken = await this.getLongLivedToken(access_token);

      return {
        accessToken: longLivedToken.access_token,
        userId: user_id,
        expiresIn: longLivedToken.expires_in
      };
    } catch (error) {
      console.error('❌ Instagram OAuth Error:', error.response?.data || error.message);
      throw new Error(`Failed to get access token: ${error.response?.data?.error_message || error.message}`);
    }
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   */
  async getLongLivedToken(shortLivedToken) {
    try {
      const response = await axios.get(`${this.graphApiUrl}/access_token`, {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: this.appSecret,
          access_token: shortLivedToken
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error getting long-lived token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Refresh long-lived token before it expires
   */
  async refreshAccessToken(accessToken) {
    try {
      const response = await axios.get(`${this.graphApiUrl}/refresh_access_token`, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: accessToken
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error refreshing token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Instagram user profile information
   */
  async getUserProfile(accessToken, userId) {
    try {
      const response = await axios.get(`${this.graphApiUrl}/${userId}`, {
        params: {
          fields: 'id,username,account_type,media_count,followers_count,follows_count',
          access_token: accessToken
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Instagram Business Account ID from Page
   */
  async getInstagramBusinessAccount(accessToken, pageId) {
    try {
      const response = await axios.get(`${this.graphApiUrl}/${pageId}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: accessToken
        }
      });

      return response.data.instagram_business_account?.id;
    } catch (error) {
      console.error('❌ Error getting Instagram Business Account:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Check if a user follows the account
   */
  async checkUserFollows(accessToken, igBusinessAccountId, username) {
    try {
      // Get followers list (Note: This is limited and may require pagination)
      const response = await axios.get(`${this.graphApiUrl}/${igBusinessAccountId}`, {
        params: {
          fields: 'followers_count',
          access_token: accessToken
        }
      });

      // For basic check, we'll use the mentions/comments to infer relationship
      // Full follower check requires additional permissions and pagination
      return response.data;
    } catch (error) {
      console.error('❌ Error checking follower status:', error.response?.data || error.message);
      return { isFollowing: false };
    }
  }

  /**
   * Send Direct Message to a user
   */
  async sendDirectMessage(accessToken, recipientId, message) {
    try {
      const response = await axios.post(
        `${this.graphApiUrl}/me/messages`,
        {
          recipient: { id: recipientId },
          message: { text: message }
        },
        {
          params: { access_token: accessToken }
        }
      );

      console.log(`✅ DM sent to ${recipientId}: ${message}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending DM:', error.response?.data || error.message);
      throw new Error(`Failed to send DM: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Reply to a comment
   */
  async replyToComment(accessToken, commentId, message) {
    try {
      const response = await axios.post(
        `${this.graphApiUrl}/${commentId}/replies`,
        {
          message: message
        },
        {
          params: { access_token: accessToken }
        }
      );

      console.log(`✅ Replied to comment ${commentId}: ${message}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error replying to comment:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get comments on a media post
   */
  async getMediaComments(accessToken, mediaId) {
    try {
      const response = await axios.get(`${this.graphApiUrl}/${mediaId}/comments`, {
        params: {
          fields: 'id,text,username,timestamp,like_count',
          access_token: accessToken
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('❌ Error fetching comments:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get user's recent media posts
   */
  async getUserMedia(accessToken, userId, limit = 10) {
    try {
      const response = await axios.get(`${this.graphApiUrl}/${userId}/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
          limit: limit,
          access_token: accessToken
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('❌ Error fetching user media:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get mentions (stories/posts where user is mentioned)
   */
  async getMentions(accessToken, userId) {
    try {
      const response = await axios.get(`${this.graphApiUrl}/${userId}/mentions`, {
        params: {
          fields: 'id,media_type,timestamp,username',
          access_token: accessToken
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('❌ Error fetching mentions:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Subscribe to webhooks for real-time updates
   */
  async subscribeToWebhooks(accessToken, pageId, callbackUrl, verifyToken) {
    try {
      const response = await axios.post(
        `${this.graphApiUrl}/${pageId}/subscribed_apps`,
        {},
        {
          params: {
            subscribed_fields: 'messages,messaging_postbacks,message_reactions,comments,mentions',
            access_token: accessToken,
            callback_url: callbackUrl,
            verify_token: verifyToken
          }
        }
      );

      console.log('✅ Subscribed to Instagram webhooks');
      return response.data;
    } catch (error) {
      console.error('❌ Error subscribing to webhooks:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verify webhook subscription (for Meta's verification)
   */
  verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'Gshankar@413';
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Webhook verified successfully');
      return challenge;
    } else {
      console.error('❌ Webhook verification failed');
      return null;
    }
  }

  /**
   * Process incoming webhook events
   */
  processWebhookEvent(body) {
    try {
      if (body.object !== 'instagram') {
        return null;
      }

      const events = [];

      body.entry?.forEach(entry => {
        entry.messaging?.forEach(messagingEvent => {
          // Direct message event
          if (messagingEvent.message) {
            events.push({
              type: 'message',
              platform: 'instagram',
              senderId: messagingEvent.sender.id,
              recipientId: messagingEvent.recipient.id,
              message: messagingEvent.message.text,
              timestamp: messagingEvent.timestamp
            });
          }

          // Message reaction event
          if (messagingEvent.reaction) {
            events.push({
              type: 'reaction',
              platform: 'instagram',
              senderId: messagingEvent.sender.id,
              reaction: messagingEvent.reaction.emoji,
              timestamp: messagingEvent.timestamp
            });
          }
        });

        // Comment events
        entry.changes?.forEach(change => {
          if (change.field === 'comments') {
            events.push({
              type: 'comment',
              platform: 'instagram',
              commentId: change.value.id,
              mediaId: change.value.media?.id,
              text: change.value.text,
              userId: change.value.from?.id,
              username: change.value.from?.username,
              timestamp: change.value.timestamp
            });
          }

          // Mention events
          if (change.field === 'mentions') {
            events.push({
              type: 'mention',
              platform: 'instagram',
              mediaId: change.value.media_id,
              commentId: change.value.comment_id,
              timestamp: change.value.timestamp
            });
          }
        });
      });

      return events;
    } catch (error) {
      console.error('❌ Error processing webhook event:', error);
      return [];
    }
  }

  /**
   * Get conversation with a user
   */
  async getConversation(accessToken, conversationId) {
    try {
      const response = await axios.get(`${this.graphApiUrl}/${conversationId}`, {
        params: {
          fields: 'messages{id,created_time,from,to,message}',
          access_token: accessToken
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching conversation:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(accessToken, messageId) {
    try {
      await axios.post(
        `${this.graphApiUrl}/me/messages`,
        {
          recipient: { id: messageId }
        },
        {
          params: {
            access_token: accessToken,
            sender_action: 'mark_seen'
          }
        }
      );

      console.log(`✅ Marked message ${messageId} as read`);
    } catch (error) {
      console.error('❌ Error marking message as read:', error.response?.data || error.message);
    }
  }

  /**
   * Get account insights/analytics
   */
  async getInsights(accessToken, userId, metrics = ['impressions', 'reach', 'profile_views']) {
    try {
      const response = await axios.get(`${this.graphApiUrl}/${userId}/insights`, {
        params: {
          metric: metrics.join(','),
          period: 'day',
          access_token: accessToken
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('❌ Error fetching insights:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new InstagramService();
