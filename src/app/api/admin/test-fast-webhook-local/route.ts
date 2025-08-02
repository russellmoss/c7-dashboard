import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TextReplyModel, EmailSubscriptionModel } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    console.log("=== LOCAL FAST WEBHOOK TEST ===");
    
    // Simulate the same logic as the fast webhook
    const fromPhone = "+18457073347";
    const messageBody = "This is a local test message!";

    console.log(`Processing SMS from ${fromPhone}: ${messageBody}`);

    // Quick database connection
    console.log("Connecting to database...");
    await connectToDatabase();
    console.log("Database connected");

    // Normalize phone number for matching (remove + and country code)
    const normalizedFromPhone = fromPhone.replace(/^\+1/, '').replace(/^\+/, '').replace(/\D/g, '');
    console.log(`Normalized phone number: ${normalizedFromPhone}`);

    // Find subscriber quickly - try multiple formats with better logging
    console.log(`Looking for subscriber with phone: ${fromPhone}`);
    let subscriber = await EmailSubscriptionModel.findOne({
      "smsCoaching.phoneNumber": fromPhone,
      "smsCoaching.isActive": true,
    }).select('name _id smsCoaching.phoneNumber');

    console.log(`First attempt result: ${subscriber ? 'FOUND' : 'NOT FOUND'}`);

    if (!subscriber) {
      // Try without + prefix (this should work based on the test results)
      const phoneWithoutPlus = fromPhone.replace(/^\+/, '');
      console.log(`Trying without + prefix: ${phoneWithoutPlus}`);
      subscriber = await EmailSubscriptionModel.findOne({
        "smsCoaching.phoneNumber": phoneWithoutPlus,
        "smsCoaching.isActive": true,
      }).select('name _id smsCoaching.phoneNumber');
      console.log(`Second attempt result: ${subscriber ? 'FOUND' : 'NOT FOUND'}`);
    }

    if (!subscriber) {
      // Try without country code (remove +1)
      const phoneWithoutCountryCode = fromPhone.replace(/^\+1/, '');
      console.log(`Trying without country code: ${phoneWithoutCountryCode}`);
      subscriber = await EmailSubscriptionModel.findOne({
        "smsCoaching.phoneNumber": phoneWithoutCountryCode,
        "smsCoaching.isActive": true,
      }).select('name _id smsCoaching.phoneNumber');
      console.log(`Third attempt result: ${subscriber ? 'FOUND' : 'NOT FOUND'}`);
    }

    if (!subscriber) {
      // Try with + prefix
      const phoneWithPlus = fromPhone.startsWith('+') ? fromPhone : `+${fromPhone}`;
      console.log(`Trying with + prefix: ${phoneWithPlus}`);
      subscriber = await EmailSubscriptionModel.findOne({
        "smsCoaching.phoneNumber": phoneWithPlus,
        "smsCoaching.isActive": true,
      }).select('name _id smsCoaching.phoneNumber');
      console.log(`Fourth attempt result: ${subscriber ? 'FOUND' : 'NOT FOUND'}`);
    }

    if (!subscriber) {
      // Try normalized version (digits only, no country code)
      console.log(`Trying normalized version: ${normalizedFromPhone}`);
      subscriber = await EmailSubscriptionModel.findOne({
        "smsCoaching.phoneNumber": normalizedFromPhone,
        "smsCoaching.isActive": true,
      }).select('name _id smsCoaching.phoneNumber');
      console.log(`Fifth attempt result: ${subscriber ? 'FOUND' : 'NOT FOUND'}`);
    }

    if (!subscriber) {
      console.log(`No active subscriber found for phone: ${fromPhone}`);
      return NextResponse.json({ error: "No active subscriber found" });
    }

    console.log(`Found subscriber: ${subscriber.name} with phone: ${subscriber.smsCoaching?.phoneNumber}`);

    // Create reply immediately
    const reply = new TextReplyModel({
      fromPhone,
      fromName: subscriber.name,
      message: messageBody,
      timestamp: new Date(),
      isRead: false,
      isSentMessage: false,
    });

    await reply.save();
    console.log("Reply saved successfully");

    // Find campaign and update in background (don't wait for it) - ONLY ACTIVE CAMPAIGNS
    const { TextCampaignModel } = await import("@/lib/models");
    TextCampaignModel.findOne({
      subscribers: subscriber._id,
      status: "active", // Only look for active campaigns
    }).sort({ createdAt: -1 }).then(async (campaign) => {
      if (campaign) {
        campaign.replies.push(reply._id);
        await campaign.save();
        console.log(`Added reply to campaign: ${campaign.name}`);
      } else {
        console.log("No active campaign found for this subscriber");
      }
    }).catch(err => {
      console.error("Error updating campaign:", err);
    });

    console.log(`Successfully processed SMS from ${subscriber.name} (${fromPhone}): ${messageBody}`);
    console.log("=== LOCAL FAST WEBHOOK TEST END ===");

    return NextResponse.json({ 
      success: true,
      message: "Local fast webhook test completed successfully",
      subscriber: subscriber.name,
      phoneNumber: subscriber.smsCoaching?.phoneNumber
    });
  } catch (error) {
    console.error("Error in local fast webhook test:", error);
    return NextResponse.json(
      { error: "Failed to test local fast webhook", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 