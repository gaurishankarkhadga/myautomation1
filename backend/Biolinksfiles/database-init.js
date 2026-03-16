const mongoose = require('mongoose');

// Simplified Database initialization script - ONLY BioLink
async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database indexes for BioLink...');
    
    // Ensure BioLink model is loaded
    require('./models/BioLink');

    const db = mongoose.connection.db;
    
    // Helper function to create index with error handling
    const createIndexSafely = async (collection, indexSpec, options = {}) => {
      try {
        await collection.createIndex(indexSpec, options);
        console.log(`✅ Index created: ${JSON.stringify(indexSpec)}`);
      } catch (error) {
        if (error.code === 86 || error.codeName === 'IndexKeySpecsConflict') {
          console.log(`ℹ️ Index already exists: ${JSON.stringify(indexSpec)}`);
        } else {
          console.warn(`⚠️ Index creation failed: ${JSON.stringify(indexSpec)} - ${error.message}`);
        }
      }
    };
    
    // BioLink indexes
    const biolinkCollection = db.collection('biolinks');
    await createIndexSafely(biolinkCollection, { userId: 1, lastModified: -1 });
    await createIndexSafely(biolinkCollection, { isPublished: 1 });
    await createIndexSafely(biolinkCollection, { 'analytics.views': -1 });
    await createIndexSafely(biolinkCollection, { username: 1 }, { unique: true, sparse: true });
    
    console.log('✅ BioLink database indexes created successfully');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

module.exports = { initializeDatabase };
