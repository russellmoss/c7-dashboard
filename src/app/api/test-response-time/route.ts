import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    message: "Server is responding quickly",
    timestamp: new Date().toISOString(),
    status: "ok"
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Simulate minimal processing
    const formData = await request.formData();
    const fromPhone = formData.get("From") as string;
    const messageBody = formData.get("Body") as string;
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return NextResponse.json({ 
      message: "Test response",
      fromPhone,
      messageBody,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      status: "ok"
    });
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return NextResponse.json({ 
      error: "Test failed",
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      status: "error"
    });
  }
} 