import { connectToDatabase } from "./mongodb";
import { CompetitionModel } from "./models";

export interface ArchiveFilters {
  type?: "bottleConversion" | "clubConversion" | "aov";
  dashboard?: "mtd" | "qtd" | "ytd";
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  status?: "completed" | "archived";
  search?: string;
  hasWinners?: boolean;
  hasWinnerAnnouncement?: boolean;
}

export interface ArchiveSortOptions {
  field:
    | "name"
    | "startDate"
    | "endDate"
    | "createdAt"
    | "participantCount"
    | "winnerCount";
  direction: "asc" | "desc";
}

export interface ArchiveStatistics {
  totalCompetitions: number;
  totalParticipants: number;
  totalWinners: number;
  averageParticipants: number;
  averageWinners: number;
  byType: {
    bottleConversion: { count: number; participants: number; winners: number };
    clubConversion: { count: number; participants: number; winners: number };
    aov: { count: number; participants: number; winners: number };
  };
  byDashboard: {
    mtd: { count: number; participants: number; winners: number };
    qtd: { count: number; participants: number; winners: number };
    ytd: { count: number; participants: number; winners: number };
  };
  byMonth: Array<{
    month: string;
    count: number;
    participants: number;
    winners: number;
  }>;
  recentActivity: {
    lastCompleted: Date | null;
    lastArchived: Date | null;
    competitionsThisMonth: number;
    competitionsThisQuarter: number;
  };
}

export interface ArchiveCompetition {
  _id: string;
  name: string;
  type: "bottleConversion" | "clubConversion" | "aov";
  dashboard: "mtd" | "qtd" | "ytd";
  startDate: Date;
  endDate: Date;
  status: "completed" | "archived";
  participantCount: number;
  winnerCount: number;
  finalRankings: Array<{
    subscriberId: string;
    rank: number;
    value: number;
    name: string;
  }>;
  winners: {
    first: { name: string; value: number } | null;
    second: { name: string; value: number } | null;
    third: { name: string; value: number } | null;
  };
  prizes: {
    first: string;
    second: string;
    third: string;
  };
  welcomeMessage: {
    sent: boolean;
    sentAt: Date | null;
  };
  progressNotifications: Array<{
    id: string;
    scheduledAt: Date;
    sent: boolean;
    sentAt: Date | null;
  }>;
  winnerAnnouncement: {
    sent: boolean;
    sentAt: Date | null;
  };
  createdAt: Date;
  updatedAt: Date;
  duration: number; // in days
  completionRate: number; // percentage of notifications sent
}

