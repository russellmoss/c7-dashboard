import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TextCampaignModel, EmailSubscriptionModel } from "@/lib/models";

export async function GET() {
  try {
    await connectToDatabase();
    
    // Test database connection
    const campaignCount = await TextCampaignModel.countDocuments();
    const subscriberCount = await EmailSubscriptionModel.countDocuments({
      "smsCoaching.isActive": true,
    });

    return NextResponse.json({
      message: "Text campaign system is working",
      campaignCount,
      subscriberCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error testing text campaigns:", error);
    return NextResponse.json(
      { error: "Failed to test text campaigns", details: error },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, message } = body;

    await connectToDatabase();

    // Create a test campaign
    const testCampaign = new TextCampaignModel({
      name: name || "Test Campaign",
      message: message || "This is a test message",
      subscribers: [],
      status: "active",
      createdAt: new Date(),
      replies: [],
    });

    await testCampaign.save();

    return NextResponse.json({
      message: "Test campaign created successfully",
      campaign: testCampaign,
    });
  } catch (error) {
    console.error("Error creating test campaign:", error);
    return NextResponse.json(
      { error: "Failed to create test campaign" },
      { status: 500 },
    );
  }
} 