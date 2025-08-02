import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { EmailSubscriptionModel } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get the first subscriber with SMS coaching enabled
    let subscriber = await EmailSubscriptionModel.findOne({
      "smsCoaching.isActive": true,
    });

    if (!subscriber) {
      // Create a test subscriber if none exists
      subscriber = new EmailSubscriptionModel({
        name: "Test User",
        email: "test@example.com",
        smsCoaching: {
          isActive: true,
          phoneNumber: "+1234567890",
        },
      });
      await subscriber.save();
    }

    // Simulate Twilio's form data using the real subscriber's phone number
    const formData = new FormData();
    formData.append('From', subscriber.smsCoaching?.phoneNumber || '+1234567890');
    formData.append('To', '+18453799532'); // Your actual Twilio number (845) 379-9532
    formData.append('Body', 'This is a test message from my phone!');
    formData.append('MessageSid', 'SM1234567890');

    console.log(`Testing webhook with phone: ${subscriber.smsCoaching?.phoneNumber}`);

    // Make a request to our webhook
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/webhooks/twilio/sms`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.text();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      result: result,
      subscriberPhone: subscriber.smsCoaching?.phoneNumber,
      message: "Webhook test completed. Check your campaigns for the new message."
    });
  } catch (error) {
    console.error("Error testing webhook:", error);
    return NextResponse.json(
      { error: "Failed to test webhook", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Webhook test endpoint",
    instructions: "POST to this endpoint to simulate a Twilio webhook call",
    webhookUrl: "/api/webhooks/twilio/sms"
  });
} 