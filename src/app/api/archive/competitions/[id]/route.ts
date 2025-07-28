import { NextRequest, NextResponse } from "next/server";
import { archiveManagementService } from "@/lib/archive-management";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    console.log(`[API] GET /api/archive/competitions/${id}`);

    // Get detailed competition data
    const competition =
      await archiveManagementService.getCompetitionDetails(id);

    if (!competition) {
      return NextResponse.json(
        { error: "Competition not found or not archived" },
        { status: 404 },
      );
    }

    console.log(`[API] ✅ Retrieved competition details: ${competition.name}`);

    return NextResponse.json({
      success: true,
      data: competition,
    });
  } catch (error: any) {
    console.error(
      `[API] Error getting competition details for ${params.id}:`,
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const { action } = await request.json();
    console.log(
      `[API] POST /api/archive/competitions/${id} - Action: ${action}`,
    );

    let result = false;

    if (action === "archive") {
      result = await archiveManagementService.archiveCompetition(id);
    } else if (action === "restore") {
      result = await archiveManagementService.restoreCompetition(id);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "archive" or "restore"' },
        { status: 400 },
      );
    }

    if (result) {
      console.log(`[API] ✅ Competition ${id} ${action}d successfully`);
      return NextResponse.json({
        success: true,
        message: `Competition ${action}d successfully`,
      });
    } else {
      return NextResponse.json(
        { error: `Failed to ${action} competition` },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error(
      `[API] Error archiving/restoring competition ${params.id}:`,
      error,
    );
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
