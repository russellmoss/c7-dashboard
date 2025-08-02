import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TextReplyModel, EmailSubscriptionModel } from "@/lib/models";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    console.log("Webhook received - starting processing");
    
    const formData = await request.formData();
    const fromPhone = formData.get("From") as string;
    const toPhone = formData.get("To") as string;
    const messageBody = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;

    console.log(`Processing SMS from ${fromPhone} to ${toPhone}: ${messageBody}`);

    if (!fromPhone || !messageBody) {
      console.log("Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Connect to database
    console.log("Connecting to database...");
    await connectToDatabase();
    console.log("Database connected");

    // Find the subscriber by phone number - try multiple formats
    console.log(`Looking for subscriber with phone: ${fromPhone}`);
    let subscriber = await EmailSubscriptionModel.findOne({
      "smsCoaching.phoneNumber": fromPhone,
      "smsCoaching.isActive": true,
    });

    if (!subscriber) {
      // Try without + prefix
      const phoneWithoutPlus = fromPhone.replace(/^\+/, '');
      console.log(`Trying without + prefix: ${phoneWithoutPlus}`);
      subscriber = await EmailSubscriptionModel.findOne({
        "smsCoaching.phoneNumber": phoneWithoutPlus,
        "smsCoaching.isActive": true,
      });
    }

    if (!subscriber) {
      // Try with + prefix
      const phoneWithPlus = fromPhone.startsWith('+') ? fromPhone : `+${fromPhone}`;
      console.log(`Trying with + prefix: ${phoneWithPlus}`);
      subscriber = await EmailSubscriptionModel.findOne({
        "smsCoaching.phoneNumber": phoneWithPlus,
        "smsCoaching.isActive": true,
      });
    }

    if (!subscriber) {
      console.log(`No active subscriber found for phone: ${fromPhone} (tried: ${fromPhone}, ${fromPhone.replace(/^\+/, '')}, ${fromPhone.startsWith('+') ? fromPhone : `+${fromPhone}`})`);
      return NextResponse.json({ message: "No active subscriber found" });
    }

    console.log(`Found subscriber: ${subscriber.name}`);

    // Try to find the most recent campaign this subscriber was part of
    console.log("Looking for recent campaign...");
    const { TextCampaignModel } = await import("@/lib/models");
    const recentCampaign = await TextCampaignModel.findOne({
      subscribers: subscriber._id,
      status: "active",
    }).sort({ createdAt: -1 });

    if (recentCampaign) {
      console.log(`Found campaign: ${recentCampaign.name}`);
    } else {
      console.log("No recent campaign found");
    }

    // Create a new reply
    console.log("Creating reply...");
    const reply = new TextReplyModel({
      campaignId: recentCampaign?._id || null,
      fromPhone,
      fromName: subscriber.name,
      message: messageBody,
      timestamp: new Date(),
      isRead: false,
      isSentMessage: false,
    });

    await reply.save();
    console.log("Reply saved");

    // If we found a campaign, add this reply to it
    if (recentCampaign) {
      console.log("Adding reply to campaign...");
      recentCampaign.replies.push(new mongoose.Types.ObjectId(reply._id));
      await recentCampaign.save();
      console.log("Campaign updated");
    }

    console.log(`Successfully processed SMS from ${subscriber.name} (${fromPhone}): ${messageBody}`);

    return NextResponse.json({ message: "SMS received and stored" });
  } catch (error) {
    console.error("Error processing incoming SMS:", error);
    return NextResponse.json(
      { error: "Failed to process SMS" },
      { status: 500 },
    );
  }
} 