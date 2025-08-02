import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TextReplyModel, EmailSubscriptionModel } from "@/lib/models";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  console.log("=== FAST WEBHOOK CALLED ===");
  console.log("Time:", new Date().toISOString());
  
  try {
    // Extract form data in the main function
    const formData = await request.formData();
    const fromPhone = formData.get("From") as string;
    const messageBody = formData.get("Body") as string;
    const toPhone = formData.get("To") as string;
    
    console.log("Webhook data received:");
    console.log("- From:", fromPhone);
    console.log("- To:", toPhone);
    console.log("- Message:", messageBody);

    // Quick validation
    if (!fromPhone || !messageBody) {
      console.log("Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Start background processing immediately without waiting
    processSmsInBackground(fromPhone, messageBody, toPhone).catch(error => {
      console.error("Background processing error:", error);
    });
    
    // Respond immediately to Twilio
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

async function processSmsInBackground(fromPhone: string, messageBody: string, toPhone: string) {
  try {
    console.log("=== BACKGROUND PROCESSING START ===");
    
    // Connect to database
    console.log("Connecting to database...");
    await connectToDatabase();
    console.log("Database connected");

    // Clean the phone number first (remove spaces and normalize)
    const cleanFromPhone = fromPhone.trim().replace(/\s+/g, '');
    console.log(`Clean phone number: ${cleanFromPhone}`);

    // Find subscriber - try the most likely match first
    console.log(`Looking for subscriber with phone: ${cleanFromPhone}`);
    
    // Try removing the leading "1" first since that's most likely to work
    const phoneWithoutLeadingOne = cleanFromPhone.replace(/^1/, '');
    console.log(`Trying without leading 1: ${phoneWithoutLeadingOne}`);
    let subscriber = await EmailSubscriptionModel.findOne({
      "smsCoaching.phoneNumber": phoneWithoutLeadingOne,
      "smsCoaching.isActive": true,
    }).select('name _id smsCoaching.phoneNumber');

    if (subscriber) {
      console.log(`✅ FOUND subscriber: ${subscriber.name}`);
    } else {
      console.log(`❌ NOT FOUND with phone: ${phoneWithoutLeadingOne}`);
      
      // Try other variations
      const variations = [
        cleanFromPhone,
        cleanFromPhone.replace(/^\+/, ''),
        cleanFromPhone.replace(/^\+1/, ''),
        cleanFromPhone.startsWith('+') ? cleanFromPhone : `+${cleanFromPhone}`
      ];
      
      for (const variation of variations) {
        console.log(`Trying variation: ${variation}`);
        subscriber = await EmailSubscriptionModel.findOne({
          "smsCoaching.phoneNumber": variation,
          "smsCoaching.isActive": true,
        }).select('name _id smsCoaching.phoneNumber');
        
        if (subscriber) {
          console.log(`✅ FOUND subscriber: ${subscriber.name} with variation: ${variation}`);
          break;
        }
      }
    }

    if (!subscriber) {
      console.log(`❌ No active subscriber found for phone: ${fromPhone}`);
      console.log(`Tried variations: ${phoneWithoutLeadingOne}, ${cleanFromPhone}, ${cleanFromPhone.replace(/^\+/, '')}, ${cleanFromPhone.replace(/^\+1/, '')}`);
      
      // Let's also check what subscribers exist in the database
      const allSubscribers = await EmailSubscriptionModel.find({
        "smsCoaching.isActive": true
      }).select('name smsCoaching.phoneNumber');
      
      console.log(`Available subscribers with SMS coaching:`);
      allSubscribers.forEach(sub => {
        console.log(`- ${sub.name}: ${sub.smsCoaching?.phoneNumber}`);
      });
      
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
      campaign.replies.push(new mongoose.Types.ObjectId(reply._id));
      await campaign.save();
      console.log(`Added reply to campaign: ${campaign.name}`);
    }

    console.log(`Successfully processed SMS from ${subscriber.name} (${fromPhone}): ${messageBody}`);
    console.log("=== BACKGROUND PROCESSING END ===");

    // Send alerts to configured phone numbers
    console.log("=== STARTING ALERT PROCESS ===");
    await sendAlertNotifications(subscriber.name, fromPhone, messageBody, campaign?.name);
    console.log("=== ALERT PROCESS COMPLETE ===");
  } catch (error) {
    console.error("Error in background processing:", error);
  }
}

async function sendAlertNotifications(subscriberName: string, fromPhone: string, messageBody: string, campaignName?: string) {
  try {
    console.log("=== SENDING ALERT NOTIFICATIONS ===");
    
    // Get alert subscribers from database
    const { AlertSubscriberModel, EmailSubscriptionModel } = await import("@/lib/models");
    const alertSubscribers = await AlertSubscriberModel.find({}).sort({ createdAt: -1 });
    const subscriberIds = alertSubscribers.map(sub => sub.subscriberId);
    
    console.log(`Found ${subscriberIds.length} alert subscribers:`, subscriberIds);
    
    if (subscriberIds.length === 0) {
      console.log("No alert subscribers configured");
      return;
    }

    // Get the actual subscriber details with phone numbers
    const subscribers = await EmailSubscriptionModel.find({
      _id: { $in: subscriberIds },
      "smsCoaching.isActive": true
    }).select('name smsCoaching.phoneNumber');
    
    const phoneNumbers = subscribers.map(sub => sub.smsCoaching?.phoneNumber).filter(Boolean);
    
    console.log(`Found ${phoneNumbers.length} valid phone numbers for alerts:`, phoneNumbers);
    
    if (phoneNumbers.length === 0) {
      console.log("No valid phone numbers found for alert subscribers");
      return;
    }

    const { sendSMS } = await import("@/lib/sms/client");
    
    const alertMessage = `🚨 New SMS Reply\n\nFrom: ${subscriberName} (${fromPhone})\nCampaign: ${campaignName || 'Unknown'}\nMessage: ${messageBody.substring(0, 100)}${messageBody.length > 100 ? '...' : ''}`;

    console.log(`Sending alert message: ${alertMessage}`);

    // Send alerts to all configured phone numbers
    for (const alertPhone of phoneNumbers) {
      try {
        console.log(`Sending alert to ${alertPhone}...`);
        await sendSMS(alertPhone, alertMessage);
        console.log(`✅ Alert sent successfully to ${alertPhone}`);
      } catch (error) {
        console.error(`❌ Failed to send alert to ${alertPhone}:`, error);
      }
    }
    
    console.log("=== ALERT NOTIFICATIONS COMPLETE ===");
  } catch (error) {
    console.error("Error sending alert notifications:", error);
  }
} 