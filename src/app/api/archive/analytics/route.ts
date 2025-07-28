import { NextRequest, NextResponse } from "next/server";
import { archiveManagementService } from "@/lib/archive-management";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    console.log("[API] GET /api/archive/analytics");

    // Parse query parameters for filters
    const type = searchParams.get("type") as
      | "bottleConversion"
      | "clubConversion"
      | "aov"
      | undefined;
    const dashboard = searchParams.get("dashboard") as
      | "mtd"
      | "qtd"
      | "ytd"
      | undefined;

    // Parse date range
    let dateRange = undefined;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    if (startDate && endDate) {
      dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
    }

    // Build filters
    const filters = {
      type,
      dashboard,
      dateRange,
    };

    // Get performance analytics
    const analytics =
      await archiveManagementService.getPerformanceAnalytics(filters);

    console.log(
      `[API] ✅ Retrieved performance analytics: ${analytics.totalCompetitions} competitions analyzed`,
    );

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error("[API] Error getting performance analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
