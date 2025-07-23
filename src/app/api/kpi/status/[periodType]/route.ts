import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { KPIDataModel, CronJobLogModel } from '@/lib/models';

export async function GET(
  request: NextRequest,
  { params }: { params: { periodType: string } }
) {
  try {
    const { periodType } = params;
    if (!['mtd', 'qtd', 'ytd', 'all-quarters'].includes(periodType)) {
      return NextResponse.json({ error: 'Invalid period type' }, { status: 400 });
    }
    await connectToDatabase();
    const latestData = await KPIDataModel.findOne({
      periodType,
      year: new Date().getFullYear()
    }).sort({ updatedAt: -1 });
    const runningJob = await CronJobLogModel.findOne({
      jobType: periodType,
      status: 'running',
      startTime: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
    });
    const estimatedDurations = {
        'mtd': 8 * 60 * 1000, 'qtd': 1 * 60 * 1000,
        'ytd': 6 * 60 * 1000, 'all-quarters': 18 * 60 * 1000
    };
    let status = latestData?.status || 'idle';
    let progress = null;
    if (runningJob) {
        status = 'running';
        const elapsedTime = Date.now() - runningJob.startTime.getTime();
        const estimatedDuration = estimatedDurations[periodType as keyof typeof estimatedDurations];
        progress = Math.min(Math.floor((elapsedTime / estimatedDuration) * 100), 95);
    } else if (status === 'completed') {
        progress = 100;
    }
    return NextResponse.json({
      periodType,
      status,
      progress,
      lastUpdated: latestData?.updatedAt,
      lastGenerated: latestData?.generatedAt,
      executionTime: latestData?.executionTime,
    });
  } catch (error) {
    console.error(`Error checking ${params.periodType} status:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 