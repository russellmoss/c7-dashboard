import { connectToDatabase } from "./mongodb.js";
import { CompetitionModel, EmailSubscriptionModel } from "./models.js";


export interface AnalyticsFilters {
  type?: "bottleConversion" | "clubConversion" | "aov";
  dashboard?: "mtd" | "qtd" | "ytd";
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  staffMember?: string;
  status?: "completed" | "archived" | "all";
}

export interface CompetitionAnalytics {
  overview: {
    totalCompetitions: number;
    totalParticipants: number;
    totalWinners: number;
    averageParticipants: number;
    averageWinners: number;
    averageDuration: number;
    averageCompletionRate: number;
  };
  trends: {
    monthly: Array<{
      month: string;
      competitions: number;
      participants: number;
      winners: number;
      averageParticipants: number;
    }>;
    quarterly: Array<{
      quarter: string;
      competitions: number;
      participants: number;
      winners: number;
      averageParticipants: number;
    }>;
    yearly: Array<{
      year: string;
      competitions: number;
      participants: number;
      winners: number;
      averageParticipants: number;
    }>;
  };
  performance: {
    byType: {
      bottleConversion: CompetitionTypeAnalytics;
      clubConversion: CompetitionTypeAnalytics;
      aov: CompetitionTypeAnalytics;
    };
    byDashboard: {
      mtd: DashboardAnalytics;
      qtd: DashboardAnalytics;
      ytd: DashboardAnalytics;
    };
    byStaff: Array<StaffPerformanceAnalytics>;
  };
  effectiveness: {
    participationRates: {
      overall: number;
      byType: { [key: string]: number };
      byDashboard: { [key: string]: number };
    };
    completionRates: {
      welcomeMessage: number;
      progressNotifications: number;
      winnerAnnouncement: number;
      overall: number;
    };
    engagementMetrics: {
      averageRank: number;
      rankDistribution: { [key: string]: number };
      winnerRepeatRate: number;
      participationGrowth: number;
    };
  };
  insights: {
    topPerformers: Array<StaffInsight>;
    mostEffectiveCompetitions: Array<CompetitionInsight>;
    trends: Array<AnalyticsInsight>;
    recommendations: Array<string>;
  };
}

export interface CompetitionTypeAnalytics {
  count: number;
  totalParticipants: number;
  totalWinners: number;
  averageParticipants: number;
  averageWinners: number;
  averageDuration: number;
  averageCompletionRate: number;
  participationRate: number;
  winnerDistribution: {
    firstPlace: number;
    secondPlace: number;
    thirdPlace: number;
  };
  performanceTrend: "increasing" | "decreasing" | "stable";
  effectivenessScore: number; // 0-100
}

export interface DashboardAnalytics {
  count: number;
  totalParticipants: number;
  totalWinners: number;
  averageParticipants: number;
  averageWinners: number;
  averageDuration: number;
  averageCompletionRate: number;
  participationRate: number;
  mostPopularType: string;
  performanceTrend: "increasing" | "decreasing" | "stable";
  effectivenessScore: number; // 0-100
}

export interface StaffPerformanceAnalytics {
  staffName: string;
  totalCompetitions: number;
  totalParticipations: number;
  totalWins: number;
  averageRank: number;
  bestRank: number;
  winRate: number;
  participationRate: number;
  performanceTrend: "increasing" | "decreasing" | "stable";
  favoriteType: string;
  favoriteDashboard: string;
  effectivenessScore: number; // 0-100
  recentPerformance: Array<{
    competitionName: string;
    rank: number;
    value: number;
    date: string;
  }>;
}

export interface StaffInsight {
  staffName: string;
  metric: string;
  value: number;
  trend: "increasing" | "decreasing" | "stable";
  description: string;
}

export interface CompetitionInsight {
  competitionName: string;
  metric: string;
  value: number;
  rank: number;
  description: string;
}

export interface AnalyticsInsight {
  type: "trend" | "anomaly" | "opportunity" | "warning";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  recommendation: string;
}

