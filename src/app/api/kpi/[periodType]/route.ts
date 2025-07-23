import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { KPIDataModel } from '@/lib/models';

export async function GET(
  request: NextRequest,
  { params }: { params: { periodType: string } }
) {
  try {
    const { periodType } = params;
    if (!['mtd', 'qtd', 'ytd', 'all-quarters'].includes(periodType)) {
      return NextResponse.json({ error: 'Invalid period type' }, { status: 400 });
    }
    await connectToDatabase();
    const kpiData = await KPIDataModel.findOne({
      periodType,
      year: new Date().getFullYear(),
      status: 'completed'
    }).sort({ createdAt: -1 }).lean();
    if (!kpiData) {
      return NextResponse.json(
        { error: `No ${periodType.toUpperCase()} data available. Please generate the report first.` },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      periodType: kpiData.periodType,
      data: kpiData.data,
      insights: kpiData.insights,
      lastUpdated: kpiData.updatedAt,
      executionTime: kpiData.executionTime
    });
  } catch (error) {
    console.error(`Error fetching ${params.periodType} data:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 