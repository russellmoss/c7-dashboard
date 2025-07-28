import { NextRequest, NextResponse } from 'next/server';
import { progressSmsService } from '@/lib/sms/progress-sms';
import { connectToDatabase } from '@/lib/mongodb';
import { CompetitionModel, EmailSubscriptionModel } from '@/lib/models';
import { getCompetitionRankings } from '@/lib/competition-ranking';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`[API] GET /api/competitions/${id}/progress-sms/preview`);

    await connectToDatabase();

    // Get competition details
    const competition = await CompetitionModel.findById(id).lean();
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    // Get current rankings
    const rankings = await getCompetitionRankings(id, false);
    if (rankings.rankings.length === 0) {
      return NextResponse.json(
        { error: 'No rankings available for this competition' },
        { status: 400 }
      );
    }

    // Get enrolled subscribers
    const subscribers = await EmailSubscriptionModel.find({
      _id: { $in: competition.enrolledSubscribers }
    }).lean();

    // Generate preview messages for each subscriber
    const previews = await Promise.all(
      subscribers.map(async (subscriber) => {
        try {
          const message = await progressSmsService.getProgressMessagePreview(id, subscriber.name);
          return {
            subscriberId: subscriber._id,
            subscriberName: subscriber.name,
            subscriberEmail: subscriber.email,
            hasValidPhone: subscriber.smsCoaching?.isActive && subscriber.smsCoaching?.phoneNumber,
            phoneNumber: subscriber.smsCoaching?.phoneNumber || 'No phone number',
            message: message,
            ranking: rankings.rankings.find(r => r.name === subscriber.name) || null
          };
        } catch (error: any) {
          return {
            subscriberId: subscriber._id,
            subscriberName: subscriber.name,
            subscriberEmail: subscriber.email,
            hasValidPhone: subscriber.smsCoaching?.isActive && subscriber.smsCoaching?.phoneNumber,
            phoneNumber: subscriber.smsCoaching?.phoneNumber || 'No phone number',
            message: `Error generating preview: ${error.message}`,
            ranking: null,
            error: error.message
          };
        }
      })
    );

    // Calculate statistics
    const totalSubscribers = subscribers.length;
    const validPhoneSubscribers = subscribers.filter(s => 
      s.smsCoaching?.isActive && s.smsCoaching?.phoneNumber
    ).length;
    const invalidPhoneSubscribers = totalSubscribers - validPhoneSubscribers;

    // Calculate ranking statistics
    const rankingStats = {
      totalParticipants: rankings.rankings.length,
      averageRank: rankings.rankings.reduce((sum, r) => sum + r.rank, 0) / rankings.rankings.length,
      topRank: Math.min(...rankings.rankings.map(r => r.rank)),
      bottomRank: Math.max(...rankings.rankings.map(r => r.rank))
    };

    return NextResponse.json({
      success: true,
      data: {
        competition: {
          id: competition._id,
          name: competition.name,
          type: competition.type,
          dashboard: competition.dashboard,
          startDate: competition.startDate,
          endDate: competition.endDate,
          status: competition.status,
          totalParticipants: totalSubscribers
        },
        rankings: {
          current: rankings.rankings,
          statistics: rankingStats
        },
        previews,
        statistics: {
          totalSubscribers,
          validPhoneSubscribers,
          invalidPhoneSubscribers,
          canSendSms: validPhoneSubscribers > 0 && competition.status === 'active'
        }
      }
    });

  } catch (error: any) {
    console.error(`[API] Error generating progress SMS preview for competition ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 