export class CompetitionAnalyticsService {
  /**
   * Get comprehensive competition analytics
   */
  async getCompetitionAnalytics(
    filters: AnalyticsFilters = {},
  ): Promise<CompetitionAnalytics> {
    try {
      await connectToDatabase();

      // Build query
      const query: any = {};
      if (filters.status && filters.status !== "all") {
        query.status = filters.status;
      } else {
        query.status = { $in: ["completed", "archived"] };
      }

      if (filters.type) query.type = filters.type;
      if (filters.dashboard) query.dashboard = filters.dashboard;
      if (filters.dateRange) {
        query.endDate = {
          $gte: filters.dateRange.startDate,
          $lte: filters.dateRange.endDate,
        };
      }

      const competitions = await CompetitionModel.find(query).lean();
      const allSubscribers = await EmailSubscriptionModel.find().lean();

      // Calculate overview metrics
      const overview = this.calculateOverviewMetrics(competitions);

      // Calculate trends
      const trends = this.calculateTrends(competitions);

      // Calculate performance analytics
      const performance = await this.calculatePerformanceAnalytics(
        competitions,
        allSubscribers,
        filters,
      );

      // Calculate effectiveness metrics
      const effectiveness = this.calculateEffectivenessMetrics(competitions);

      // Generate insights
      const insights = this.generateInsights(
        overview,
        trends,
        performance,
        effectiveness,
      );

      return {
        overview,
        trends,
        performance,
        effectiveness,
        insights,
      };
    } catch (error: any) {
      console.error(
        "[CompetitionAnalyticsService] Error getting analytics:",
        error,
      );
      throw new Error(`Failed to get competition analytics: ${error.message}`);
    }
  }

