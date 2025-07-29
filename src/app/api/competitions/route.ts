import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CompetitionModel, EmailSubscriptionModel } from "@/lib/models";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    console.log(
      `[API] GET /api/competitions - status: ${status}, page: ${page}, limit: ${limit}`,
    );

    await connectToDatabase();

    // Build query based on status filter
    const query: any = {};
    if (status && status !== "all") {
      query.status = status;
    }

    // Get competitions with pagination
    const competitions = await CompetitionModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await CompetitionModel.countDocuments(query);

    // Populate subscriber details for each competition
    const competitionsWithSubscribers = await Promise.all(
      competitions.map(async (competition) => {
        const subscribers = await EmailSubscriptionModel.find({
          _id: { $in: competition.enrolledSubscribers },
        })
          .select("name email")
          .lean();

        return {
          ...competition,
          enrolledSubscribers: subscribers,
          totalParticipants: subscribers.length,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        competitions: competitionsWithSubscribers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error: any) {
    console.error("[API] Error fetching competitions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[API] POST /api/competitions - Creating new competition");

    await connectToDatabase();

    // Validate required fields
    const requiredFields = [
      "name",
      "type",
      "dashboard",
      "prizes",
      "startDate",
      "endDate",
      "welcomeMessage",
    ];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    // Validate competition type
    const validTypes = ["bottleConversion", "clubConversion", "aov"];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: "Invalid competition type" },
        { status: 400 },
      );
    }

    // Validate dashboard
    const validDashboards = ["mtd", "qtd", "ytd"];
    if (!validDashboards.includes(body.dashboard)) {
      return NextResponse.json(
        { error: "Invalid dashboard type" },
        { status: 400 },
      );
    }

    // Validate competition type (ranking vs target)
    if (body.competitionType) {
      const validCompetitionTypes = ["ranking", "target"];
      if (!validCompetitionTypes.includes(body.competitionType)) {
        return NextResponse.json(
          { error: 'Invalid competition type. Must be "ranking" or "target"' },
          { status: 400 },
        );
      }
    }

    // Validate target goals if competition type is target
    if (body.competitionType === "target" && body.targetGoals) {
      if (body.targetGoals.bottleConversionRate !== undefined) {
        if (
          body.targetGoals.bottleConversionRate < 0 ||
          body.targetGoals.bottleConversionRate > 100
        ) {
          return NextResponse.json(
            {
              error: "Bottle conversion rate target must be between 0 and 100",
            },
            { status: 400 },
          );
        }
      }
      if (body.targetGoals.clubConversionRate !== undefined) {
        if (
          body.targetGoals.clubConversionRate < 0 ||
          body.targetGoals.clubConversionRate > 100
        ) {
          return NextResponse.json(
            { error: "Club conversion rate target must be between 0 and 100" },
            { status: 400 },
          );
        }
      }
      if (body.targetGoals.aov !== undefined) {
        if (body.targetGoals.aov < 0) {
          return NextResponse.json(
            { error: "AOV target must be a positive number" },
            { status: 400 },
          );
        }
      }
    }

    // Validate dates
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 },
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 },
      );
    }

    // Set default winner announcement time (1 hour after end date)
    const winnerAnnouncementTime = new Date(endDate.getTime() + 60 * 60 * 1000);

    // Process SMS scheduling
    let welcomeMessageSendAt = null;
    let progressNotifications = [];
    let winnerAnnouncementScheduledAt = null;

    if (
      body.welcomeMessage?.scheduledDate &&
      body.welcomeMessage?.scheduledTime
    ) {
      // Use EST timezone offset (-05:00) since user is in EST
      const welcomeDate = new Date(
        `${body.welcomeMessage.scheduledDate}T${body.welcomeMessage.scheduledTime}-05:00`
      );
      if (!isNaN(welcomeDate.getTime())) {
        welcomeMessageSendAt = welcomeDate;
      }
    }

    if (body.progressNotifications && Array.isArray(body.progressNotifications)) {
      progressNotifications = body.progressNotifications
        .filter(
          (notification: any) =>
            notification.scheduledDate && notification.scheduledTime,
        )
        .map((notification: any, index: number) => {
          // Use EST timezone offset (-05:00) since user is in EST
          const scheduledAt = new Date(
            `${notification.scheduledDate}T${notification.scheduledTime}-05:00`
          );
          return {
            id: `notification_${Date.now()}_${index}`,
            scheduledAt: scheduledAt,
            sent: false,
            sentAt: null,
            customMessage: notification.customMessage || "",
          };
        });
    }

    if (
      body.winnerAnnouncement?.scheduledDate &&
      body.winnerAnnouncement?.scheduledTime
    ) {
      // Use EST timezone offset (-05:00) since user is in EST
      const winnerDate = new Date(
        `${body.winnerAnnouncement.scheduledDate}T${body.winnerAnnouncement.scheduledTime}-05:00`
      );
      if (!isNaN(winnerDate.getTime())) {
        winnerAnnouncementScheduledAt = winnerDate;
      }
    }

    // Create competition
    const competition = await CompetitionModel.create({
      ...body,
      status: "draft", // Always start as draft
      welcomeMessage: {
        customText: body.welcomeMessage.customText,
        sendAt: welcomeMessageSendAt,
        sent: false,
        sentAt: null,
      },
      progressNotifications: progressNotifications,
      winnerAnnouncement: {
        scheduledAt: winnerAnnouncementScheduledAt,
        sent: false,
        sentAt: null,
      },
      enrolledSubscribers: body.enrolledSubscribers || [],
    });

    console.log(
      `[API] ✅ Created competition: ${competition.name} (ID: ${competition._id})`,
    );

    return NextResponse.json(
      {
        success: true,
        message: "Competition created successfully",
        data: {
          competition: {
            _id: competition._id,
            name: competition.name,
            type: competition.type,
            dashboard: competition.dashboard,
            status: competition.status,
            startDate: competition.startDate,
            endDate: competition.endDate,
          },
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[API] Error creating competition:", error);

    if (error.name === "ValidationError") {
      return NextResponse.json(
        { error: "Validation error", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
