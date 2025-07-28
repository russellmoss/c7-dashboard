import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CompetitionModel, EmailSubscriptionModel } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    console.log(`[API] POST /api/test-create-scheduled-competition`);
    
    await connectToDatabase();
    
    // Get a subscriber with SMS coaching enabled
    const subscriber = await EmailSubscriptionModel.findOne({
      'smsCoaching.isActive': true,
      'smsCoaching.phoneNumber': { $exists: true, $ne: '' }
    }).lean();
    
    if (!subscriber) {
      return NextResponse.json({ error: 'No subscribers with SMS coaching found' }, { status: 404 });
    }
    
    const now = new Date();
    const pastTime = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
    
    // Create a test competition with scheduled SMS due in the past
    const testCompetition = {
      name: 'Test Worker Competition',
      type: 'bottleConversion',
      competitionType: 'ranking',
      dashboard: 'mtd',
      prizes: {
        first: '$100 Gift Card',
        second: '$50 Gift Card',
        third: '$25 Gift Card'
      },
      startDate: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 1 day ago
      endDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
      welcomeMessage: {
        customText: 'Welcome to the test competition!',
        sendAt: pastTime, // Due in the past
        sent: false,
        sentAt: null
      },
      progressNotifications: [
        {
          id: 'progress_test_1',
          scheduledAt: pastTime, // Due in the past
          sent: false,
          sentAt: null,
          customMessage: 'Check your progress!'
        }
      ],
      winnerAnnouncement: {
        scheduledAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 6), // 6 days from now
        sent: false,
        sentAt: null
      },
      enrolledSubscribers: [subscriber._id],
      status: 'active',
      finalRankings: [],
      createdAt: now,
      updatedAt: now
    };
    
    const competition = await CompetitionModel.create(testCompetition);
    
    console.log(`[TEST] Created test competition: ${competition._id}`);
    
    return NextResponse.json({
      success: true,
      data: {
        competitionId: competition._id,
        competitionName: competition.name,
        subscriber: {
          id: subscriber._id,
          name: subscriber.name,
          email: subscriber.email,
          phoneNumber: subscriber.smsCoaching?.phoneNumber
        },
        scheduledSMS: {
          welcomeMessage: {
            due: true,
            sendAt: pastTime
          },
          progressNotifications: [
            {
              due: true,
              scheduledAt: pastTime
            }
          ],
          winnerAnnouncement: {
            due: false,
            scheduledAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 6)
          }
        }
      }
    });
    
  } catch (error: any) {
    console.error(`[API] Error in test-create-scheduled-competition: ${error.message}`);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 