import { NextRequest, NextResponse } from 'next/server';
import { progressSmsService } from '@/lib/sms/progress-sms';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`[API] POST /api/competitions/${id}/progress-sms/send`);

    // Parse request body for custom message
    const body = await request.json();
    const customMessage = body.customMessage || '';

    // Validate before sending
    const validation = await progressSmsService.validateProgressSms(id);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] },
        { status: 400 }
      );
    }

    // Check if competition is active
    if (validation.competition.status !== 'active') {
      return NextResponse.json(
        { error: 'Can only send progress SMS for active competitions' },
        { status: 400 }
      );
    }

    // Send progress SMS
    const result = await progressSmsService.sendProgressSms(id, customMessage);

    if (result.success && result.sentCount > 0) {
      console.log(`[API] ✅ Progress SMS sent successfully to ${result.sentCount} subscribers`);
      
      return NextResponse.json({
        success: true,
        message: `Progress SMS sent successfully to ${result.sentCount} subscribers`,
        data: {
          competitionId: id,
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          errors: result.errors,
          messageSent: true,
          customMessage: customMessage
        }
      });
    } else {
      console.error(`[API] ❌ Progress SMS failed: ${result.errors.join(', ')}`);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to send progress SMS',
        data: {
          competitionId: id,
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          errors: result.errors
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error(`[API] Error sending progress SMS for competition ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 