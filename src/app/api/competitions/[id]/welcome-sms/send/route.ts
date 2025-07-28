import { NextRequest, NextResponse } from "next/server";
import { welcomeSmsService } from "@/lib/sms/welcome-sms";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    console.log(`[API] POST /api/competitions/${id}/welcome-sms/send`);

    // Validate before sending
    const validation = await welcomeSmsService.validateWelcomeSms(id);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] },
        { status: 400 },
      );
    }

    // Check if competition is active
    if (validation.competition.status !== "active") {
      return NextResponse.json(
        { error: "Can only send welcome SMS for active competitions" },
        { status: 400 },
      );
    }

    // Send welcome SMS
    const result = await welcomeSmsService.sendWelcomeSms(id);

    if (result.success && result.sentCount > 0) {
      console.log(
        `[API] ✅ Welcome SMS sent successfully to ${result.sentCount} subscribers`,
      );

      return NextResponse.json({
        success: true,
        message: `Welcome SMS sent successfully to ${result.sentCount} subscribers`,
        data: {
          competitionId: id,
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          errors: result.errors,
          messageSent: true,
        },
      });
    } else {
      console.error(`[API] ❌ Welcome SMS failed: ${result.errors.join(", ")}`);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to send welcome SMS",
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
      `[API] Error sending welcome SMS for competition ${params.id}:`,
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
