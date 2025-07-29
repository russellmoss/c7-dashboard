import { connectToDatabase } from "./mongodb.js";
import { CompetitionModel, EmailSubscriptionModel, KPIDataModel } from "./models.js";

export interface RankingEntry {
  subscriberId: string;
  name: string;
  metricValue: number;
  rank: number;
  tied: boolean;
}

export interface CompetitionRankingResult {
  competitionId: string;
  competitionName: string;
  competitionType: "bottleConversion" | "clubConversion" | "aov";
  dashboard: "mtd" | "qtd" | "ytd";
  rankings: RankingEntry[];
  calculatedAt: Date;
  totalParticipants: number;
}

// Simple in-memory cache with TTL
const rankingCache = new Map<
  string,
  { data: CompetitionRankingResult; expires: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Calculate rankings for a competition with proper tie handling
 */
export async function calculateCompetitionRankings(
  competitionId: string,
  forceRefresh: boolean = false,
): Promise<CompetitionRankingResult> {
  const cacheKey = `competition_${competitionId}`;

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = rankingCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      console.log(
        `[RANKING] Returning cached rankings for competition ${competitionId}`,
      );
      return cached.data;
    }
  }

  console.log(
    `[RANKING] Calculating fresh rankings for competition ${competitionId}`,
  );

  try {
    await connectToDatabase();

    // Get competition details
    const competition = await CompetitionModel.findById(competitionId).lean();
    if (!competition) {
      throw new Error(`Competition not found: ${competitionId}`);
    }

    // Get enrolled subscribers
    const enrolledSubscribers = await EmailSubscriptionModel.find({
      _id: { $in: competition.enrolledSubscribers },
    }).lean();

    if (enrolledSubscribers.length === 0) {
      console.log(
        `[RANKING] No enrolled subscribers found for competition ${competitionId}`,
      );
      return {
        competitionId,
        competitionName: competition.name,
        competitionType: competition.type,
        dashboard: competition.dashboard,
        rankings: [],
        calculatedAt: new Date(),
        totalParticipants: 0,
      };
    }

    // Get KPI data for the competition dashboard period
    const kpiData = await KPIDataModel.findOne({
      periodType: competition.dashboard,
      year: new Date().getFullYear(),
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!kpiData) {
      throw new Error(`No KPI data found for ${competition.dashboard} period`);
    }

    // Extract staff performance data
    const staffPerformance = kpiData.data.current.associatePerformance;
    if (!staffPerformance) {
      throw new Error(`No staff performance data found in KPI data`);
    }

    // Map subscriber names to their performance metrics
    const subscriberMetrics: Array<{
      subscriberId: string;
      name: string;
      metricValue: number;
    }> = [];

    for (const subscriber of enrolledSubscribers) {
      // Get the staff member name from SMS coaching mapping
      const staffMemberName = subscriber.smsCoaching?.staffMembers?.[0]?.name;
      const staffName = staffMemberName || subscriber.name; // Fallback to subscriber name if no mapping

      const performance = staffPerformance[staffName];

      if (!performance) {
        console.warn(
          `[RANKING] No performance data found for staff member: ${staffName} (subscriber: ${subscriber.name})`,
        );
        continue;
      }

      let metricValue: number;

      switch (competition.type) {
        case "bottleConversion":
          metricValue = performance.wineBottleConversionRate || 0;
          break;
        case "clubConversion":
          // Handle string values (like "N/A") for club conversion
          metricValue =
            typeof performance.clubConversionRate === "number"
              ? performance.clubConversionRate
              : 0;
          break;
        case "aov":
          metricValue = performance.aov || 0;
          break;
        default:
          throw new Error(`Unknown competition type: ${competition.type}`);
      }

      subscriberMetrics.push({
        subscriberId: subscriber._id.toString(),
        name: subscriber.name, // Keep subscriber name for display
        metricValue,
      });
    }

    // Sort by metric value (descending for all types)
    subscriberMetrics.sort((a, b) => b.metricValue - a.metricValue);

    // Calculate rankings with tie handling
    const rankings: RankingEntry[] = [];
    let currentRank = 1;
    let currentValue: number | null = null;
    let tiedCount = 0;

    for (let i = 0; i < subscriberMetrics.length; i++) {
      const entry = subscriberMetrics[i];

      if (currentValue === null || entry.metricValue !== currentValue) {
        // New rank (accounting for ties)
        currentRank = i + 1;
        currentValue = entry.metricValue;
        tiedCount = 1;
      } else {
        // Same value as previous - tied
        tiedCount++;
      }

      rankings.push({
        subscriberId: entry.subscriberId,
        name: entry.name,
        metricValue: entry.metricValue,
        rank: currentRank,
        tied: tiedCount > 1,
      });
    }

    const result: CompetitionRankingResult = {
      competitionId,
      competitionName: competition.name,
      competitionType: competition.type,
      dashboard: competition.dashboard,
      rankings,
      calculatedAt: new Date(),
      totalParticipants: rankings.length,
    };

    // Cache the result
    rankingCache.set(cacheKey, {
      data: result,
      expires: Date.now() + CACHE_TTL,
    });

    console.log(
      `[RANKING] Calculated rankings for ${rankings.length} participants in competition ${competitionId}`,
    );
    return result;
  } catch (error) {
    console.error(
      `[RANKING] Error calculating rankings for competition ${competitionId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Get rankings for a competition (with caching)
 */
export async function getCompetitionRankings(
  competitionId: string,
  forceRefresh: boolean = false,
): Promise<CompetitionRankingResult> {
  return calculateCompetitionRankings(competitionId, forceRefresh);
}

/**
 * Clear cache for a specific competition
 */
export function clearCompetitionCache(competitionId: string): void {
  const cacheKey = `competition_${competitionId}`;
  rankingCache.delete(cacheKey);
  console.log(`[RANKING] Cleared cache for competition ${competitionId}`);
}

/**
 * Clear all ranking caches
 */
export function clearAllRankingCaches(): void {
  rankingCache.clear();
  console.log(`[RANKING] Cleared all ranking caches`);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{ key: string; expires: number }>;
} {
  const entries = Array.from(rankingCache.entries()).map(([key, value]) => ({
    key,
    expires: value.expires,
  }));

  return {
    size: rankingCache.size,
    entries,
  };
}
