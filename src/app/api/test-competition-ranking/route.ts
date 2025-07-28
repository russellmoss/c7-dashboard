import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import {
  CompetitionModel,
  EmailSubscriptionModel,
  KPIDataModel,
} from "@/lib/models";
import {
  calculateCompetitionRankings,
  getCacheStats,
} from "@/lib/competition-ranking";

export async function GET(request: NextRequest) {
  try {
    console.log("[TEST] Testing Competition Ranking Service...");

    await connectToDatabase();
    console.log("[TEST] ✅ Connected to database");

    // Check if we have any competitions
    const competitions = await CompetitionModel.find().limit(5);
    console.log(
      `[TEST] 📊 Found ${competitions.length} competitions in database`,
    );

    if (competitions.length === 0) {
      console.log(
        "[TEST] ⚠️  No competitions found. Creating a test competition...",
      );

      // Check if we have subscribers
      const subscribers = await EmailSubscriptionModel.find().limit(3);
      console.log(`[TEST] 👥 Found ${subscribers.length} subscribers`);

      if (subscribers.length === 0) {
        return NextResponse.json({
          success: false,
          error: "No subscribers found. Cannot create test competition.",
          message: "Please create some subscribers first via the admin panel.",
        });
      }

      // Check if we have KPI data
      const kpiData = await KPIDataModel.findOne({
        periodType: "mtd",
        year: new Date().getFullYear(),
        status: "completed",
      });

      if (!kpiData) {
        return NextResponse.json({
          success: false,
          error: "No MTD KPI data found.",
          message:
            "Please generate MTD KPI data first using the dashboard refresh button.",
        });
      }

      console.log("[TEST] ✅ Found KPI data for testing");

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
          customText: "Welcome to the test competition!",
          sendAt: null, // Manual send
          sent: false,
          sentAt: null,
        },
        progressNotifications: [],
        winnerAnnouncement: {
          scheduledAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
          ), // endDate + 1 hour
          sent: false,
          sentAt: null,
        },
        enrolledSubscribers: subscribers.map((s) => s._id),
        status: "active",
      });

      console.log(
        `[TEST] ✅ Created test competition: ${testCompetition.name}`,
      );

      // Test the ranking service
      console.log("[TEST] 🏆 Testing ranking calculation...");
      const rankings = await calculateCompetitionRankings(
        testCompetition._id.toString(),
      );

      // Clean up test competition
      await CompetitionModel.findByIdAndDelete(testCompetition._id);
      console.log("[TEST] 🧹 Cleaned up test competition");

      return NextResponse.json({
        success: true,
        message:
          "Test competition created and rankings calculated successfully",
        data: {
          competition: {
            name: testCompetition.name,
            type: testCompetition.type,
            dashboard: testCompetition.dashboard,
          },
          rankings: {
            totalParticipants: rankings.totalParticipants,
            calculatedAt: rankings.calculatedAt,
            entries: rankings.rankings.map((entry, index) => ({
              position: index + 1,
              name: entry.name,
              metricValue: entry.metricValue,
              rank: entry.rank,
              tied: entry.tied,
            })),
          },
        },
      });
    } else {
      // Test with existing competitions
      console.log("[TEST] 🏆 Testing with existing competitions...");

      const testResults = [];

      for (const competition of competitions) {
        console.log(`[TEST] 📊 Testing competition: ${competition.name}`);

        try {
          const rankings = await calculateCompetitionRankings(
            competition._id.toString(),
          );

          testResults.push({
            competitionId: competition._id.toString(),
            competitionName: competition.name,
            type: competition.type,
            dashboard: competition.dashboard,
            totalParticipants: rankings.totalParticipants,
            topRankings: rankings.rankings.slice(0, 3).map((entry, index) => ({
              position: index + 1,
              name: entry.name,
              metricValue: entry.metricValue,
              rank: entry.rank,
              tied: entry.tied,
            })),
          });
        } catch (error: any) {
          testResults.push({
            competitionId: competition._id.toString(),
            competitionName: competition.name,
            error: error.message,
          });
        }
      }

      // Get cache stats
      const cacheStats = getCacheStats();

      return NextResponse.json({
        success: true,
        message: `Tested ${competitions.length} existing competitions`,
        data: {
          competitions: testResults,
          cacheStats: {
            size: cacheStats.size,
            entries: cacheStats.entries.length,
          },
        },
      });
    }
  } catch (error: any) {
    console.error("[TEST] ❌ Test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Test failed",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
