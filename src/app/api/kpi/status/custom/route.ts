import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CronJobLogModel } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    // Find the most recent cron job log for custom generation
    const latestLog = await CronJobLogModel.findOne({
      jobType: "custom",
      startDate,
      endDate,
    }).sort({ startTime: -1 });

    if (!latestLog) {
      return NextResponse.json({
        status: "not_found",
        message: "No generation job found for this date range",
      });
    }

    const response: any = {
      status: latestLog.status,
      startTime: latestLog.startTime,
      executionTime: latestLog.executionTime,
      recordsProcessed: latestLog.recordsProcessed,
    };

    if (latestLog.status === "completed") {
      response.progress = 100;
      response.endTime = latestLog.endTime;
    } else if (latestLog.status === "failed") {
      response.error = latestLog.error;
      response.progress = 0;
    } else if (latestLog.status === "running") {
      // Estimate progress based on time elapsed
      const elapsed = Date.now() - latestLog.startTime.getTime();
      const estimatedTime = 5 * 60 * 1000; // 5 minutes estimate
      response.progress = Math.min(
        Math.round((elapsed / estimatedTime) * 100),
        95,
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error checking custom KPI status:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 },
    );
  }
}
