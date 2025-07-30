import { config } from "dotenv";
import { resolve } from "path";
import cron from "node-cron";
import { fileURLToPath } from "url";
import moment from "moment-timezone";
import mongoose from "mongoose";
import chalk from "chalk";
import express from "express";
import { EmailService } from "../lib/email-service.js";
import { getSmsService } from "../lib/sms/client.js";

import type { EmailSubscription, KPIData } from "../types/kpi.js";

import { exec } from "child_process";
import { promisify } from "util";
import { join, dirname } from "path";
import { sendSms, generateCoachingMessage } from "../lib/sms/sms-worker.worker.js";

// Load environment variables FIRST
config({ path: resolve(process.cwd(), ".env.local") });
console.log(
  "[Worker] Environment loaded. TWILIO_ACCOUNT_SID:",
  process.env.TWILIO_ACCOUNT_SID ? "SET" : "NOT SET",
);

console.log("[DEBUG] getSmsService:", typeof getSmsService);
console.log("[DEBUG] EmailService:", typeof EmailService);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// In production, the script should be in the src folder, not dist
const scriptPath = process.env.NODE_ENV === 'production' 
  ? join(process.cwd(), "src/scripts/optimized-kpi-dashboard.cjs")
  : join(__dirname, "optimized-kpi-dashboard.cjs");

console.log(`[Worker] Script path: ${scriptPath}`);
console.log(`[Worker] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[Worker] Process cwd: ${process.cwd()}`);
console.log(`[Worker] __dirname: ${__dirname}`);
// Use dynamic import for fs instead of require
import('fs').then(fs => {
  console.log(`[Worker] File exists check: ${fs.default.existsSync(scriptPath)}`);
}).catch(err => {
  console.log(`[Worker] File exists check failed: ${err.message}`);
});

// Logging
const log = {
  info: (msg: string) =>
    console.log(chalk.blue(`[${new Date().toISOString()}] INFO: ${msg}`)),
  success: (msg: string) =>
    console.log(chalk.green(`[${new Date().toISOString()}] SUCCESS: ${msg}`)),
  error: (msg: string) =>
    console.log(chalk.red(`[${new Date().toISOString()}] ERROR: ${msg}`)),
  warn: (msg: string) =>
    console.log(chalk.yellow(`[${new Date().toISOString()}] WARN: ${msg}`)),
};

console.log("Mongoose instance in worker:", mongoose);
console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY);

const runningJobs = new Set();
const jobExecutionLog = new Map();

// Placeholder functions - implement these as needed
async function generateAIInsights(periodType: string) {
  // TODO: Implement AI insights generation
  log.info(`AI insights generation for ${periodType} - not yet implemented`);
}

async function sendFailureNotification(periodType: string, error: Error) {
  // TODO: Implement failure notification (email/SMS)
  log.error(
    `Failure notification for ${periodType}: ${error.message} - not yet implemented`,
  );
}

// Create and maintain our own MongoDB connection
async function createPersistentConnection() {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    "mongodb://localhost:27017/milea-estate";

  // Check if already connected
  if (Number(mongoose.connection.readyState) === 1) {
    log.info("MongoDB already connected, using existing connection");
    return mongoose.connection;
  }

  // Set mongoose options for persistent connection
  mongoose.set("strictQuery", false);

  const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    // Keep the connection alive
    keepAlive: true,
    keepAliveInitialDelay: 300000,
  };

  try {
    log.info(
      "Creating new MongoDB connection to: " +
        mongoUri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@"),
    );
    await mongoose.connect(mongoUri, options);
    log.success("✅ MongoDB connected successfully with persistent connection");

    // Set up connection monitoring
    mongoose.connection.on("connected", () => {
      log.info("MongoDB connected event fired");
    });

    mongoose.connection.on("disconnected", () => {
      log.error("MongoDB disconnected! Will attempt to reconnect...");
    });

    mongoose.connection.on("error", (err: Error) => {
      log.error(`MongoDB error: ${err.message}`);
    });

    mongoose.connection.on("reconnected", () => {
      log.success("MongoDB reconnected successfully");
    });

    // Verify connection is ready
    if (Number(mongoose.connection.readyState) !== 1) {
      throw new Error("Connection established but not in ready state");
    }

    return mongoose.connection;
  } catch (error: unknown) {
    if (error instanceof Error) {
      log.error(`Failed to connect to MongoDB: ${error.message}`);
    } else {
      log.error("Failed to connect to MongoDB: Unknown error");
    }
    throw error;
  }
}

