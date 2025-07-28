import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { KPIDataModel } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    console.log(`[API] GET /api/test-staff-names`);
    
    await connectToDatabase();
    
    // Get latest MTD KPI data
    const kpiData = await KPIDataModel.findOne({
      periodType: 'mtd',
      year: new Date().getFullYear(),
      status: 'completed'
    }).sort({ createdAt: -1 }).lean();
    
    if (!kpiData) {
      return NextResponse.json({ error: 'No KPI data found' }, { status: 404 });
    }
    
    const staffPerformance = kpiData.data?.current?.associatePerformance;
    if (!staffPerformance) {
      return NextResponse.json({ error: 'No staff performance data found' }, { status: 404 });
    }
    
    // Get all staff names
    const staffNames = Object.keys(staffPerformance);
    
    // Get sample data for first few staff members
    const sampleData = staffNames.slice(0, 5).map(name => ({
      name,
      data: staffPerformance[name]
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        totalStaff: staffNames.length,
        staffNames: staffNames,
        sampleData: sampleData
      }
    });
    
  } catch (error: any) {
    console.error(`[API] Error in test-staff-names: ${error.message}`);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 