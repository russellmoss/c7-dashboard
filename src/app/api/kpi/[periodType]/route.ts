import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { KPIDataModel } from '@/lib/models';

export async function GET(
  request: NextRequest,
  { params }: { params: { periodType: string } }
) {
  try {
    const { periodType } = params;
    const validPeriods = ['mtd', 'qtd', 'ytd', 'all-quarters'];
    if (!validPeriods.includes(periodType)) {
      return NextResponse.json(
        { error: 'Invalid period type' },
        { status: 400 }
      );
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
    // Return complete data structure with metrics and insights, only if metrics exists
    const metrics = (kpiData as any).metrics;
    return NextResponse.json({
      success: true,
      data: {
        ...kpiData.data,
        ...(metrics ? { metrics } : {}),
        insights: kpiData.insights,
        generatedAt: kpiData.generatedAt,
        periodType: kpiData.periodType
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 