// Reliable timezone-aware scheduling
function isJobDueNow(schedule: any, now: Date) {
  try {
    const estNow = moment.tz(now, "America/New_York");
    log.info(
      `[DEBUG] isJobDueNow: UTC now: ${now.toISOString()}, EST now: ${estNow.format()}, schedule.timeEST: ${schedule.timeEST}`,
    );
    const hour = estNow.hour();
    const minute = estNow.minute();
    const dayOfWeek = estNow.day();
    const dayOfMonth = estNow.date();
    const [scheduleHour, scheduleMinute] = (schedule.timeEST || "09:00")
      .split(":")
      .map(Number);
    if (hour !== scheduleHour || minute !== scheduleMinute) return false;
    const jobKey = `${schedule.periodType || "email"}_${schedule.frequency}_${schedule.timeEST}`;
    if (hasJobExecutedRecently(jobKey)) {
      log.warn(`Job ${jobKey} already executed recently, skipping`);
      return false;
    }
    switch (schedule.frequency) {
      case "daily":
        return true;
      case "weekly":
        return schedule.dayOfWeek === dayOfWeek;
      case "biweekly": {
        if (schedule.dayOfWeek !== dayOfWeek) return false;
        const weeksSinceEpoch = Math.floor(
          estNow.valueOf() / (7 * 24 * 60 * 60 * 1000),
        );
        return weeksSinceEpoch % 2 === (schedule.weekStart || 0) % 2;
      }
      case "monthly":
        if (schedule.dayOfMonth) {
          return dayOfMonth === schedule.dayOfMonth;
        }
        if (schedule.dayOfWeek !== undefined && schedule.weekOfMonth) {
          const firstDayOfMonth = estNow.clone().startOf("month");
          const firstWeekdayOfMonth = firstDayOfMonth.day();
          const nthWeekdayDate =
            1 +
            (schedule.weekOfMonth - 1) * 7 +
            ((schedule.dayOfWeek - firstWeekdayOfMonth + 7) % 7);
          return dayOfMonth === nthWeekdayDate;
        }
        return false;
      case "quarterly": {
        const quarterStartMonth = Math.floor(estNow.month() / 3) * 3;
        return estNow.month() === quarterStartMonth && dayOfMonth === 1;
      }
      default:
        return false;
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      log.error(`Error in isJobDueNow: ${error.message}`);
    } else {
      log.error("Error in isJobDueNow: Unknown error");
    }
    return false;
  }
}

function hasJobExecutedRecently(jobKey: string, windowMinutes = 30) {
  const lastExecution = jobExecutionLog.get(jobKey);
  if (!lastExecution) return false;
  return Date.now() - lastExecution < windowMinutes * 60 * 1000;
}

function markJobExecuted(jobKey: string) {
  jobExecutionLog.set(jobKey, Date.now());
}

// Add robust ensureConnection function
async function ensureConnection() {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    "mongodb://localhost:27017/milea-estate";
  const options = {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  };
  if (Number(mongoose.connection.readyState) !== 1) {
    log.warn(
      "MongoDB not connected (readyState=" +
        mongoose.connection.readyState +
        "). Attempting to connect...",
    );
    await mongoose.connect(mongoUri, options);
    log.success("✅ MongoDB connected (or reconnected) successfully");
  } else {
    log.info("MongoDB already connected, using existing connection");
  }
}

