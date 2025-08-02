import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { EmailSubscriptionModel } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Enable SMS coaching for Russell moss (your phone number)
    const subscriber = await EmailSubscriptionModel.findOne({
      name: "Russell moss",
      email: "russell@mileaestatevineyard.com"
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: "Subscriber not found" },
        { status: 404 }
      );
    }

    // Enable SMS coaching with all required properties
    subscriber.smsCoaching = {
      isActive: true,
      phoneNumber: "8457073347",
      staffMembers: [
        {
          name: "Russell moss",
          isActive: true,
          dashboards: [
            {
              periodType: "mtd",
              frequency: "weekly",
              timeEST: "09:00",
              dayOfWeek: 1,
              dayOfMonth: 1,
              weekOfMonth: 1,
              monthOfQuarter: 1,
              isActive: true,
              includeMetrics: {
                wineConversionRate: true,
                clubConversionRate: true,
                goalVariance: true,
                overallPerformance: true,
              },
            },
          ],
        },
      ],
      coachingStyle: "encouraging",
      customMessage: "Keep up the great work!",
    };

    await subscriber.save();

    return NextResponse.json({
      message: "SMS coaching enabled successfully",
      subscriber: {
        name: subscriber.name,
        email: subscriber.email,
        phoneNumber: subscriber.smsCoaching?.phoneNumber,
        hasSmsCoaching: subscriber.smsCoaching?.isActive
      }
    });
  } catch (error) {
    console.error("Error enabling SMS coaching:", error);
    return NextResponse.json(
      { error: "Failed to enable SMS coaching" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    
    // Get all subscribers
    const subscribers = await EmailSubscriptionModel.find({}).select('name email smsCoaching.phoneNumber smsCoaching.isActive').lean();

    return NextResponse.json({
      message: "All subscribers",
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