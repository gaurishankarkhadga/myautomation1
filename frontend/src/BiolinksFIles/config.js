// Environment Configuration Utility
export const config = {
  // Backend Configuration
  backendUrl: import.meta.env.VITE_BACKEND_URL,
  
  // App Configuration
  appName: import.meta.env.VITE_APP_NAME || 'MYVYTEX',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  appDescription: import.meta.env.VITE_APP_DESCRIPTION || 'The most advanced platform for creators to manage links, campaigns, collaborations, and grow their audience with AI-powered tools.',
  
  // Security Configuration
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  
  // Social Media Integration
  facebookAppId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
  instagramClientId: import.meta.env.VITE_INSTAGRAM_CLIENT_ID || '',
  
  // Payment Configuration
  cashfreeClientId: import.meta.env.VITE_CASHFREE_CLIENT_ID || '',
  cashfreeMode: import.meta.env.VITE_CASHFREE_MODE || 'sandbox',
  
  // Contact Information
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || 'ggs699000@gmail.com',
  contactPhone: import.meta.env.VITE_CONTACT_PHONE || '+91 8141166187',
  businessName: import.meta.env.VITE_BUSINESS_NAME || 'MYVYTEX',
  
  // Legal URLs
  privacyPolicyUrl: import.meta.env.VITE_PRIVACY_POLICY_URL || '/privacy-policy',
  termsConditionsUrl: import.meta.env.VITE_TERMS_CONDITIONS_URL || '/terms-and-conditions',
  dataDeletionUrl: import.meta.env.VITE_DATA_DELETION_URL || '/data-deletion-policy',
  
  // API Endpoints
  get apiBaseUrl() {
    return `${this.backendUrl}/api`;
  },
  
  // Utility Methods
  getImageUrl(imagePath) {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${this.backendUrl}${imagePath}`;
  },
  
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },
  
  // Environment Detection
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // Debug logging
  log: function(message, data = null) {
    if (this.enableDebug || this.isDevelopment) {
      console.log(`[${this.appName}] ${message}`, data);
    }
  }
};

// Export individual configs for convenience
export const {
  backendUrl,
  apiBaseUrl,
  appName,
  appVersion,
  contactEmail,
  contactPhone,
  businessName,
  getImageUrl,
  getAuthHeaders,
  isDevelopment,
  isProduction,
  log
} = config;

export default config;