// Process competition SMS scheduling
async function processCompetitionSMS(CompetitionModel: any, now: Date) {
  try {
    log.info("[COMPETITION] Processing competition SMS scheduling...");

    // Find active competitions without populating (we'll handle subscribers separately)
    const activeCompetitions = await CompetitionModel.find({
      status: "active",
      $or: [
        { "welcomeMessage.sendAt": { $lte: now, $ne: null } },
        { "progressNotifications.scheduledAt": { $lte: now } },
        { "winnerAnnouncement.scheduledAt": { $lte: now } },
      ],
    }).lean();

    log.info(
      `[COMPETITION] Found ${activeCompetitions.length} competitions with scheduled SMS`,
    );

    for (const competition of activeCompetitions) {
      try {
        // Process welcome message
        if (
          competition.welcomeMessage?.sendAt &&
          competition.welcomeMessage.sendAt <= now &&
          !competition.welcomeMessage.sent
        ) {
          log.info(
            `[COMPETITION] Sending welcome SMS for competition: ${competition.name}`,
          );

          const { WelcomeSmsService } = await import("../lib/sms/welcome-sms.js");
          const welcomeSmsService = new WelcomeSmsService();

          await welcomeSmsService.sendWelcomeSms(competition._id.toString());

          // Mark as sent
          await CompetitionModel.findByIdAndUpdate(competition._id, {
            "welcomeMessage.sent": true,
            "welcomeMessage.sentAt": now,
          });

          log.success(
            `[COMPETITION] ✅ Welcome SMS sent for: ${competition.name}`,
          );
        }

        // Process progress notifications
        if (
          competition.progressNotifications &&
          competition.progressNotifications.length > 0
        ) {
          for (const notification of competition.progressNotifications) {
            if (notification.scheduledAt <= now && !notification.sent) {
              log.info(
                `[COMPETITION] Sending progress SMS for competition: ${competition.name}`,
              );

              const { ProgressSmsService } = await import(
                "../lib/sms/progress-sms.js"
              );
              const progressSmsService = new ProgressSmsService();

              await progressSmsService.sendProgressSms(
                competition._id.toString(),
              );

              // Mark as sent
              await CompetitionModel.findByIdAndUpdate(
                competition._id,
                {
                  "progressNotifications.$[elem].sent": true,
                  "progressNotifications.$[elem].sentAt": now,
                },
                {
                  arrayFilters: [{ "elem.id": notification.id }],
                },
              );

              log.success(
                `[COMPETITION] ✅ Progress SMS sent for: ${competition.name}`,
              );
            }
          }
        }

        // Process winner announcement
        if (
          competition.winnerAnnouncement?.scheduledAt &&
          competition.winnerAnnouncement.scheduledAt <= now &&
          !competition.winnerAnnouncement.sent
        ) {
          log.info(
            `[COMPETITION] Sending winner announcement for competition: ${competition.name}`,
          );

          const { WinnerAnnouncementService } = await import(
            "../lib/sms/winner-announcement.js"
          );
          const winnerAnnouncementService = new WinnerAnnouncementService();

          await winnerAnnouncementService.sendWinnerAnnouncement(
            competition._id.toString(),
          );

          // Mark as sent
          await CompetitionModel.findByIdAndUpdate(competition._id, {
            "winnerAnnouncement.sent": true,
            "winnerAnnouncement.sentAt": now,
          });

          log.success(
            `[COMPETITION] ✅ Winner announcement sent for: ${competition.name}`,
          );
        }
      } catch (error: any) {
        log.error(
          `[COMPETITION] Error processing SMS for competition ${competition.name}: ${error.message}`,
        );
      }
    }
  } catch (error: any) {
    log.error(`[COMPETITION] Error in processCompetitionSMS: ${error.message}`);
  }
}

