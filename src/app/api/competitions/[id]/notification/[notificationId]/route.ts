import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CompetitionModel } from '@/lib/models';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; notificationId: string } }
) {
  try {
    const { id, notificationId } = params;
    console.log(`[API] DELETE /api/competitions/${id}/notification/${notificationId}`);

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

    // Check if notification exists
    const notificationExists = competition.progressNotifications.some(
      (n: any) => n.id === notificationId
    );

    if (!notificationExists) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Remove notification using schema method
    (competition as any).removeProgressNotification(notificationId);
    await competition.save();

    console.log(`[API] ✅ Removed notification: ${notificationId} from competition: ${competition.name}`);

    return NextResponse.json({
      success: true,
      message: 'Notification removed successfully',
      data: {
        notificationId,
        competitionId: competition._id
      }
    });

  } catch (error: any) {
    console.error(`[API] Error removing notification from competition ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 