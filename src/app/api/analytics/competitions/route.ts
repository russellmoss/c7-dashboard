import { NextRequest, NextResponse } from "next/server";
import { competitionAnalyticsService } from "@/lib/competition-analytics";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    console.log("[API] GET /api/analytics/competitions");

    // Parse query parameters
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
    const staffMember = searchParams.get("staffMember") || undefined;
    const status = searchParams.get("status") as
      | "completed"
      | "archived"
      | "all"
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
      staffMember,
      status,
    };

    // Get comprehensive analytics
    const analytics =
      await competitionAnalyticsService.getCompetitionAnalytics(filters);

    console.log(
      `[API] ✅ Retrieved competition analytics: ${analytics.overview.totalCompetitions} competitions analyzed`,
    );

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error("[API] Error getting competition analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
