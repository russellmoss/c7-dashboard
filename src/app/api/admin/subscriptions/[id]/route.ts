import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { EmailSubscriptionModel } from "@/lib/models";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectToDatabase();
    const subscription = await EmailSubscriptionModel.findById(params.id);

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    // Check if email already exists for different subscription
    const existingSubscription = await EmailSubscriptionModel.findOne({
      email,
      _id: { $ne: params.id },
    });
    if (existingSubscription) {
      return NextResponse.json(
        { error: "Email already subscribed" },
        { status: 400 },
      );
    }

    const updatePayload: any = {
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
    };
    
    if (typeof personalizedGoals !== "undefined") {
      updatePayload.personalizedGoals = personalizedGoals;
    }

    const subscription = await EmailSubscriptionModel.findByIdAndUpdate(
      params.id,
      updatePayload,
      { new: true, runValidators: true },
    );

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    await connectToDatabase();

    const subscription = await EmailSubscriptionModel.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true },
    );

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectToDatabase();
    const subscription = await EmailSubscriptionModel.findByIdAndDelete(
      params.id,
    );

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Subscription deleted successfully" });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 },
    );
  }
}
