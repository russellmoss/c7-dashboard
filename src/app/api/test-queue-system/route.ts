import { NextRequest, NextResponse } from "next/server";
import { QueueManager } from "@/lib/queue-manager";
import { getSmsService } from "@/lib/sms/client";
import { EmailService } from "@/lib/email-service";
import { EmailSubscription } from "@/types/email";

export async function POST(request: NextRequest) {
  try {
    console.log(`[API] POST /api/test-queue-system`);

    const body = await request.json();
    const { testType, count = 5 } = body;

    const results: any = {
      testType,
      count,
      startTime: new Date().toISOString(),
      results: [] as any[],
      queueStats: QueueManager.getStats(),
      endTime: null as string | null,
      finalQueueStats: null as any,
    };

    console.log(`[TEST] Starting ${testType} queue test with ${count} items`);

    switch (testType) {
      case "sms":
        // Test SMS queuing
        for (let i = 0; i < count; i++) {
          const startTime = Date.now();
          try {
            const success = await getSmsService().sendSms(
              "+15555555555", // Test number
              `Test SMS ${i + 1} from queue system at ${new Date().toISOString()}`,
            );
            const duration = Date.now() - startTime;
            results.results.push({
              index: i + 1,
              success,
              duration: `${duration}ms`,
              timestamp: new Date().toISOString(),
            });
          } catch (error: any) {
            results.results.push({
              index: i + 1,
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            });
          }
        }
        break;

      case "email":
        // Test email queuing
        const testSubscription: EmailSubscription = {
          name: "Test User",
          email: "test@example.com",
          subscribedReports: ["mtd"],
          frequency: "weekly",
          timeEST: "09:00",
          isActive: true,
          personalizedGoals: {
            bottleConversionRate: { enabled: true, value: 25 },
            clubConversionRate: { enabled: true, value: 6 },
            aov: { enabled: true, value: 150 },
          },
          smsCoaching: {
            isActive: true,
            phoneNumber: "+1234567890",
            staffMembers: [],
            coachingStyle: "balanced",
            customMessage: "",
          },
        };

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

        for (let i = 0; i < count; i++) {
          const startTime = Date.now();
          try {
            await EmailService.sendKPIDashboard(testSubscription, testKpiData);
            const duration = Date.now() - startTime;
            results.results.push({
              index: i + 1,
              success: true,
              duration: `${duration}ms`,
              timestamp: new Date().toISOString(),
            });
          } catch (error: any) {
            results.results.push({
              index: i + 1,
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            });
          }
        }
        break;

      case "batch":
        // Test batch processing
        const items = Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          name: `Item ${i + 1}`,
          data: `Test data ${i + 1}`,
        }));

        const batchResults = await QueueManager.processBatch(
          items,
          async (item, index) => {
            console.log(
              `[TEST] Processing batch item ${index + 1}/${items.length}`,
            );
            await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate processing
            return {
              ...item,
              processed: true,
              processedAt: new Date().toISOString(),
            };
          },
          1000, // 1 second delay between items
        );

        results.results = batchResults;
        break;

      default:
        return NextResponse.json(
          { error: "Invalid test type. Use: sms, email, or batch" },
          { status: 400 },
        );
    }

    results.endTime = new Date().toISOString();
    results.finalQueueStats = QueueManager.getStats();

    console.log(`[TEST] ${testType} queue test completed`);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error(`[API] Error in test-queue-system: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log(`[API] GET /api/test-queue-system`);

    const stats = QueueManager.getStats();

    return NextResponse.json({
      success: true,
      data: {
        queueStats: stats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error(`[API] Error in test-queue-system: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
