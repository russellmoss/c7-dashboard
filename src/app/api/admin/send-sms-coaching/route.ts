import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { KPIDataModel, EmailSubscriptionModel } from '@/lib/models';
import { SMSService, StaffPerformance } from '@/lib/sms-service';

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const matrix = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) matrix[i][0] = i;
  for (let j = 0; j <= bl; j++) matrix[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[al][bl];
}

function fuzzyFindStaffName(target: string, staffList: string[]): string | null {
  const norm = (s: string) => s.trim().toLowerCase();
  const t = norm(target);
  let best: { name: string; dist: number } | null = null;
  for (const name of staffList) {
    const n = norm(name);
    if (n === t || n.includes(t) || t.includes(n)) return name;
    const dist = levenshtein(n, t);
    if (!best || dist < best.dist) best = { name, dist };
  }
  if (best && best.dist <= 2) return best.name;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, periodType = 'mtd' } = body;

    await connectToDatabase();

    // Get the subscription
    const subscription = await EmailSubscriptionModel.findById(subscriptionId);
    if (!subscription || !subscription.smsCoaching?.isActive) {
      return NextResponse.json({ error: 'SMS coaching not enabled for this subscription' }, { status: 400 });
    }

    // Get the latest KPI data for the specified period
    const currentYear = new Date().getFullYear();
    let kpiData;
    
    if (periodType === 'custom') {
      // For custom periods, you might need to pass start/end dates
      kpiData = await KPIDataModel.findOne({
        periodType,
        year: currentYear
      }).sort({ createdAt: -1 });
    } else {
      kpiData = await KPIDataModel.findOne({
        periodType,
        year: currentYear
      });
    }

    if (!kpiData) {
      return NextResponse.json({ error: 'No KPI data found for the specified period' }, { status: 404 });
    }

    // Extract staff performance data
    const staffPerformance = kpiData.data.current.associatePerformance;
    const staffNames = Object.keys(staffPerformance);
    const results = [];

    // Send SMS for each active staff member who has this dashboard configured
    for (const staffMember of subscription.smsCoaching.staffMembers) {
      if (!staffMember.isActive) continue;

      // Check if this staff member has the requested dashboard configured
      const dashboardConfig = staffMember.dashboards.find(d => 
        d.periodType === periodType && d.isActive
      );

      if (!dashboardConfig) {
        results.push({
          staffName: staffMember.name,
          success: false,
          error: `Dashboard ${periodType} not configured for this staff member`
        });
        continue;
      }

      // Fuzzy match staff name
      const matchedName = fuzzyFindStaffName(staffMember.name, staffNames);
      if (!matchedName) {
        results.push({
          staffName: staffMember.name,
          success: false,
          error: 'Staff member not found in performance data (fuzzy match failed)'
        });
        continue;
      }

      const performance = staffPerformance[matchedName];
      if (!performance) {
        results.push({
          staffName: staffMember.name,
          success: false,
          error: 'Staff member not found in performance data'
        });
        continue;
      }

      // Convert performance data to StaffPerformance format
      const staffData: StaffPerformance = {
        name: matchedName,
        wineBottleConversionRate: performance.wineBottleConversionRate,
        clubConversionRate: performance.clubConversionRate,
        wineBottleConversionGoalVariance: performance.wineBottleConversionGoalVariance,
        clubConversionGoalVariance: performance.clubConversionGoalVariance,
        orders: performance.orders,
        guests: performance.guests,
        revenue: performance.revenue,
        bottles: performance.bottles
      };

      // Send SMS
      const success = await SMSService.sendCoachingSMS(
        subscription.smsCoaching.phoneNumber,
        staffData,
        subscription.smsCoaching,
        periodType
      );

      results.push({
        staffName: staffMember.name,
        matchedName,
        success,
        error: success ? null : 'Failed to send SMS',
        periodType
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return NextResponse.json({
      message: `SMS coaching sent to ${successCount}/${totalCount} staff members for ${periodType.toUpperCase()}`,
      results,
      periodType,
      subscriptionName: subscription.name
    });

  } catch (error) {
    console.error('Error sending SMS coaching:', error);
    return NextResponse.json({ error: 'Failed to send SMS coaching' }, { status: 500 });
  }
} 