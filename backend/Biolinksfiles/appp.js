require('dotenv').config();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;


// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
}));

// Basic middleware with proper CORS
app.use(cors({
  origin: ['http://localhost:5173','https://dream-3-frontend.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
// Static files with permissive CORP for images
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB with better error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/creatorhub')
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Initialize database indexes and sample data
    try {
      const { initializeDatabase } = require('./database-init');
      await initializeDatabase();
    } catch (error) {
      console.error('❌ Database initialization error:', error);
    }
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('⚠️  Continuing without database - using in-memory storage');
  });

// Create uploads directory
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'CreatorHub API Server', 
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Import and use routers with individual error handling
try {
  const biolinkRouter = require('./biolink');
  app.use('/api/biolinks', biolinkRouter);
  console.log('✅ Biolink router loaded');
} catch (error) {
  console.error('❌ Error loading biolink router:', error.message);
}



// SIMPLE USERNAME CHECK - NO REGEX (GET endpoint for frontend)
app.get('/api/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    let available = true;
    
    // Check BioLink only
    const BioLink = mongoose.models.BioLink;
    if (BioLink) {
      const biolink = await BioLink.findOne({ username: username });
      if (biolink) available = false;
    }
    
    res.json({ available, username });
  } catch (err) {
    console.error('Error checking username:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SIMPLE USERNAME CHECK - NO REGEX (POST endpoint for backward compatibility)
app.post('/api/check-username', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    let available = true;
    
    // Check BioLink only
    const BioLink = mongoose.models.BioLink;
    if (BioLink) {
      const biolink = await BioLink.findOne({ username: username });
      if (biolink) available = false;
    }
    
    res.json({ available, username });
  } catch (err) {
    console.error('Error checking username:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Simplified API status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    routes: {
      biolinks: '/api/biolinks/*',
      health: '/health'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler (Express v5 compatible - no wildcard path)
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found', 
    method: req.method, 
    url: req.originalUrl,
    suggestion: 'Check /api/status for available routes'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Global error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test biolinks: http://localhost:${PORT}/api/biolinks/test`);
});

module.exports = app;