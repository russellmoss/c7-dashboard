import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { KPIDataModel } from "@/lib/models";
import { chatWithAssistant } from "@/lib/ai-insights";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }
    await connectToDatabase();
    const latestKPIData = await KPIDataModel.find({
      year: new Date().getFullYear(),
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();
    const kpiContext = latestKPIData.reduce((acc, item) => {
      acc[item.periodType] = {
        data: item.data,
        insights: item.insights,
        lastUpdated: item.updatedAt,
      };
      return acc;
    }, {} as any);
    const response = await chatWithAssistant(message, kpiContext);
    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 },
    );
  }
}
