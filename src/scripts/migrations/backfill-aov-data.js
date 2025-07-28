const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

async function backfillAOVData() {
  try {
    console.log("🔄 Starting AOV data backfill migration...");

    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.DATABASE_URL ||
      "mongodb://localhost:27017/milea-estate";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Get the KPIData model
    const KPIData = mongoose.model("KPIData");

    // Find all KPI records that don't have AOV data
    const kpiRecords = await KPIData.find({
      $or: [
        { "associatePerformance.aov": { $exists: false } },
        { "associatePerformance.aov": null },
      ],
    });

    console.log(
      `🔄 Found ${kpiRecords.length} KPI records to update with AOV data`,
    );

    let updatedCount = 0;

    for (const record of kpiRecords) {
      try {
        // Calculate AOV for each staff member
        const updatedAssociatePerformance = {};

        for (const [staffName, performance] of Object.entries(
          record.associatePerformance,
        )) {
          if (performance && typeof performance === "object") {
            // Calculate AOV: revenue / orders (convert cents to dollars)
            const revenue = performance.revenue || 0;
            const orders = performance.orders || 0;
            const aov = orders > 0 ? revenue / 100 / orders : 0; // Convert cents to dollars

            updatedAssociatePerformance[staffName] = {
              ...performance,
              aov: Math.round(aov * 100) / 100, // Round to 2 decimal places
            };
          }
        }

        // Update the record
        await KPIData.findByIdAndUpdate(record._id, {
          associatePerformance: updatedAssociatePerformance,
          updatedAt: new Date(),
        });

        updatedCount++;

        if (updatedCount % 10 === 0) {
          console.log(
            `🔄 Updated ${updatedCount}/${kpiRecords.length} records...`,
          );
        }
      } catch (error) {
        console.error(`❌ Error updating record ${record._id}:`, error);
      }
    }

    console.log(
      `✅ Successfully updated ${updatedCount} KPI records with AOV data`,
    );

    // Create index for AOV field
    console.log("🔄 Creating index for AOV field...");
    await KPIData.createIndex({ "associatePerformance.aov": 1 });
    console.log("✅ AOV index created");

    console.log("✅ AOV data backfill migration completed");
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
  backfillAOVData()
    .then(() => {
      console.log("🎉 Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { backfillAOVData };
