// PRODUCTION-READY BACKGROUND WORKER
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
const cron = require('node-cron');
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const chalk = require('chalk');
const express = require('express');
const { connectToDatabase } = require('../lib/mongodb-cjs.js');
const { KPIDataModel, EmailSubscriptionModel, CronJobLogModel, ScheduledJobLogModel } = require('../lib/models-cjs.js');
const { EmailService } = require('../lib/email-service');
const { SMSService } = require('../lib/sms-service');

// Logging
const log = {
    info: (msg) => console.log(chalk.blue(`[${new Date().toISOString()}] INFO: ${msg}`)),
    success: (msg) => console.log(chalk.green(`[${new Date().toISOString()}] SUCCESS: ${msg}`)),
    error: (msg) => console.log(chalk.red(`[${new Date().toISOString()}] ERROR: ${msg}`)),
    warn: (msg) => console.log(chalk.yellow(`[${new Date().toISOString()}] WARN: ${msg}`)),
};

const runningJobs = new Set();
const jobExecutionLog = new Map();

// Reliable timezone-aware scheduling
function isJobDueNow(schedule, now) {
    try {
        const estNow = moment.tz(now, 'America/New_York');
        const hour = estNow.hour();
        const minute = estNow.minute();
        const dayOfWeek = estNow.day();
        const dayOfMonth = estNow.date();
        const [scheduleHour, scheduleMinute] = (schedule.timeEST || '09:00').split(':').map(Number);
        if (hour !== scheduleHour || minute !== scheduleMinute) return false;
        const jobKey = `${schedule.periodType || 'email'}_${schedule.frequency}_${schedule.timeEST}`;
        if (hasJobExecutedRecently(jobKey)) {
            log.warn(`Job ${jobKey} already executed recently, skipping`);
            return false;
        }
        switch (schedule.frequency) {
            case 'daily':
                return true;
            case 'weekly':
                return schedule.dayOfWeek === dayOfWeek;
            case 'biweekly': {
                if (schedule.dayOfWeek !== dayOfWeek) return false;
                const weeksSinceEpoch = Math.floor(estNow.valueOf() / (7 * 24 * 60 * 60 * 1000));
                return weeksSinceEpoch % 2 === (schedule.weekStart || 0) % 2;
            }
            case 'monthly':
                if (schedule.dayOfMonth) {
                    return dayOfMonth === schedule.dayOfMonth;
                }
                if (schedule.dayOfWeek !== undefined && schedule.weekOfMonth) {
                    const firstDayOfMonth = estNow.clone().startOf('month');
                    const firstWeekdayOfMonth = firstDayOfMonth.day();
                    const nthWeekdayDate = 1 + (schedule.weekOfMonth - 1) * 7 + (schedule.dayOfWeek - firstWeekdayOfMonth + 7) % 7;
                    return dayOfMonth === nthWeekdayDate;
                }
                return false;
            case 'quarterly': {
                const quarterStartMonth = Math.floor(estNow.month() / 3) * 3;
                return estNow.month() === quarterStartMonth && dayOfMonth === 1;
            }
            default:
                return false;
        }
    } catch (error) {
        log.error(`Error in isJobDueNow: ${error.message}`);
        return false;
    }
}

function hasJobExecutedRecently(jobKey, windowMinutes = 30) {
    const lastExecution = jobExecutionLog.get(jobKey);
    if (!lastExecution) return false;
    return (Date.now() - lastExecution) < (windowMinutes * 60 * 1000);
}
function markJobExecuted(jobKey) {
    jobExecutionLog.set(jobKey, Date.now());
}

// Robust job processing with individual error handling
async function processScheduledJobs() {
    let connection;
    try {
        connection = await connectToDatabase();
        const now = new Date();
        const subs = await EmailSubscriptionModel.find({ isActive: true }).lean();
        log.info(`Processing scheduled jobs for ${subs.length} active subscriptions`);
        for (const sub of subs) {
            // Email Reports
            if (sub.subscribedReports && sub.reportSchedules) {
                for (const reportKey of sub.subscribedReports) {
                    try {
                        const schedule = sub.reportSchedules[reportKey];
                        if (schedule && schedule.isActive && isJobDueNow(schedule, now)) {
                            const jobKey = `email_${reportKey}_${sub.email}`;
                            const kpiData = await KPIDataModel.findOne({ periodType: reportKey, status: 'completed' }).sort({ createdAt: -1 }).lean();
                            if (!kpiData) {
                                log.warn(`No KPI data for ${reportKey} for ${sub.email}`);
                                continue;
                            }
                            await EmailService.sendKPIDashboard(sub, kpiData.data);
                            markJobExecuted(jobKey);
                            log.success(`Sent ${reportKey} email report to ${sub.email}`);
                        }
                    } catch (err) {
                        log.error(`Email report error for ${reportKey} to ${sub.email}: ${err.message}`);
                    }
                }
            }
            // SMS Coaching
            if (sub.smsCoaching && sub.smsCoaching.isActive && sub.smsCoaching.staffMembers) {
                for (const staff of sub.smsCoaching.staffMembers) {
                    for (const dashboard of staff.dashboards || []) {
                        try {
                            if (dashboard.isActive && isJobDueNow(dashboard, now)) {
                                const jobKey = `sms_${dashboard.periodType}_${staff.name}`;
                                const kpiData = await KPIDataModel.findOne({ periodType: dashboard.periodType, status: 'completed' }).sort({ createdAt: -1 }).lean();
                                if (!kpiData?.data?.current?.associatePerformance) {
                                    log.warn(`No KPI data for ${dashboard.periodType} SMS to ${staff.name}`);
                                    continue;
                                }
                                const staffPerf = kpiData.data.current.associatePerformance[staff.name];
                                if (!staffPerf) {
                                    log.warn(`No performance data for ${staff.name} in ${dashboard.periodType}`);
                                    continue;
                                }
                                await SMSService.sendCoachingSMS(
                                    sub.smsCoaching.phoneNumber,
                                    staffPerf,
                                    sub.smsCoaching,
                                    dashboard.periodType
                                );
                                markJobExecuted(jobKey);
                                log.success(`Sent SMS to ${sub.smsCoaching.phoneNumber} for ${staff.name} (${dashboard.periodType})`);
                            }
                        } catch (err) {
                            log.error(`SMS coaching error for ${staff.name} (${dashboard.periodType}): ${err.message}`);
                        }
                    }
                }
            }
        }
        log.info('Completed processing scheduled jobs');
    } catch (error) {
        log.error(`Scheduled jobs processing failed: ${error.message}`);
    } finally {
        try {
            if (connection) await mongoose.connection.close();
        } catch (closeErr) {
            log.error(`Error closing MongoDB connection: ${closeErr.message}`);
        }
    }
}

