import { NextRequest, NextResponse } from "next/server";
import { getSmsService } from "@/lib/sms/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, name } = body;

    if (!phoneNumber || !name) {
      return NextResponse.json(
        { error: "Phone number and name are required" },
        { status: 400 },
      );
    }

    const smsService = getSmsService();
    const message = `Hi ${name}! This is a test SMS from the Milea Estate Vineyard KPI Dashboard system. 🍷`;
    const success = await smsService.sendSms(phoneNumber, message);

    if (success) {
      return NextResponse.json({
        message: "Test SMS sent successfully!",
        phoneNumber,
        name,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to send test SMS" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error sending test SMS:", error);
    return NextResponse.json(
      { error: "Failed to send test SMS" },
      { status: 500 },
    );
  }
}
