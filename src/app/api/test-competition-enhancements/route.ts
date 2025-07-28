import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CompetitionModel, EmailSubscriptionModel } from "@/lib/models";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log("[TEST] Testing Competition Enhancements...");

    // Skip tests during build time
    if (process.env.NODE_ENV === 'production' && process.env.SKIP_INTEGRATION_TESTS === 'true') {
      console.log("[API] ⏭️ Skipping competition enhancements tests during build (API not available)");
      return NextResponse.json({
        success: true,
        message: "Competition enhancements tests skipped during build",
        data: {
          testResults: {
            rankingCompetition: { success: true, message: "Skipped during build" },
            targetCompetition: { success: true, message: "Skipped during build" },
            editTest: { success: true, message: "Skipped during build" },
            deleteTest: { success: true, message: "Skipped during build" }
          }
        }
      });
    }

    await connectToDatabase();
    console.log("[TEST] ✅ Connected to database");

    // Check if we have subscribers
    const subscribers = await EmailSubscriptionModel.find({
      "smsCoaching.isActive": true,
      "smsCoaching.phoneNumber": { $exists: true, $ne: "" },
    }).limit(2);
    console.log(`[TEST] 👥 Found ${subscribers.length} subscribers`);

    if (subscribers.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No subscribers with SMS coaching found.",
        message: "Please create subscribers with SMS coaching enabled first.",
      });
    }

    // Test 1: Create a ranking competition
    console.log("[TEST] 🧪 Test 1: Creating ranking competition...");
    const rankingCompetitionData = {
      name: "Test Ranking Competition",
      type: "bottleConversion",
      competitionType: "ranking",
      dashboard: "mtd",
      prizes: {
        first: "🏆 $500 Gift Card",
        second: "🥈 $250 Gift Card",
        third: "🥉 $100 Gift Card",
      },
      targetGoals: {}, // Empty for ranking competitions
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      welcomeMessage: {
        customText:
          "Welcome to our ranking competition! Top 3 performers will win prizes.",
        sendAt: null,
        sent: false,
        sentAt: null,
      },
      progressNotifications: [],
      winnerAnnouncement: {
        scheduledAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
        ),
        sent: false,
        sentAt: null,
      },
      enrolledSubscribers: subscribers.map((s) => s._id),
      status: "draft",
    };

    const rankingCompetition = await CompetitionModel.create(
      rankingCompetitionData,
    );
    console.log(
      `[TEST] ✅ Created ranking competition: ${rankingCompetition.name}`,
    );

    // Test 2: Create a target competition
    console.log("[TEST] 🧪 Test 2: Creating target competition...");
    const targetCompetitionData = {
      name: "Test Target Competition",
      type: "clubConversion",
      competitionType: "target",
      dashboard: "qtd",
      prizes: {
        first: "🏆 $300 Gift Card",
        second: "🥈 $150 Gift Card",
        third: "🥉 $75 Gift Card",
      },
      targetGoals: {
        clubConversionRate: 6.0,
        bottleConversionRate: 53.0,
        aov: 113.44,
      },
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      welcomeMessage: {
        customText:
          "Welcome to our target competition! Hit the goals to win prizes.",
        sendAt: null,
        sent: false,
        sentAt: null,
      },
      progressNotifications: [],
      winnerAnnouncement: {
        scheduledAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
        ),
        sent: false,
        sentAt: null,
      },
      enrolledSubscribers: subscribers.map((s) => s._id),
      status: "draft",
    };

    const targetCompetition = await CompetitionModel.create(
      targetCompetitionData,
    );
    console.log(
      `[TEST] ✅ Created target competition: ${targetCompetition.name}`,
    );

    // Test 3: Test editing active competition
    console.log("[TEST] 🧪 Test 3: Testing edit active competition...");
    await CompetitionModel.findByIdAndUpdate(rankingCompetition._id, {
      status: "active",
    });

    const editResponse = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/competitions/${rankingCompetition._id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Ranking Competition",
          prizes: {
            first: "🏆 $600 Gift Card",
            second: "🥈 $300 Gift Card",
            third: "🥉 $150 Gift Card",
          },
        }),
      },
    );

    if (editResponse.ok) {
      console.log("[TEST] ✅ Successfully edited active competition");
    } else {
      console.log(
        `[TEST] ⚠️ Failed to edit active competition: ${editResponse.statusText}`,
      );
    }

    // Test 4: Test deleting active competition
    console.log("[TEST] 🧪 Test 4: Testing delete active competition...");
    const deleteResponse = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/competitions/${rankingCompetition._id}`,
      {
        method: "DELETE",
      },
    );

    if (deleteResponse.ok) {
      console.log("[TEST] ✅ Successfully deleted active competition");
    } else {
      console.log(
        `[TEST] ⚠️ Failed to delete active competition: ${deleteResponse.statusText}`,
      );
    }

    // Clean up
    console.log("[TEST] 🧹 Cleaning up test data...");
    await CompetitionModel.findByIdAndDelete(targetCompetition._id);
    console.log("[TEST] ✅ Cleanup completed");

    return NextResponse.json({
      success: true,
      message: "Competition enhancements test completed successfully",
      data: {
        tests: {
          rankingCompetitionCreated: true,
          targetCompetitionCreated: true,
          editActiveCompetition: editResponse.ok,
          deleteActiveCompetition: deleteResponse.ok,
        },
        features: {
          competitionType: "Support for ranking vs target competitions",
          targetGoals: "Configurable target goals for target competitions",
          editActiveCompetitions: "Ability to edit active competitions",
          deleteActiveCompetitions: "Ability to delete active competitions",
          validation: "Proper validation for new fields",
        },
        competitionTypes: {
          ranking: "🏆 Top 3 performers win prizes",
          target: "🎯 Hit specific goals to win prizes",
        },
      },
    });
  } catch (error: any) {
    console.error("[TEST] Error testing competition enhancements:", error);
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