  /**
   * Calculate overview metrics
   */
  private calculateOverviewMetrics(
    competitions: any[],
  ): CompetitionAnalytics["overview"] {
    if (competitions.length === 0) {
      return {
        totalCompetitions: 0,
        totalParticipants: 0,
        totalWinners: 0,
        averageParticipants: 0,
        averageWinners: 0,
        averageDuration: 0,
        averageCompletionRate: 0,
      };
    }

    let totalParticipants = 0;
    let totalWinners = 0;
    let totalDuration = 0;
    let totalCompletionRate = 0;

    competitions.forEach((competition) => {
      const participantCount = competition.enrolledSubscribers?.length || 0;
      const winnerCount = competition.finalRankings?.length || 0;
      const duration = Math.ceil(
        (new Date(competition.endDate).getTime() -
          new Date(competition.startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      totalParticipants += participantCount;
      totalWinners += winnerCount;
      totalDuration += duration;

      // Calculate completion rate
      const totalNotifications =
        1 + (competition.progressNotifications?.length || 0) + 1;
      const sentNotifications =
        (competition.welcomeMessage?.sent ? 1 : 0) +
        (competition.progressNotifications?.filter((n: any) => n.sent).length ||
          0) +
        (competition.winnerAnnouncement?.sent ? 1 : 0);
      totalCompletionRate += (sentNotifications / totalNotifications) * 100;
    });

    return {
      totalCompetitions: competitions.length,
      totalParticipants,
      totalWinners,
      averageParticipants: Math.round(totalParticipants / competitions.length),
      averageWinners: Math.round(totalWinners / competitions.length),
      averageDuration: Math.round(totalDuration / competitions.length),
      averageCompletionRate: Math.round(
        totalCompletionRate / competitions.length,
      ),
    };
  }

  /**
   * Calculate trends over time
   */
  private calculateTrends(competitions: any[]): CompetitionAnalytics["trends"] {
    const monthly = new Map<string, any>();
    const quarterly = new Map<string, any>();
    const yearly = new Map<string, any>();

    competitions.forEach((competition) => {
      const endDate = new Date(competition.endDate);
      const monthKey = endDate.toISOString().substring(0, 7); // YYYY-MM
      const quarterKey = `${endDate.getFullYear()}-Q${Math.floor(endDate.getMonth() / 3) + 1}`;
      const yearKey = endDate.getFullYear().toString();

      const participantCount = competition.enrolledSubscribers?.length || 0;
      const winnerCount = competition.finalRankings?.length || 0;

      // Monthly trends
      if (!monthly.has(monthKey)) {
        monthly.set(monthKey, { competitions: 0, participants: 0, winners: 0 });
      }
      const monthData = monthly.get(monthKey);
      monthData.competitions++;
      monthData.participants += participantCount;
      monthData.winners += winnerCount;

      // Quarterly trends
      if (!quarterly.has(quarterKey)) {
        quarterly.set(quarterKey, {
          competitions: 0,
          participants: 0,
          winners: 0,
        });
      }
      const quarterData = quarterly.get(quarterKey);
      quarterData.competitions++;
      quarterData.participants += participantCount;
      quarterData.winners += winnerCount;

      // Yearly trends
      if (!yearly.has(yearKey)) {
        yearly.set(yearKey, { competitions: 0, participants: 0, winners: 0 });
      }
      const yearData = yearly.get(yearKey);
      yearData.competitions++;
      yearData.participants += participantCount;
      yearData.winners += winnerCount;
    });

    // Convert to arrays and calculate averages
    const monthlyArray = Array.from(monthly.entries())
      .map(([month, data]) => ({
        month,
        ...data,
        averageParticipants: Math.round(data.participants / data.competitions),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const quarterlyArray = Array.from(quarterly.entries())
      .map(([quarter, data]) => ({
        quarter,
        ...data,
        averageParticipants: Math.round(data.participants / data.competitions),
      }))
      .sort((a, b) => a.quarter.localeCompare(b.quarter));

    const yearlyArray = Array.from(yearly.entries())
      .map(([year, data]) => ({
        year,
        ...data,
        averageParticipants: Math.round(data.participants / data.competitions),
      }))
      .sort((a, b) => a.year.localeCompare(b.year));

    return {
      monthly: monthlyArray,
      quarterly: quarterlyArray,
      yearly: yearlyArray,
    };
  }

  /**
   * Calculate performance analytics by type, dashboard, and staff
   */
  private async calculatePerformanceAnalytics(
    competitions: any[],
    subscribers: any[],
    filters: AnalyticsFilters,
  ): Promise<CompetitionAnalytics["performance"]> {
    // Calculate by type
    const byType = {
      bottleConversion: this.calculateTypeAnalytics(
        competitions.filter((c) => c.type === "bottleConversion"),
      ),
      clubConversion: this.calculateTypeAnalytics(
        competitions.filter((c) => c.type === "clubConversion"),
      ),
      aov: this.calculateTypeAnalytics(
        competitions.filter((c) => c.type === "aov"),
      ),
    };

    // Calculate by dashboard
    const byDashboard = {
      mtd: this.calculateDashboardAnalytics(
        competitions.filter((c) => c.dashboard === "mtd"),
      ),
      qtd: this.calculateDashboardAnalytics(
        competitions.filter((c) => c.dashboard === "qtd"),
      ),
      ytd: this.calculateDashboardAnalytics(
        competitions.filter((c) => c.dashboard === "ytd"),
      ),
    };

    // Calculate by staff
    const byStaff = await this.calculateStaffAnalytics(
      competitions,
      subscribers,
      filters,
    );

    return {
      byType,
      byDashboard,
      byStaff,
    };
  }

  /**
   * Calculate analytics for a specific competition type
   */
  private calculateTypeAnalytics(
    competitions: any[],
  ): CompetitionTypeAnalytics {
    if (competitions.length === 0) {
      return {
        count: 0,
        totalParticipants: 0,
        totalWinners: 0,
        averageParticipants: 0,
        averageWinners: 0,
        averageDuration: 0,
        averageCompletionRate: 0,
        participationRate: 0,
        winnerDistribution: { firstPlace: 0, secondPlace: 0, thirdPlace: 0 },
        performanceTrend: "stable",
        effectivenessScore: 0,
      };
    }

    let totalParticipants = 0;
    let totalWinners = 0;
    let totalDuration = 0;
    let totalCompletionRate = 0;
    let firstPlaceWins = 0;
    let secondPlaceWins = 0;
    let thirdPlaceWins = 0;

    competitions.forEach((competition) => {
      const participantCount = competition.enrolledSubscribers?.length || 0;
      const winnerCount = competition.finalRankings?.length || 0;
      const duration = Math.ceil(
        (new Date(competition.endDate).getTime() -
          new Date(competition.startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      totalParticipants += participantCount;
      totalWinners += winnerCount;
      totalDuration += duration;

      // Calculate completion rate
      const totalNotifications =
        1 + (competition.progressNotifications?.length || 0) + 1;
      const sentNotifications =
        (competition.welcomeMessage?.sent ? 1 : 0) +
        (competition.progressNotifications?.filter((n: any) => n.sent).length ||
          0) +
        (competition.winnerAnnouncement?.sent ? 1 : 0);
      totalCompletionRate += (sentNotifications / totalNotifications) * 100;

      // Track winner distribution
      if (competition.finalRankings?.length > 0) {
        const firstPlace = competition.finalRankings.find(
          (r: any) => r.rank === 1,
        );
        const secondPlace = competition.finalRankings.find(
          (r: any) => r.rank === 2,
        );
        const thirdPlace = competition.finalRankings.find(
          (r: any) => r.rank === 3,
        );

        if (firstPlace) firstPlaceWins++;
        if (secondPlace) secondPlaceWins++;
        if (thirdPlace) thirdPlaceWins++;
      }
    });

    const averageParticipants = Math.round(
      totalParticipants / competitions.length,
    );
    const averageWinners = Math.round(totalWinners / competitions.length);
    const averageDuration = Math.round(totalDuration / competitions.length);
    const averageCompletionRate = Math.round(
      totalCompletionRate / competitions.length,
    );
    const participationRate = Math.round(
      (totalParticipants / (competitions.length * 10)) * 100,
    ); // Assuming max 10 participants per competition

    // Calculate effectiveness score (0-100)
    const effectivenessScore = Math.round(
      averageParticipants * 0.3 +
        averageWinners * 0.3 +
        averageCompletionRate * 0.2 +
        participationRate * 0.2,
    );

    return {
      count: competitions.length,
      totalParticipants,
      totalWinners,
      averageParticipants,
      averageWinners,
      averageDuration,
      averageCompletionRate,
      participationRate,
      winnerDistribution: {
        firstPlace: firstPlaceWins,
        secondPlace: secondPlaceWins,
        thirdPlace: thirdPlaceWins,
      },
      performanceTrend: this.calculateTrend(competitions),
      effectivenessScore: Math.min(100, Math.max(0, effectivenessScore)),
    };
  }

  /**
   * Calculate analytics for a specific dashboard
   */
  private calculateDashboardAnalytics(competitions: any[]): DashboardAnalytics {
    if (competitions.length === 0) {
      return {
        count: 0,
        totalParticipants: 0,
        totalWinners: 0,
        averageParticipants: 0,
        averageWinners: 0,
        averageDuration: 0,
        averageCompletionRate: 0,
        participationRate: 0,
        mostPopularType: "",
        performanceTrend: "stable",
        effectivenessScore: 0,
      };
    }

    let totalParticipants = 0;
    let totalWinners = 0;
    let totalDuration = 0;
    let totalCompletionRate = 0;
    const typeCounts: { [key: string]: number } = {};

    competitions.forEach((competition) => {
      const participantCount = competition.enrolledSubscribers?.length || 0;
      const winnerCount = competition.finalRankings?.length || 0;
      const duration = Math.ceil(
        (new Date(competition.endDate).getTime() -
          new Date(competition.startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      totalParticipants += participantCount;
      totalWinners += winnerCount;
      totalDuration += duration;

      // Track type counts
      typeCounts[competition.type] = (typeCounts[competition.type] || 0) + 1;

      // Calculate completion rate
      const totalNotifications =
        1 + (competition.progressNotifications?.length || 0) + 1;
      const sentNotifications =
        (competition.welcomeMessage?.sent ? 1 : 0) +
        (competition.progressNotifications?.filter((n: any) => n.sent).length ||
          0) +
        (competition.winnerAnnouncement?.sent ? 1 : 0);
      totalCompletionRate += (sentNotifications / totalNotifications) * 100;
    });

    const averageParticipants = Math.round(
      totalParticipants / competitions.length,
    );
    const averageWinners = Math.round(totalWinners / competitions.length);
    const averageDuration = Math.round(totalDuration / competitions.length);
    const averageCompletionRate = Math.round(
      totalCompletionRate / competitions.length,
    );
    const participationRate = Math.round(
      (totalParticipants / (competitions.length * 10)) * 100,
    );

    // Find most popular type
    const mostPopularType =
      Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "";

    // Calculate effectiveness score
    const effectivenessScore = Math.round(
      averageParticipants * 0.3 +
        averageWinners * 0.3 +
        averageCompletionRate * 0.2 +
        participationRate * 0.2,
    );

    return {
      count: competitions.length,
      totalParticipants,
      totalWinners,
      averageParticipants,
      averageWinners,
      averageDuration,
      averageCompletionRate,
      participationRate,
      mostPopularType,
      performanceTrend: this.calculateTrend(competitions),
      effectivenessScore: Math.min(100, Math.max(0, effectivenessScore)),
    };
  }

  /**
   * Calculate staff performance analytics
   */
  private async calculateStaffAnalytics(
    competitions: any[],
    subscribers: any[],
    filters: AnalyticsFilters,
  ): Promise<StaffPerformanceAnalytics[]> {
    const staffMap = new Map<string, StaffPerformanceAnalytics>();

    // Initialize staff data
    subscribers.forEach((subscriber) => {
      if (filters.staffMember && subscriber.name !== filters.staffMember)
        return;

      staffMap.set(subscriber.name, {
        staffName: subscriber.name,
        totalCompetitions: 0,
        totalParticipations: 0,
        totalWins: 0,
        averageRank: 0,
        bestRank: Infinity,
        winRate: 0,
        participationRate: 0,
        performanceTrend: "stable",
        favoriteType: "",
        favoriteDashboard: "",
        effectivenessScore: 0,
        recentPerformance: [],
      });
    });

    // Process competitions
    competitions.forEach((competition) => {


      competition.finalRankings?.forEach((ranking: any) => {
        const staff = staffMap.get(ranking.name);
        if (!staff) return;

        staff.totalParticipations++;

        if (ranking.rank === 1) staff.totalWins++;

        // Update average rank
        const currentTotal =
          staff.averageRank * (staff.totalParticipations - 1) + ranking.rank;
        staff.averageRank = currentTotal / staff.totalParticipations;

        // Update best rank
        if (ranking.rank < staff.bestRank) staff.bestRank = ranking.rank;

        // Add to recent performance
        staff.recentPerformance.push({
          competitionName: competition.name,
          rank: ranking.rank,
          value: ranking.value,
          date: competition.endDate,
        });
      });

      // Count total competitions for participation rate
      staffMap.forEach((staff) => {
        staff.totalCompetitions++;
      });
    });

    // Calculate derived metrics
    staffMap.forEach((staff) => {
      staff.winRate =
        staff.totalParticipations > 0
          ? Math.round((staff.totalWins / staff.totalParticipations) * 100)
          : 0;
      staff.participationRate =
        staff.totalCompetitions > 0
          ? Math.round(
              (staff.totalParticipations / staff.totalCompetitions) * 100,
            )
          : 0;
      staff.averageRank = Math.round(staff.averageRank * 10) / 10;
      staff.bestRank = staff.bestRank === Infinity ? 0 : staff.bestRank;
      staff.performanceTrend = this.calculateStaffTrend(
        staff.recentPerformance,
      );

      // Determine favorite type and dashboard
      const typeCounts: { [key: string]: number } = {};
      const dashboardCounts: { [key: string]: number } = {};

      staff.recentPerformance.forEach((perf) => {
        const competition = competitions.find(
          (c) => c.name === perf.competitionName,
        );
        if (competition) {
          typeCounts[competition.type] =
            (typeCounts[competition.type] || 0) + 1;
          dashboardCounts[competition.dashboard] =
            (dashboardCounts[competition.dashboard] || 0) + 1;
        }
      });

      staff.favoriteType =
        Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "";
      staff.favoriteDashboard =
        Object.entries(dashboardCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        "";

      // Calculate effectiveness score
      staff.effectivenessScore = Math.round(
        staff.winRate * 0.4 +
          (100 - staff.averageRank * 10) * 0.3 +
          staff.participationRate * 0.3,
      );
      staff.effectivenessScore = Math.min(
        100,
        Math.max(0, staff.effectivenessScore),
      );

      // Sort recent performance by date
      staff.recentPerformance.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      staff.recentPerformance = staff.recentPerformance.slice(0, 5); // Keep last 5
    });

    return Array.from(staffMap.values())
      .filter((staff) => staff.totalParticipations > 0)
      .sort((a, b) => b.effectivenessScore - a.effectivenessScore);
  }

  /**
   * Calculate effectiveness metrics
   */
  private calculateEffectivenessMetrics(
    competitions: any[],
  ): CompetitionAnalytics["effectiveness"] {
    if (competitions.length === 0) {
      return {
        participationRates: { overall: 0, byType: {}, byDashboard: {} },
        completionRates: {
          welcomeMessage: 0,
          progressNotifications: 0,
          winnerAnnouncement: 0,
          overall: 0,
        },
        engagementMetrics: {
          averageRank: 0,
          rankDistribution: {},
          winnerRepeatRate: 0,
          participationGrowth: 0,
        },
      };
    }

    // Calculate participation rates
    const totalPossibleParticipants = competitions.length * 10; // Assuming max 10 per competition
    const totalActualParticipants = competitions.reduce(
      (sum, c) => sum + (c.enrolledSubscribers?.length || 0),
      0,
    );
    const overallParticipationRate = Math.round(
      (totalActualParticipants / totalPossibleParticipants) * 100,
    );

    const participationByType: { [key: string]: number } = {};
    const participationByDashboard: { [key: string]: number } = {};

    ["bottleConversion", "clubConversion", "aov"].forEach((type) => {
      const typeCompetitions = competitions.filter((c) => c.type === type);
      const typeParticipants = typeCompetitions.reduce(
        (sum, c) => sum + (c.enrolledSubscribers?.length || 0),
        0,
      );
      const typePossible = typeCompetitions.length * 10;
      participationByType[type] =
        typePossible > 0
          ? Math.round((typeParticipants / typePossible) * 100)
          : 0;
    });

    ["mtd", "qtd", "ytd"].forEach((dashboard) => {
      const dashboardCompetitions = competitions.filter(
        (c) => c.dashboard === dashboard,
      );
      const dashboardParticipants = dashboardCompetitions.reduce(
        (sum, c) => sum + (c.enrolledSubscribers?.length || 0),
        0,
      );
      const dashboardPossible = dashboardCompetitions.length * 10;
      participationByDashboard[dashboard] =
        dashboardPossible > 0
          ? Math.round((dashboardParticipants / dashboardPossible) * 100)
          : 0;
    });

    // Calculate completion rates
    let welcomeMessagesSent = 0;
    let progressNotificationsSent = 0;
    let winnerAnnouncementsSent = 0;
    let totalProgressNotifications = 0;

    competitions.forEach((competition) => {
      if (competition.welcomeMessage?.sent) welcomeMessagesSent++;
      if (competition.winnerAnnouncement?.sent) winnerAnnouncementsSent++;

      const sentProgress =
        competition.progressNotifications?.filter((n: any) => n.sent).length ||
        0;
      const totalProgress = competition.progressNotifications?.length || 0;
      progressNotificationsSent += sentProgress;
      totalProgressNotifications += totalProgress;
    });

    const completionRates = {
      welcomeMessage: Math.round(
        (welcomeMessagesSent / competitions.length) * 100,
      ),
      progressNotifications:
        totalProgressNotifications > 0
          ? Math.round(
              (progressNotificationsSent / totalProgressNotifications) * 100,
            )
          : 0,
      winnerAnnouncement: Math.round(
        (winnerAnnouncementsSent / competitions.length) * 100,
      ),
      overall: Math.round(
        ((welcomeMessagesSent +
          progressNotificationsSent +
          winnerAnnouncementsSent) /
          (competitions.length +
            totalProgressNotifications +
            competitions.length)) *
          100,
      ),
    };

    // Calculate engagement metrics
    const allRanks: number[] = [];
    const rankDistribution: { [key: string]: number } = {};
    const winnerNames = new Set<string>();

    competitions.forEach((competition) => {
      competition.finalRankings?.forEach((ranking: any) => {
        allRanks.push(ranking.rank);
        const rankKey = ranking.rank.toString();
        rankDistribution[rankKey] = (rankDistribution[rankKey] || 0) + 1;

        if (ranking.rank === 1) {
          winnerNames.add(ranking.name);
        }
      });
    });

    const averageRank =
      allRanks.length > 0
        ? Math.round(
            (allRanks.reduce((sum, rank) => sum + rank, 0) / allRanks.length) *
              10,
          ) / 10
        : 0;

    // Calculate winner repeat rate (simplified)
    const winnerRepeatRate = Math.round(
      (winnerNames.size / Math.max(1, allRanks.length)) * 100,
    );

    // Calculate participation growth (simplified)
    const participationGrowth = 0; // Would need historical data for accurate calculation

    return {
      participationRates: {
        overall: overallParticipationRate,
        byType: participationByType,
        byDashboard: participationByDashboard,
      },
      completionRates,
      engagementMetrics: {
        averageRank,
        rankDistribution,
        winnerRepeatRate,
        participationGrowth,
      },
    };
  }

  /**
   * Generate insights from analytics data
   */
  private generateInsights(
    overview: CompetitionAnalytics["overview"],
    trends: CompetitionAnalytics["trends"],
    performance: CompetitionAnalytics["performance"],
    effectiveness: CompetitionAnalytics["effectiveness"],
  ): CompetitionAnalytics["insights"] {
    const insights: AnalyticsInsight[] = [];
    const topPerformers: StaffInsight[] = [];
    const mostEffectiveCompetitions: CompetitionInsight[] = [];

    // Generate trend insights
    if (trends.monthly.length >= 2) {
      const recent = trends.monthly[trends.monthly.length - 1];
      const previous = trends.monthly[trends.monthly.length - 2];

      if (recent.competitions > previous.competitions) {
        insights.push({
          type: "trend",
          title: "Increasing Competition Activity",
          description: `Competition count increased from ${previous.competitions} to ${recent.competitions} in the last month`,
          impact: "medium",
          recommendation:
            "Consider maintaining this momentum with regular competition scheduling",
        });
      }
    }

    // Generate effectiveness insights
    if (effectiveness.completionRates.overall < 80) {
      insights.push({
        type: "warning",
        title: "Low SMS Completion Rate",
        description: `Overall SMS completion rate is ${effectiveness.completionRates.overall}%`,
        impact: "high",
        recommendation:
          "Review SMS scheduling and ensure proper follow-up procedures",
      });
    }

    if (effectiveness.participationRates.overall < 70) {
      insights.push({
        type: "opportunity",
        title: "Low Participation Rate",
        description: `Overall participation rate is ${effectiveness.participationRates.overall}%`,
        impact: "medium",
        recommendation:
          "Consider incentives and better communication to increase participation",
      });
    }

    // Generate performance insights
    Object.entries(performance.byType).forEach(([type, analytics]) => {
      if (analytics.effectivenessScore < 60) {
        insights.push({
          type: "warning",
          title: `Low ${type} Competition Effectiveness`,
          description: `${type} competitions have an effectiveness score of ${analytics.effectivenessScore}`,
          impact: "medium",
          recommendation: `Review ${type} competition structure and incentives`,
        });
      }
    });

    // Generate recommendations
    const recommendations = [
      "Monitor participation rates and adjust incentives accordingly",
      "Ensure timely SMS delivery for better engagement",
      "Consider competition type variety to maintain interest",
      "Track staff performance trends for targeted coaching",
    ];

    return {
      topPerformers,
      mostEffectiveCompetitions,
      trends: insights,
      recommendations,
    };
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(
    competitions: any[],
  ): "increasing" | "decreasing" | "stable" {
    if (competitions.length < 2) return "stable";

    const sorted = competitions.sort(
      (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
    );
    const recent = sorted.slice(-Math.ceil(sorted.length / 2));
    const older = sorted.slice(0, Math.ceil(sorted.length / 2));

    const recentAvg =
      recent.reduce((sum, c) => sum + (c.enrolledSubscribers?.length || 0), 0) /
      recent.length;
    const olderAvg =
      older.reduce((sum, c) => sum + (c.enrolledSubscribers?.length || 0), 0) /
      older.length;

    if (recentAvg > olderAvg * 1.1) return "increasing";
    if (recentAvg < olderAvg * 0.9) return "decreasing";
    return "stable";
  }

  /**
   * Calculate staff trend direction
   */
  private calculateStaffTrend(
    recentPerformance: any[],
  ): "increasing" | "decreasing" | "stable" {
    if (recentPerformance.length < 2) return "stable";

    const sorted = recentPerformance.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const recent = sorted.slice(-Math.ceil(sorted.length / 2));
    const older = sorted.slice(0, Math.ceil(sorted.length / 2));

    const recentAvg =
      recent.reduce((sum, p) => sum + p.rank, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.rank, 0) / older.length;

    if (recentAvg < olderAvg * 0.9) return "increasing"; // Lower rank is better
    if (recentAvg > olderAvg * 1.1) return "decreasing";
    return "stable";
  }
}

// Export singleton instance
export const competitionAnalyticsService = new CompetitionAnalyticsService();
