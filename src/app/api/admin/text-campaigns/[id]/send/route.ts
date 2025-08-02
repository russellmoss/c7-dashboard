import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TextCampaignModel, EmailSubscriptionModel } from "@/lib/models";
import { sendSMS } from "@/lib/sms/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const campaign = await TextCampaignModel.findById(params.id);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (campaign.sentAt) {
      return NextResponse.json(
        { error: "Campaign has already been sent" },
        { status: 400 },
      );
    }

    // Get subscriber details
    const subscribers = await EmailSubscriptionModel.find({
      _id: { $in: campaign.subscribers },
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
            campaign.message,
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

    // Update campaign with sent timestamp
    campaign.sentAt = new Date();
    await campaign.save();

    return NextResponse.json({
      message: `Campaign sent successfully. ${successCount} successful, ${errorCount} failed.`,
      results,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("Error sending campaign:", error);
    return NextResponse.json(
      { error: "Failed to send campaign" },
      { status: 500 },
    );
  }
} 