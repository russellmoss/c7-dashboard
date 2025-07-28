import { NextRequest, NextResponse } from 'next/server';
import { archiveManagementService } from '@/lib/archive-management';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] GET /api/archive/statistics');

    // Get comprehensive archive statistics
    const statistics = await archiveManagementService.getArchiveStatistics();

    console.log(`[API] ✅ Retrieved archive statistics: ${statistics.totalCompetitions} competitions, ${statistics.totalParticipants} participants`);

    return NextResponse.json({
      success: true,
      data: statistics
    });

  } catch (error: any) {
    console.error('[API] Error getting archive statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 