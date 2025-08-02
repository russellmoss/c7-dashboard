import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TextCampaignModel, TextReplyModel } from "@/lib/models";

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    
    if (!searchTerm) {
      return NextResponse.json(
        { error: "Search term is required" },
        { status: 400 },
      );
    }
    
    // Search in campaign messages
    const campaignQuery = {
      $or: [
        { name: { $regex: searchTerm, $options: "i" } },
        { message: { $regex: searchTerm, $options: "i" } }
      ]
    };
    
    // Search in reply messages
    const replyQuery = {
      message: { $regex: searchTerm, $options: "i" }
    };
    
    // Execute searches
    const campaigns = await TextCampaignModel.find(campaignQuery)
      .populate("replies")
      .sort({ createdAt: -1 })
      .lean();
    
    const replies = await TextReplyModel.find(replyQuery)
      .populate("campaignId")
      .sort({ timestamp: -1 })
      .lean();
    
    // Combine and format results
    const results = [];
    
    // Add campaigns that match
    for (const campaign of campaigns) {
      results.push({
        type: "campaign",
        id: campaign._id,
        name: campaign.name,
        message: campaign.message,
        createdAt: campaign.createdAt,
        status: campaign.status,
        matchType: "campaign_message",
        highlightedText: campaign.message.includes(searchTerm) ? 
          campaign.message.substring(Math.max(0, campaign.message.toLowerCase().indexOf(searchTerm.toLowerCase()) - 20), 
          campaign.message.toLowerCase().indexOf(searchTerm.toLowerCase()) + searchTerm.length + 20) : 
          campaign.name
      });
    }
    
    // Add replies that match
    for (const reply of replies) {
      if (reply.campaignId && typeof reply.campaignId === 'object' && 'name' in reply.campaignId) {
        results.push({
          type: "reply",
          id: reply._id,
          campaignId: reply.campaignId._id,
          campaignName: (reply.campaignId as any).name,
          fromName: reply.fromName,
          fromPhone: reply.fromPhone,
          message: reply.message,
          timestamp: reply.timestamp,
          matchType: "reply_message",
          highlightedText: reply.message.substring(Math.max(0, reply.message.toLowerCase().indexOf(searchTerm.toLowerCase()) - 20), 
            reply.message.toLowerCase().indexOf(searchTerm.toLowerCase()) + searchTerm.length + 20)
        });
      }
    }
    
    // Sort results by relevance (campaigns first, then by date)
    results.sort((a, b) => {
      if (a.type === "campaign" && b.type === "reply") return -1;
      if (a.type === "reply" && b.type === "campaign") return 1;
      return new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime();
    });
    
    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedResults = results.slice(skip, skip + limit);
    
    return NextResponse.json({
      results: paginatedResults,
      total: results.length,
      pagination: {
        page,
        limit,
        total: results.length,
        pages: Math.ceil(results.length / limit)
      }
    });
  } catch (error) {
    console.error("Error searching SMS content:", error);
    return NextResponse.json(
      { error: "Failed to search SMS content" },
      { status: 500 },
    );
  }
} 