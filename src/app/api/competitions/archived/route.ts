import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CompetitionModel, EmailSubscriptionModel } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const dashboard = searchParams.get("dashboard") || "";
    const skip = (page - 1) * limit;

    console.log(
      `[API] GET /api/competitions/archived - page: ${page}, limit: ${limit}, search: ${search}`,
    );

    await connectToDatabase();

    // Build query for archived competitions
    const query: any = { status: "archived" };

    // Add search filter
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Add type filter
    if (type) {
      query.type = type;
    }

    // Add dashboard filter
    if (dashboard) {
      query.dashboard = dashboard;
    }

    // Get archived competitions with pagination
    const competitions = await CompetitionModel.find(query)
      .sort({ updatedAt: -1 }) // Sort by last updated (most recent first)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await CompetitionModel.countDocuments(query);

    // Populate subscriber details and add statistics for each competition
    const competitionsWithDetails = await Promise.all(
      competitions.map(async (competition) => {
        const subscribers = await EmailSubscriptionModel.find({
          _id: { $in: competition.enrolledSubscribers },
        })
          .select("name email")
          .lean();

        // Calculate competition statistics
        const totalParticipants = subscribers.length;
        const hasFinalRankings =
          competition.finalRankings && competition.finalRankings.length > 0;
        const winners = hasFinalRankings
          ? competition.finalRankings.filter((r: any) => r.rank <= 3)
          : [];

        return {
          ...competition,
          enrolledSubscribers: subscribers,
          totalParticipants,
          statistics: {
            hasFinalRankings,
            winnerCount: winners.length,
            averageRank: hasFinalRankings
              ? competition.finalRankings.reduce(
                  (sum: number, r: any) => sum + r.rank,
                  0,
                ) / competition.finalRankings.length
              : null,
          },
        };
      }),
    );

    // Get archive statistics
    const archiveStats = await CompetitionModel.aggregate([
      { $match: { status: "archived" } },
      {
        $group: {
          _id: null,
          totalArchived: { $sum: 1 },
          byType: {
            $push: "$type",
          },
          byDashboard: {
            $push: "$dashboard",
          },
        },
      },
    ]);

    const stats = archiveStats[0] || {
      totalArchived: 0,
      byType: [],
      byDashboard: [],
    };
    const typeStats = stats.byType.reduce((acc: any, type: string) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    const dashboardStats = stats.byDashboard.reduce(
      (acc: any, dashboard: string) => {
        acc[dashboard] = (acc[dashboard] || 0) + 1;
        return acc;
      },
      {},
    );

    return NextResponse.json({
      success: true,
      data: {
        competitions: competitionsWithDetails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
        statistics: {
          totalArchived: stats.totalArchived,
          byType: typeStats,
          byDashboard: dashboardStats,
        },
        filters: {
          search,
          type,
          dashboard,
        },
      },
    });
  } catch (error: any) {
    console.error("[API] Error fetching archived competitions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
