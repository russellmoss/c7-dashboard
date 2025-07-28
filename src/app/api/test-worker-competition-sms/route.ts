import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CompetitionModel } from "@/lib/models";
import { WelcomeSmsService } from "@/lib/sms/welcome-sms";
import { ProgressSmsService } from "@/lib/sms/progress-sms";
import { WinnerAnnouncementService } from "@/lib/sms/winner-announcement";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log(`[API] GET /api/test-worker-competition-sms`);

    // Skip SMS tests during build time
    if (process.env.NODE_ENV === 'production' && process.env.SKIP_INTEGRATION_TESTS === 'true') {
      console.log("[API] ⏭️ Skipping SMS tests during build (API not available)");
      return NextResponse.json({
        success: true,
        message: "SMS tests skipped during build",
        data: {
          competitions: [],
          summary: {
            totalCompetitions: 0,
            processedCompetitions: 0,
            totalSmsSent: 0,
            totalErrors: 0
          }
        }
      });
    }

    await connectToDatabase();

    const now = new Date();
    console.log(`[TEST] Current time: ${now.toISOString()}`);

    // Find active competitions with scheduled SMS
    const activeCompetitions = await CompetitionModel.find({
      status: "active",
      $or: [
        { "welcomeMessage.sendAt": { $lte: now, $ne: null } },
        { "progressNotifications.scheduledAt": { $lte: now } },
        { "winnerAnnouncement.scheduledAt": { $lte: now } },
      ],
    }).lean();

    console.log(
      `[TEST] Found ${activeCompetitions.length} competitions with scheduled SMS`,
    );

    const results = [];

    for (const competition of activeCompetitions) {
      const competitionResult = {
        competitionId: competition._id,
        competitionName: competition.name,
        status: competition.status,
        enrolledSubscribers: competition.enrolledSubscribers?.length || 0,
        welcomeMessage: {
          scheduled: !!competition.welcomeMessage?.sendAt,
          due: competition.welcomeMessage?.sendAt
            ? competition.welcomeMessage.sendAt <= now
            : false,
          sent: competition.welcomeMessage?.sent,
          sendAt: competition.welcomeMessage?.sendAt,
        },
        progressNotifications:
          competition.progressNotifications?.map((n) => ({
            id: n.id,
            scheduled: !!n.scheduledAt,
            due: n.scheduledAt <= now,
            sent: n.sent,
            scheduledAt: n.scheduledAt,
          })) || [],
        winnerAnnouncement: {
          scheduled: !!competition.winnerAnnouncement?.scheduledAt,
          due: competition.winnerAnnouncement?.scheduledAt <= now,
          sent: competition.winnerAnnouncement?.sent,
          scheduledAt: competition.winnerAnnouncement?.scheduledAt,
        },
        tests: [] as any[],
      };

      // Test welcome message
      if (
        competition.welcomeMessage?.sendAt &&
        competition.welcomeMessage.sendAt <= now &&
        !competition.welcomeMessage.sent
      ) {
        try {
          console.log(
            `[TEST] Testing welcome SMS for competition: ${competition.name}`,
          );
          const welcomeSmsService = new WelcomeSmsService();
          const result = await welcomeSmsService.sendWelcomeSms(
            competition._id.toString(),
          );

          competitionResult.tests.push({
            type: "welcome_sms",
            success: result.success,
            sentCount: result.sentCount,
            failedCount: result.failedCount,
            errors: result.errors,
          });

          console.log(
            `[TEST] ✅ Welcome SMS test completed for: ${competition.name}`,
          );
        } catch (error: any) {
          competitionResult.tests.push({
            type: "welcome_sms",
            success: false,
            error: error.message,
          });
          console.log(
            `[TEST] ❌ Welcome SMS test failed for: ${competition.name}: ${error.message}`,
          );
        }
      }

      // Test progress notifications
      if (
        competition.progressNotifications &&
        competition.progressNotifications.length > 0
      ) {
        for (const notification of competition.progressNotifications) {
          if (notification.scheduledAt <= now && !notification.sent) {
            try {
              console.log(
                `[TEST] Testing progress SMS for competition: ${competition.name}`,
              );
              const progressSmsService = new ProgressSmsService();
              const result = await progressSmsService.sendProgressSms(
                competition._id.toString(),
              );

              competitionResult.tests.push({
                type: "progress_sms",
                notificationId: notification.id,
                success: result.success,
                sentCount: result.sentCount,
                failedCount: result.failedCount,
                errors: result.errors,
              });

              console.log(
                `[TEST] ✅ Progress SMS test completed for: ${competition.name}`,
              );
            } catch (error: any) {
              competitionResult.tests.push({
                type: "progress_sms",
                notificationId: notification.id,
                success: false,
                error: error.message,
              });
              console.log(
                `[TEST] ❌ Progress SMS test failed for: ${competition.name}: ${error.message}`,
              );
            }
          }
        }
      }

      // Test winner announcement
      if (
        competition.winnerAnnouncement?.scheduledAt &&
        competition.winnerAnnouncement.scheduledAt <= now &&
        !competition.winnerAnnouncement.sent
      ) {
        try {
          console.log(
            `[TEST] Testing winner announcement for competition: ${competition.name}`,
          );
          const winnerAnnouncementService = new WinnerAnnouncementService();
          const result = await winnerAnnouncementService.sendWinnerAnnouncement(
            competition._id.toString(),
          );

          competitionResult.tests.push({
            type: "winner_announcement",
            success: result.success,
            sentCount: result.sentCount,
            failedCount: result.failedCount,
            errors: result.errors,
          });

          console.log(
            `[TEST] ✅ Winner announcement test completed for: ${competition.name}`,
          );
        } catch (error: any) {
          competitionResult.tests.push({
            type: "winner_announcement",
            success: false,
            error: error.message,
          });
          console.log(
            `[TEST] ❌ Winner announcement test failed for: ${competition.name}: ${error.message}`,
          );
        }
      }

      results.push(competitionResult);
    }

    return NextResponse.json({
      success: true,
      data: {
        currentTime: now.toISOString(),
        totalCompetitions: activeCompetitions.length,
        results: results,
      },
    });
  } catch (error: any) {
    console.error(
      `[API] Error in test-worker-competition-sms: ${error.message}`,
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