export interface ArchiveSearchResult {
  competitions: ArchiveCompetition[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: ArchiveFilters;
  sort: ArchiveSortOptions;
}

export class ArchiveManagementService {
  /**
   * Search and filter archived competitions
   */
  async searchArchivedCompetitions(
    filters: ArchiveFilters = {},
    sort: ArchiveSortOptions = { field: "endDate", direction: "desc" },
    page: number = 1,
    limit: number = 20,
  ): Promise<ArchiveSearchResult> {
    try {
      await connectToDatabase();

      // Build query
      const query: any = {
        status: { $in: ["completed", "archived"] },
      };

      // Apply filters
      if (filters.type) {
        query.type = filters.type;
      }

      if (filters.dashboard) {
        query.dashboard = filters.dashboard;
      }

      if (filters.dateRange) {
        query.endDate = {
          $gte: filters.dateRange.startDate,
          $lte: filters.dateRange.endDate,
        };
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.search) {
        query.name = { $regex: filters.search, $options: "i" };
      }

      if (filters.hasWinners !== undefined) {
        if (filters.hasWinners) {
          query["finalRankings.0"] = { $exists: true };
        } else {
          query.finalRankings = { $size: 0 };
        }
      }

      if (filters.hasWinnerAnnouncement !== undefined) {
        query["winnerAnnouncement.sent"] = filters.hasWinnerAnnouncement;
      }

      // Build sort object
      const sortObj: any = {};
      if (sort.field === "participantCount" || sort.field === "winnerCount") {
        // These will be calculated after aggregation
        sortObj[sort.field] = sort.direction === "asc" ? 1 : -1;
      } else {
        sortObj[sort.field] = sort.direction === "asc" ? 1 : -1;
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;

      const competitions = await CompetitionModel.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

      // Get total count for pagination
      const totalCount = await CompetitionModel.countDocuments(query);

      // Populate subscriber details and calculate additional fields
      const enrichedCompetitions = await Promise.all(
        competitions.map(async (competition) => {
          const enriched = await this.enrichCompetitionData(competition);
          return enriched;
        }),
      );

      // Apply sorting for calculated fields
      if (sort.field === "participantCount" || sort.field === "winnerCount") {
        enrichedCompetitions.sort((a, b) => {
          const aValue =
            sort.field === "participantCount"
              ? a.participantCount
              : a.winnerCount;
          const bValue =
            sort.field === "participantCount"
              ? b.participantCount
              : b.winnerCount;
          return sort.direction === "asc" ? aValue - bValue : bValue - aValue;
        });
      }

      return {
        competitions: enrichedCompetitions,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        filters,
        sort,
      };
    } catch (error: any) {
      console.error(
        "[ArchiveManagementService] Error searching archived competitions:",
        error,
      );
      throw new Error(
        `Failed to search archived competitions: ${error.message}`,
      );
    }
  }

  /**
   * Get comprehensive archive statistics
   */
  async getArchiveStatistics(): Promise<ArchiveStatistics> {
    try {
      await connectToDatabase();

      // Get all completed and archived competitions
      const competitions = await CompetitionModel.find({
        status: { $in: ["completed", "archived"] },
      }).lean();

      if (competitions.length === 0) {
        return this.getEmptyStatistics();
      }

      // Calculate basic statistics
      const totalCompetitions = competitions.length;
      let totalParticipants = 0;
      let totalWinners = 0;

      // Calculate by type
      const byType = {
        bottleConversion: { count: 0, participants: 0, winners: 0 },
        clubConversion: { count: 0, participants: 0, winners: 0 },
        aov: { count: 0, participants: 0, winners: 0 },
      };

      // Calculate by dashboard
      const byDashboard = {
        mtd: { count: 0, participants: 0, winners: 0 },
        qtd: { count: 0, participants: 0, winners: 0 },
        ytd: { count: 0, participants: 0, winners: 0 },
      };

      // Calculate by month
      const monthMap = new Map<
        string,
        { count: number; participants: number; winners: number }
      >();

      // Process each competition
      competitions.forEach((competition) => {
        const participantCount = competition.enrolledSubscribers?.length || 0;
        const winnerCount = competition.finalRankings?.length || 0;

        totalParticipants += participantCount;
        totalWinners += winnerCount;

        // By type
        byType[competition.type].count++;
        byType[competition.type].participants += participantCount;
        byType[competition.type].winners += winnerCount;

        // By dashboard
        byDashboard[competition.dashboard].count++;
        byDashboard[competition.dashboard].participants += participantCount;
        byDashboard[competition.dashboard].winners += winnerCount;

        // By month
        const monthKey = new Date(competition.endDate)
          .toISOString()
          .substring(0, 7); // YYYY-MM
        const monthData = monthMap.get(monthKey) || {
          count: 0,
          participants: 0,
          winners: 0,
        };
        monthData.count++;
        monthData.participants += participantCount;
        monthData.winners += winnerCount;
        monthMap.set(monthKey, monthData);
      });

      // Convert month map to array and sort
      const byMonth = Array.from(monthMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12); // Last 12 months

      // Calculate recent activity
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisQuarter = new Date(
        now.getFullYear(),
        Math.floor(now.getMonth() / 3) * 3,
        1,
      );

      const recentActivity = {
        lastCompleted:
          competitions
            .filter((c) => c.status === "completed")
            .sort(
              (a, b) =>
                new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
            )[0]?.endDate || null,
        lastArchived:
          competitions
            .filter((c) => c.status === "archived")
            .sort(
              (a, b) =>
                new Date(b.updatedAt || new Date()).getTime() -
                new Date(a.updatedAt || new Date()).getTime(),
            )[0]?.updatedAt || null,
        competitionsThisMonth: competitions.filter(
          (c) => new Date(c.endDate) >= thisMonth,
        ).length,
        competitionsThisQuarter: competitions.filter(
          (c) => new Date(c.endDate) >= thisQuarter,
        ).length,
      };

      return {
        totalCompetitions,
        totalParticipants,
        totalWinners,
        averageParticipants:
          totalCompetitions > 0
            ? Math.round(totalParticipants / totalCompetitions)
            : 0,
        averageWinners:
          totalCompetitions > 0
            ? Math.round(totalWinners / totalCompetitions)
            : 0,
        byType,
        byDashboard,
        byMonth,
        recentActivity,
      };
    } catch (error: any) {
      console.error(
        "[ArchiveManagementService] Error getting archive statistics:",
        error,
      );
      throw new Error(`Failed to get archive statistics: ${error.message}`);
    }
  }

  /**
   * Get detailed competition data for archive view
   */
  async getCompetitionDetails(
    competitionId: string,
  ): Promise<ArchiveCompetition | null> {
    try {
      await connectToDatabase();

      const competition = await CompetitionModel.findById(competitionId).lean();
      if (
        !competition ||
        !["completed", "archived"].includes(competition.status)
      ) {
        return null;
      }

      return await this.enrichCompetitionData(competition);
    } catch (error: any) {
      console.error(
        "[ArchiveManagementService] Error getting competition details:",
        error,
      );
      throw new Error(`Failed to get competition details: ${error.message}`);
    }
  }

  /**
   * Archive a completed competition
   */
  async archiveCompetition(competitionId: string): Promise<boolean> {
    try {
      await connectToDatabase();

      const competition = await CompetitionModel.findById(competitionId);
      if (!competition) {
        throw new Error("Competition not found");
      }

      if (competition.status !== "completed") {
        throw new Error("Only completed competitions can be archived");
      }

      competition.status = "archived";
      await competition.save();

      console.log(
        `[ArchiveManagementService] ✅ Competition ${competition.name} archived successfully`,
      );
      return true;
    } catch (error: any) {
      console.error(
        "[ArchiveManagementService] Error archiving competition:",
        error,
      );
      throw new Error(`Failed to archive competition: ${error.message}`);
    }
  }

  /**
   * Restore an archived competition to completed status
   */
  async restoreCompetition(competitionId: string): Promise<boolean> {
    try {
      await connectToDatabase();

      const competition = await CompetitionModel.findById(competitionId);
      if (!competition) {
        throw new Error("Competition not found");
      }

      if (competition.status !== "archived") {
        throw new Error("Only archived competitions can be restored");
      }

      competition.status = "completed";
      await competition.save();

      console.log(
        `[ArchiveManagementService] ✅ Competition ${competition.name} restored successfully`,
      );
      return true;
    } catch (error: any) {
      console.error(
        "[ArchiveManagementService] Error restoring competition:",
        error,
      );
      throw new Error(`Failed to restore competition: ${error.message}`);
    }
  }

  /**
   * Get performance analytics for archived competitions
   */
  async getPerformanceAnalytics(filters: ArchiveFilters = {}): Promise<any> {
    try {
      await connectToDatabase();

      // Build query
      const query: any = {
        status: { $in: ["completed", "archived"] },
      };

      if (filters.type) query.type = filters.type;
      if (filters.dashboard) query.dashboard = filters.dashboard;
      if (filters.dateRange) {
        query.endDate = {
          $gte: filters.dateRange.startDate,
          $lte: filters.dateRange.endDate,
        };
      }

      const competitions = await CompetitionModel.find(query).lean();

      // Calculate performance metrics
      const analytics = {
        totalCompetitions: competitions.length,
        averageParticipants: 0,
        averageWinners: 0,
        participationRate: 0,
        winnerDistribution: {
          firstPlace: 0,
          secondPlace: 0,
          thirdPlace: 0,
        },
        typePerformance: {
          bottleConversion: { count: 0, avgParticipants: 0, avgWinners: 0 },
          clubConversion: { count: 0, avgParticipants: 0, avgWinners: 0 },
          aov: { count: 0, avgParticipants: 0, avgWinners: 0 },
        },
        dashboardPerformance: {
          mtd: { count: 0, avgParticipants: 0, avgWinners: 0 },
          qtd: { count: 0, avgParticipants: 0, avgWinners: 0 },
          ytd: { count: 0, avgParticipants: 0, avgWinners: 0 },
        },
        completionRates: {
          welcomeMessage: 0,
          progressNotifications: 0,
          winnerAnnouncement: 0,
        },
      };

      if (competitions.length === 0) {
        return analytics;
      }

      let totalParticipants = 0;
      let totalWinners = 0;
      let welcomeMessagesSent = 0;
      let progressNotificationsSent = 0;
      let winnerAnnouncementsSent = 0;

      competitions.forEach((competition) => {
        const participantCount = competition.enrolledSubscribers?.length || 0;
        const winnerCount = competition.finalRankings?.length || 0;

        totalParticipants += participantCount;
        totalWinners += winnerCount;

        // Track completion rates
        if (competition.welcomeMessage?.sent) welcomeMessagesSent++;
        if (competition.winnerAnnouncement?.sent) winnerAnnouncementsSent++;

        const sentProgressNotifications =
          competition.progressNotifications?.filter((n) => n.sent).length || 0;
        const totalProgressNotifications =
          competition.progressNotifications?.length || 0;
        if (totalProgressNotifications > 0) {
          progressNotificationsSent +=
            sentProgressNotifications / totalProgressNotifications;
        }

        // Track winner distribution
        if (competition.finalRankings?.length > 0) {
          const firstPlace = competition.finalRankings.find(
            (r) => r.rank === 1,
          );
          const secondPlace = competition.finalRankings.find(
            (r) => r.rank === 2,
          );
          const thirdPlace = competition.finalRankings.find(
            (r) => r.rank === 3,
          );

          if (firstPlace) analytics.winnerDistribution.firstPlace++;
          if (secondPlace) analytics.winnerDistribution.secondPlace++;
          if (thirdPlace) analytics.winnerDistribution.thirdPlace++;
        }

        // Track by type
        analytics.typePerformance[competition.type].count++;
        analytics.typePerformance[competition.type].avgParticipants +=
          participantCount;
        analytics.typePerformance[competition.type].avgWinners += winnerCount;

        // Track by dashboard
        analytics.dashboardPerformance[competition.dashboard].count++;
        analytics.dashboardPerformance[competition.dashboard].avgParticipants +=
          participantCount;
        analytics.dashboardPerformance[competition.dashboard].avgWinners +=
          winnerCount;
      });

      // Calculate averages
      analytics.averageParticipants = Math.round(
        totalParticipants / competitions.length,
      );
      analytics.averageWinners = Math.round(totalWinners / competitions.length);
      analytics.completionRates.welcomeMessage = Math.round(
        (welcomeMessagesSent / competitions.length) * 100,
      );
      analytics.completionRates.winnerAnnouncement = Math.round(
        (winnerAnnouncementsSent / competitions.length) * 100,
      );
      analytics.completionRates.progressNotifications = Math.round(
        (progressNotificationsSent / competitions.length) * 100,
      );

      // Calculate type and dashboard averages
      Object.keys(analytics.typePerformance).forEach((type) => {
        const typeData =
          analytics.typePerformance[
            type as keyof typeof analytics.typePerformance
          ];
        if (typeData.count > 0) {
          typeData.avgParticipants = Math.round(
            typeData.avgParticipants / typeData.count,
          );
          typeData.avgWinners = Math.round(
            typeData.avgWinners / typeData.count,
          );
        }
      });

      Object.keys(analytics.dashboardPerformance).forEach((dashboard) => {
        const dashboardData =
          analytics.dashboardPerformance[
            dashboard as keyof typeof analytics.dashboardPerformance
          ];
        if (dashboardData.count > 0) {
          dashboardData.avgParticipants = Math.round(
            dashboardData.avgParticipants / dashboardData.count,
          );
          dashboardData.avgWinners = Math.round(
            dashboardData.avgWinners / dashboardData.count,
          );
        }
      });

      return analytics;
    } catch (error: any) {
      console.error(
        "[ArchiveManagementService] Error getting performance analytics:",
        error,
      );
      throw new Error(`Failed to get performance analytics: ${error.message}`);
    }
  }

  /**
   * Enrich competition data with calculated fields
   */
  private async enrichCompetitionData(
    competition: any,
  ): Promise<ArchiveCompetition> {
    const participantCount = competition.enrolledSubscribers?.length || 0;
    const winnerCount = competition.finalRankings?.length || 0;

    // Calculate winners
    const winners = {
      first: competition.finalRankings?.find((r: any) => r.rank === 1) || null,
      second: competition.finalRankings?.find((r: any) => r.rank === 2) || null,
      third: competition.finalRankings?.find((r: any) => r.rank === 3) || null,
    };

    // Calculate duration
    const duration = Math.ceil(
      (new Date(competition.endDate).getTime() -
        new Date(competition.startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // Calculate completion rate
    const totalNotifications =
      1 + (competition.progressNotifications?.length || 0) + 1; // welcome + progress + winner
    const sentNotifications =
      (competition.welcomeMessage?.sent ? 1 : 0) +
      (competition.progressNotifications?.filter((n: any) => n.sent).length ||
        0) +
      (competition.winnerAnnouncement?.sent ? 1 : 0);
    const completionRate = Math.round(
      (sentNotifications / totalNotifications) * 100,
    );

    return {
      _id: competition._id.toString(),
      name: competition.name,
      type: competition.type,
      dashboard: competition.dashboard,
      startDate: competition.startDate,
      endDate: competition.endDate,
      status: competition.status,
      participantCount,
      winnerCount,
      finalRankings: competition.finalRankings || [],
      winners: {
        first: winners.first
          ? { name: winners.first.name, value: winners.first.value }
          : null,
        second: winners.second
          ? { name: winners.second.name, value: winners.second.value }
          : null,
        third: winners.third
          ? { name: winners.third.name, value: winners.third.value }
          : null,
      },
      prizes: competition.prizes,
      welcomeMessage: {
        sent: competition.welcomeMessage?.sent || false,
        sentAt: competition.welcomeMessage?.sentAt || null,
      },
      progressNotifications: competition.progressNotifications || [],
      winnerAnnouncement: {
        sent: competition.winnerAnnouncement?.sent || false,
        sentAt: competition.winnerAnnouncement?.sentAt || null,
      },
      createdAt: competition.createdAt,
      updatedAt: competition.updatedAt,
      duration,
      completionRate,
    };
  }

  /**
   * Get empty statistics for when no competitions exist
   */
  private getEmptyStatistics(): ArchiveStatistics {
    return {
      totalCompetitions: 0,
      totalParticipants: 0,
      totalWinners: 0,
      averageParticipants: 0,
      averageWinners: 0,
      byType: {
        bottleConversion: { count: 0, participants: 0, winners: 0 },
        clubConversion: { count: 0, participants: 0, winners: 0 },
        aov: { count: 0, participants: 0, winners: 0 },
      },
      byDashboard: {
        mtd: { count: 0, participants: 0, winners: 0 },
        qtd: { count: 0, participants: 0, winners: 0 },
        ytd: { count: 0, participants: 0, winners: 0 },
      },
      byMonth: [],
      recentActivity: {
        lastCompleted: null,
        lastArchived: null,
        competitionsThisMonth: 0,
        competitionsThisQuarter: 0,
      },
    };
  }
}

// Export singleton instance
export const archiveManagementService = new ArchiveManagementService();
