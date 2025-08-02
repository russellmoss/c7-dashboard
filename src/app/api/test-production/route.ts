import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    message: "Production server is working",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const fromPhone = formData.get("From") as string;
    const messageBody = formData.get("Body") as string;
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return NextResponse.json({ 
      message: "Production webhook test",
      fromPhone,
      messageBody,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return NextResponse.json({ 
      error: "Production test failed",
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  }
} 