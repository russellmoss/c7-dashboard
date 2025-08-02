import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TextCampaignModel } from "@/lib/models";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const campaign = await TextCampaignModel.findById(params.id);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    campaign.status = "archived";
    await campaign.save();

    return NextResponse.json({
      message: "Campaign archived successfully",
      campaign,
    });
  } catch (error) {
    console.error("Error archiving campaign:", error);
    return NextResponse.json(
      { error: "Failed to archive campaign" },
      { status: 500 },
    );
  }
} 