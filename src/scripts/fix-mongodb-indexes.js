// Fix MongoDB indexes for custom reports
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env.local"),
});
const mongoose = require("mongoose");
const { connectToDatabase } = require("../lib/mongodb-cjs.cjs");

async function fixIndexes() {
  try {
    console.log("🔧 Fixing MongoDB indexes for custom reports...");

    await connectToDatabase();
    const db = mongoose.connection.db;

    // Drop all existing indexes except the default _id index
    console.log("🗑️ Dropping all existing indexes...");
    try {
      const indexes = await db.collection("kpi_data").listIndexes().toArray();
      for (const index of indexes) {
        if (index.name !== "_id_") {
          await db.collection("kpi_data").dropIndex(index.name);
          console.log(`✅ Dropped index: ${index.name}`);
        }
      }
    } catch (error) {
      console.log("ℹ️ Error dropping indexes:", error.message);
    }

    // Create new indexes
    console.log("🔨 Creating new indexes...");

    // For custom reports, include startDate and endDate in the unique constraint
    await db.collection("kpi_data").createIndex(
      { periodType: 1, year: 1, startDate: 1, endDate: 1 },
      {
        unique: true,
        partialFilterExpression: { periodType: "custom" },
        name: "custom_reports_unique",
      },
    );
    console.log("✅ Custom reports unique index created");

    // For standard reports (mtd, qtd, ytd, all-quarters), use the original unique constraint
    await db.collection("kpi_data").createIndex(
      { periodType: 1, year: 1 },
      {
        unique: true,
        partialFilterExpression: {
          periodType: { $in: ["mtd", "qtd", "ytd", "all-quarters"] },
        },
        name: "standard_reports_unique",
      },
    );
    console.log("✅ Standard reports unique index created");

    // General indexes
    await db.collection("kpi_data").createIndex({ createdAt: -1 });
    console.log("✅ Created index created");

    console.log("🎉 All indexes fixed successfully!");
  } catch (error) {
    console.error("❌ Error fixing indexes:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

fixIndexes();
