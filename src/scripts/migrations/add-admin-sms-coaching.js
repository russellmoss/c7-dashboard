const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

async function addAdminSmsCoaching() {
  let connection;
  
  try {
    console.log('🔄 Starting admin SMS coaching migration...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/milea-estate";
    if (!mongoUri) {
      throw new Error('MONGODB_URI or DATABASE_URL environment variable is required');
    }
    
    connection = await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Get the EmailSubscription model
    const EmailSubscription = mongoose.model('EmailSubscription');
    
    // Find documents that don't have adminCoaching field
    const documentsToUpdate = await EmailSubscription.find({
      $or: [
        { 'smsCoaching.adminCoaching': { $exists: false } },
        { 'isAdmin': { $exists: false } }
      ]
    });
    
    console.log(`📊 Found ${documentsToUpdate.length} documents to update`);
    
    if (documentsToUpdate.length === 0) {
      console.log('✅ No documents need updating - admin fields already exist');
      return;
    }
    
    // Update documents with default adminCoaching configuration and admin fields
    const result = await EmailSubscription.updateMany(
      {
        $or: [
          { 'smsCoaching.adminCoaching': { $exists: false } },
          { 'isAdmin': { $exists: false } }
        ]
      },
      {
        $set: {
          'smsCoaching.adminCoaching': {
            isActive: false,
            includeTeamMetrics: true,
            includeTopPerformers: true,
            includeBottomPerformers: true,
            includeGoalComparison: true,
            includeManagementTips: true,
            dashboards: [
              {
                periodType: 'mtd',
                frequency: 'weekly',
                timeEST: '09:00',
                dayOfWeek: 3,
                isActive: true
              },
              {
                periodType: 'qtd',
                frequency: 'monthly',
                timeEST: '09:00',
                dayOfWeek: 3,
                weekOfMonth: 1,
                isActive: true
              }
            ]
          },
          'isAdmin': false
        }
      }
    );
    
    console.log(`✅ Successfully updated ${result.modifiedCount} documents`);
    
    // Verify the update
    const updatedCount = await EmailSubscription.countDocuments({
      'smsCoaching.adminCoaching': { $exists: true },
      'isAdmin': { $exists: true }
    });
    
    console.log(`✅ Verification: ${updatedCount} documents now have admin fields`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run if called directly
if (require.main === module) {
  addAdminSmsCoaching()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addAdminSmsCoaching }; 