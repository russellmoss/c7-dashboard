import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CronJobLogModel, KPIDataModel } from '@/lib/models';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const runningJobs = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/kpi/generate POST called');
    const body = await request.json();
    const { periodType } = body;
    console.log(`[API] Requested periodType: ${periodType}`);
    
    if (!['mtd', 'qtd', 'ytd', 'all-quarters'].includes(periodType)) {
      console.log('[API] Invalid period type');
      return NextResponse.json({ error: 'Invalid period type' }, { status: 400 });
    }
    
    if (runningJobs.has(periodType)) {
      console.log(`[API] ${periodType} generation already in progress`);
      return NextResponse.json({ error: `${periodType} generation already in progress` }, { status: 409 });
    }
    
    runningJobs.add(periodType);
    
    // Don't await - let it run in background and return immediately
    generateKPIDataAndInsights(periodType).finally(() => {
      runningJobs.delete(periodType);
    });
    
    const estimatedTimes = {
      'mtd': '8-10 minutes',
      'qtd': '1-2 minutes', 
      'ytd': '5-8 minutes',
      'all-quarters': '15-20 minutes'
    };
    
    console.log(`[API] Generation started for ${periodType}`);
    return NextResponse.json({
      success: true,
      message: `${periodType.toUpperCase()} generation started`,
      estimatedTime: estimatedTimes[periodType as keyof typeof estimatedTimes]
    });
    
  } catch (error) {
    console.error('[API] Error starting KPI generation:', error);
    return NextResponse.json({ error: 'Failed to start generation' }, { status: 500 });
  }
}

async function generateKPIDataAndInsights(periodType: string) {
  console.log(`[GEN] Starting generation for ${periodType}`);
  const startTime = Date.now();
  let cronLog;
  
  try {
    await connectToDatabase();
    console.log('[GEN] Connected to MongoDB');
    // Create job log
    cronLog = await CronJobLogModel.create({
      jobType: periodType,
      status: 'running',
      startTime: new Date(startTime)
    });
    console.log('[GEN] Cron job log created');
    // Run the KPI script
    const scriptPath = path.join(process.cwd(), 'src/scripts/optimized-kpi-dashboard.js');
    const command = `node "${scriptPath}" ${periodType}`;
    console.log(`[GEN] Executing: ${command}`);
    const { stdout, stderr } = await execAsync(command, {
      timeout: 1800000, // 30 minute timeout
      maxBuffer: 1024 * 1024 * 10,
      env: { ...process.env }
    });
    if (stderr) console.warn('[GEN] Script warnings:', stderr);
    console.log('[GEN] Script completed successfully');
    const executionTime = Date.now() - startTime;
    // Update job log
    await CronJobLogModel.findByIdAndUpdate(cronLog._id, {
      status: 'completed',
      endTime: new Date(),
      executionTime,
      dataGenerated: true
    });
    console.log('[GEN] Cron job log updated to completed');
    // Generate AI insights
    await generateAIInsights(periodType);
    console.log('[GEN] AI insights generation finished');
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[GEN] ${periodType} generation failed:`, error);
    if (cronLog) {
      await CronJobLogModel.findByIdAndUpdate(cronLog._id, {
        status: 'failed',
        endTime: new Date(),
        executionTime,
        error: error.message,
      });
      console.log('[GEN] Cron job log updated to failed');
    }
  }
}

async function generateAIInsights(periodType: string) {
  try {
    console.log(`[AI] Generating AI insights for ${periodType}...`);
    // Find the latest completed KPI data
    const latestData = await KPIDataModel.findOne({
      periodType,
      year: new Date().getFullYear(),
      status: 'completed'
    }).sort({ createdAt: -1 });
    if (!latestData) {
      console.warn(`[AI] No KPI data found for ${periodType} to generate insights`);
      return;
    }
    // Import the AI insights function
    const { generateInsights } = require('@/lib/ai-insights-cjs.js');
    console.log('[AI] Calling generateInsights...');
    const insights = await generateInsights(latestData.data);
    console.log('[AI] Insights generated:', insights);
    // Update the MongoDB record with insights
    await KPIDataModel.findByIdAndUpdate(latestData._id, { 
      insights,
      updatedAt: new Date()
    });
    console.log(`[AI] AI insights saved for ${periodType}`);
  } catch (error: any) {
    console.error(`[AI] Failed to generate AI insights for ${periodType}:`, error);
  }
} 