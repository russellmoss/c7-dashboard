import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { EmailSubscriptionModel, TextCampaignModel, TextReplyModel } from "@/lib/models";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    console.log("=== TESTING REAL REPLY FLOW ===");
    await connectToDatabase();
    
    // Find Russell moss subscriber
    const subscriber = await EmailSubscriptionModel.findOne({
      name: "Russell moss"
    });

    if (!subscriber) {
      return NextResponse.json({ error: "Subscriber not found" });
    }

    console.log(`Found subscriber: ${subscriber.name} with phone: ${subscriber.smsCoaching?.phoneNumber}`);

    // Find active campaign
    const campaign = await TextCampaignModel.findOne({
      subscribers: subscriber._id,
      status: "active"
    }).sort({ createdAt: -1 });

    if (!campaign) {
      return NextResponse.json({ error: "No active campaign found" });
    }

    console.log(`Found campaign: ${campaign.name}`);

    // Simulate a reply
    const fromPhone = "+18457073347";
    const messageBody = "This is a test reply from Russell";
    
    // Test phone number matching
    const cleanFromPhone = fromPhone.trim().replace(/\s+/g, '');
    const phoneWithoutCountryCode = cleanFromPhone.replace(/^\+1/, '');
    
    console.log(`Testing phone matching:`);
    console.log(`- Original: ${fromPhone}`);
    console.log(`- Clean: ${cleanFromPhone}`);
    console.log(`- Without country code: ${phoneWithoutCountryCode}`);
    console.log(`- Database stores: ${subscriber.smsCoaching?.phoneNumber}`);
    console.log(`- Match: ${phoneWithoutCountryCode === subscriber.smsCoaching?.phoneNumber}`);

    // Create reply
    const reply = new TextReplyModel({
      campaignId: campaign._id,
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
    campaign.replies.push(new mongoose.Types.ObjectId(reply._id));
    await campaign.save();
    console.log(`Added reply to campaign: ${campaign.name}`);

    // Test alert system
    const { AlertSubscriberModel } = await import("@/lib/models");
    const alertSubscribers = await AlertSubscriberModel.find({}).sort({ createdAt: -1 });
    const subscriberIds = alertSubscribers.map(sub => sub.subscriberId);
    
    console.log(`Found ${subscriberIds.length} alert subscribers:`, subscriberIds);
    
    const alertSubscribersWithDetails = await EmailSubscriptionModel.find({
      _id: { $in: subscriberIds },
      "smsCoaching.isActive": true
    }).select('name smsCoaching.phoneNumber');
    
    const phoneNumbers = alertSubscribersWithDetails.map(sub => sub.smsCoaching?.phoneNumber).filter(Boolean);
    console.log(`Found ${phoneNumbers.length} valid phone numbers for alerts:`, phoneNumbers);

    return NextResponse.json({
      success: true,
      message: "Real reply test completed",
      subscriber: {
        name: subscriber.name,
        phoneNumber: subscriber.smsCoaching?.phoneNumber
      },
      campaign: {
        name: campaign.name,
        _id: campaign._id
      },
      reply: {
        _id: reply._id,
        message: reply.message,
        fromName: reply.fromName
      },
      alertSystem: {
        subscriberCount: subscriberIds.length,
        phoneNumbers: phoneNumbers
      }
    });
  } catch (error) {
    console.error("Error testing real reply:", error);
    return NextResponse.json({ error: "Failed to test real reply" }, { status: 500 });
  }
} 