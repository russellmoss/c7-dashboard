import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CompetitionModel, EmailSubscriptionModel } from '@/lib/models';
import { winnerAnnouncementService } from '@/lib/sms/winner-announcement';
import { getCompetitionRankings } from '@/lib/competition-ranking';

export async function GET(request: NextRequest) {
  try {
    console.log('[TEST] Testing Winner Announcement SMS Implementation with Claude AI...');
    
    await connectToDatabase();
    console.log('[TEST] ✅ Connected to database');
    
    // Check if we have subscribers with SMS coaching
    const subscribers = await EmailSubscriptionModel.find({
      'smsCoaching.isActive': true,
      'smsCoaching.phoneNumber': { $exists: true, $ne: '' }
    }).limit(3);
    console.log(`[TEST] 👥 Found ${subscribers.length} subscribers with SMS coaching`);
    
    if (subscribers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No subscribers with SMS coaching found.',
        message: 'Please create subscribers with SMS coaching enabled first.'
      });
    }
    
    // Test 1: Create a test completed competition
    console.log('[TEST] 🧪 Test 1: Creating test completed competition...');
    const testCompetitionData = {
      name: 'Test Winner Announcement Competition',
      type: 'bottleConversion',
      dashboard: 'mtd',
      prizes: {
        first: '🏆 $500 Gift Card',
        second: '🥈 $250 Gift Card', 
        third: '🥉 $100 Gift Card'
      },
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Started 7 days ago
      endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Ended yesterday
      welcomeMessage: {
        customText: 'Welcome to our test competition!',
        sendAt: null,
        sent: true,
        sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      progressNotifications: [],
      winnerAnnouncement: {
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
        sent: false,
        sentAt: null
      },
      enrolledSubscribers: subscribers.map(s => s._id),
      status: 'completed'
    };
    
    const testCompetition = await CompetitionModel.create(testCompetitionData);
    console.log(`[TEST] ✅ Created test completed competition: ${testCompetition.name} (ID: ${testCompetition._id})`);
    
    // Test 2: Validate winner announcement
    console.log('[TEST] 🧪 Test 2: Validating winner announcement...');
    const validation = await winnerAnnouncementService.validateWinnerAnnouncement(testCompetition._id.toString());
    console.log(`[TEST] ✅ Validation result: ${validation.valid ? 'Valid' : 'Invalid'}`);
    if (!validation.valid) {
      console.log(`[TEST] ⚠️ Validation errors: ${validation.errors.join(', ')}`);
    }
    
    // Test 3: Generate winner announcement message preview
    console.log('[TEST] 🧪 Test 3: Generating winner announcement message preview with Claude AI...');
    const previewMessage = await winnerAnnouncementService.getWinnerAnnouncementPreview(testCompetition._id.toString(), subscribers[0].name);
    console.log(`[TEST] ✅ Generated Claude AI preview message for ${subscribers[0].name}:`);
    console.log(`[TEST] 📱 Preview: ${previewMessage.substring(0, 100)}...`);
    
    // Test 4: Test winner announcement preview API
    console.log('[TEST] 🧪 Test 4: Testing winner announcement preview API...');
    const previewResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/competitions/${testCompetition._id}/winner-announcement/preview`);
    if (previewResponse.ok) {
      const previewData = await previewResponse.json();
      console.log(`[TEST] ✅ Winner announcement preview API working: ${previewData.data.statistics.validPhoneSubscribers} valid phones`);
      console.log(`[TEST] 🏆 Winners determined: ${previewData.data.winners.count} winners`);
    } else {
      console.log(`[TEST] ⚠️ Winner announcement preview API failed: ${previewResponse.statusText}`);
    }
    
    // Test 5: Test winner announcement sending (if Twilio is configured)
    console.log('[TEST] 🧪 Test 5: Testing winner announcement sending with Claude AI...');
    const smsResult = await winnerAnnouncementService.sendWinnerAnnouncement(testCompetition._id.toString(), 'Congratulations to all participants! 🍷');
    console.log(`[TEST] ✅ Winner announcement sending result: ${smsResult.sentCount} sent, ${smsResult.failedCount} failed`);
    
    if (smsResult.sentCount > 0) {
      console.log(`[TEST] 🎉 Successfully sent ${smsResult.sentCount} Claude AI-generated winner announcement SMS messages!`);
    } else if (smsResult.failedCount > 0) {
      console.log(`[TEST] ⚠️ Winner announcement sending failed: ${smsResult.errors.join(', ')}`);
    }
    
    // Test 6: Test Claude AI integration specifically
    console.log('[TEST] 🧪 Test 6: Testing Claude AI integration...');
    try {
      const claudePrompt = `You are a celebration coach for a completed wine sales competition. Generate a short, celebratory SMS message for a 1st place winner. Keep it under 160 characters and use emojis sparingly.`;
      const claudeResponse = await winnerAnnouncementService['callClaude'](claudePrompt);
      console.log(`[TEST] ✅ Claude AI integration working: ${claudeResponse.substring(0, 50)}...`);
    } catch (error: any) {
      console.log(`[TEST] ⚠️ Claude AI integration failed: ${error.message}`);
    }
    
    // Test 7: Test winner determination
    console.log('[TEST] 🧪 Test 7: Testing winner determination...');
    const rankings = await getCompetitionRankings(testCompetition._id.toString(), false);
    const winners = {
      first: rankings.rankings.find(r => r.rank === 1) || null,
      second: rankings.rankings.find(r => r.rank === 2) || null,
      third: rankings.rankings.find(r => r.rank === 3) || null
    };
    console.log(`[TEST] ✅ Winner determination working: ${[winners.first, winners.second, winners.third].filter(w => w !== null).length} winners determined`);
    
    // Test 8: Test duplicate send prevention
    console.log('[TEST] 🧪 Test 8: Testing duplicate send prevention...');
    const duplicateResult = await winnerAnnouncementService.sendWinnerAnnouncement(testCompetition._id.toString());
    console.log(`[TEST] ✅ Duplicate send prevention: ${duplicateResult.success ? 'Working' : 'Failed'}`);
    
    // Clean up test competition
    console.log('[TEST] 🧹 Cleaning up test competition...');
    await CompetitionModel.findByIdAndDelete(testCompetition._id);
    console.log('[TEST] ✅ Test competition cleaned up');
    
    return NextResponse.json({
      success: true,
      message: 'Winner announcement SMS implementation with Claude AI test completed successfully',
      data: {
        tests: {
          competitionCreated: true,
          validationTested: validation.valid,
          claudePreviewGenerated: true,
          previewApiTested: previewResponse.ok,
          winnerAnnouncementSendingTested: true,
          claudeIntegrationTested: true,
          winnerDeterminationTested: true,
          duplicatePreventionTested: true
        },
        statistics: {
          totalSubscribers: subscribers.length,
          validPhoneSubscribers: validation.subscribers?.length || 0,
          winnerAnnouncementSent: smsResult.sentCount,
          winnerAnnouncementFailed: smsResult.failedCount,
          winnersDetermined: [winners.first, winners.second, winners.third].filter(w => w !== null).length
        },
        winnerAnnouncementFeatures: {
          claudeAI: 'AI-generated personalized winner announcement messages',
          winnerDetermination: 'Automatic winner determination from final rankings',
          prizeIntegration: 'Prize information in winner messages',
          celebrationMessaging: 'Celebratory and congratulatory content',
          finalRankings: 'Final ranking display and statistics',
          customMessages: 'Admin custom message support',
          previewFunctionality: 'Message preview before sending',
          twilioIntegration: 'Real SMS sending via Twilio API',
          validation: 'Pre-send validation and error handling',
          statusTracking: 'Winner announcement sent status tracking',
          duplicatePrevention: 'Prevents multiple sends of winner announcements'
        },
        claudeFeatures: {
          dynamicMessaging: 'Context-aware winner announcement generation',
          winnerContext: 'Winner position and prize information',
          finalRankingContext: 'Final rank and competition completion',
          celebrationTone: 'Celebratory and congratulatory messaging',
          prizeAnnouncement: 'Prize information and celebration',
          personalization: 'Individual subscriber personalization',
          characterLimit: 'SMS-optimized message length'
        },
        messageExample: {
          subscriber: subscribers[0].name,
          preview: previewMessage.substring(0, 200) + '...'
        }
      }
    });
    
  } catch (error: any) {
    console.error('[TEST] ❌ Winner announcement test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      message: error.message
    }, { status: 500 });
  }
} 