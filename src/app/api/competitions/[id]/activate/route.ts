import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CompetitionModel } from '@/lib/models';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`[API] POST /api/competitions/${id}/activate`);

    await connectToDatabase();

    // Check if competition exists
    const competition = await CompetitionModel.findById(id);
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    // Only allow activation if competition is in draft status
    if (competition.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only activate competitions in draft status' },
        { status: 400 }
      );
    }

    // Validate that competition has enrolled subscribers
    if (!competition.enrolledSubscribers || competition.enrolledSubscribers.length === 0) {
      return NextResponse.json(
        { error: 'Cannot activate competition without enrolled subscribers' },
        { status: 400 }
      );
    }

    // Validate that competition has a welcome message
    if (!competition.welcomeMessage || !competition.welcomeMessage.customText) {
      return NextResponse.json(
        { error: 'Cannot activate competition without a welcome message' },
        { status: 400 }
      );
    }

    // Check if start date is in the future
    const now = new Date();
    if (competition.startDate <= now) {
      return NextResponse.json(
        { error: 'Cannot activate competition with start date in the past' },
        { status: 400 }
      );
    }

    // Activate competition
    const activatedCompetition = await CompetitionModel.findByIdAndUpdate(
      id,
      { 
        status: 'active',
        updatedAt: new Date()
      },
      { new: true }
    ).lean();

    if (!activatedCompetition) {
      return NextResponse.json(
        { error: 'Failed to activate competition' },
        { status: 500 }
      );
    }

    console.log(`[API] ✅ Activated competition: ${activatedCompetition.name}`);

    return NextResponse.json({
      success: true,
      message: 'Competition activated successfully',
      data: {
        competition: {
          _id: activatedCompetition._id,
          name: activatedCompetition.name,
          status: activatedCompetition.status,
          startDate: activatedCompetition.startDate,
          endDate: activatedCompetition.endDate
        }
      }
    });

  } catch (error: any) {
    console.error(`[API] Error activating competition ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 