// Robust job processing with individual error handling
async function processScheduledJobs() {
  try {
    await ensureConnection();
    // Require models only after connection is ensured
    const { EmailSubscriptionModel, KPIDataModel, CompetitionModel } =
      await import("../lib/models.js");

    // Ensure all models are registered
    await import("../lib/models.js");

    const now = new Date();
    const estNow = moment.tz(now, "America/New_York");
    log.info(
      `[DEBUG] UTC now: ${now.toISOString()}, EST now: ${estNow.format()}`,
    );
    log.info(
      "Mongoose connection state after ensureConnection: " +
        mongoose.connection.readyState,
    );

    // Process competition SMS scheduling
    await processCompetitionSMS(CompetitionModel, now);

    const subs = (await EmailSubscriptionModel.find({
      isActive: true,
    }).lean()) as unknown as EmailSubscription[];
    log.info(
      `Processing scheduled jobs for ${subs.length} active subscriptions`,
    );

    for (const sub of subs) {
      log.info(
        `[DEBUG] Processing subscription: ${sub.email}, hasSmsCoaching: ${!!sub.smsCoaching}, smsCoachingActive: ${sub.smsCoaching?.isActive}, staffMembersCount: ${sub.smsCoaching?.staffMembers?.length || 0}`,
      );
      // Email Reports
      if (sub.subscribedReports && sub.reportSchedules) {
        for (const reportKey of sub.subscribedReports) {
          try {
            const schedule = sub.reportSchedules[reportKey];
            if (schedule && schedule.isActive && isJobDueNow(schedule, now)) {
              // Include scheduled time in job key to allow multiple times per day
              const jobKey = `email_${reportKey}_${sub.email}_${schedule.timeEST || "09:00"}`;
              if (hasJobExecutedRecently(jobKey)) {
                log.info(`Skipping duplicate email for ${jobKey}`);
                continue;
              }
              const kpiData = (await KPIDataModel.findOne({
                periodType: reportKey,
                status: "completed",
              })
                .sort({ createdAt: -1 })
                .lean()) as KPIData | null;
              if (!kpiData || !kpiData.data) {
                log.warn(`No KPI data for ${reportKey} for ${sub.email}`);
                continue;
              }
              const allowedFrequencies = [
                "daily",
                "weekly",
                "monthly",
              ] as const;
              function toAllowedFrequency(
                f: string | undefined,
              ): (typeof allowedFrequencies)[number] {
                return allowedFrequencies.includes(f as any)
                  ? (f as (typeof allowedFrequencies)[number])
                  : "weekly";
              }
              const frequency = toAllowedFrequency(
                sub.reportSchedules?.[reportKey]?.frequency,
              );
              // Before sending the email, add a debug log and safe check
              log.info(
                "kpiData.data for email: " +
                  JSON.stringify(kpiData.data, null, 2),
              );
              const report = kpiData.data; // KPIReport
              const kpiDashboardData = {
                periodType: report.periodType,
                periodLabel: report.current.periodLabel,
                dateRange: report.current.dateRange,
                overallMetrics: report.current.overallMetrics,
                yearOverYear: report.yearOverYear,
                associatePerformance: report.current.associatePerformance,
                insights: kpiData.insights, // or report.insights if present
              };
              if (
                !kpiDashboardData.dateRange ||
                !kpiDashboardData.periodLabel
              ) {
                log.error(
                  "KPI data missing required fields for email: " +
                    JSON.stringify(kpiDashboardData, null, 2),
                );
                continue;
              }
              await EmailService.sendKPIDashboard(
                {
                  name: sub.name,
                  email: sub.email,
                  subscribedReports: sub.subscribedReports,
                  frequency,
                  timeEST: sub.reportSchedules?.[reportKey]?.timeEST ?? "09:00",
                  isActive: sub.isActive,
                },
                kpiDashboardData,
              );
              markJobExecuted(jobKey);
              log.success(`Sent ${reportKey} email report to ${sub.email}`);
            }
          } catch (err: unknown) {
            if (err instanceof Error) {
              log.error(
                `Email report error for ${reportKey} to ${sub.email}: ${err.message}`,
              );
            } else {
              log.error(
                `Email report error for ${reportKey} to ${sub.email}: Unknown error`,
              );
            }
          }
        }
      }
      // SMS Coaching
      if (
        sub.smsCoaching &&
        sub.smsCoaching.isActive &&
        sub.smsCoaching.staffMembers
      ) {
        for (const staff of sub.smsCoaching.staffMembers) {
          for (const dashboard of staff.dashboards || []) {
            log.info(
              `[DEBUG] Checking SMS schedule: staff=${staff.name}, staffActive=${staff.isActive}, dashboardActive=${dashboard.isActive}, periodType=${dashboard.periodType}, timeEST=${dashboard.timeEST}`,
            );
            try {
              if (!staff.isActive) {
                log.info(`[DEBUG] Skipping staff ${staff.name} (inactive)`);
                continue;
              }
              if (!dashboard.isActive) {
                log.info(
                  `[DEBUG] Skipping dashboard for ${staff.name} (${dashboard.periodType}) at ${dashboard.timeEST} (inactive)`,
                );
                continue;
              }
              if (!isJobDueNow(dashboard, now)) {
                log.info(
                  `[DEBUG] Not due now: staff=${staff.name}, periodType=${dashboard.periodType}, timeEST=${dashboard.timeEST}`,
                );
                continue;
              }
              // Include scheduled time in job key to allow multiple times per day
              const jobKey = `sms_${dashboard.periodType}_${staff.name}_${dashboard.timeEST || "09:00"}`;
              if (hasJobExecutedRecently(jobKey)) {
                log.info(`Skipping duplicate SMS for ${jobKey}`);
                continue;
              }
              const kpiData = (await KPIDataModel.findOne({
                periodType: dashboard.periodType,
                status: "completed",
              })
                .sort({ createdAt: -1 })
                .lean()) as KPIData | null;
              if (!kpiData?.data?.current?.associatePerformance) {
                log.warn(
                  `No KPI data for ${dashboard.periodType} SMS to ${staff.name}`,
                );
                continue;
              }
              const staffPerf =
                kpiData.data.current.associatePerformance[staff.name];
              if (!staffPerf) {
                log.warn(
                  `No performance data for ${staff.name} in ${dashboard.periodType}`,
                );
                continue;
              }
              log.info(
                `[DEBUG] Staff performance data for ${staff.name}: ${JSON.stringify(staffPerf, null, 2)}`,
              );
              // For SMS body generation, use the logic from the new sms/base.ts or move generateCoachingMessage there if needed.
              const smsBody = await generateCoachingMessage(
                { ...staffPerf, name: staff.name },
                sub.smsCoaching,
                dashboard.periodType,
                sub.personalizedGoals,
              );
              const smsSent = await sendSms(
                sub.smsCoaching.phoneNumber,
                smsBody,
              );
              if (smsSent) {
                // Archive the sent SMS
                const models = await import("../lib/models.js");
                await models.CoachingSMSHistoryModel.create({
                  staffName: staff.name,
                  phoneNumber: sub.smsCoaching.phoneNumber,
                  periodType: dashboard.periodType,
                  coachingMessage: smsBody,
                  sentAt: new Date(),
                });
                markJobExecuted(jobKey);
                log.success(
                  `Sent SMS to ${sub.smsCoaching.phoneNumber} for ${staff.name} (${dashboard.periodType}) at ${dashboard.timeEST || "09:00"}`,
                );
              } else {
                log.error(
                  `Failed to send SMS to ${sub.smsCoaching.phoneNumber} for ${staff.name} (${dashboard.periodType})`,
                );
              }
            } catch (err: unknown) {
              if (err instanceof Error) {
                log.error(
                  `SMS coaching error for ${staff.name} (${dashboard.periodType}): ${err.message}`,
                );
              } else {
                log.error(
                  `SMS coaching error for ${staff.name} (${dashboard.periodType}): Unknown error`,
                );
              }
            }
          }
        }
      }
    }
    log.info("Completed processing scheduled jobs");
  } catch (error: unknown) {
    if (error instanceof Error) {
      log.error(`Scheduled jobs processing failed: ${error.message}`);
      // If it's a connection error, try to reconnect
      if (error.message.includes("Client must be connected")) {
        log.error("Connection lost, attempting to reconnect...");
        try {
          await createPersistentConnection();
          log.success("Reconnected successfully");
        } catch (reconnectError: unknown) {
          if (reconnectError instanceof Error) {
            log.error(`Failed to reconnect: ${reconnectError.message}`);
          } else {
            log.error("Failed to reconnect: Unknown error");
          }
        }
      }
    } else {
      log.error("Scheduled jobs processing failed: Unknown error");
    }
  }
}

