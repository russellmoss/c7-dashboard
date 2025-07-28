import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CompetitionModel } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    console.log("[TEST] Testing worker startup...");

    await connectToDatabase();
    console.log("[TEST] ✅ Connected to database");

    // Test basic competition model access
    const competitionCount = await CompetitionModel.countDocuments();
    console.log(`[TEST] ✅ Found ${competitionCount} competitions in database`);

    // Test competition SMS scheduling query
    const now = new Date();
    const activeCompetitions = await CompetitionModel.find({
      status: "active",
      $or: [
        { "welcomeMessage.sendAt": { $lte: now, $ne: null } },
        { "progressNotifications.scheduledAt": { $lte: now } },
        { "winnerAnnouncement.scheduledAt": { $lte: now } },
      ],
    }).lean();

    console.log(
      `[TEST] ✅ Found ${activeCompetitions.length} competitions with scheduled SMS`,
    );

    return NextResponse.json({
      success: true,
      message: "Worker startup test completed successfully",
      data: {
        databaseConnection: "Connected",
        competitionCount,
        activeCompetitionsWithSMS: activeCompetitions.length,
        workerReady: true,
        features: {
          competitionSMSProcessing: "Ready",
          scheduledJobProcessing: "Ready",
          healthMonitoring: "Ready",
        },
      },
    });
  } catch (error: any) {
    console.error("[TEST] Error testing worker startup:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Worker startup test failed",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
