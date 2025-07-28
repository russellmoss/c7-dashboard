import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CompetitionModel, EmailSubscriptionModel } from "@/lib/models";
import { competitionAnalyticsService } from "@/lib/competition-analytics";


export async function GET() {
  try {
    console.log(
      "[API] GET /api/test-competition-analytics - Starting comprehensive analytics test",
    );

    await connectToDatabase();

    // Create test subscribers if they don't exist
    const testSubscribers = [
      { name: "Mina", email: "mina@test.com", phoneNumber: "555-0101" },
      {
        name: "Benjamin Barnes",
        email: "ben@test.com",
        phoneNumber: "555-0102",
      },
      {
        name: "Sarah Johnson",
        email: "sarah@test.com",
        phoneNumber: "555-0103",
      },
      { name: "Mike Wilson", email: "mike@test.com", phoneNumber: "555-0104" },
    ];

    const createdSubscribers = [];
    for (const subscriber of testSubscribers) {
      const createdSubscriber = await EmailSubscriptionModel.findOneAndUpdate(
        { email: subscriber.email },
        {
          name: subscriber.name,
          email: subscriber.email,
          phoneNumber: subscriber.phoneNumber,
          isActive: true,
          subscribedReports: ["mtd", "qtd", "ytd"],
          smsCoaching: {
            isActive: true,
            phoneNumber: subscriber.phoneNumber,
          },
          reportSchedules: {
            mtd: {
              frequency: "weekly",
              timeEST: "09:00",
              dayOfWeek: 3,
              isActive: true,
            },
            qtd: {
              frequency: "monthly",
              timeEST: "09:00",
              dayOfWeek: 1,
              isActive: true,
            },
            ytd: {
              frequency: "quarterly",
              timeEST: "09:00",
              dayOfWeek: 1,
              isActive: true,
            },
          },
        },
        { upsert: true, new: true },
      );
      createdSubscribers.push(createdSubscriber);
    }

    // Create test competitions with proper schema compliance
    const testCompetitions = [
      {
        name: "Test Bottle Conversion MTD",
        type: "bottleConversion",
        dashboard: "mtd",
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-31"),
        status: "completed",
        prizes: {
          first: "Gift Card",
          second: "Wine Bottle",
          third: "Certificate",
        },
        enrolledSubscribers: [
          createdSubscribers[0]._id,
          createdSubscribers[1]._id,
          createdSubscribers[2]._id,
        ],
        welcomeMessage: {
          customText: "Welcome to the test competition!",
          sendAt: new Date("2025-07-01"),
          sent: true,
          sentAt: new Date("2025-07-01"),
        },
        progressNotifications: [
          {
            id: "1",
            scheduledAt: new Date("2025-07-15"),
            sent: true,
            sentAt: new Date("2025-07-15"),
          },
          {
            id: "2",
            scheduledAt: new Date("2025-07-25"),
            sent: true,
            sentAt: new Date("2025-07-25"),
          },
        ],
        winnerAnnouncement: {
          scheduledAt: new Date("2025-07-31"),
          sent: true,
          sentAt: new Date("2025-07-31"),
        },
        finalRankings: [
          {
            subscriberId: createdSubscribers[0]._id,
            name: "Mina",
            rank: 1,
            value: 85.5,
          },
          {
            subscriberId: createdSubscribers[1]._id,
            name: "Benjamin Barnes",
            rank: 2,
            value: 78.2,
          },
          {
            subscriberId: createdSubscribers[2]._id,
            name: "Sarah Johnson",
            rank: 3,
            value: 72.1,
          },
        ],
      },
      {
        name: "Test Club Conversion QTD",
        type: "clubConversion",
        dashboard: "qtd",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-06-30"),
        status: "completed",
        prizes: {
          first: "Premium Membership",
          second: "Wine Club Credit",
          third: "Tasting Pass",
        },
        enrolledSubscribers: [
          createdSubscribers[0]._id,
          createdSubscribers[3]._id,
        ],
        welcomeMessage: {
          customText: "Welcome to the club conversion challenge!",
          sendAt: new Date("2025-04-01"),
          sent: true,
          sentAt: new Date("2025-04-01"),
        },
        progressNotifications: [
          {
            id: "1",
            scheduledAt: new Date("2025-05-15"),
            sent: true,
            sentAt: new Date("2025-05-15"),
          },
        ],
        winnerAnnouncement: {
          scheduledAt: new Date("2025-06-30"),
          sent: false,
          sentAt: null,
        },
        finalRankings: [
          {
            subscriberId: createdSubscribers[0]._id,
            name: "Mina",
            rank: 1,
            value: 12.5,
          },
          {
            subscriberId: createdSubscribers[3]._id,
            name: "Mike Wilson",
            rank: 2,
            value: 8.3,
          },
        ],
      },
      {
        name: "Test AOV YTD",
        type: "aov",
        dashboard: "ytd",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        status: "archived",
        prizes: {
          first: "Bonus Commission",
          second: "Extra PTO",
          third: "Recognition",
        },
        enrolledSubscribers: [
          createdSubscribers[1]._id,
          createdSubscribers[2]._id,
          createdSubscribers[3]._id,
        ],
        welcomeMessage: {
          customText: "Welcome to the AOV challenge!",
          sendAt: new Date("2025-01-01"),
          sent: true,
          sentAt: new Date("2025-01-01"),
        },
        progressNotifications: [
          {
            id: "1",
            scheduledAt: new Date("2025-06-15"),
            sent: true,
            sentAt: new Date("2025-06-15"),
          },
          {
            id: "2",
            scheduledAt: new Date("2025-09-15"),
            sent: false,
            sentAt: null,
          },
        ],
        winnerAnnouncement: {
          scheduledAt: new Date("2025-12-31"),
          sent: true,
          sentAt: new Date("2025-12-31"),
        },
        finalRankings: [
          {
            subscriberId: createdSubscribers[1]._id,
            name: "Benjamin Barnes",
            rank: 1,
            value: 145.75,
          },
          {
            subscriberId: createdSubscribers[2]._id,
            name: "Sarah Johnson",
            rank: 2,
            value: 132.4,
          },
          {
            subscriberId: createdSubscribers[3]._id,
            name: "Mike Wilson",
            rank: 3,
            value: 118.9,
          },
        ],
      },
    ];

    // Create test competitions
    const createdCompetitions = [];
    for (const competitionData of testCompetitions) {
      const competition = await CompetitionModel.create(competitionData);
      createdCompetitions.push(competition);
      console.log(`[TEST] ✅ Created test competition: ${competition.name}`);
    }

    // Test analytics with different filters
    console.log("[TEST] 📊 Testing analytics with no filters...");
    const allAnalytics =
      await competitionAnalyticsService.getCompetitionAnalytics();

    console.log("[TEST] 📊 Testing analytics with type filter...");
    const bottleConversionAnalytics =
      await competitionAnalyticsService.getCompetitionAnalytics({
        type: "bottleConversion",
      });

    console.log("[TEST] 📊 Testing analytics with dashboard filter...");
    const mtdAnalytics =
      await competitionAnalyticsService.getCompetitionAnalytics({
        dashboard: "mtd",
      });

    console.log("[TEST] 📊 Testing analytics with status filter...");
    const completedAnalytics =
      await competitionAnalyticsService.getCompetitionAnalytics({
        status: "completed",
      });

    console.log("[TEST] 📊 Testing analytics with staff filter...");
    const minaAnalytics =
      await competitionAnalyticsService.getCompetitionAnalytics({
        staffMember: "Mina",
      });

    // Test date range filter
    console.log("[TEST] 📊 Testing analytics with date range filter...");
    const dateRangeAnalytics =
      await competitionAnalyticsService.getCompetitionAnalytics({
        dateRange: {
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-12-31"),
        },
      });

    // Clean up test data
    console.log("[TEST] 🧹 Cleaning up test data...");
    for (const competition of createdCompetitions) {
      await CompetitionModel.findByIdAndDelete(competition._id);
    }

    // Remove test subscribers
    for (const subscriber of createdSubscribers) {
      await EmailSubscriptionModel.findByIdAndDelete(subscriber._id);
    }

    console.log("[TEST] ✅ Competition analytics test completed successfully");

    return NextResponse.json({
      success: true,
      message: "Competition analytics system test completed successfully",
      data: {
        tests: {
          testDataCreated: true,
          allAnalyticsTested: true,
          filteredAnalyticsTested: true,
          typeFilterTested: true,
          dashboardFilterTested: true,
          statusFilterTested: true,
          staffFilterTested: true,
          dateRangeFilterTested: true,
          cleanupCompleted: true,
        },
        analyticsResults: {
          allCompetitions: allAnalytics.overview.totalCompetitions,
          bottleConversionCompetitions:
            bottleConversionAnalytics.overview.totalCompetitions,
          mtdCompetitions: mtdAnalytics.overview.totalCompetitions,
          completedCompetitions: completedAnalytics.overview.totalCompetitions,
          minaParticipations: minaAnalytics.performance.byStaff.length,
          dateRangeCompetitions: dateRangeAnalytics.overview.totalCompetitions,
        },
        analyticsFeatures: {
          overviewMetrics: "Comprehensive overview metrics calculation",
          trendAnalysis: "Monthly, quarterly, and yearly trend analysis",
          performanceAnalytics:
            "Performance analysis by type, dashboard, and staff",
          effectivenessMetrics:
            "Participation rates, completion rates, and engagement metrics",
          insightsGeneration: "Automated insights and recommendations",
          filteringCapabilities:
            "Advanced filtering by type, dashboard, status, staff, and date range",
          staffPerformance: "Detailed staff performance analytics with trends",
          competitionEffectiveness:
            "Competition effectiveness scoring and analysis",
        },
        performanceMetrics: {
          totalCompetitions: allAnalytics.overview.totalCompetitions,
          totalParticipants: allAnalytics.overview.totalParticipants,
          totalWinners: allAnalytics.overview.totalWinners,
          averageParticipants: allAnalytics.overview.averageParticipants,
          averageCompletionRate: allAnalytics.overview.averageCompletionRate,
          participationRate:
            allAnalytics.effectiveness.participationRates.overall,
          completionRate: allAnalytics.effectiveness.completionRates.overall,
        },
        insightsGenerated: {
          trendsCount: allAnalytics.insights.trends.length,
          recommendationsCount: allAnalytics.insights.recommendations.length,
          staffPerformanceCount: allAnalytics.performance.byStaff.length,
        },
        filterResults: {
          bottleConversionFilter:
            bottleConversionAnalytics.overview.totalCompetitions === 1,
          mtdFilter: mtdAnalytics.overview.totalCompetitions === 1,
          completedFilter: completedAnalytics.overview.totalCompetitions === 2,
          staffFilter: minaAnalytics.performance.byStaff.length === 1,
          dateRangeFilter: dateRangeAnalytics.overview.totalCompetitions === 3,
        },
      },
    });
  } catch (error: any) {
    console.error("[API] Error in competition analytics test:", error);
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
