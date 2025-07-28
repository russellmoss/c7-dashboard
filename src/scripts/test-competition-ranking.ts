import { connectToDatabase } from "../lib/mongodb";
import {
  CompetitionModel,
  EmailSubscriptionModel,
  KPIDataModel,
} from "../lib/models";
import {
  calculateCompetitionRankings,
  getCacheStats,
} from "../lib/competition-ranking";

async function testCompetitionRanking() {
  try {
    console.log("🧪 Testing Competition Ranking Service...\n");

    await connectToDatabase();
    console.log("✅ Connected to database");

    // Check if we have any competitions
    const competitions = await CompetitionModel.find().limit(5);
    console.log(`📊 Found ${competitions.length} competitions in database`);

    if (competitions.length === 0) {
      console.log("⚠️  No competitions found. Creating a test competition...");

      // Check if we have subscribers
      const subscribers = await EmailSubscriptionModel.find().limit(3);
      console.log(`👥 Found ${subscribers.length} subscribers`);

      if (subscribers.length === 0) {
        console.log("❌ No subscribers found. Cannot create test competition.");
        return;
      }

      // Check if we have KPI data
      const kpiData = await KPIDataModel.findOne({
        periodType: "mtd",
        year: new Date().getFullYear(),
        status: "completed",
      });

      if (!kpiData) {
        console.log(
          "❌ No MTD KPI data found. Please generate KPI data first.",
        );
        return;
      }

      console.log("✅ Found KPI data for testing");

      // Create a test competition
      const testCompetition = await CompetitionModel.create({
        name: "Test Bottle Conversion Competition",
        type: "bottleConversion",
        dashboard: "mtd",
        prizes: {
          first: "🏆 First Place Prize",
          second: "🥈 Second Place Prize",
          third: "🥉 Third Place Prize",
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        welcomeMessage: {
          text: "Welcome to the test competition!",
          sendAt: new Date(),
          sent: false,
        },
        smsNotificationDates: [],
        winnerMessageSent: false,
        enrolledSubscribers: subscribers.map((s) => s._id),
        status: "active",
      });

      console.log(`✅ Created test competition: ${testCompetition.name}`);

      // Test the ranking service
      console.log("\n🏆 Testing ranking calculation...");
      const rankings = await calculateCompetitionRankings(
        testCompetition._id.toString(),
      );

      console.log(`📊 Competition: ${rankings.competitionName}`);
      console.log(`📈 Type: ${rankings.competitionType}`);
      console.log(`📅 Dashboard: ${rankings.dashboard}`);
      console.log(`👥 Participants: ${rankings.totalParticipants}`);
      console.log(`🕐 Calculated: ${rankings.calculatedAt}`);

      console.log("\n🏅 Rankings:");
      rankings.rankings.forEach((entry, index) => {
        const tieIndicator = entry.tied ? " (T)" : "";
        const metricDisplay =
          rankings.competitionType === "aov"
            ? `$${entry.metricValue.toFixed(2)}`
            : `${entry.metricValue.toFixed(1)}%`;

        console.log(
          `  ${index + 1}. ${entry.name} - ${metricDisplay} (Rank: ${entry.rank}${tieIndicator})`,
        );
      });

      // Test cache
      console.log("\n💾 Testing cache...");
      const cacheStats = getCacheStats();
      console.log(`Cache size: ${cacheStats.size}`);
      console.log(`Cache entries: ${cacheStats.entries.length}`);

      // Test cached retrieval
      console.log("\n🔄 Testing cached retrieval...");
      await calculateCompetitionRankings(
        testCompetition._id.toString(),
      );
      console.log("✅ Cached rankings retrieved successfully");

      // Clean up test competition
      await CompetitionModel.findByIdAndDelete(testCompetition._id);
      console.log("🧹 Cleaned up test competition");
    } else {
      // Test with existing competitions
      console.log("\n🏆 Testing with existing competitions...");

      for (const competition of competitions) {
        console.log(`\n📊 Testing competition: ${competition.name}`);

        try {
          const rankings = await calculateCompetitionRankings(
            competition._id.toString(),
          );

          console.log(`  📈 Type: ${rankings.competitionType}`);
          console.log(`  📅 Dashboard: ${rankings.dashboard}`);
          console.log(`  👥 Participants: ${rankings.totalParticipants}`);

          if (rankings.rankings.length > 0) {
            console.log("  🏅 Top 3 Rankings:");
            rankings.rankings.slice(0, 3).forEach((entry, index) => {
              const tieIndicator = entry.tied ? " (T)" : "";
              const metricDisplay =
                rankings.competitionType === "aov"
                  ? `$${entry.metricValue.toFixed(2)}`
                  : `${entry.metricValue.toFixed(1)}%`;

              console.log(
                `    ${index + 1}. ${entry.name} - ${metricDisplay} (Rank: ${entry.rank}${tieIndicator})`,
              );
            });
          } else {
            console.log("  ⚠️  No participants found");
          }
        } catch (error: any) {
          console.log(`  ❌ Error: ${error.message}`);
        }
      }
    }

    console.log("\n✅ Competition ranking service test completed!");
  } catch (error: any) {
    console.error("❌ Test failed:", error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testCompetitionRanking();
