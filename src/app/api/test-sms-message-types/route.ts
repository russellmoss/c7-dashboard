import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CompetitionModel, EmailSubscriptionModel } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    console.log("[TEST] Testing SMS Message Types...");

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

    // Create a test competition with all SMS message types
    const testCompetition = await CompetitionModel.create({
      name: "Test SMS Message Types Competition",
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
        customText:
          "Welcome to the test competition! This is a custom welcome message.",
        sendAt: null, // Manual send
        sent: false,
        sentAt: null,
      },
      progressNotifications: [
        {
          id: "test-notification-1",
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          sent: false,
          sentAt: null,
        },
        {
          id: "test-notification-2",
          scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
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
      status: "active",
    });

    console.log(`[TEST] ✅ Created test competition: ${testCompetition.name}`);

    // Test the schema methods
    console.log("[TEST] 🧪 Testing schema methods...");

    // Test adding a progress notification
    const newNotificationId = (testCompetition as any).addProgressNotification(
      new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    );
    console.log(`[TEST] ✅ Added progress notification: ${newNotificationId}`);

    // Test marking a notification as sent
    (testCompetition as any).markNotificationSent("test-notification-1");
    console.log("[TEST] ✅ Marked notification as sent");

    // Test marking welcome message as sent
    (testCompetition as any).markWelcomeMessageSent();
    console.log("[TEST] ✅ Marked welcome message as sent");

    // Test removing a notification
    (testCompetition as any).removeProgressNotification("test-notification-2");
    console.log("[TEST] ✅ Removed progress notification");

    // Save the changes
    await testCompetition.save();
    console.log("[TEST] ✅ Saved changes to database");

    // Fetch the updated competition to verify changes
    const updatedCompetition = await CompetitionModel.findById(
      testCompetition._id,
    ).lean();

    if (!updatedCompetition) {
      throw new Error("Failed to fetch updated competition");
    }

    // Clean up test competition
    await CompetitionModel.findByIdAndDelete(testCompetition._id);
    console.log("[TEST] 🧹 Cleaned up test competition");

    return NextResponse.json({
      success: true,
      message: "SMS message types test completed successfully",
      data: {
        competition: {
          name: testCompetition.name,
          type: testCompetition.type,
          dashboard: testCompetition.dashboard,
        },
        welcomeMessage: {
          customText: updatedCompetition.welcomeMessage.customText,
          sendAt: updatedCompetition.welcomeMessage.sendAt,
          sent: updatedCompetition.welcomeMessage.sent,
          sentAt: updatedCompetition.welcomeMessage.sentAt,
        },
        progressNotifications: updatedCompetition.progressNotifications.map(
          (n: any) => ({
            id: n.id,
            scheduledAt: n.scheduledAt,
            sent: n.sent,
            sentAt: n.sentAt,
          }),
        ),
        winnerAnnouncement: {
          scheduledAt: updatedCompetition.winnerAnnouncement.scheduledAt,
          sent: updatedCompetition.winnerAnnouncement.sent,
          sentAt: updatedCompetition.winnerAnnouncement.sentAt,
        },
        methodTests: {
          notificationAdded: newNotificationId ? true : false,
          notificationMarkedSent:
            updatedCompetition.progressNotifications.find(
              (n: any) => n.id === "test-notification-1",
            )?.sent || false,
          welcomeMessageMarkedSent: updatedCompetition.welcomeMessage.sent,
          notificationRemoved: !updatedCompetition.progressNotifications.find(
            (n: any) => n.id === "test-notification-2",
          ),
        },
      },
    });
  } catch (error: any) {
    console.error("[TEST] ❌ SMS message types test failed:", error);

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
