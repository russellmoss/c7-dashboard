import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { EmailSubscriptionModel, KPIDataModel } from '@/lib/models';
import { generateAdminCoachingMessage } from '@/lib/sms/admin-coaching-generator';
import { getSmsService } from '@/lib/sms/client';

export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG] POST /api/admin/test-admin-sms - Starting request');
    
    const body = await request.json();
    console.log('[DEBUG] POST /api/admin/test-admin-sms - Request body:', JSON.stringify(body, null, 2));
    
    const { subscriptionId, periodType = "mtd" } = body;
    console.log('[DEBUG] POST /api/admin/test-admin-sms - subscriptionId:', subscriptionId);
    console.log('[DEBUG] POST /api/admin/test-admin-sms - periodType:', periodType);

    if (!subscriptionId) {
      console.log('[DEBUG] POST /api/admin/test-admin-sms - Missing subscriptionId');
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the subscription
    const subscription = await EmailSubscriptionModel.findById(subscriptionId);
    console.log('[DEBUG] POST /api/admin/test-admin-sms - Found subscription:', subscription ? 'yes' : 'no');
    
    if (!subscription) {
      console.log('[DEBUG] POST /api/admin/test-admin-sms - Subscription not found');
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    console.log('[DEBUG] POST /api/admin/test-admin-sms - Subscription data:', JSON.stringify(subscription, null, 2));
    console.log('[DEBUG] POST /api/admin/test-admin-sms - subscription.isAdmin:', subscription.isAdmin);
    console.log('[DEBUG] POST /api/admin/test-admin-sms - subscription.smsCoaching:', JSON.stringify(subscription.smsCoaching, null, 2));
    console.log('[DEBUG] POST /api/admin/test-admin-sms - subscription.smsCoaching.adminCoaching:', JSON.stringify(subscription.smsCoaching?.adminCoaching, null, 2));

    // Check if admin coaching is enabled
    if (!subscription.smsCoaching?.adminCoaching?.isActive) {
      console.log('[DEBUG] POST /api/admin/test-admin-sms - Admin coaching not active');
      return NextResponse.json(
        { error: "Admin SMS coaching is not enabled for this subscription" },
        { status: 400 }
      );
    }

    // Get dashboard configuration for the requested period type
    console.log('[DEBUG] POST /api/admin/test-admin-sms - Looking for dashboard config with periodType:', periodType);
    console.log('[DEBUG] POST /api/admin/test-admin-sms - Available dashboards:', JSON.stringify(subscription.smsCoaching.adminCoaching?.dashboards, null, 2));
    
    // Debug each dashboard individually
    if (subscription.smsCoaching.adminCoaching?.dashboards) {
      subscription.smsCoaching.adminCoaching.dashboards.forEach((d: any, index: number) => {
        console.log(`[DEBUG] POST /api/admin/test-admin-sms - Dashboard ${index}:`, {
          periodType: d.periodType,
          isActive: d.isActive,
          matchesPeriodType: d.periodType === periodType,
          matchesIsActive: d.isActive === true,
          matchesBoth: d.periodType === periodType && d.isActive === true
        });
      });
    }
    
    const dashboardConfig = subscription.smsCoaching.adminCoaching?.dashboards?.find(
      (d: any) => d.periodType === periodType && d.isActive
    );

    console.log('[DEBUG] POST /api/admin/test-admin-sms - Found dashboardConfig:', dashboardConfig ? 'yes' : 'no');

    if (!dashboardConfig) {
      console.log('[DEBUG] POST /api/admin/test-admin-sms - No active dashboard configuration found for periodType:', periodType);
      return NextResponse.json(
        { error: `No active dashboard configuration found for ${periodType}` },
        { status: 400 }
      );
    }

    console.log('[DEBUG] POST /api/admin/test-admin-sms - Using dashboardConfig:', JSON.stringify(dashboardConfig, null, 2));

    // Get KPI data for the period
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const kpiResponse = await fetch(`${baseUrl}/api/kpi/${periodType}`);
    console.log('[DEBUG] POST /api/admin/test-admin-sms - KPI response status:', kpiResponse.status);
    
    if (!kpiResponse.ok) {
      console.log('[DEBUG] POST /api/admin/test-admin-sms - KPI request failed');
      return NextResponse.json(
        { error: "Failed to fetch KPI data" },
        { status: 500 }
      );
    }

    const kpiData = await kpiResponse.json();
    console.log('[DEBUG] POST /api/admin/test-admin-sms - KPI data received');

    // Get active staff members
    const activeStaffNames = subscription.smsCoaching?.staffMembers?.map((s: any) => s.name) || [];
    console.log('[DEBUG] POST /api/admin/test-admin-sms - Active staff names:', activeStaffNames);

    // Generate admin message
    const adminMessage = await generateAdminCoachingMessage(
      subscription.name,
      kpiData,
      periodType,
      activeStaffNames,
      subscription.smsCoaching.adminCoaching,
      dashboardConfig
    );

    console.log('[DEBUG] POST /api/admin/test-admin-sms - Generated admin message:', adminMessage);

    // Send SMS
    const smsSuccess = await getSmsService().sendSms(
      subscription.smsCoaching.phoneNumber,
      adminMessage
    );

    console.log('[DEBUG] POST /api/admin/test-admin-sms - SMS success:', smsSuccess);

    if (!smsSuccess) {
      console.log('[DEBUG] POST /api/admin/test-admin-sms - SMS failed');
      return NextResponse.json(
        { error: `Failed to send admin SMS` },
        { status: 500 }
      );
    }

    console.log('[DEBUG] POST /api/admin/test-admin-sms - Success, SMS sent');
    return NextResponse.json({
      success: true,
      message: "Admin SMS sent successfully"
    });

  } catch (error) {
    console.error('[DEBUG] POST /api/admin/test-admin-sms - Error:', error);
    return NextResponse.json(
      { error: `Failed to send admin SMS: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 