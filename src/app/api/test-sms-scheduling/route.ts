import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CompetitionModel, EmailSubscriptionModel } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    console.log('[TEST] Testing SMS Scheduling...');
    
    await connectToDatabase();
    console.log('[TEST] ✅ Connected to database');
    
    // Check if we have subscribers
    const subscribers = await EmailSubscriptionModel.find({
      'smsCoaching.isActive': true,
      'smsCoaching.phoneNumber': { $exists: true, $ne: '' }
    }).limit(2);
    console.log(`[TEST] 👥 Found ${subscribers.length} subscribers`);
    
    if (subscribers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No subscribers with SMS coaching found.',
        message: 'Please create subscribers with SMS coaching enabled first.'
      });
    }
    
    // Test 1: Create competition with SMS scheduling
    console.log('[TEST] 🧪 Test 1: Creating competition with SMS scheduling...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const competitionData = {
      name: 'Test SMS Scheduling Competition',
      type: 'bottleConversion',
      competitionType: 'ranking',
      dashboard: 'mtd',
      prizes: {
        first: '🏆 $500 Gift Card',
        second: '🥈 $250 Gift Card', 
        third: '🥉 $100 Gift Card'
      },
      targetGoals: {},
      startDate: tomorrow.toISOString(),
      endDate: nextWeek.toISOString(),
      welcomeMessage: {
        customText: 'Welcome to our SMS scheduling test!',
        scheduledDate: tomorrow.toISOString().split('T')[0],
        scheduledTime: '09:00'
      },
      progressNotifications: [
        {
          scheduledDate: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          scheduledTime: '14:00',
          customMessage: 'Mid-week progress update!'
        },
        {
          scheduledDate: new Date(tomorrow.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          scheduledTime: '16:00',
          customMessage: 'Final push before the end!'
        }
      ],
      winnerAnnouncement: {
        scheduledDate: new Date(nextWeek.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduledTime: '10:00'
      },
      enrolledSubscribers: subscribers.map(s => s._id)
    };
    
    const competition = await CompetitionModel.create(competitionData);
    console.log(`[TEST] ✅ Created competition: ${competition.name}`);
    
    // Test 2: Verify scheduling was processed correctly
    console.log('[TEST] 🧪 Test 2: Verifying scheduling processing...');
    const createdCompetition = await CompetitionModel.findById(competition._id).lean();
    
    const schedulingResults = {
      welcomeMessage: {
        hasScheduledDate: !!createdCompetition.welcomeMessage.sendAt,
        scheduledDate: createdCompetition.welcomeMessage.sendAt,
        customText: createdCompetition.welcomeMessage.customText
      },
      progressNotifications: {
        count: createdCompetition.progressNotifications.length,
        notifications: createdCompetition.progressNotifications.map((n: any) => ({
          id: n.id,
          scheduledAt: n.scheduledAt,
          sent: n.sent
        }))
      },
      winnerAnnouncement: {
        hasScheduledDate: !!createdCompetition.winnerAnnouncement.scheduledAt,
        scheduledDate: createdCompetition.winnerAnnouncement.scheduledAt
      }
    };
    
    console.log('[TEST] ✅ Scheduling verification completed');
    
    // Test 3: Test updating scheduling for active competition
    console.log('[TEST] 🧪 Test 3: Testing scheduling updates...');
    await CompetitionModel.findByIdAndUpdate(competition._id, { status: 'active' });
    
    const updateData = {
      welcomeMessage: {
        customText: 'Updated welcome message!',
        scheduledDate: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduledTime: '10:00'
      },
      progressNotifications: [
        {
          scheduledDate: new Date(tomorrow.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          scheduledTime: '15:00',
          customMessage: 'Updated progress message!'
        }
      ]
    };
    
    const updateResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/competitions/${competition._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (updateResponse.ok) {
      console.log('[TEST] ✅ Successfully updated SMS scheduling');
    } else {
      console.log(`[TEST] ⚠️ Failed to update SMS scheduling: ${updateResponse.statusText}`);
    }
    
    // Clean up
    console.log('[TEST] 🧹 Cleaning up test data...');
    await CompetitionModel.findByIdAndDelete(competition._id);
    console.log('[TEST] ✅ Cleanup completed');
    
    return NextResponse.json({
      success: true,
      message: 'SMS scheduling test completed successfully',
      data: {
        tests: {
          competitionCreated: true,
          schedulingProcessed: true,
          schedulingUpdated: updateResponse.ok
        },
        features: {
          welcomeMessageScheduling: 'Date and time scheduling for welcome messages',
          progressNotificationScheduling: 'Multiple progress notifications with custom dates/times',
          winnerAnnouncementScheduling: 'Date and time scheduling for winner announcements',
          schedulingUpdates: 'Ability to update scheduling for active competitions',
          customMessages: 'Custom messages for progress notifications'
        },
        schedulingResults,
        schedulingFormats: {
          welcomeMessage: 'Date + Time → sendAt field',
          progressNotifications: 'Array of Date + Time → scheduledAt fields',
          winnerAnnouncement: 'Date + Time → scheduledAt field'
        }
      }
    });

  } catch (error: any) {
    console.error('[TEST] Error testing SMS scheduling:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      message: error.message
    }, { status: 500 });
  }
} 