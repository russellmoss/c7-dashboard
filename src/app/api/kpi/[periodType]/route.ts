import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { KPIDataModel } from "@/lib/models";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { periodType: string } },
) {
  console.log("[API] /api/kpi/[periodType] GET called");
  console.log("[API] periodType:", params.periodType);

  try {
    const { periodType } = params;
    const validPeriods = ["mtd", "qtd", "ytd", "all-quarters", "custom"];
    console.log("[API] Valid periods:", validPeriods);
    console.log(
      "[API] Is periodType valid?",
      validPeriods.includes(periodType),
    );

    if (!validPeriods.includes(periodType)) {
      console.log("[API] Invalid period type:", periodType);
      return NextResponse.json(
        { error: "Invalid period type" },
        { status: 400 },
      );
    }

    // Handle custom period type differently
    if (periodType === "custom") {
      console.log("[API] Handling custom period type");
      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");

      console.log(
        "[API] Custom params - startDate:",
        startDate,
        "endDate:",
        endDate,
      );

      if (!startDate || !endDate) {
        console.log("[API] Missing start or end date");
        return NextResponse.json(
          { error: "Start date and end date are required for custom reports" },
          { status: 400 },
        );
      }

      await connectToDatabase();
      console.log("[API] Connected to database for custom query");

      const customData = await KPIDataModel.findOne({
        periodType: "custom",
        startDate,
        endDate,
        status: "completed",
      })
        .sort({ createdAt: -1 })
        .lean();

      console.log("[API] Custom data found:", !!customData);

      if (!customData) {
        console.log("[API] No custom data found for date range");
        return NextResponse.json(
          {
            error: "No data found for this date range",
            message: "Please run the analysis first for this date range",
          },
          { status: 404 },
        );
      }

      console.log("[API] Returning custom data successfully");
      return NextResponse.json({
        success: true,
        data: customData.data,
        insights: customData.insights,
        generatedAt: customData.generatedAt,
        periodType: customData.periodType,
        startDate: customData.startDate,
        endDate: customData.endDate,
      });
    }

    console.log("[API] Handling standard period type:", periodType);
    // Handle standard period types
    await connectToDatabase();
    const kpiData = await KPIDataModel.findOne({
      periodType,
      year: new Date().getFullYear(),
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .lean();
    if (!kpiData) {
      return NextResponse.json(
        {
          error: `No ${periodType.toUpperCase()} data available. Please generate the report first.`,
        },
        { status: 404 },
      );
    }
    // Return complete data structure with metrics and insights, only if metrics exists
    const metrics = (kpiData as any).metrics;
    return NextResponse.json(
      {
        success: true,
        data: {
          ...kpiData.data,
          ...(metrics ? { metrics } : {}),
          insights: kpiData.insights,
          generatedAt: kpiData.generatedAt,
          periodType: kpiData.periodType,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("[API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
