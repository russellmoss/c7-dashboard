import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CompetitionModel } from '@/lib/models';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    console.log(`[API] POST /api/competitions/${id}/add-notification`);

    await connectToDatabase();

    // Check if competition exists
    const competition = await CompetitionModel.findById(id);
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    // Only allow modifications if competition is in draft status
    if (competition.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only modify notifications for competitions in draft status' },
        { status: 400 }
      );
    }

    // Validate scheduledAt date
    if (!body.scheduledAt) {
      return NextResponse.json(
        { error: 'scheduledAt date is required' },
        { status: 400 }
      );
    }

    const scheduledAt = new Date(body.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduledAt date format' },
        { status: 400 }
      );
    }

    // Validate that notification date is within competition period
    if (scheduledAt < competition.startDate || scheduledAt > competition.endDate) {
      return NextResponse.json(
        { error: 'Notification date must be within the competition period' },
        { status: 400 }
      );
    }

    // Add notification using schema method
    const notificationId = (competition as any).addProgressNotification(scheduledAt);
    await competition.save();

    console.log(`[API] ✅ Added notification: ${notificationId} to competition: ${competition.name}`);

    return NextResponse.json({
      success: true,
      message: 'Notification added successfully',
      data: {
        notificationId,
        scheduledAt: scheduledAt.toISOString(),
        competitionId: competition._id
      }
    });

  } catch (error: any) {
    console.error(`[API] Error adding notification to competition ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 