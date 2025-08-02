import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AlertSubscriberModel, EmailSubscriptionModel } from "@/lib/models";

export async function GET() {
  try {
    await connectToDatabase();
    const alertSubscribers = await AlertSubscriberModel.find({}).sort({ createdAt: -1 });
    const subscriberIds = alertSubscribers.map(sub => sub.subscriberId);
    
    // Get the actual subscriber details for the phone numbers
    const subscribers = await EmailSubscriptionModel.find({
      _id: { $in: subscriberIds }
    }).select('name smsCoaching.phoneNumber');
    
    const phoneNumbers = subscribers.map(sub => sub.smsCoaching?.phoneNumber).filter(Boolean);
    
    return NextResponse.json({ 
      subscriberIds,
      phoneNumbers
    });
  } catch (error) {
    console.error("Error fetching alert subscribers:", error);
    return NextResponse.json({ error: "Failed to fetch alert subscribers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { subscriberId } = await request.json();
    
    if (!subscriberId || typeof subscriberId !== 'string') {
      return NextResponse.json({ error: "Subscriber ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    // Verify the subscriber exists and has SMS coaching enabled
    const subscriber = await EmailSubscriptionModel.findOne({
      _id: subscriberId,
      "smsCoaching.isActive": true
    });

    if (!subscriber) {
      return NextResponse.json({ error: "Subscriber not found or SMS coaching not enabled" }, { status: 400 });
    }

    // Check if subscriber already exists in alerts
    const existingAlert = await AlertSubscriberModel.findOne({ subscriberId });
    if (existingAlert) {
      const allAlertSubscribers = await AlertSubscriberModel.find({}).sort({ createdAt: -1 });
      return NextResponse.json({ 
        message: "Subscriber already in alert list",
        subscriberIds: allAlertSubscribers.map(sub => sub.subscriberId)
      });
    }

    // Add new alert subscriber
    const newAlertSubscriber = new AlertSubscriberModel({ subscriberId });
    await newAlertSubscriber.save();

    const allAlertSubscribers = await AlertSubscriberModel.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ 
      message: "Alert subscriber added successfully",
      subscriberIds: allAlertSubscribers.map(sub => sub.subscriberId)
    });
  } catch (error) {
    console.error("Error adding alert subscriber:", error);
    return NextResponse.json({ error: "Failed to add alert subscriber" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { subscriberId } = await request.json();
    
    if (!subscriberId) {
      return NextResponse.json({ error: "Subscriber ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    // Remove subscriber from alerts
    await AlertSubscriberModel.deleteOne({ subscriberId });

    const remainingAlertSubscribers = await AlertSubscriberModel.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ 
      message: "Alert subscriber removed successfully",
      subscriberIds: remainingAlertSubscribers.map(sub => sub.subscriberId)
    });
  } catch (error) {
    console.error("Error removing alert subscriber:", error);
    return NextResponse.json({ error: "Failed to remove alert subscriber" }, { status: 500 });
  }
} 