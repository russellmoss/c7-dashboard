import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CompetitionModel, EmailSubscriptionModel, KPIDataModel } from '@/lib/models';
import { getCompetitionRankings } from '@/lib/competition-ranking';

export async function GET(request: NextRequest) {
  try {
    console.log(`[API] GET /api/test-progress-sms-debug`);
    
    await connectToDatabase();
    
    const competitionId = '6887a8c2a2addb06adbaffa7';
    
    // Step 1: Get competition details
    const competition = await CompetitionModel.findById(competitionId).lean();
    console.log(`[DEBUG] Competition found:`, competition ? 'Yes' : 'No');
    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }
    
    // Step 2: Get enrolled subscribers
    const subscribers = await EmailSubscriptionModel.find({
      _id: { $in: competition.enrolledSubscribers }
    }).lean();
    console.log(`[DEBUG] Enrolled subscribers:`, subscribers.length);
    
    // Step 3: Get KPI data
    const kpiData = await KPIDataModel.findOne({
      periodType: competition.dashboard,
      year: new Date().getFullYear(),
      status: 'completed'
    }).sort({ createdAt: -1 }).lean();
    console.log(`[DEBUG] KPI data found:`, kpiData ? 'Yes' : 'No');
    
    // Step 4: Try to get rankings
    try {
      const rankings = await getCompetitionRankings(competitionId, true);
      console.log(`[DEBUG] Rankings calculated:`, rankings.rankings.length);
      
      return NextResponse.json({
        success: true,
        data: {
          competition: {
            id: competition._id,
            name: competition.name,
            type: competition.type,
            dashboard: competition.dashboard,
            enrolledSubscribers: competition.enrolledSubscribers.length,
            status: competition.status
          },
          subscribers: subscribers.map(s => ({
            id: s._id,
            name: s.name,
            email: s.email,
            hasSms: s.smsCoaching?.isActive && s.smsCoaching?.phoneNumber
          })),
          kpiData: kpiData ? {
            periodType: kpiData.periodType,
            year: kpiData.year,
            status: kpiData.status,
            hasStaffData: !!kpiData.data?.current?.associatePerformance
          } : null,
          rankings: {
            total: rankings.rankings.length,
            top3: rankings.rankings.slice(0, 3)
          }
        }
      });
    } catch (rankingError: any) {
      console.log(`[DEBUG] Ranking error:`, rankingError.message);
      
      return NextResponse.json({
        success: false,
        error: rankingError.message,
        data: {
          competition: {
            id: competition._id,
            name: competition.name,
            type: competition.type,
            dashboard: competition.dashboard,
            enrolledSubscribers: competition.enrolledSubscribers.length,
            status: competition.status
          },
          subscribers: subscribers.map(s => ({
            id: s._id,
            name: s.name,
            email: s.email,
            hasSms: s.smsCoaching?.isActive && s.smsCoaching?.phoneNumber
          })),
          kpiData: kpiData ? {
            periodType: kpiData.periodType,
            year: kpiData.year,
            status: kpiData.status,
            hasStaffData: !!kpiData.data?.current?.associatePerformance
          } : null
        }
      });
    }
    
  } catch (error: any) {
    console.error(`[API] Error in test-progress-sms-debug: ${error.message}`);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 