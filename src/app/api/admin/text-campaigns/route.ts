import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TextCampaignModel } from "@/lib/models";

export async function GET() {
  try {
    await connectToDatabase();
    
    // Get campaigns with populated replies
    const campaigns = await TextCampaignModel.find({})
      .sort({ createdAt: -1 })
      .populate('replies')
      .lean();
    
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, message, subscribers } = body;

    // Validate required fields
    if (!name || !message || !subscribers || subscribers.length === 0) {
      return NextResponse.json(
        { error: "Name, message, and subscribers are required" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const campaign = new TextCampaignModel({
      name,
      message,
      subscribers,
      status: "active",
      createdAt: new Date(),
      replies: [],
    });

    await campaign.save();
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 },
    );
  }
} 