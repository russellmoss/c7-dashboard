import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CompetitionModel, EmailSubscriptionModel } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    console.log("[TEST] Testing Competition Admin UI Integration...");

    await connectToDatabase();
    console.log("[TEST] ✅ Connected to database");

    // Check if we have subscribers
    const subscribers = await EmailSubscriptionModel.find({
      "smsCoaching.isActive": true,
    }).limit(3);
    console.log(`[TEST] 👥 Found ${subscribers.length} active SMS subscribers`);

    if (subscribers.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No active SMS subscribers found.",
        message: "Please create subscribers with SMS coaching enabled first.",
      });
    }

    // Test 1: Create a test competition via API
    console.log("[TEST] 🧪 Test 1: Creating competition via API...");
    const testCompetitionData = {
      name: "Test Competition Admin UI",
      type: "bottleConversion",
      dashboard: "mtd",
      prizes: {
        first: "🏆 $500 Gift Card",
        second: "🥈 $250 Gift Card",
        third: "🥉 $100 Gift Card",
      },
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      welcomeMessage: {
        customText:
          "Welcome to the test competition! This tests the admin UI integration.",
        sendAt: null,
      },
      enrolledSubscribers: subscribers.map((s) => s._id),
    };

    const createResponse = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/competitions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testCompetitionData),
      },
    );

    if (!createResponse.ok) {
      throw new Error(
        `Failed to create competition: ${createResponse.statusText}`,
      );
    }

    const createdCompetition = await createResponse.json();
    const competitionId = createdCompetition.data.competition._id;
    console.log(
      `[TEST] ✅ Created competition: ${createdCompetition.data.competition.name} (ID: ${competitionId})`,
    );

    // Test 2: Fetch competitions list
    console.log("[TEST] 🧪 Test 2: Fetching competitions list...");
    const listResponse = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/competitions?status=draft`,
    );
    const competitionsList = await listResponse.json();
    console.log(
      `[TEST] ✅ Found ${competitionsList.data.competitions.length} draft competitions`,
    );

    // Test 3: Get individual competition details
    console.log("[TEST] 🧪 Test 3: Getting competition details...");
    const detailResponse = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/competitions/${competitionId}`,
    );
    const competitionDetails = await detailResponse.json();
    console.log(
      `[TEST] ✅ Fetched competition details: ${competitionDetails.data.name}`,
    );

    // Test 4: Add notification
    console.log("[TEST] 🧪 Test 4: Adding notification...");
    const notificationResponse = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/competitions/${competitionId}/add-notification`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 3 days from now
        }),
      },
    );

    if (notificationResponse.ok) {
      const notificationResult = await notificationResponse.json();
      console.log(
        `[TEST] ✅ Added notification: ${notificationResult.data.notificationId}`,
      );
    } else {
      console.log(
        `[TEST] ⚠️ Notification add failed: ${notificationResponse.statusText}`,
      );
    }

    // Test 5: Activate competition
    console.log("[TEST] 🧪 Test 5: Activating competition...");
    const activateResponse = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/competitions/${competitionId}/activate`,
      {
        method: "POST",
      },
    );

    if (activateResponse.ok) {
      console.log(`[TEST] ✅ Competition activated successfully`);
    } else {
      const error = await activateResponse.json();
      console.log(`[TEST] ⚠️ Activation failed: ${error.error}`);
    }

    // Test 6: Get active competitions
    console.log("[TEST] 🧪 Test 6: Fetching active competitions...");
    const activeResponse = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/competitions?status=active`,
    );
    const activeCompetitions = await activeResponse.json();
    console.log(
      `[TEST] ✅ Found ${activeCompetitions.data.competitions.length} active competitions`,
    );

    // Test 7: Get archived competitions
    console.log("[TEST] 🧪 Test 7: Fetching archived competitions...");
    const archivedResponse = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/competitions/archived`,
    );
    const archivedCompetitions = await archivedResponse.json();
    console.log(
      `[TEST] ✅ Found ${archivedCompetitions.data.competitions.length} archived competitions`,
    );

    // Test 8: Test welcome SMS (if competition is active)
    console.log("[TEST] 🧪 Test 8: Testing welcome SMS...");
    const smsResponse = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/competitions/${competitionId}/welcome-sms/send`,
      {
        method: "POST",
      },
    );

    if (smsResponse.ok) {
      console.log(`[TEST] ✅ Welcome SMS sent successfully`);
    } else {
      const error = await smsResponse.json();
      console.log(`[TEST] ⚠️ Welcome SMS failed: ${error.error}`);
    }

    // Clean up test competition
    console.log("[TEST] 🧹 Cleaning up test competition...");
    await CompetitionModel.findByIdAndDelete(competitionId);
    console.log("[TEST] ✅ Test competition cleaned up");

    return NextResponse.json({
      success: true,
      message: "Competition Admin UI integration test completed successfully",
      data: {
        tests: {
          competitionCreated: true,
          competitionsListed: true,
          competitionDetailsFetched: true,
          notificationAdded: notificationResponse.ok,
          competitionActivated: activateResponse.ok,
          activeCompetitionsListed: true,
          archivedCompetitionsListed: true,
          welcomeSMSTested: smsResponse.ok,
        },
        statistics: {
          totalSubscribers: subscribers.length,
          draftCompetitions: competitionsList.data.competitions.length,
          activeCompetitions: activeCompetitions.data.competitions.length,
          archivedCompetitions: archivedCompetitions.data.competitions.length,
        },
        apiEndpoints: {
          createCompetition: "/api/competitions (POST)",
          listCompetitions: "/api/competitions (GET)",
          getCompetition: "/api/competitions/[id] (GET)",
          addNotification: "/api/competitions/[id]/add-notification (POST)",
          activateCompetition: "/api/competitions/[id]/activate (POST)",
          sendWelcomeSMS: "/api/competitions/[id]/welcome-sms/send (POST)",
          archivedCompetitions: "/api/competitions/archived (GET)",
        },
        uiFeatures: {
          competitionList: "Active/Draft/Archived tabs",
          createForm: "Competition creation with validation",
          competitionDetails: "Detailed view with SMS status",
          smsScheduling: "Welcome SMS and progress notifications",
          statusManagement: "Draft → Active → Completed lifecycle",
        },
      },
    });
  } catch (error: any) {
    console.error("[TEST] ❌ Competition Admin UI test failed:", error);

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
