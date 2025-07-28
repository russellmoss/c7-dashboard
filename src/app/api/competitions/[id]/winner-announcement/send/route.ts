import { NextRequest, NextResponse } from "next/server";
import { winnerAnnouncementService } from "@/lib/sms/winner-announcement";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    console.log(`[API] POST /api/competitions/${id}/winner-announcement/send`);

    // Parse request body for custom message
    const body = await request.json();
    const customMessage = body.customMessage || "";

    // Validate before sending
    const validation =
      await winnerAnnouncementService.validateWinnerAnnouncement(id);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] },
        { status: 400 },
      );
    }

    // Check if competition is completed
    if (validation.competition.status !== "completed") {
      return NextResponse.json(
        {
          error:
            "Can only send winner announcements for completed competitions",
        },
        { status: 400 },
      );
    }

    // Send winner announcement SMS
    const result = await winnerAnnouncementService.sendWinnerAnnouncement(
      id,
      customMessage,
    );

    if (result.success && result.sentCount > 0) {
      console.log(
        `[API] ✅ Winner announcement sent successfully to ${result.sentCount} subscribers`,
      );

      return NextResponse.json({
        success: true,
        message: `Winner announcement sent successfully to ${result.sentCount} subscribers`,
        data: {
          competitionId: id,
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          errors: result.errors,
          messageSent: true,
          customMessage: customMessage,
          winners: result.winners,
        },
      });
    } else {
      console.error(
        `[API] ❌ Winner announcement failed: ${result.errors.join(", ")}`,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Failed to send winner announcement",
          data: {
            competitionId: id,
            sentCount: result.sentCount,
            failedCount: result.failedCount,
            errors: result.errors,
          },
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error(
      `[API] Error sending winner announcement for competition ${params.id}:`,
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
