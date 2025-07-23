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
const { CronJobLogModel, KPIDataModel } = require('../lib/models-cjs.js');

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
