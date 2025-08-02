import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { EmailSubscriptionModel } from "@/lib/models";

export async function GET() {
  try {
    await connectToDatabase();
    
    // Get all subscribers with SMS coaching enabled
    const subscribers = await EmailSubscriptionModel.find({
      "smsCoaching.isActive": true,
    }).select('name email smsCoaching.phoneNumber').lean();

    return NextResponse.json({
      message: "Subscriber phone numbers",
      subscribers: subscribers.map(sub => ({
        name: sub.name,
        email: sub.email,
        phoneNumber: sub.smsCoaching?.phoneNumber,
        hasSmsCoaching: !!sub.smsCoaching?.isActive
      }))
    });
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscribers" },
      { status: 500 }
    );
  }
} 