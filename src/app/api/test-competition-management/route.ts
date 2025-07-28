import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CompetitionModel, EmailSubscriptionModel } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    console.log("[TEST] Testing Competition Management API...");

    await connectToDatabase();
    console.log("[TEST] ✅ Connected to database");

    // Check if we have subscribers
    const subscribers = await EmailSubscriptionModel.find().limit(3);
    console.log(`[TEST] 👥 Found ${subscribers.length} subscribers`);

    if (subscribers.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No subscribers found.",
        message: "Please create some subscribers first via the admin panel.",
      });
    }

    // Test 1: Create a competition
    console.log("[TEST] 🧪 Test 1: Creating competition...");
    const testCompetitionData = {
      name: "Test Competition Management API",
      type: "bottleConversion",
      dashboard: "mtd",
      prizes: {
        first: "🏆 First Place Prize",
        second: "🥈 Second Place Prize",
        third: "🥉 Third Place Prize",
      },
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      welcomeMessage: {
        customText:
          "Welcome to the test competition! This tests the management API.",
        sendAt: null, // Manual send
        sent: false,
        sentAt: null,
      },
      progressNotifications: [
        {
          id: "test-notification-1",
          scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          sent: false,
          sentAt: null,
        },
      ],
      winnerAnnouncement: {
        scheduledAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
        ), // endDate + 1 hour
        sent: false,
        sentAt: null,
      },
      enrolledSubscribers: subscribers.map((s) => s._id),
      status: "draft",
    };

    const testCompetition = await CompetitionModel.create(testCompetitionData);
    console.log(
      `[TEST] ✅ Created competition: ${testCompetition.name} (ID: ${testCompetition._id})`,
    );

    // Test 2: Get competition details
    console.log("[TEST] 🧪 Test 2: Getting competition details...");
    const fetchedCompetition = await CompetitionModel.findById(
      testCompetition._id,
    ).lean();
    if (!fetchedCompetition) {
      throw new Error("Failed to fetch competition");
    }
    console.log(`[TEST] ✅ Fetched competition: ${fetchedCompetition.name}`);

    // Test 3: Add notification
    console.log("[TEST] 🧪 Test 3: Adding notification...");
    const competition = await CompetitionModel.findById(testCompetition._id);
    if (!competition) {
      throw new Error("Failed to find competition for notification");
    }
    const newNotificationId = (competition as any).addProgressNotification(
      new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    );
    await competition.save();
    console.log(`[TEST] ✅ Added notification: ${newNotificationId}`);

    // Test 4: Update competition
    console.log("[TEST] 🧪 Test 4: Updating competition...");
    const updatedCompetition = await CompetitionModel.findByIdAndUpdate(
      testCompetition._id,
      { name: "Updated Test Competition Management API" },
      { new: true },
    ).lean();
    if (!updatedCompetition) {
      throw new Error("Failed to update competition");
    }
    console.log(`[TEST] ✅ Updated competition: ${updatedCompetition.name}`);

    // Test 5: Activate competition
    console.log("[TEST] 🧪 Test 5: Activating competition...");
    const activatedCompetition = await CompetitionModel.findByIdAndUpdate(
      testCompetition._id,
      { status: "active" },
      { new: true },
    ).lean();
    if (!activatedCompetition) {
      throw new Error("Failed to activate competition");
    }
    console.log(
      `[TEST] ✅ Activated competition: ${activatedCompetition.name}`,
    );

    // Test 6: Mark welcome message as sent
    console.log("[TEST] 🧪 Test 6: Marking welcome message as sent...");
    const competitionForSMS = await CompetitionModel.findById(
      testCompetition._id,
    );
    if (!competitionForSMS) {
      throw new Error("Failed to find competition for SMS");
    }
    (competitionForSMS as any).markWelcomeMessageSent();
    await competitionForSMS.save();
    console.log(`[TEST] ✅ Welcome message marked as sent`);

    // Test 7: Get competitions list
    console.log("[TEST] 🧪 Test 7: Getting competitions list...");
    const competitionsList = await CompetitionModel.find({
      status: "active",
    }).lean();
    console.log(
      `[TEST] ✅ Found ${competitionsList.length} active competitions`,
    );

    // Test 8: Get archived competitions (should be empty)
    console.log("[TEST] 🧪 Test 8: Getting archived competitions...");
    const archivedCompetitions = await CompetitionModel.find({
      status: "archived",
    }).lean();
    console.log(
      `[TEST] ✅ Found ${archivedCompetitions.length} archived competitions`,
    );

    // Clean up test competition
    await CompetitionModel.findByIdAndDelete(testCompetition._id);
    console.log("[TEST] 🧹 Cleaned up test competition");

    return NextResponse.json({
      success: true,
      message: "Competition Management API test completed successfully",
      data: {
        tests: {
          competitionCreated: true,
          competitionFetched: true,
          notificationAdded: true,
          competitionUpdated: true,
          competitionActivated: true,
          welcomeMessageMarkedSent: true,
          competitionsListed: true,
          archivedCompetitionsListed: true,
        },
        statistics: {
          totalSubscribers: subscribers.length,
          activeCompetitions: competitionsList.length,
          archivedCompetitions: archivedCompetitions.length,
        },
        competitionDetails: {
          name: updatedCompetition?.name || "Unknown",
          type: updatedCompetition?.type || "Unknown",
          dashboard: updatedCompetition?.dashboard || "Unknown",
          status: activatedCompetition?.status || "Unknown",
          totalParticipants: subscribers.length,
          notificationsCount:
            updatedCompetition?.progressNotifications?.length || 0,
        },
      },
    });
  } catch (error: any) {
    console.error("[TEST] ❌ Competition Management API test failed:", error);

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
