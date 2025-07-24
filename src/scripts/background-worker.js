require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
const cron = require('node-cron');
const { exec } = require('child_process');
const { promisify } = require('util');
const mongoose = require('mongoose');
const path = require('path');
const { Resend } = require('resend');
const { generateInsights } = require('../lib/ai-insights-cjs.js');

const execAsync = promisify(exec);

const { connectToDatabase } = require('../lib/mongodb-cjs.js');
const { CronJobLogModel, KPIDataModel, EmailSubscriptionModel } = require('../lib/models-cjs.js');
const { EmailService } = require('../lib/email-service');
const { SMSService } = require('../lib/sms-service');

const log = {
    info: (message) => console.log(`[${new Date().toISOString()}] 📊 ${message}`),
    success: (message) => console.log(`[${new Date().toISOString()}] ✅ ${message}`),
    error: (message) => console.log(`[${new Date().toISOString()}] ❌ ${message}`),
    warn: (message) => console.log(`[${new Date().toISOString()}] ⚠️ ${message}`),
    step: (message) => console.log(`[${new Date().toISOString()}] 🚀 ${message}`)
};

const runningJobs = new Set();
const resend = new Resend(process.env.RESEND_API_KEY);

async function generateAIInsights(periodType) {
    try {
        log.step(`Generating AI insights for ${periodType}...`);
        const latestData = await KPIDataModel.findOne({
            periodType,
            year: new Date().getFullYear(),
            status: 'completed'
        }).sort({ createdAt: -1 });
        if (!latestData) {
            log.warn(`No KPI data found for ${periodType} to generate insights`);
            return;
        }
        const insights = await generateInsights(latestData.data);
        await KPIDataModel.findByIdAndUpdate(latestData._id, { insights });
        log.success(`AI insights generated and saved for ${periodType}`);
    } catch (error) {
        log.error(`Failed to generate AI insights for ${periodType}: ${error.message}`);
    }
}

async function sendFailureNotification(periodType, error) {
    try {
        await resend.emails.send({
            from: 'dashboard@milea.com',
            to: 'your-team@example.com',
            subject: `KPI Job Failed: ${periodType}`,
            html: `<p>The ${periodType} KPI job failed.<br>Error: ${error.message}</p>`
        });
        log.info('Failure notification sent.');
    } catch (err) {
        log.error('Failed to send failure notification:', err.message);
    }
}

async function executeKPIJob(periodType) {
    if (runningJobs.has(periodType)) {
        log.warn(`Job ${periodType} is already running, skipping this execution`);
        return;
    }
    runningJobs.add(periodType);
    const startTime = Date.now();
    let cronLog;
    try {
        log.step(`Starting ${periodType.toUpperCase()} KPI generation...`);
        await connectToDatabase();
        cronLog = await CronJobLogModel.create({
            jobType: periodType,
            status: 'running',
            startTime: new Date(startTime)
        });
        const scriptPath = path.join(__dirname, 'optimized-kpi-dashboard.js');
        const command = `node "${scriptPath}" ${periodType}`;
        log.info(`Executing: ${command}`);
        const { stdout, stderr } = await execAsync(command, {
            timeout: 1800000, // 30 minute timeout
            maxBuffer: 1024 * 1024 * 10 
        });
        if (stderr) log.warn(`Script warnings for ${periodType}: ${stderr}`);
        log.info(`Script output for ${periodType}: ${stdout}`);
        const executionTime = Date.now() - startTime;
        await CronJobLogModel.findByIdAndUpdate(cronLog._id, {
            status: 'completed',
            endTime: new Date(),
            executionTime,
            dataGenerated: true
        });
        log.success(`${periodType.toUpperCase()} completed in ${(executionTime / 1000).toFixed(2)}s`);
        await generateAIInsights(periodType);
    } catch (error) {
        const executionTime = Date.now() - startTime;
        log.error(`${periodType.toUpperCase()} failed after ${(executionTime / 1000).toFixed(2)}s: ${error.message}`);
        if (cronLog) {
            await CronJobLogModel.findByIdAndUpdate(cronLog._id, {
                status: 'failed',
                endTime: new Date(),
                executionTime,
                error: error.message,
            });
        }
        await sendFailureNotification(periodType, error);
    } finally {
        runningJobs.delete(periodType);
        await mongoose.connection.close();
    }
}

function setupCronJobs() {
    // MTD at 1:00 AM EST
    cron.schedule('0 1 * * *', () => executeKPIJob('mtd'), { timezone: "America/New_York" });
    // YTD at 2:00 AM EST
    cron.schedule('0 2 * * *', () => executeKPIJob('ytd'), { timezone: "America/New_York" });
    // QTD at 3:00 AM EST
    cron.schedule('0 3 * * *', () => executeKPIJob('qtd'), { timezone: "America/New_York" });
    // All-Quarters at 4:00 AM EST
    cron.schedule('0 4 * * *', () => executeKPIJob('all-quarters'), { timezone: "America/New_York" });
    log.success('✅ All cron jobs scheduled successfully');
}