// KPI job execution with error handling
async function executeKPIJob(periodType: string) {
  if (runningJobs.has(periodType)) {
    log.warn(`Job ${periodType} is already running, skipping`);
    return;
  }
  runningJobs.add(periodType);
  const startTime = Date.now();
  try {
    // Ensure connection is ready
    await ensureConnection();

    log.info(`Starting ${periodType.toUpperCase()} KPI generation...`);
    log.info(`Using script path: ${scriptPath}`);
    
    // Check if script file exists
    const fs = await import('fs');
    log.info(`File exists check: ${fs.default.existsSync(scriptPath)}`);
    log.info(`Current working directory: ${process.cwd()}`);
    log.info(`Directory contents: ${fs.default.readdirSync(process.cwd()).join(', ')}`);
    
    if (!fs.default.existsSync(scriptPath)) {
      throw new Error(`Script file not found: ${scriptPath}`);
    }
    
    const CronJobLogModel = await import("../lib/models.js").then(
      (m) => m.CronJobLogModel,
    );
    const cronLog = await CronJobLogModel.create({
      jobType: periodType,
      status: "running",
      startTime: new Date(startTime),
    });
    const execAsync = promisify(exec);
    // Increase memory limit for large data processing
    const memoryLimit = periodType === "all-quarters" ? "--max-old-space-size=4096" : "--max-old-space-size=2048";
    const command = `node ${memoryLimit} "${scriptPath}" ${periodType}`;
    log.info(`Executing command: ${command}`);
    
    const { stderr } = await execAsync(command, {
      timeout: 1800000,
      maxBuffer: 1024 * 1024 * 10,
      env: { ...process.env },
    });
    if (stderr) log.warn(`Script warnings for ${periodType}: ${stderr}`);
    const executionTime = Date.now() - startTime;
    await CronJobLogModel.findByIdAndUpdate(cronLog._id, {
      status: "completed",
      endTime: new Date(),
      executionTime,
      dataGenerated: true,
    });
    log.success(
      `${periodType.toUpperCase()} completed in ${(executionTime / 1000).toFixed(2)}s`,
    );
    // Generate AI insights (non-blocking)
    setTimeout(() => generateAIInsights(periodType), 1000);
  } catch (error: unknown) {
    if (error instanceof Error) {
      const executionTime = Date.now() - startTime;
      log.error(
        `${periodType.toUpperCase()} failed after ${(executionTime / 1000).toFixed(2)}s: ${error.message}`,
      );
      await sendFailureNotification(periodType, error);
    } else {
      const executionTime = Date.now() - startTime;
      log.error(
        `${periodType.toUpperCase()} failed after ${(executionTime / 1000).toFixed(2)}s: Unknown error`,
      );
      await sendFailureNotification(periodType, error as Error);
    }
  } finally {
    runningJobs.delete(periodType);
  }
}

