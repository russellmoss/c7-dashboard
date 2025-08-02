import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { EmailSubscriptionModel, TextCampaignModel } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Find Russell moss subscriber
    const subscriber = await EmailSubscriptionModel.findOne({
      name: "Russell moss"
    });

    if (!subscriber) {
      return NextResponse.json({ error: "Subscriber not found" });
    }

    // Find active campaigns for this subscriber
    const activeCampaigns = await TextCampaignModel.find({
      subscribers: subscriber._id,
      status: "active"
    }).sort({ createdAt: -1 });

    // Find all campaigns for this subscriber (including archived)
    const allCampaigns = await TextCampaignModel.find({
      subscribers: subscriber._id
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      subscriber: {
        name: subscriber.name,
        _id: subscriber._id,
        phoneNumber: subscriber.smsCoaching?.phoneNumber,
        isActive: subscriber.smsCoaching?.isActive
      },
      activeCampaigns: activeCampaigns.map(campaign => ({
        _id: campaign._id,
        name: campaign.name,
        message: campaign.message,
        status: campaign.status,
        createdAt: campaign.createdAt,
        subscriberCount: campaign.subscribers.length
      })),
      allCampaigns: allCampaigns.map(campaign => ({
        _id: campaign._id,
        name: campaign.name,
        message: campaign.message,
        status: campaign.status,
        createdAt: campaign.createdAt,
        subscriberCount: campaign.subscribers.length
      })),
      summary: {
        activeCount: activeCampaigns.length,
        totalCount: allCampaigns.length
      }
    });
  } catch (error) {
    console.error("Error debugging campaigns:", error);
    return NextResponse.json({ error: "Failed to debug campaigns" }, { status: 500 });
  }
} 