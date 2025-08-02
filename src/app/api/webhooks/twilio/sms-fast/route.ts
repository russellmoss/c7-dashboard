import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TextReplyModel, EmailSubscriptionModel } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    console.log("=== FAST WEBHOOK START ===");
    
    // Parse form data quickly
    const formData = await request.formData();
    const fromPhone = formData.get("From") as string;
    const messageBody = formData.get("Body") as string;

    console.log(`Received SMS from ${fromPhone}: ${messageBody}`);

    // Quick validation
    if (!fromPhone || !messageBody) {
      console.log("Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Respond immediately - don't wait for database operations
    console.log("Responding immediately to Twilio...");
    
    // Process everything in the background
    processSmsInBackground(fromPhone, messageBody).catch(error => {
      console.error("Background processing error:", error);
    });

    console.log("=== FAST WEBHOOK END (immediate response) ===");
    return NextResponse.json({ message: "SMS received" });
  } catch (error) {
    console.error("Error in fast webhook:", error);
    return NextResponse.json(
      { error: "Failed to process SMS" },
      { status: 500 },
    );
  }
}

async function processSmsInBackground(fromPhone: string, messageBody: string) {
  try {
    console.log("=== BACKGROUND PROCESSING START ===");
    
    // Connect to database
    console.log("Connecting to database...");
    await connectToDatabase();
    console.log("Database connected");

    // Normalize phone number for matching
    const normalizedFromPhone = fromPhone.replace(/^\+1/, '').replace(/^\+/, '').replace(/\D/g, '');
    console.log(`Normalized phone number: ${normalizedFromPhone}`);

    // Find subscriber - try multiple formats
    console.log(`Looking for subscriber with phone: ${fromPhone}`);
    let subscriber = await EmailSubscriptionModel.findOne({
      "smsCoaching.phoneNumber": fromPhone,
      "smsCoaching.isActive": true,
    }).select('name _id smsCoaching.phoneNumber');

    if (!subscriber) {
      const phoneWithoutPlus = fromPhone.replace(/^\+/, '');
      console.log(`Trying without + prefix: ${phoneWithoutPlus}`);
      subscriber = await EmailSubscriptionModel.findOne({
        "smsCoaching.phoneNumber": phoneWithoutPlus,
        "smsCoaching.isActive": true,
      }).select('name _id smsCoaching.phoneNumber');
    }

    if (!subscriber) {
      const phoneWithoutCountryCode = fromPhone.replace(/^\+1/, '');
      console.log(`Trying without country code: ${phoneWithoutCountryCode}`);
      subscriber = await EmailSubscriptionModel.findOne({
        "smsCoaching.phoneNumber": phoneWithoutCountryCode,
        "smsCoaching.isActive": true,
      }).select('name _id smsCoaching.phoneNumber');
    }

    if (!subscriber) {
      const phoneWithPlus = fromPhone.startsWith('+') ? fromPhone : `+${fromPhone}`;
      console.log(`Trying with + prefix: ${phoneWithPlus}`);
      subscriber = await EmailSubscriptionModel.findOne({
        "smsCoaching.phoneNumber": phoneWithPlus,
        "smsCoaching.isActive": true,
      }).select('name _id smsCoaching.phoneNumber');
    }

    if (!subscriber) {
      console.log(`Trying normalized version: ${normalizedFromPhone}`);
      subscriber = await EmailSubscriptionModel.findOne({
        "smsCoaching.phoneNumber": normalizedFromPhone,
        "smsCoaching.isActive": true,
      }).select('name _id smsCoaching.phoneNumber');
    }

    if (!subscriber) {
      console.log(`No active subscriber found for phone: ${fromPhone}`);
      return;
    }

    console.log(`Found subscriber: ${subscriber.name} with phone: ${subscriber.smsCoaching?.phoneNumber}`);

    // Find campaign first
    const { TextCampaignModel } = await import("@/lib/models");
    const campaign = await TextCampaignModel.findOne({
      subscribers: subscriber._id,
      status: "active",
    }).sort({ createdAt: -1 });

    if (campaign) {
      console.log(`Found campaign: ${campaign.name}`);
    } else {
      console.log("No active campaign found for this subscriber");
    }

    // Create reply
    const reply = new TextReplyModel({
      campaignId: campaign?._id || null,
      fromPhone,
      fromName: subscriber.name,
      message: messageBody,
      timestamp: new Date(),
      isRead: false,
      isSentMessage: false,
    });

    await reply.save();
    console.log("Reply saved successfully");

    // Update campaign with reply
    if (campaign) {
      campaign.replies.push(reply._id);
      await campaign.save();
      console.log(`Added reply to campaign: ${campaign.name}`);
    }

    console.log(`Successfully processed SMS from ${subscriber.name} (${fromPhone}): ${messageBody}`);
    console.log("=== BACKGROUND PROCESSING END ===");
  } catch (error) {
    console.error("Error in background processing:", error);
  }
} 