// Health monitoring
let lastHealthCheck = Date.now();

function setupHealthMonitoring() {
  setInterval(
    () => {
      const health = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        runningJobs: Array.from(runningJobs),
        mongooseState: mongoose.connection.readyState,
        mongooseStateText: [
          "disconnected",
          "connected",
          "connecting",
          "disconnecting",
        ][mongoose.connection.readyState],
      };
      log.info(`Health check: ${JSON.stringify(health)}`);
    },
    5 * 60 * 1000,
  );
}

// Graceful shutdown
async function gracefulShutdown() {
  log.info("Received shutdown signal, gracefully shutting down...");
  const shutdownTimeout = 30000;
  const startTime = Date.now();
  while (runningJobs.size > 0 && Date.now() - startTime < shutdownTimeout) {
    log.info(`Waiting for ${runningJobs.size} jobs to complete...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (runningJobs.size > 0) {
    log.warn(`Forcing shutdown with ${runningJobs.size} jobs still running`);
  }

  // Close MongoDB connection before exit
  try {
    await mongoose.connection.close();
    log.info("MongoDB connection closed");
  } catch (error: unknown) {
    if (error instanceof Error) {
      log.error(`Error closing MongoDB connection: ${error.message}`);
    } else {
      log.error("Error closing MongoDB connection: Unknown error");
    }
  }

  process.exit(0);
}

// Cron jobs
function setupCronJobs() {
  // KPI Data Generation - Daily at specific times (PRODUCTION SCHEDULE)
  cron.schedule("0 1 * * *", () => executeKPIJob("mtd"), {
    timezone: "America/New_York",
    name: "mtd-generation",
  });
  cron.schedule("0 2 * * *", () => executeKPIJob("ytd"), {
    timezone: "America/New_York",
    name: "ytd-generation",
  });
  cron.schedule("0 3 * * *", () => executeKPIJob("qtd"), {
    timezone: "America/New_York",
    name: "qtd-generation",
  });
  cron.schedule("0 4 * * *", () => executeKPIJob("all-quarters"), {
    timezone: "America/New_York",
    name: "all-quarters-generation",
  });

  // Scheduled Communications - Every 5 minutes
  // This interval is optimal because:
  // - Handles timezone edge cases (server vs. EST)
  // - Catches jobs that might be slightly delayed
  // - Good for real-time competition updates
  // - Minimal resource usage (lightweight job checking)
  // - Prevents jobs from being missed due to timing issues
  cron.schedule(
    "*/5 * * * *",
    async () => {
      log.info("Scheduled communications cron triggered");
      try {
        await processScheduledJobs();
      } catch (error: unknown) {
        if (error instanceof Error) {
          log.error(`Scheduled jobs failed: ${error.message}`);
          setTimeout(processScheduledJobs, 5 * 60 * 1000);
        } else {
          log.error("Scheduled jobs failed: Unknown error");
          setTimeout(processScheduledJobs, 5 * 60 * 1000);
        }
      }
    },
    { timezone: "America/New_York", name: "scheduled-communications" },
  );
  log.success("✅ All cron jobs scheduled successfully");
}

// Express /health endpoint
const app = express();
app.get("/health", (req, res) => {
  const mongoState = [
    "disconnected",
    "connected",
    "connecting",
    "disconnecting",
  ][mongoose.connection.readyState];
  res.json({
    status: Number(mongoose.connection.readyState) === 1 ? "ok" : "unhealthy",
    uptime: process.uptime(),
    lastHealthCheck: new Date(lastHealthCheck).toISOString(),
    memoryUsage: process.memoryUsage(),
    mongooseConnection: mongoState,
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  log.info(`[HEALTH] Health endpoint listening on port ${port}`);
});

// Initialize SMS service after env loaded
// initializeSmsService(); // This line is removed as per the new_code, as the service is now imported directly.

// Start the worker
async function startWorker() {
  try {
    log.info("🚀 Starting Milea Estate KPI Background Worker...");
    await ensureConnection();
    // Require models after connecting to MongoDB
    setupCronJobs();
    setupHealthMonitoring();
    log.success(
      "✅ Worker started successfully and waiting for scheduled jobs...",
    );
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error: unknown) {
    if (error instanceof Error) {
      log.error(`Failed to start worker: ${error.message}`);
    } else {
      log.error("Failed to start worker: Unknown error");
    }
    process.exit(1);
  }
}

startWorker();
