const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

async function updateSubscriberSchema() {
  try {
    console.log("🔄 Starting subscriber schema migration...");

    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.DATABASE_URL ||
      "mongodb://localhost:27017/milea-estate";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Get the EmailSubscription model
    const EmailSubscription = mongoose.model("EmailSubscription");

    // Update existing documents to add new fields
    console.log("🔄 Updating existing subscribers...");

    const updateResult = await EmailSubscription.updateMany(
      { personalizedGoals: { $exists: false } },
      {
        $set: {
          personalizedGoals: {
            bottleConversionRate: { enabled: false, value: 0 },
            clubConversionRate: { enabled: false, value: 0 },
            aov: { enabled: false, value: 0 },
          },
        },
      },
    );

    console.log(
      `✅ Updated ${updateResult.modifiedCount} subscribers with personalized goals`,
    );

    // Update SMS coaching fields
    const smsUpdateResult = await EmailSubscription.updateMany(
      { "smsCoaching.isActive": { $exists: false } },
      {
        $set: {
          "smsCoaching.isActive": false,
          "smsCoaching.phoneNumber": "",
          "smsCoaching.staffMembers": [],
        },
      },
    );

    console.log(
      `✅ Updated ${smsUpdateResult.modifiedCount} subscribers with SMS coaching fields`,
    );

    // Create indexes for new fields
    console.log("🔄 Creating indexes for new fields...");
    await EmailSubscription.createIndex({
      "personalizedGoals.bottleConversionRate.enabled": 1,
    });
    await EmailSubscription.createIndex({
      "personalizedGoals.clubConversionRate.enabled": 1,
    });
    await EmailSubscription.createIndex({ "personalizedGoals.aov.enabled": 1 });
    await EmailSubscription.createIndex({ "smsCoaching.isActive": 1 });
    await EmailSubscription.createIndex({ "smsCoaching.phoneNumber": 1 });

    console.log("✅ Indexes created for new fields");

    console.log("✅ Subscriber schema migration completed");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run migration if called directly
if (require.main === module) {
  updateSubscriberSchema()
    .then(() => {
      console.log("🎉 Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { updateSubscriberSchema };