// KPI job execution with error handling
async function executeKPIJob(periodType) {
    if (runningJobs.has(periodType)) {
        log.warn(`Job ${periodType} is already running, skipping`);
        return;
    }
    runningJobs.add(periodType);
    const startTime = Date.now();
    let connection;
    try {
        log.info(`Starting ${periodType.toUpperCase()} KPI generation...`);
        connection = await connectToDatabase();
        const cronLog = await CronJobLogModel.create({
            jobType: periodType,
            status: 'running',
            startTime: new Date(startTime)
        });
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const scriptPath = require('path').join(__dirname, 'optimized-kpi-dashboard.js');
        const command = `node "${scriptPath}" ${periodType}`;
        const { stdout, stderr } = await execAsync(command, {
            timeout: 1800000,
            maxBuffer: 1024 * 1024 * 10,
            env: { ...process.env }
        });
        if (stderr) log.warn(`Script warnings for ${periodType}: ${stderr}`);
        const executionTime = Date.now() - startTime;
        await CronJobLogModel.findByIdAndUpdate(cronLog._id, {
            status: 'completed',
            endTime: new Date(),
            executionTime,
            dataGenerated: true
        });
        log.success(`${periodType.toUpperCase()} completed in ${(executionTime / 1000).toFixed(2)}s`);
        // Generate AI insights (non-blocking)
        setTimeout(() => generateAIInsights(periodType), 1000);
    } catch (error) {
        const executionTime = Date.now() - startTime;
        log.error(`${periodType.toUpperCase()} failed after ${(executionTime / 1000).toFixed(2)}s: ${error.message}`);
        await sendFailureNotification(periodType, error);
    } finally {
        runningJobs.delete(periodType);
        try {
            if (connection) await mongoose.connection.close();
        } catch (closeErr) {
            log.error(`Error closing connection: ${closeErr.message}`);
        }
    }
}

// Health monitoring
let lastHealthCheck = Date.now();
function logHealth() {
    lastHealthCheck = Date.now();
    log.info(`[HEALTH] Worker healthy at ${new Date(lastHealthCheck).toISOString()}`);
}
function setupHealthMonitoring() {
    setInterval(() => {
        const health = {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            runningJobs: Array.from(runningJobs)
        };
        log.info(`Health check: ${JSON.stringify(health)}`);
    }, 5 * 60 * 1000);
}

// Graceful shutdown
async function gracefulShutdown() {
    log.info('Received shutdown signal, gracefully shutting down...');
    const shutdownTimeout = 30000;
    const startTime = Date.now();
    while (runningJobs.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
        log.info(`Waiting for ${runningJobs.size} jobs to complete...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (runningJobs.size > 0) {
        log.warn(`Forcing shutdown with ${runningJobs.size} jobs still running`);
    }
    process.exit(0);
}

// Cron jobs
function setupCronJobs() {
    cron.schedule('0 1 * * *', () => executeKPIJob('mtd'), { timezone: 'America/New_York', name: 'mtd-generation' });
    cron.schedule('0 2 * * *', () => executeKPIJob('ytd'), { timezone: 'America/New_York', name: 'ytd-generation' });
    cron.schedule('0 3 * * *', () => executeKPIJob('qtd'), { timezone: 'America/New_York', name: 'qtd-generation' });
    cron.schedule('0 4 * * *', () => executeKPIJob('all-quarters'), { timezone: 'America/New_York', name: 'all-quarters-generation' });
    cron.schedule('0 * * * *', async () => {
        try {
            await processScheduledJobs();
        } catch (error) {
            log.error(`Scheduled jobs failed: ${error.message}`);
            setTimeout(processScheduledJobs, 5 * 60 * 1000);
        }
    }, { timezone: 'America/New_York', name: 'scheduled-communications' });
    log.success('✅ All cron jobs scheduled successfully');
}

// Express /health endpoint
const app = express();
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        lastHealthCheck: new Date(lastHealthCheck).toISOString(),
        memoryUsage: process.memoryUsage(),
    });
});
const port = process.env.PORT || 3001;
app.listen(port, () => {
    log.info(`[HEALTH] Health endpoint listening on port ${port}`);
});

// Start the worker
async function startWorker() {
    try {
        log.info('🚀 Starting Milea Estate KPI Background Worker...');
        const connection = await connectToDatabase();
        log.success('📊 MongoDB connection established');
        await mongoose.connection.close();
        setupCronJobs();
        setupHealthMonitoring();
        log.success('✅ Worker started successfully and waiting for scheduled jobs...');
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
    } catch (error) {
        log.error(`Failed to start worker: ${error.message}`);
        process.exit(1);
    }
}

startWorker();
