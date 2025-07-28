const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

async function createCompetitionCollection() {
  try {
    console.log("🔄 Starting competition collection migration...");

    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.DATABASE_URL ||
      "mongodb://localhost:27017/milea-estate";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Define the Competition schema
    const CompetitionSchema = new mongoose.Schema({
      name: { type: String, required: true },
      type: {
        type: String,
        enum: ["bottleConversion", "clubConversion", "aov"],
        required: true,
      },
      competitionType: {
        type: String,
        enum: ["ranking", "target"],
        required: true,
        default: "ranking",
      },
      dashboard: { type: String, enum: ["mtd", "qtd", "ytd"], required: true },
      prizes: {
        first: { type: String, required: true },
        second: { type: String, required: true },
        third: { type: String, required: true },
      },
      targetGoals: {
        bottleConversionRate: {
          type: Number,
          min: 0,
          max: 100,
          required: false,
        },
        clubConversionRate: { type: Number, min: 0, max: 100, required: false },
        aov: { type: Number, min: 0, required: false },
      },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      welcomeMessage: {
        customText: { type: String, required: true },
        sendAt: { type: Date, default: null },
        scheduledDate: { type: String, default: "" },
        scheduledTime: { type: String, default: "09:00" },
        sent: { type: Boolean, default: false },
        sentAt: { type: Date, default: null },
      },
      progressNotifications: [
        {
          id: { type: String, required: true },
          scheduledDate: { type: String, required: true },
          scheduledTime: { type: String, required: true },
          customMessage: { type: String, required: true },
          scheduledAt: { type: Date, required: true },
          sent: { type: Boolean, default: false },
          sentAt: { type: Date, default: null },
        },
      ],
      winnerAnnouncement: {
        scheduledDate: { type: String, default: "" },
        scheduledTime: { type: String, default: "17:00" },
        scheduledAt: { type: Date, required: true },
        sent: { type: Boolean, default: false },
        sentAt: { type: Date, default: null },
      },
      enrolledSubscribers: [
        { type: mongoose.Schema.Types.ObjectId, ref: "EmailSubscription" },
      ],
      status: {
        type: String,
        enum: ["draft", "active", "completed", "archived"],
        default: "draft",
      },
      finalRankings: [],
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });

    // Create indexes
    CompetitionSchema.index({ status: 1 });
    CompetitionSchema.index({ startDate: 1, endDate: 1 });
    CompetitionSchema.index({ "welcomeMessage.sendAt": 1 });
    CompetitionSchema.index({ "progressNotifications.scheduledAt": 1 });
    CompetitionSchema.index({ "winnerAnnouncement.scheduledAt": 1 });
    CompetitionSchema.index({ enrolledSubscribers: 1 });

    // Create the model
    const Competition = mongoose.model("Competition", CompetitionSchema);

    // Check if collection exists
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const competitionExists = collections.some(
      (col) => col.name === "competitions",
    );

    if (competitionExists) {
      console.log("✅ Competition collection already exists");
    } else {
      console.log("🔄 Creating competition collection...");
      await Competition.createCollection();
      console.log("✅ Competition collection created");
    }

    // Create indexes
    console.log("🔄 Creating indexes...");
    await Competition.createIndexes();
    console.log("✅ Indexes created");

    console.log("✅ Competition collection migration completed");
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
  createCompetitionCollection()
    .then(() => {
      console.log("🎉 Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { createCompetitionCollection };
