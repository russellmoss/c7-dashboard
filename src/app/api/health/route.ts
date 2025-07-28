import { NextResponse } from "next/server";
import { testConnection } from "@/lib/mongodb";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mongoConnected = await testConnection();
    const requiredEnvVars = [
      "MONGODB_URI",
      "ANTHROPIC_API_KEY",
      "C7_APP_ID",
      "C7_API_KEY",
      "C7_TENANT_ID",
    ];
    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar],
    );
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      mongodb: mongoConnected ? "connected" : "disconnected",
      environment: process.env.NODE_ENV || "unknown",
      missingEnvVars: missingEnvVars.length > 0 ? missingEnvVars : null,
    };
    if (!mongoConnected || missingEnvVars.length > 0) {
      health.status = "unhealthy";
      return NextResponse.json(health, { status: 503 });
    }
    return NextResponse.json(health);
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 },
    );
  }
}
