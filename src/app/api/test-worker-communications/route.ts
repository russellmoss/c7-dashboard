import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { EmailSubscriptionModel, CronJobLogModel } from '@/lib/models';
import { EmailService } from '@/lib/email-service';
import { getSmsService, generateCoachingMessage } from '@/lib/sms/sms-worker.worker';
import { WelcomeSmsService } from '@/lib/sms/welcome-sms';
import { ProgressSmsService } from '@/lib/sms/progress-sms';
import { WinnerAnnouncementService } from '@/lib/sms/winner-announcement';

export async function POST(request: NextRequest) {
  try {
    console.log(`[API] POST /api/test-worker-communications`);
    await connectToDatabase();
    
    const body = await request.json();
    const { testType = 'all', forceSend = false } = body;
    
    const results = {
      testType,
      forceSend,
      startTime: new Date().toISOString(),
      emailResults: null as any,
      smsResults: null as any,
      competitionResults: null as any
    };
    
    // Test email communications
    if (testType === 'all' || testType === 'email') {
      console.log(`[TEST] Testing email communications...`);
      
      try {
        const subscribers = await EmailSubscriptionModel.find({
          isActive: true,
          subscribedReports: { $exists: true, $ne: [] }
        }).limit(2).lean();
        
        if (subscribers.length > 0) {
          const emailResults = [];
          for (const subscriber of subscribers) {
            try {
              // Create test KPI data
              const testKpiData = {
                periodType: 'mtd',
                periodLabel: 'July 2025',
                dateRange: '2025-07-01 to 2025-07-31',
                overallMetrics: {
                  totalRevenue: 50000,
                  totalOrders: 100,
                  averageOrderValue: 500
                },
                yearOverYear: {
                  revenueGrowth: 15,
                  orderGrowth: 10
                },
                associatePerformance: {
                  'Test User': {
                    wineBottleConversionRate: 75,
                    clubConversionRate: 60,
                    revenue: 15000
                  }
                }
              };
              
              await EmailService.sendKPIDashboard(subscriber, testKpiData);
              emailResults.push({
                subscriber: subscriber.name,
                email: subscriber.email,
                success: true
              });
            } catch (error: any) {
              emailResults.push({
                subscriber: subscriber.name,
                email: subscriber.email,
                success: false,
                error: error.message
              });
            }
          }
          results.emailResults = emailResults;
        } else {
          results.emailResults = { message: 'No active subscribers found for email testing' };
        }
      } catch (error: any) {
        results.emailResults = { error: error.message };
      }
    }
    
    // Test SMS coaching
    if (testType === 'all' || testType === 'sms') {
      console.log(`[TEST] Testing SMS coaching...`);
      
      try {
        const subscribers = await EmailSubscriptionModel.find({
          'smsCoaching.isActive': true,
          'smsCoaching.phoneNumber': { $exists: true, $ne: '' }
        }).limit(2).lean();
        
        if (subscribers.length > 0) {
          const smsResults = [];
          for (const subscriber of subscribers) {
            try {
              const message = await generateCoachingMessage(subscriber.name, 'mtd');
              const success = await getSmsService().sendSms(
                subscriber.smsCoaching.phoneNumber,
                message
              );
              
              smsResults.push({
                subscriber: subscriber.name,
                phone: subscriber.smsCoaching.phoneNumber,
                success,
                messageLength: message.length
              });
            } catch (error: any) {
              smsResults.push({
                subscriber: subscriber.name,
                phone: subscriber.smsCoaching.phoneNumber,
                success: false,
                error: error.message
              });
            }
          }
          results.smsResults = smsResults;
        } else {
          results.smsResults = { message: 'No active SMS subscribers found for testing' };
        }
      } catch (error: any) {
        results.smsResults = { error: error.message };
      }
    }
    
    // Test competition SMS
    if (testType === 'all' || testType === 'competition') {
      console.log(`[TEST] Testing competition SMS...`);
      
      try {
        const { CompetitionModel } = await import('@/lib/models');
        const activeCompetitions = await CompetitionModel.find({
          status: 'active',
          enrolledSubscribers: { $exists: true, $ne: [] }
        }).limit(2).lean();
        
        if (activeCompetitions.length > 0) {
          const competitionResults = [];
          for (const competition of activeCompetitions) {
            try {
              // Test welcome SMS
              const welcomeSmsService = new WelcomeSmsService();
              const welcomeResult = await welcomeSmsService.sendWelcomeSms(competition._id.toString());
              
              // Test progress SMS
              const progressSmsService = new ProgressSmsService();
              const progressResult = await progressSmsService.sendProgressSms(competition._id.toString());
              
              competitionResults.push({
                competitionId: competition._id.toString(),
                competitionName: competition.name,
                welcomeSms: welcomeResult,
                progressSms: progressResult
              });
            } catch (error: any) {
              competitionResults.push({
                competitionId: competition._id.toString(),
                competitionName: competition.name,
                error: error.message
              });
            }
          }
          results.competitionResults = competitionResults;
        } else {
          results.competitionResults = { message: 'No active competitions found for testing' };
        }
      } catch (error: any) {
        results.competitionResults = { error: error.message };
      }
    }
    
    results.endTime = new Date().toISOString();
    
    console.log(`[TEST] ✅ Communications testing completed`);
    
    return NextResponse.json({
      success: true,
      data: results
    });
    
  } catch (error: any) {
    console.error(`[API] Error in test-worker-communications: ${error.message}`);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log(`[API] GET /api/test-worker-communications`);
    await connectToDatabase();
    
    // Get communication statistics
    const emailSubscribers = await EmailSubscriptionModel.countDocuments({
      isActive: true,
      subscribedReports: { $exists: true, $ne: [] }
    });
    
    const smsSubscribers = await EmailSubscriptionModel.countDocuments({
      'smsCoaching.isActive': true,
      'smsCoaching.phoneNumber': { $exists: true, $ne: '' }
    });
    
    const { CompetitionModel } = await import('@/lib/models');
    const activeCompetitions = await CompetitionModel.countDocuments({
      status: 'active',
      enrolledSubscribers: { $exists: true, $ne: [] }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        emailSubscribers,
        smsSubscribers,
        activeCompetitions,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error(`[API] Error in test-worker-communications: ${error.message}`);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 