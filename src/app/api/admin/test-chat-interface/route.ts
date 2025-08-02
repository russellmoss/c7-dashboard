import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TextCampaignModel, TextReplyModel } from "@/lib/models";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get the first campaign
    const campaign = await TextCampaignModel.findOne({});
    
    if (!campaign) {
      return NextResponse.json(
        { error: "No campaigns found. Please create a campaign first." },
        { status: 404 }
      );
    }

    // Create sample replies
    const sampleReplies = [
      {
        campaignId: campaign._id,
        fromPhone: "+1234567890",
        fromName: "John Smith",
        message: "Thanks for the update! I'm interested in the new promotion.",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isRead: false,
      },
      {
        campaignId: campaign._id,
        fromPhone: "+1987654321",
        fromName: "Sarah Johnson",
        message: "Can you send me more details about the membership options?",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        isRead: false,
      },
      {
        campaignId: campaign._id,
        fromPhone: "+1555123456",
        fromName: "Mike Wilson",
        message: "Great message! When is the next event?",
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        isRead: true,
      },
    ];

    // Save the replies
    const savedReplies = await TextReplyModel.insertMany(sampleReplies);
    
    // Add the reply IDs to the campaign
    campaign.replies = savedReplies.map(reply => new mongoose.Types.ObjectId(reply._id));
    await campaign.save();

    return NextResponse.json({
      message: "Sample replies added successfully",
      campaign: campaign,
      replies: savedReplies,
    });
  } catch (error) {
    console.error("Error adding sample replies:", error);
    return NextResponse.json(
      { error: "Failed to add sample replies" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    
    const campaignCount = await TextCampaignModel.countDocuments();
    const replyCount = await TextReplyModel.countDocuments();
    
    return NextResponse.json({
      message: "Chat interface test endpoint",
      campaignCount,
      replyCount,
      instructions: "POST to this endpoint to add sample replies to the first campaign",
    });
  } catch (error) {
    console.error("Error testing chat interface:", error);
    return NextResponse.json(
      { error: "Failed to test chat interface" },
      { status: 500 }
    );
  }
} 