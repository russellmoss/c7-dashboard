import { NextRequest, NextResponse } from "next/server";
import { archiveManagementService } from "@/lib/archive-management";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    console.log("[API] GET /api/archive/competitions");

    // Parse query parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || undefined;
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
    const status = searchParams.get("status") as
      | "completed"
      | "archived"
      | undefined;
    const hasWinners =
      searchParams.get("hasWinners") === "true"
        ? true
        : searchParams.get("hasWinners") === "false"
          ? false
          : undefined;
    const hasWinnerAnnouncement =
      searchParams.get("hasWinnerAnnouncement") === "true"
        ? true
        : searchParams.get("hasWinnerAnnouncement") === "false"
          ? false
          : undefined;

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

    // Parse sort options
    const sortField =
      (searchParams.get("sortField") as
        | "name"
        | "startDate"
        | "endDate"
        | "createdAt"
        | "participantCount"
        | "winnerCount") || "endDate";
    const sortDirection =
      (searchParams.get("sortDirection") as "asc" | "desc") || "desc";

    // Build filters
    const filters = {
      type,
      dashboard,
      dateRange,
      status,
      search,
      hasWinners,
      hasWinnerAnnouncement,
    };

    // Build sort options
    const sort = {
      field: sortField,
      direction: sortDirection,
    };

    // Search archived competitions
    const result = await archiveManagementService.searchArchivedCompetitions(
      filters,
      sort,
      page,
      limit,
    );

    console.log(
      `[API] ✅ Found ${result.totalCount} archived competitions (page ${page}/${result.totalPages})`,
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[API] Error searching archived competitions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
