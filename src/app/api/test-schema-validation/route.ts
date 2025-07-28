import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CompetitionModel } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    console.log("[TEST] Testing Schema Validation...");

    await connectToDatabase();
    console.log("[TEST] ✅ Connected to database");

    // Test the new schema structure
    const testCompetitionData = {
      name: "Schema Validation Test Competition",
      type: "bottleConversion" as const,
      dashboard: "mtd" as const,
      prizes: {
        first: "🏆 First Place Prize",
        second: "🥈 Second Place Prize",
        third: "🥉 Third Place Prize",
      },
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      welcomeMessage: {
        customText: "Welcome to the schema validation test!",
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
      ],
      winnerAnnouncement: {
        scheduledAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
        ), // endDate + 1 hour
        sent: false,
        sentAt: null,
      },
      enrolledSubscribers: [],
      status: "draft" as const,
    };

    console.log("[TEST] 🧪 Testing competition creation...");

    // Try to create the competition
    const testCompetition = await CompetitionModel.create(testCompetitionData);
    console.log(
      `[TEST] ✅ Successfully created competition: ${testCompetition.name}`,
    );

    // Clean up
    await CompetitionModel.findByIdAndDelete(testCompetition._id);
    console.log("[TEST] 🧹 Cleaned up test competition");

    return NextResponse.json({
      success: true,
      message: "Schema validation test passed successfully",
      data: {
        competitionCreated: true,
        competitionName: testCompetition.name,
        schemaFields: {
          welcomeMessage: {
            customText: testCompetition.welcomeMessage.customText,
            sendAt: testCompetition.welcomeMessage.sendAt,
            sent: testCompetition.welcomeMessage.sent,
            sentAt: testCompetition.welcomeMessage.sentAt,
          },
          progressNotifications: testCompetition.progressNotifications.length,
          winnerAnnouncement: {
            scheduledAt: testCompetition.winnerAnnouncement.scheduledAt,
            sent: testCompetition.winnerAnnouncement.sent,
            sentAt: testCompetition.winnerAnnouncement.sentAt,
          },
        },
      },
    });
  } catch (error: any) {
    console.error("[TEST] ❌ Schema validation test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Schema validation failed",
        message: error.message,
        details: error.errors || error,
      },
      { status: 500 },
    );
  }
}
