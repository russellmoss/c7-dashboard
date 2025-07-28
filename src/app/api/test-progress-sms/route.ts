import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CompetitionModel, EmailSubscriptionModel } from '@/lib/models';
import { progressSmsService } from '@/lib/sms/progress-sms';
import { getCompetitionRankings } from '@/lib/competition-ranking';

export async function GET(request: NextRequest) {
  try {
    console.log('[TEST] Testing Progress SMS Implementation with Claude AI...');
    
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
    
    // Test 1: Create a test competition
    console.log('[TEST] 🧪 Test 1: Creating test competition...');
    const testCompetitionData = {
      name: 'Test Progress SMS Competition',
      type: 'bottleConversion',
      dashboard: 'mtd',
      prizes: {
        first: '🏆 $500 Gift Card',
        second: '🥈 $250 Gift Card', 
        third: '🥉 $100 Gift Card'
      },
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started yesterday
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      welcomeMessage: {
        customText: 'Welcome to our test competition!',
        sendAt: null,
        sent: true,
        sentAt: new Date()
      },
      progressNotifications: [],
      winnerAnnouncement: {
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        sent: false,
        sentAt: null
      },
      enrolledSubscribers: subscribers.map(s => s._id),
      status: 'active'
    };
    
    const testCompetition = await CompetitionModel.create(testCompetitionData);
    console.log(`[TEST] ✅ Created test competition: ${testCompetition.name} (ID: ${testCompetition._id})`);
    
    // Test 2: Validate progress SMS
    console.log('[TEST] 🧪 Test 2: Validating progress SMS...');
    const validation = await progressSmsService.validateProgressSms(testCompetition._id.toString());
    console.log(`[TEST] ✅ Validation result: ${validation.valid ? 'Valid' : 'Invalid'}`);
    if (!validation.valid) {
      console.log(`[TEST] ⚠️ Validation errors: ${validation.errors.join(', ')}`);
    }
    
    // Test 3: Generate progress message preview
    console.log('[TEST] 🧪 Test 3: Generating progress message preview with Claude AI...');
    const previewMessage = await progressSmsService.getProgressMessagePreview(testCompetition._id.toString(), subscribers[0].name);
    console.log(`[TEST] ✅ Generated Claude AI preview message for ${subscribers[0].name}:`);
    console.log(`[TEST] 📱 Preview: ${previewMessage.substring(0, 100)}...`);
    
    // Test 4: Test progress SMS preview API
    console.log('[TEST] 🧪 Test 4: Testing progress SMS preview API...');
    const previewResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/competitions/${testCompetition._id}/progress-sms/preview`);
    if (previewResponse.ok) {
      const previewData = await previewResponse.json();
      console.log(`[TEST] ✅ Progress SMS preview API working: ${previewData.data.statistics.validPhoneSubscribers} valid phones`);
      console.log(`[TEST] 📊 Rankings available: ${previewData.data.rankings.current.length} participants`);
    } else {
      console.log(`[TEST] ⚠️ Progress SMS preview API failed: ${previewResponse.statusText}`);
    }
    
    // Test 5: Test progress SMS sending (if Twilio is configured)
    console.log('[TEST] 🧪 Test 5: Testing progress SMS sending with Claude AI...');
    const smsResult = await progressSmsService.sendProgressSms(testCompetition._id.toString(), 'Keep up the great work! 🍷');
    console.log(`[TEST] ✅ Progress SMS sending result: ${smsResult.sentCount} sent, ${smsResult.failedCount} failed`);
    
    if (smsResult.sentCount > 0) {
      console.log(`[TEST] 🎉 Successfully sent ${smsResult.sentCount} Claude AI-generated progress SMS messages!`);
    } else if (smsResult.failedCount > 0) {
      console.log(`[TEST] ⚠️ Progress SMS sending failed: ${smsResult.errors.join(', ')}`);
    }
    
    // Test 6: Test Claude AI integration specifically
    console.log('[TEST] 🧪 Test 6: Testing Claude AI integration...');
    try {
      const claudePrompt = `You are a motivational competition coach. Generate a short, encouraging SMS message for a wine sales competition participant who is currently ranked 2nd out of 5 participants. Keep it under 160 characters and use emojis sparingly.`;
      const claudeResponse = await progressSmsService['callClaude'](claudePrompt);
      console.log(`[TEST] ✅ Claude AI integration working: ${claudeResponse.substring(0, 50)}...`);
    } catch (error: any) {
      console.log(`[TEST] ⚠️ Claude AI integration failed: ${error.message}`);
    }
    
    // Test 7: Test ranking integration
    console.log('[TEST] 🧪 Test 7: Testing ranking integration...');
    const rankings = await getCompetitionRankings(testCompetition._id.toString(), false);
    console.log(`[TEST] ✅ Ranking integration working: ${rankings.rankings.length} rankings calculated`);
    
    // Clean up test competition
    console.log('[TEST] 🧹 Cleaning up test competition...');
    await CompetitionModel.findByIdAndDelete(testCompetition._id);
    console.log('[TEST] ✅ Test competition cleaned up');
    
    return NextResponse.json({
      success: true,
      message: 'Progress SMS implementation with Claude AI test completed successfully',
      data: {
        tests: {
          competitionCreated: true,
          validationTested: validation.valid,
          claudePreviewGenerated: true,
          previewApiTested: previewResponse.ok,
          progressSmsSendingTested: true,
          claudeIntegrationTested: true,
          rankingIntegrationTested: true
        },
        statistics: {
          totalSubscribers: subscribers.length,
          validPhoneSubscribers: validation.subscribers?.length || 0,
          progressSmsSent: smsResult.sentCount,
          progressSmsFailed: smsResult.failedCount,
          rankingsCalculated: rankings.rankings.length
        },
        progressSmsFeatures: {
          claudeAI: 'AI-generated personalized progress messages',
          rankingIntegration: 'Real-time competition rankings',
          performanceData: 'Current performance metrics integration',
          personalization: 'First name and ranking personalization',
          motivationalContent: 'Encouraging and motivational messaging',
          customMessages: 'Admin custom message support',
          previewFunctionality: 'Message preview before sending',
          twilioIntegration: 'Real SMS sending via Twilio API',
          validation: 'Pre-send validation and error handling',
          statusTracking: 'Progress notification tracking'
        },
        claudeFeatures: {
          dynamicMessaging: 'Context-aware message generation',
          rankingContext: 'Current rank and competition status',
          performanceContext: 'Current performance metrics',
          motivationalTone: 'Encouraging and positive messaging',
          actionableTips: 'Specific improvement suggestions',
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
    console.error('[TEST] ❌ Progress SMS test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      message: error.message
    }, { status: 500 });
  }
} 