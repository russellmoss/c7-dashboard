import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TextReplyModel, EmailSubscriptionModel } from "@/lib/models";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromPhone, message, subscriberName } = body;

    await connectToDatabase();

    // Find or create a test subscriber
    let subscriber = await EmailSubscriptionModel.findOne({
      "smsCoaching.phoneNumber": fromPhone,
    });

    if (!subscriber) {
      // Create a test subscriber if none exists
      subscriber = new EmailSubscriptionModel({
        name: subscriberName || "Test User",
        email: "test@example.com",
        smsCoaching: {
          isActive: true,
          phoneNumber: fromPhone,
        },
        subscribedReports: ["mtd"],
        reportSchedules: {
          mtd: { frequency: "weekly", timeEST: "09:00", isActive: true },
          qtd: { frequency: "monthly", timeEST: "09:00", isActive: true },
          ytd: { frequency: "quarterly", timeEST: "09:00", isActive: true },
          "all-quarters": { frequency: "monthly", timeEST: "09:00", isActive: true },
        },
      });
      await subscriber.save();
    }

    // Try to find the most recent campaign this subscriber was part of
    const { TextCampaignModel } = await import("@/lib/models");
    const recentCampaign = await TextCampaignModel.findOne({
      subscribers: subscriber._id,
      status: "active",
    }).sort({ createdAt: -1 });

    // Create a test reply
    const reply = new TextReplyModel({
      campaignId: recentCampaign?._id || null,
      fromPhone,
      fromName: subscriber.name,
      message: message || "Test message from webhook",
      timestamp: new Date(),
      isRead: false,
      isSentMessage: false,
    });

    await reply.save();

    // If we found a campaign, add this reply to it
    if (recentCampaign) {
      recentCampaign.replies.push(new mongoose.Types.ObjectId(reply._id));
      await recentCampaign.save();
    }

    console.log(`Test SMS received from ${subscriber.name} (${fromPhone}): ${message}`);

    return NextResponse.json({
      message: "Test SMS received and stored",
      reply: reply,
      subscriber: subscriber,
    });
  } catch (error) {
    console.error("Error processing test SMS:", error);
    return NextResponse.json(
      { error: "Failed to process test SMS" },
      { status: 500 },
    );
  }
} 