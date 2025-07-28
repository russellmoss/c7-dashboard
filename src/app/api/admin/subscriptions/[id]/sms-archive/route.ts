import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { EmailSubscriptionModel, CoachingSMSHistoryModel } from "@/lib/models";
import type { CoachingSMSHistory } from "@/types/sms";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectToDatabase();
    const subscription = await EmailSubscriptionModel.findById(params.id);
    if (!subscription || !subscription.smsCoaching?.phoneNumber) {
      return NextResponse.json(
        { error: "Subscription or phone number not found" },
        { status: 404 },
      );
    }
    const messages: CoachingSMSHistory[] = await CoachingSMSHistoryModel.find({
      phoneNumber: subscription.smsCoaching.phoneNumber,
    })
      .sort({ sentAt: -1 })
      .lean();
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching SMS archive:", error);
    return NextResponse.json(
      { error: "Failed to fetch SMS archive" },
      { status: 500 },
    );
  }
}
