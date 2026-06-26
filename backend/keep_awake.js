const axios = require('axios');

/**
 * Keep-Awake Script for Render Free Tier
 * Run this script to ping your Render backend every 14 minutes.
 * 
 * Usage: 
 *   node keep_awake.js https://your-backend-url.onrender.com
 */

const url = process.argv[2] || process.env.BACKEND_URL;

if (!url) {
  console.error('Please provide a URL to ping. Example: node keep_awake.js https://my-app.onrender.com');
  process.exit(1);
}

const pingInterval = 14 * 60 * 1000; // 14 minutes

const pingService = async () => {
  try {
    const targetUrl = `${url.replace(/\/$/, '')}/api/health`;
    console.log(`[${new Date().toISOString()}] Pinging ${targetUrl}...`);
    const response = await axios.get(targetUrl);
    console.log(`[${new Date().toISOString()}] OK! Service is awake (Status: ${response.data.status})`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Ping failed:`, error.message);
  }
};

// Ping immediately on start
pingService();

// Schedule regular pings
setInterval(pingService, pingInterval);
console.log(`Started keep-awake script. Pinging every 14 minutes.`);
