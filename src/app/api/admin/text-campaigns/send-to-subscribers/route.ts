import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TextCampaignModel, EmailSubscriptionModel, TextReplyModel } from "@/lib/models";
import { sendSMS } from "@/lib/sms/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, message, sendToAll, selectedSubscribers } = body;

    if (!campaignId || !message) {
      return NextResponse.json(
        { error: "Campaign ID and message are required" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const campaign = await TextCampaignModel.findById(campaignId);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    let subscribersToSendTo: string[] = [];

    if (sendToAll) {
      // Send to all campaign subscribers
      subscribersToSendTo = campaign.subscribers;
    } else {
      // Send to selected subscribers
      subscribersToSendTo = selectedSubscribers || [];
    }

    if (subscribersToSendTo.length === 0) {
      return NextResponse.json(
        { error: "No subscribers selected" },
        { status: 400 },
      );
    }

    // Get subscriber details
    const subscribers = await EmailSubscriptionModel.find({
      _id: { $in: subscribersToSendTo },
      "smsCoaching.isActive": true,
    });

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Send SMS to each subscriber
    for (const subscriber of subscribers) {
      try {
        if (subscriber.smsCoaching?.phoneNumber) {
          await sendSMS(
            subscriber.smsCoaching.phoneNumber,
            message,
            subscriber.name
          );
          successCount++;
          results.push({
            subscriberId: subscriber._id,
            name: subscriber.name,
            phone: subscriber.smsCoaching.phoneNumber,
            status: "success",
          });
        } else {
          errorCount++;
          results.push({
            subscriberId: subscriber._id,
            name: subscriber.name,
            phone: subscriber.smsCoaching?.phoneNumber,
            status: "error",
            error: "No phone number configured",
          });
        }
      } catch (error) {
        errorCount++;
        results.push({
          subscriberId: subscriber._id,
          name: subscriber.name,
          phone: subscriber.smsCoaching?.phoneNumber,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Store the sent message in the database for chat history
    const sentMessage = new TextReplyModel({
      campaignId: campaign._id,
      fromPhone: "SYSTEM",
      fromName: "C7 Dashboard",
      message: message,
      timestamp: new Date(),
      isRead: true,
      isSentMessage: true, // Flag to identify sent messages
    });

    await sentMessage.save();

    // Update campaign with the new message
    campaign.replies.push(sentMessage._id);
    await campaign.save();

    return NextResponse.json({
      message: `Message sent successfully. ${successCount} successful, ${errorCount} failed.`,
      results,
      successCount,
      errorCount,
      sentMessage: sentMessage,
    });
  } catch (error) {
    console.error("Error sending to subscribers:", error);
    return NextResponse.json(
      { error: "Failed to send to subscribers" },
      { status: 500 },
    );
  }
} 