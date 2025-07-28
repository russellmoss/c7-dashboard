import { NextRequest, NextResponse } from 'next/server';
import { winnerAnnouncementService } from '@/lib/sms/winner-announcement';
import { connectToDatabase } from '@/lib/mongodb';
import { CompetitionModel, EmailSubscriptionModel } from '@/lib/models';
import { getCompetitionRankings } from '@/lib/competition-ranking';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`[API] GET /api/competitions/${id}/winner-announcement/preview`);

    await connectToDatabase();

    // Get competition details
    const competition = await CompetitionModel.findById(id).lean();
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    // Get final rankings
    const rankings = await getCompetitionRankings(id, false);
    if (rankings.rankings.length === 0) {
      return NextResponse.json(
        { error: 'No final rankings available for this competition' },
        { status: 400 }
      );
    }

    // Determine winners
    const winners = {
      first: rankings.rankings.find(r => r.rank === 1) || null,
      second: rankings.rankings.find(r => r.rank === 2) || null,
      third: rankings.rankings.find(r => r.rank === 3) || null
    };

    // Get enrolled subscribers
    const subscribers = await EmailSubscriptionModel.find({
      _id: { $in: competition.enrolledSubscribers }
    }).lean();

    // Generate preview messages for each subscriber
    const previews = await Promise.all(
      subscribers.map(async (subscriber) => {
        try {
          const message = await winnerAnnouncementService.getWinnerAnnouncementPreview(id, subscriber.name);
          const subscriberRanking = rankings.rankings.find(r => r.name === subscriber.name);
          const isWinner = winners.first?.name === subscriber.name || 
                          winners.second?.name === subscriber.name || 
                          winners.third?.name === subscriber.name;
          const winnerPosition = winners.first?.name === subscriber.name ? '1st' :
                               winners.second?.name === subscriber.name ? '2nd' :
                               winners.third?.name === subscriber.name ? '3rd' : null;

          return {
            subscriberId: subscriber._id,
            subscriberName: subscriber.name,
            subscriberEmail: subscriber.email,
            hasValidPhone: subscriber.smsCoaching?.isActive && subscriber.smsCoaching?.phoneNumber,
            phoneNumber: subscriber.smsCoaching?.phoneNumber || 'No phone number',
            message: message,
            ranking: subscriberRanking || null,
            isWinner: isWinner,
            winnerPosition: winnerPosition
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
            isWinner: false,
            winnerPosition: null,
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
    const winnersCount = [winners.first, winners.second, winners.third].filter(w => w !== null).length;

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
          totalParticipants: totalSubscribers,
          winnerAnnouncementSent: competition.winnerAnnouncement.sent
        },
        winners: {
          first: winners.first,
          second: winners.second,
          third: winners.third,
          count: winnersCount
        },
        rankings: {
          final: rankings.rankings,
          statistics: rankingStats
        },
        previews,
        statistics: {
          totalSubscribers,
          validPhoneSubscribers,
          invalidPhoneSubscribers,
          winnersCount,
          canSendSms: validPhoneSubscribers > 0 && competition.status === 'completed' && !competition.winnerAnnouncement.sent
        }
      }
    });

  } catch (error: any) {
    console.error(`[API] Error generating winner announcement preview for competition ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 