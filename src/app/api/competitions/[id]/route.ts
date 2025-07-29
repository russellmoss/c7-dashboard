import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { CompetitionModel, EmailSubscriptionModel } from "@/lib/models";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    console.log(`[API] GET /api/competitions/${id}`);

    await connectToDatabase();

    const competition = await CompetitionModel.findById(id).lean();
    if (!competition) {
      return NextResponse.json(
        { error: "Competition not found" },
        { status: 404 },
      );
    }

    // Populate subscriber details
    const subscribers = await EmailSubscriptionModel.find({
      _id: { $in: competition.enrolledSubscribers },
    })
      .select("name email")
      .lean();

    // Add competition statistics
    const totalParticipants = subscribers.length;
    const hasFinalRankings =
      competition.finalRankings && competition.finalRankings.length > 0;
    const winners = hasFinalRankings
      ? competition.finalRankings.filter((r: any) => r.rank <= 3)
      : [];

    const competitionWithDetails = {
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

    return NextResponse.json({
      success: true,
      data: competitionWithDetails,
    });
  } catch (error: any) {
    console.error(`[API] Error fetching competition ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    console.log(`[API] PUT /api/competitions/${id}`);

    await connectToDatabase();

    // Check if competition exists
    const existingCompetition = await CompetitionModel.findById(id);
    if (!existingCompetition) {
      return NextResponse.json(
        { error: "Competition not found" },
        { status: 404 },
      );
    }

    // Allow updates for draft and active competitions (but not completed/archived)
    if (
      existingCompetition.status === "completed" ||
      existingCompetition.status === "archived"
    ) {
      return NextResponse.json(
        { error: "Cannot update completed or archived competitions" },
        { status: 400 },
      );
    }

    // Allow editing all fields for active competitions (removed restrictions)
    // Users should be able to modify any aspect of their competitions

    // Process SMS scheduling updates
    let updateBody = { ...body };

    if (body.welcomeMessage) {
      let welcomeMessageSendAt = existingCompetition.welcomeMessage.sendAt;
      if (
        body.welcomeMessage.scheduledDate &&
        body.welcomeMessage.scheduledTime
      ) {
        // Use EDT timezone offset (-04:00) since user is in EDT
        const welcomeDate = new Date(
          `${body.welcomeMessage.scheduledDate}T${body.welcomeMessage.scheduledTime}-04:00`
        );
        if (!isNaN(welcomeDate.getTime())) {
          welcomeMessageSendAt = welcomeDate;
        }
      }

      updateBody.welcomeMessage = {
        customText:
          body.welcomeMessage.customText ||
          existingCompetition.welcomeMessage.customText,
        sendAt: welcomeMessageSendAt,
        sent: existingCompetition.welcomeMessage.sent,
        sentAt: existingCompetition.welcomeMessage.sentAt,
      };
    }

    if (
      body.progressNotifications &&
      Array.isArray(body.progressNotifications)
    ) {
      const processedProgressNotifications = body.progressNotifications
        .filter(
          (notification: any) =>
            notification.scheduledDate && notification.scheduledTime,
        )
        .map((notification: any, index: number) => {
          // Use EDT timezone offset (-04:00) since user is in EDT
          const scheduledAt = new Date(
            `${notification.scheduledDate}T${notification.scheduledTime}-04:00`
          );
          return {
            id: `notification_${Date.now()}_${index}`,
            scheduledAt: scheduledAt,
            sent: false,
            sentAt: null,
          };
        });

      updateBody.progressNotifications = processedProgressNotifications;
    }

    if (body.winnerAnnouncement) {
      let winnerAnnouncementScheduledAt =
        existingCompetition.winnerAnnouncement.scheduledAt;
      if (
        body.winnerAnnouncement.scheduledDate &&
        body.winnerAnnouncement.scheduledTime
      ) {
        // Use EDT timezone offset (-04:00) since user is in EDT
        const winnerDate = new Date(
          `${body.winnerAnnouncement.scheduledDate}T${body.winnerAnnouncement.scheduledTime}-04:00`
        );
        if (!isNaN(winnerDate.getTime())) {
          winnerAnnouncementScheduledAt = winnerDate;
        }
      }

      updateBody.winnerAnnouncement = {
        scheduledAt: winnerAnnouncementScheduledAt,
        sent: existingCompetition.winnerAnnouncement.sent,
        sentAt: existingCompetition.winnerAnnouncement.sentAt,
      };
    }

    // Validate dates if provided
    if (body.startDate && body.endDate) {
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

      // Update winner announcement time if end date changed
      if (body.endDate !== existingCompetition.endDate.toISOString()) {
        body.winnerAnnouncement = {
          ...existingCompetition.winnerAnnouncement,
          scheduledAt: new Date(endDate.getTime() + 60 * 60 * 1000),
        };
      }
    }

    // Validate dashboard if provided
    if (body.dashboard) {
      const validDashboards = ["mtd", "qtd", "ytd"];
      if (!validDashboards.includes(body.dashboard)) {
        return NextResponse.json(
          { error: "Invalid dashboard type" },
          { status: 400 },
        );
      }
    }

    // Validate competition type if provided
    if (body.competitionType) {
      const validCompetitionTypes = ["ranking", "target"];
      if (!validCompetitionTypes.includes(body.competitionType)) {
        return NextResponse.json(
          { error: 'Invalid competition type. Must be "ranking" or "target"' },
          { status: 400 },
        );
      }
    }

    // Validate target goals if provided
    if (body.targetGoals) {
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

    // Update competition
    const updatedCompetition = await CompetitionModel.findByIdAndUpdate(
      id,
      { ...updateBody, updatedAt: new Date() },
      { new: true, runValidators: true },
    ).lean();

    if (!updatedCompetition) {
      return NextResponse.json(
        { error: "Failed to update competition" },
        { status: 500 },
      );
    }

    console.log(`[API] ✅ Updated competition: ${updatedCompetition.name}`);

    return NextResponse.json({
      success: true,
      message: "Competition updated successfully",
      data: {
        competition: {
          _id: updatedCompetition._id,
          name: updatedCompetition.name,
          type: updatedCompetition.type,
          dashboard: updatedCompetition.dashboard,
          status: updatedCompetition.status,
          startDate: updatedCompetition.startDate,
          endDate: updatedCompetition.endDate,
        },
      },
    });
  } catch (error: any) {
    console.error(`[API] Error updating competition ${params.id}:`, error);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    console.log(`[API] DELETE /api/competitions/${id}`);

    await connectToDatabase();

    // Check if competition exists
    const competition = await CompetitionModel.findById(id);
    if (!competition) {
      return NextResponse.json(
        { error: "Competition not found" },
        { status: 404 },
      );
    }

    // Allow deletion for draft and active competitions (but not completed/archived)
    if (
      competition.status === "completed" ||
      competition.status === "archived"
    ) {
      return NextResponse.json(
        { error: "Cannot delete completed or archived competitions" },
        { status: 400 },
      );
    }

    // Delete competition
    await CompetitionModel.findByIdAndDelete(id);

    console.log(`[API] ✅ Deleted competition: ${competition.name}`);

    return NextResponse.json({
      success: true,
      message: "Competition deleted successfully",
    });
  } catch (error: any) {
    console.error(`[API] Error deleting competition ${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
