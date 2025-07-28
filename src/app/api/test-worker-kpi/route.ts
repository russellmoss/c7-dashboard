import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { connectToDatabase } from "@/lib/mongodb";
import { CronJobLogModel } from "@/lib/models";

export const dynamic = 'force-dynamic';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptPath = join(
  __dirname,
  "../../../../scripts/optimized-kpi-dashboard.cjs",
);

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    console.log(`[API] POST /api/test-worker-kpi`);

    // Skip KPI tests during build time
    if (process.env.NODE_ENV === 'production' && process.env.SKIP_INTEGRATION_TESTS === 'true') {
      console.log("[API] ⏭️ Skipping KPI tests during build (API not available)");
      return NextResponse.json({
        success: true,
        message: "KPI tests skipped during build",
        data: {
          periodType: "mtd",
          testMode: true,
          startTime: new Date().toISOString(),
          scriptPath,
          command: `node "${scriptPath}" mtd`,
          execution: {
            success: true,
            stdout: "Skipped during build",
            stderr: null,
            executionTime: "0.00s",
          },
          logEntry: "mock-log-id",
        }
      });
    }

    await connectToDatabase();

    const body = await request.json();
    const { periodType = "mtd", testMode = false } = body;

    const validPeriods = ["mtd", "qtd", "ytd", "all-quarters"];
    if (!validPeriods.includes(periodType)) {
      return NextResponse.json(
        {
          error: `Invalid periodType. Must be one of: ${validPeriods.join(", ")}`,
        },
        { status: 400 },
      );
    }

    console.log(
      `[TEST] Testing KPI generation for ${periodType.toUpperCase()}`,
    );

    // Create a test log entry
    const cronLog = await CronJobLogModel.create({
      jobType: periodType,
      status: "running",
      startTime: new Date(),
      testMode: true,
    });

    const startTime = Date.now();
    const results = {
      periodType,
      testMode,
      startTime: new Date(startTime).toISOString(),
      scriptPath,
      command: `node "${scriptPath}" ${periodType}`,
      execution: null as any,
      logEntry: cronLog._id.toString(),
    };

    try {
      // Execute the KPI generation script
      const { stdout, stderr } = await execAsync(
        `node "${scriptPath}" ${periodType}`,
        {
          timeout: 1800000, // 30 minutes
          maxBuffer: 1024 * 1024 * 10, // 10MB
          env: { ...process.env },
        },
      );

      const executionTime = Date.now() - startTime;

      results.execution = {
        success: true,
        stdout: stdout.substring(0, 1000) + (stdout.length > 1000 ? "..." : ""),
        stderr: stderr || null,
        executionTime: `${(executionTime / 1000).toFixed(2)}s`,
      };

      // Update log entry
      await CronJobLogModel.findByIdAndUpdate(cronLog._id, {
        status: "completed",
        endTime: new Date(),
        executionTime,
        dataGenerated: true,
      });

      console.log(
        `[TEST] ✅ ${periodType.toUpperCase()} KPI generation completed successfully`,
      );
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      results.execution = {
        success: false,
        error: error.message,
        stdout: error.stdout?.substring(0, 1000) || null,
        stderr: error.stderr?.substring(0, 1000) || null,
        executionTime: `${(executionTime / 1000).toFixed(2)}s`,
      };

      // Update log entry with error
      await CronJobLogModel.findByIdAndUpdate(cronLog._id, {
        status: "failed",
        endTime: new Date(),
        executionTime,
        error: error.message,
      });

      console.log(
        `[TEST] ❌ ${periodType.toUpperCase()} KPI generation failed`,
      );
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error(`[API] Error in test-worker-kpi: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log(`[API] GET /api/test-worker-kpi`);

    // Skip KPI tests during build time
    if (process.env.NODE_ENV === 'production' && process.env.SKIP_INTEGRATION_TESTS === 'true') {
      console.log("[API] ⏭️ Skipping KPI tests during build (API not available)");
      return NextResponse.json({
        success: true,
        data: {
          scriptPath,
          scriptExists: false,
          recentLogs: [],
        },
      });
    }

    await connectToDatabase();

    // Get recent KPI job logs
    const recentLogs = await CronJobLogModel.find({
      jobType: { $in: ["mtd", "qtd", "ytd", "all-quarters"] },
    })
      .sort({ startTime: -1 })
      .limit(10)
      .lean();

    // Get script status
    const scriptExists = require("fs").existsSync(scriptPath);

    return NextResponse.json({
      success: true,
      data: {
        scriptPath,
        scriptExists,
        recentLogs: recentLogs.map((log) => ({
          id: log._id.toString(),
          jobType: log.jobType,
          status: log.status,
          startTime: log.startTime,
          endTime: log.endTime,
          executionTime: log.executionTime,
          testMode: (log as any).testMode || false,
        })),
      },
    });
  } catch (error: any) {
    console.error(`[API] Error in test-worker-kpi: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
