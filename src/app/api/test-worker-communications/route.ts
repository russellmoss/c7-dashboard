import { NextRequest, NextResponse } from "next/server";
import { EmailSubscriptionModel } from "@/lib/models";
import { EmailService } from "@/lib/email-service";
import { getSmsService } from "@/lib/sms/client";
import { generateCoachingMessage } from "@/lib/sms/sms-worker.worker";
import { EmailSubscription } from "@/types/email";
import { connectToDatabase } from "@/lib/mongodb";
import { WelcomeSmsService } from "@/lib/sms/welcome-sms";
import { ProgressSmsService } from "@/lib/sms/progress-sms";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log(`[API] POST /api/test-worker-communications`);

    // Skip communications tests during build time
    if (process.env.NODE_ENV === 'production' && process.env.SKIP_INTEGRATION_TESTS === 'true') {
      console.log("[API] ⏭️ Skipping communications tests during build (API not available)");
      return NextResponse.json({
        success: true,
        message: "Communications tests skipped during build",
        data: {
          testType: "all",
          forceSend: false,
          startTime: new Date().toISOString(),
          emailResults: null,
          smsResults: null,
          competitionResults: null,
          endTime: new Date().toISOString(),
          finalQueueStats: null
        }
      });
    }

    await connectToDatabase();

    const body = await request.json();
    const { testType = "all", forceSend = false } = body;

    const results: any = {
      testType,
      forceSend,
      startTime: new Date().toISOString(),
      emailResults: null as any,
      smsResults: null as any,
      competitionResults: null as any,
      endTime: null as string | null,
      finalQueueStats: null as any,
    };

    // Test email communications
    if (testType === "all" || testType === "email") {
      console.log(`[TEST] Testing email communications...`);

      try {
        const subscribers = await EmailSubscriptionModel.find({
          isActive: true,
          subscribedReports: { $exists: true, $ne: [] },
        })
          .limit(2)
          .lean();

        if (subscribers.length > 0) {
          const emailResults = [];
          for (const subscriber of subscribers) {
            try {
              // Transform subscriber to match EmailSubscription interface
              const emailSubscription = {
                name: subscriber.name,
                email: subscriber.email,
                subscribedReports: subscriber.subscribedReports || [],
                frequency: (subscriber.reportSchedules?.mtd?.frequency ||
                  "weekly") as "daily" | "weekly" | "monthly",
                timeEST: subscriber.reportSchedules?.mtd?.timeEST || "09:00",
                isActive: subscriber.isActive,
                personalizedGoals: subscriber.personalizedGoals || {
                  bottleConversionRate: { enabled: false, value: 0 },
                  clubConversionRate: { enabled: false, value: 0 },
                  aov: { enabled: false, value: 0 },
                },
                smsCoaching: subscriber.smsCoaching || {
                  isActive: false,
                  phoneNumber: "",
                  staffMembers: [],
                },
              };

              // Create test KPI data
              const testKpiData = {
                periodType: "mtd" as const,
                periodLabel: "July 2025",
                dateRange: {
                  start: "2025-07-01",
                  end: "2025-07-31",
                },
                overallMetrics: {
                  totalRevenue: 50000,
                  totalOrders: 100,
                  averageOrderValue: 500,
                  totalGuests: 200,
                  totalBottlesSold: 150,
                  avgOrderValue: 500,
                  wineBottleConversionRate: 75,
                  clubConversionRate: 6,
                },
                yearOverYear: {
                  revenue: {
                    current: 50000,
                    previous: 43500,
                    change: 15,
                  },
                  guests: {
                    current: 200,
                    previous: 195,
                    change: 2.5,
                  },
                  orders: {
                    current: 100,
                    previous: 95,
                    change: 5.3,
                  },
                },
                associatePerformance: {
                  "Test User": {
                    wineBottleConversionRate: 75,
                    clubConversionRate: 60,
                    revenue: 15000,
                  },
                },
              };

              await EmailService.sendKPIDashboard(
                {
                  ...emailSubscription,
                  smsCoaching: {
                    isActive: (emailSubscription.smsCoaching as any)?.isActive || false,
                    phoneNumber: (emailSubscription.smsCoaching as any)?.phoneNumber || "",
                    staffMembers: (emailSubscription.smsCoaching as any)?.staffMembers || [],
                    coachingStyle: (emailSubscription.smsCoaching as any)?.coachingStyle || "balanced",
                    customMessage: (emailSubscription.smsCoaching as any)?.customMessage || "",
                  },
                } as EmailSubscription,
                testKpiData,
              );
              emailResults.push({
                subscriber: subscriber.name,
                email: subscriber.email,
                success: true,
              });
            } catch (error: any) {
              emailResults.push({
                subscriber: subscriber.name,
                email: subscriber.email,
                success: false,
                error: error.message,
              });
            }
          }
          results.emailResults = emailResults;
        } else {
          results.emailResults = {
            message: "No active subscribers found for email testing",
          };
        }
      } catch (error: any) {
        results.emailResults = { error: error.message };
      }
    }

    // Test SMS coaching
    if (testType === "all" || testType === "sms") {
      console.log(`[TEST] Testing SMS coaching...`);

      try {
        const subscribers = await EmailSubscriptionModel.find({
          "smsCoaching.isActive": true,
          "smsCoaching.phoneNumber": { $exists: true, $ne: "" },
        })
          .limit(2)
          .lean();

        if (subscribers.length > 0) {
          const smsResults = [];
          for (const subscriber of subscribers) {
            try {
              // Create mock performance data for the staff member
              const mockPerformance = {
                name: subscriber.name,
                wineBottleConversionRate: 65,
                clubConversionRate: 4.5,
                revenue: 15000,
                orders: 25,
                guests: 40,
              };

              // Create mock config data
              const mockConfig = {
                phoneNumber: subscriber.smsCoaching?.phoneNumber || "",
                periodType: "mtd",
              };

              const message = await generateCoachingMessage(
                mockPerformance,
                mockConfig,
                "mtd",
              );
              const phoneNumber = subscriber.smsCoaching?.phoneNumber || "";
              const success = await getSmsService().sendSms(
                phoneNumber,
                message,
              );

              smsResults.push({
                subscriber: subscriber.name,
                phone: phoneNumber,
                success,
                messageLength: message.length,
              });
            } catch (error: any) {
              const phoneNumber = subscriber.smsCoaching?.phoneNumber || "";
              smsResults.push({
                subscriber: subscriber.name,
                phone: phoneNumber,
                success: false,
                error: error.message,
              });
            }
          }
          results.smsResults = smsResults;
        } else {
          results.smsResults = {
            message: "No active SMS subscribers found for testing",
          };
        }
      } catch (error: any) {
        results.smsResults = { error: error.message };
      }
    }

    // Test competition SMS
    if (testType === "all" || testType === "competition") {
      console.log(`[TEST] Testing competition SMS...`);

      try {
        const { CompetitionModel } = await import("@/lib/models");
        const activeCompetitions = await CompetitionModel.find({
          status: "active",
          enrolledSubscribers: { $exists: true, $ne: [] },
        })
          .limit(2)
          .lean();

        if (activeCompetitions.length > 0) {
          const competitionResults = [];
          for (const competition of activeCompetitions) {
            try {
              // Test welcome SMS
              const welcomeSmsService = new WelcomeSmsService();
              const welcomeResult = await welcomeSmsService.sendWelcomeSms(
                competition._id.toString(),
              );

              // Test progress SMS
              const progressSmsService = new ProgressSmsService();
              const progressResult = await progressSmsService.sendProgressSms(
                competition._id.toString(),
              );

              competitionResults.push({
                competitionId: competition._id.toString(),
                competitionName: competition.name,
                welcomeSms: welcomeResult,
                progressSms: progressResult,
              });
            } catch (error: any) {
              competitionResults.push({
                competitionId: competition._id.toString(),
                competitionName: competition.name,
                error: error.message,
              });
            }
          }
          results.competitionResults = competitionResults;
        } else {
          results.competitionResults = {
            message: "No active competitions found for testing",
          };
        }
      } catch (error: any) {
        results.competitionResults = { error: error.message };
      }
    }

    results.endTime = new Date().toISOString();

    console.log(`[TEST] ✅ Communications testing completed`);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error(
      `[API] Error in test-worker-communications: ${error.message}`,
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log(`[API] GET /api/test-worker-communications`);

    // Skip communications tests during build time
    if (process.env.NODE_ENV === 'production' && process.env.SKIP_INTEGRATION_TESTS === 'true') {
      console.log("[API] ⏭️ Skipping communications tests during build (API not available)");
      return NextResponse.json({
        success: true,
        data: {
          emailSubscribers: 0,
          smsSubscribers: 0,
          activeCompetitions: 0,
          timestamp: new Date().toISOString(),
        },
      });
    }

    await connectToDatabase();

    // Get communication statistics
    const emailSubscribers = await EmailSubscriptionModel.countDocuments({
      isActive: true,
      subscribedReports: { $exists: true, $ne: [] },
    });

    const smsSubscribers = await EmailSubscriptionModel.countDocuments({
      "smsCoaching.isActive": true,
      "smsCoaching.phoneNumber": { $exists: true, $ne: "" },
    });

    const { CompetitionModel } = await import("@/lib/models");
    const activeCompetitions = await CompetitionModel.countDocuments({
      status: "active",
      enrolledSubscribers: { $exists: true, $ne: [] },
    });

    return NextResponse.json({
      success: true,
      data: {
        emailSubscribers,
        smsSubscribers,
        activeCompetitions,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error(
      `[API] Error in test-worker-communications: ${error.message}`,
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
