import { NextRequest, NextResponse } from "next/server";
import {
  getCompetitionRankings,
  clearCompetitionCache,
} from "@/lib/competition-ranking";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);

    // Check for force refresh parameter
    const forceRefresh = searchParams.get("refresh") === "true";

    console.log(
      `[API] GET /api/competitions/${id}/rankings - forceRefresh: ${forceRefresh}`,
    );

    if (!id) {
      return NextResponse.json(
        { error: "Competition ID is required" },
        { status: 400 },
      );
    }

    const rankings = await getCompetitionRankings(id, forceRefresh);

    return NextResponse.json(
      {
        success: true,
        data: rankings,
      },
      {
        headers: {
          "Cache-Control": forceRefresh
            ? "no-cache"
            : "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error: any) {
    console.error(
      `[API] Error getting rankings for competition ${params.id}:`,
      error,
    );

    // Handle specific error types
    if (error.message?.includes("Competition not found")) {
      return NextResponse.json(
        { error: "Competition not found" },
        { status: 404 },
      );
    }

    if (error.message?.includes("No KPI data found")) {
      return NextResponse.json(
        { error: "No KPI data available for this competition period" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    console.log(
      `[API] DELETE /api/competitions/${id}/rankings - clearing cache`,
    );

    if (!id) {
      return NextResponse.json(
        { error: "Competition ID is required" },
        { status: 400 },
      );
    }

    clearCompetitionCache(id);

    return NextResponse.json({
      success: true,
      message: "Competition cache cleared successfully",
    });
  } catch (error: any) {
    console.error(
      `[API] Error clearing cache for competition ${params.id}:`,
      error,
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