// Helper: check if a job is due now based on schedule
function isJobDueNow(schedule, now) {
  // schedule: { frequency, dayOfWeek, weekOfMonth, weekStart, timeEST, ... }
  // now: Date object (UTC)
  // Convert now to EST
  const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = estNow.getHours();
  const minute = estNow.getMinutes();
  const dayOfWeek = estNow.getDay();
  const date = estNow.getDate();
  const weekOfMonth = Math.ceil((date - estNow.getDay() + 1) / 7);

  // Only run at the top of the hour
  if (minute !== 0) return false;
  if (schedule.timeEST && hour !== parseInt(schedule.timeEST.split(':')[0], 10)) return false;

  switch (schedule.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return schedule.dayOfWeek === dayOfWeek;
    case 'biweekly': {
      if (schedule.dayOfWeek !== dayOfWeek) return false;
      // weekOfMonth: 1-5, weekStart: 1-5
      // Only send on even/odd weeks based on weekStart
      if (!schedule.weekStart) return false;
      return ((weekOfMonth - schedule.weekStart) % 2 === 0);
    }
    case 'monthly':
      return schedule.weekOfMonth === weekOfMonth && schedule.dayOfWeek === dayOfWeek;
    case 'quarterly':
      // Simplified: run on first week of quarter
      return schedule.weekOfMonth === weekOfMonth && schedule.dayOfWeek === dayOfWeek;
    case 'yearly':
      // Not implemented
      return false;
    default:
      return false;
  }
}

async function processScheduledJobs() {
  try {
    await connectToDatabase();
    const now = new Date();
    const subs = await EmailSubscriptionModel.find({ isActive: true }).lean();
    for (const sub of subs) {
      // Email Reports
      if (sub.subscribedReports && sub.reportSchedules) {
        for (const reportKey of sub.subscribedReports) {
          const schedule = sub.reportSchedules[reportKey];
          if (schedule && schedule.isActive && isJobDueNow(schedule, now)) {
            try {
              // Fetch latest KPI data for this periodType
              const kpiData = await KPIDataModel.findOne({ periodType: reportKey, status: 'completed' }).sort({ createdAt: -1 }).lean();
              if (!kpiData) {
                console.warn(`[SCHEDULED EMAIL] No KPI data for ${reportKey} for ${sub.email}`);
                continue;
              }
              await EmailService.sendKPIDashboard(sub, kpiData.data);
              console.log(`[SCHEDULED EMAIL] Sent ${reportKey} report to ${sub.email}`);
            } catch (err) {
              console.error(`[SCHEDULED EMAIL] Error sending ${reportKey} report to ${sub.email}:`, err);
            }
          }
        }
      }
      // SMS Coaching
      if (sub.smsCoaching && sub.smsCoaching.isActive && sub.smsCoaching.staffMembers) {
        for (const staff of sub.smsCoaching.staffMembers) {
          for (const dash of staff.dashboards || []) {
            if (dash.isActive && isJobDueNow(dash, now)) {
              try {
                // Fetch latest KPI data for this dashboard periodType
                const kpiData = await KPIDataModel.findOne({ periodType: dash.periodType, status: 'completed' }).sort({ createdAt: -1 }).lean();
                if (!kpiData || !kpiData.data || !kpiData.data.current || !kpiData.data.current.associatePerformance) {
                  console.warn(`[SCHEDULED SMS] No KPI data for ${dash.periodType} for ${staff.name}`);
                  continue;
                }
                // Find staff performance by name
                const staffPerf = kpiData.data.current.associatePerformance[staff.name];
                if (!staffPerf) {
                  console.warn(`[SCHEDULED SMS] No performance data for ${staff.name} in ${dash.periodType}`);
                  continue;
                }
                await SMSService.sendCoachingSMS(sub.smsCoaching.phoneNumber, staffPerf, sub.smsCoaching, dash.periodType);
                console.log(`[SCHEDULED SMS] Sent SMS to ${sub.smsCoaching.phoneNumber} for ${staff.name} (${dash.periodType})`);
              } catch (err) {
                console.error(`[SCHEDULED SMS] Error sending SMS to ${sub.smsCoaching.phoneNumber} for ${staff.name} (${dash.periodType}):`, err);
              }
            }
          }
        }
      }
    }
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error processing scheduled jobs:', err);
    try { await mongoose.connection.close(); } catch {}
  }
}

// Run every hour at minute 0
cron.schedule('0 * * * *', processScheduledJobs, { timezone: 'America/New_York' });

async function startWorker() {
    try {
        log.info('🚀 Starting KPI Background Worker...');
        await connectToDatabase();
        log.success('📊 MongoDB connection established for worker.');
        await mongoose.connection.close(); // Close initial connection, jobs will reconnect
        setupCronJobs();
        log.info('Worker is now running and waiting for scheduled jobs...');
    } catch (error) {
        log.error(`Failed to start background worker: ${error.message}`);
        process.exit(1);
    }
}

startWorker();

// Export for manual/API triggers
module.exports = { executeKPIJob };
