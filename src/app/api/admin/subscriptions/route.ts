import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { EmailSubscriptionModel } from "@/lib/models";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    const subscriptions = await EmailSubscriptionModel.find({}).sort({
      createdAt: -1,
    });
    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      subscribedReports,
      reportSchedules,
      smsCoaching,
      personalizedGoals,
      isActive,
    } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required fields" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    // Check if email already exists
    const existingSubscription = await EmailSubscriptionModel.findOne({
      email,
    });
    if (existingSubscription) {
      return NextResponse.json(
        { error: "Email already subscribed" },
        { status: 400 },
      );
    }

    const subscription = new EmailSubscriptionModel({
      name,
      email,
      subscribedReports: subscribedReports || [],
      reportSchedules: reportSchedules || {},
      smsCoaching: smsCoaching || {
        isActive: false,
        phoneNumber: "",
        staffMembers: [],
        coachingStyle: "balanced",
        customMessage: "",
      },
      isActive: isActive !== undefined ? isActive : true,
      ...(typeof personalizedGoals !== "undefined"
        ? { personalizedGoals }
        : {}),
    });

    await subscription.save();
    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 },
    );
  }
}
