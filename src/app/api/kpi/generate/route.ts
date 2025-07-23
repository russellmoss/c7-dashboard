import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CronJobLogModel, KPIDataModel } from '@/lib/models';
import { exec } from 'child_process';
import path from 'path';

const runningJobs = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodType } = body;
    if (!['mtd', 'qtd', 'ytd', 'all-quarters'].includes(periodType)) {
      return NextResponse.json({ error: 'Invalid period type' }, { status: 400 });
    }
    if (runningJobs.has(periodType)) {
        return NextResponse.json({ error: `${periodType.toUpperCase()} generation is already in progress.` }, { status: 409 });
    }
    await connectToDatabase();
    const estimatedTimes = {
      'mtd': '8-10 minutes', 'qtd': '1-2 minutes', 
      'ytd': '5-8 minutes', 'all-quarters': '15-20 minutes'
    };
    runningJobs.add(periodType);
    const scriptPath = path.join(process.cwd(), 'src/scripts/optimized-kpi-dashboard.js');
    const command = `node "${scriptPath}" ${periodType}`;
    console.log(`🚀 Manually starting ${periodType} generation...`);
    exec(command, (error, stdout, stderr) => {
        runningJobs.delete(periodType);
        if (error) {
            console.error(`❌ Manual ${periodType} generation failed:`, error);
            return;
        }
        console.log(`✅ Manual ${periodType} generation completed.`);
        if (stderr) console.warn(`Manual ${periodType} warnings:`, stderr);
    });
    return NextResponse.json({
      success: true,
      message: `${periodType.toUpperCase()} KPI generation started`,
      estimatedTime: estimatedTimes[periodType as keyof typeof estimatedTimes],
    });
  } catch (error) {
    console.error('Error triggering KPI generation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 