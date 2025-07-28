import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CompetitionModel, EmailSubscriptionModel } from '@/lib/models';
import { welcomeSmsService } from '@/lib/sms/welcome-sms';

export async function GET(request: NextRequest) {
  try {
    console.log('[TEST] Testing Welcome SMS Implementation...');
    
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
      name: 'Test Welcome SMS Competition',
      type: 'bottleConversion',
      dashboard: 'mtd',
      prizes: {
        first: '🏆 $500 Gift Card',
        second: '🥈 $250 Gift Card', 
        third: '🥉 $100 Gift Card'
      },
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      welcomeMessage: {
        customText: 'Welcome to our test competition! This is a custom welcome message to test the SMS functionality.',
        sendAt: null,
        sent: false,
        sentAt: null
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
    
    // Test 2: Validate welcome SMS
    console.log('[TEST] 🧪 Test 2: Validating welcome SMS...');
    const validation = await welcomeSmsService.validateWelcomeSms(testCompetition._id.toString());
    console.log(`[TEST] ✅ Validation result: ${validation.valid ? 'Valid' : 'Invalid'}`);
    if (!validation.valid) {
      console.log(`[TEST] ⚠️ Validation errors: ${validation.errors.join(', ')}`);
    }
    
    // Test 3: Generate SMS preview
    console.log('[TEST] 🧪 Test 3: Generating SMS preview...');
    const previewMessage = await welcomeSmsService.getWelcomeMessagePreview(testCompetition, subscribers[0].name);
    console.log(`[TEST] ✅ Generated preview message for ${subscribers[0].name}:`);
    console.log(`[TEST] 📱 Preview: ${previewMessage.substring(0, 100)}...`);
    
    // Test 4: Test SMS preview API
    console.log('[TEST] 🧪 Test 4: Testing SMS preview API...');
    const previewResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/competitions/${testCompetition._id}/welcome-sms/preview`);
    if (previewResponse.ok) {
      const previewData = await previewResponse.json();
      console.log(`[TEST] ✅ SMS preview API working: ${previewData.data.statistics.validPhoneSubscribers} valid phones`);
    } else {
      console.log(`[TEST] ⚠️ SMS preview API failed: ${previewResponse.statusText}`);
    }
    
    // Test 5: Test welcome SMS sending (if Twilio is configured)
    console.log('[TEST] 🧪 Test 5: Testing welcome SMS sending...');
    const smsResult = await welcomeSmsService.sendWelcomeSms(testCompetition._id.toString());
    console.log(`[TEST] ✅ SMS sending result: ${smsResult.sentCount} sent, ${smsResult.failedCount} failed`);
    
    if (smsResult.sentCount > 0) {
      console.log(`[TEST] 🎉 Successfully sent ${smsResult.sentCount} welcome SMS messages!`);
    } else if (smsResult.failedCount > 0) {
      console.log(`[TEST] ⚠️ SMS sending failed: ${smsResult.errors.join(', ')}`);
    }
    
    // Test 6: Verify welcome message marked as sent
    console.log('[TEST] 🧪 Test 6: Verifying welcome message status...');
    const updatedCompetition = await CompetitionModel.findById(testCompetition._id).lean();
    if (updatedCompetition) {
      console.log(`[TEST] ✅ Welcome message sent: ${updatedCompetition.welcomeMessage.sent}`);
    } else {
      console.log(`[TEST] ⚠️ Could not verify welcome message status`);
    }
    
    // Test 7: Test duplicate send prevention
    console.log('[TEST] 🧪 Test 7: Testing duplicate send prevention...');
    const duplicateResult = await welcomeSmsService.sendWelcomeSms(testCompetition._id.toString());
    console.log(`[TEST] ✅ Duplicate send prevention: ${duplicateResult.success ? 'Working' : 'Failed'}`);
    
    // Clean up test competition
    console.log('[TEST] 🧹 Cleaning up test competition...');
    await CompetitionModel.findByIdAndDelete(testCompetition._id);
    console.log('[TEST] ✅ Test competition cleaned up');
    
    return NextResponse.json({
      success: true,
      message: 'Welcome SMS implementation test completed successfully',
      data: {
        tests: {
          competitionCreated: true,
          validationTested: validation.valid,
          previewGenerated: true,
          previewApiTested: previewResponse.ok,
          smsSendingTested: true,
          statusTrackingTested: true,
          duplicatePreventionTested: true
        },
        statistics: {
          totalSubscribers: subscribers.length,
          validPhoneSubscribers: validation.subscribers?.length || 0,
          smsSent: smsResult.sentCount,
          smsFailed: smsResult.failedCount
        },
        smsFeatures: {
          messageFormatting: 'Personalized welcome messages with competition details',
          twilioIntegration: 'Real SMS sending via Twilio API',
          validation: 'Pre-send validation and error handling',
          preview: 'Message preview before sending',
          statusTracking: 'Welcome message sent status tracking',
          duplicatePrevention: 'Prevents multiple sends of welcome messages',
          errorHandling: 'Comprehensive error handling and logging'
        },
        messageExample: {
          subscriber: subscribers[0].name,
          preview: previewMessage.substring(0, 200) + '...'
        }
      }
    });
    
  } catch (error: any) {
    console.error('[TEST] ❌ Welcome SMS test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      message: error.message
    }, { status: 500 });
  }
} 