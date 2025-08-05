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
    console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - Starting request');
    console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - params.id:', params.id);
    
    const body = await request.json();
    console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - Request body:', JSON.stringify(body, null, 2));
    console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - body.isAdmin:', body.isAdmin);
    console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - body.adminPassword:', body.adminPassword);
    console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - body.adminPasswordHash:', body.adminPasswordHash);
    console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - body.smsCoaching:', JSON.stringify(body.smsCoaching, null, 2));

    const {
      name,
      email,
      subscribedReports,
      reportSchedules,
      smsCoaching,
      personalizedGoals,
      isActive,
      isAdmin,
      adminPassword,
      adminPasswordHash,
    } = body;

    console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - Extracted isAdmin:', isAdmin);
    console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - Extracted adminPassword:', adminPassword);
    console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - Extracted adminPasswordHash:', adminPasswordHash);

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
        adminCoaching: {
          isActive: false,
          includeTeamMetrics: true,
          includeTopPerformers: true,
          includeBottomPerformers: true,
          includeGoalComparison: true,
          includeManagementTips: true,
          dashboards: [],
        },
      },
      isActive: isActive !== undefined ? isActive : true,
    };
    
    // Add admin-related fields if they exist in the request
    if (typeof isAdmin !== "undefined") {
      updatePayload.isAdmin = isAdmin;
      console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - Adding isAdmin to updatePayload:', isAdmin);
    }
    if (typeof adminPassword !== "undefined") {
      updatePayload.adminPassword = adminPassword;
      console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - Adding adminPassword to updatePayload:', adminPassword);
    }
    if (typeof adminPasswordHash !== "undefined") {
      updatePayload.adminPasswordHash = adminPasswordHash;
      console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - Adding adminPasswordHash to updatePayload:', adminPasswordHash);
    }

    console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - Final updatePayload:', JSON.stringify(updatePayload, null, 2));

    const subscription = await EmailSubscriptionModel.findByIdAndUpdate(
      params.id,
      updatePayload,
      { new: true, runValidators: true },
    );

    console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - Updated subscription:', JSON.stringify(subscription, null, 2));

    if (!subscription) {
      console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - Subscription not found');
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    console.log('[DEBUG] PUT /api/admin/subscriptions/[id] - Success, returning subscription');
    return NextResponse.json(subscription);
  } catch (error) {
    console.error('[DEBUG] PUT /api/admin/subscriptions/[id] - Error:', error);
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
