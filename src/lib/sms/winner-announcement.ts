import { getSmsService } from "./client";
import { connectToDatabase } from "../mongodb";
import { CompetitionModel, EmailSubscriptionModel } from "../models";
import { getCompetitionRankings, RankingEntry } from "../competition-ranking";

export interface WinnerAnnouncementResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
  messageId?: string;
  winners?: {
    first: RankingEntry | null;
    second: RankingEntry | null;
    third: RankingEntry | null;
  };
}

export interface WinnerAnnouncementData {
  competitionId: string;
  competitionName: string;
  competitionType: string;
  dashboard: string;
  startDate: Date;
  endDate: Date;
  prizes: {
    first: string;
    second: string;
    third: string;
  };
  customMessage: string;
  finalRankings: RankingEntry[];
  winners: {
    first: RankingEntry | null;
    second: RankingEntry | null;
    third: RankingEntry | null;
  };
  enrolledSubscribers: Array<{
    _id: string;
    name: string;
    email: string;
    smsCoaching: {
      isActive: boolean;
      phoneNumber: string;
    };
    personalizedGoals?: any;
  }>;
}

export class WinnerAnnouncementService {
  private smsService = getSmsService();

  /**
   * Send winner announcement SMS to all enrolled subscribers for a completed competition
   */
  async sendWinnerAnnouncement(
    competitionId: string,
    customMessage?: string,
  ): Promise<WinnerAnnouncementResult> {
    try {
      console.log(
        `[WinnerAnnouncementService] Starting winner announcement for competition: ${competitionId}`,
      );

      await connectToDatabase();

      // Get competition details
      const competition = await CompetitionModel.findById(competitionId).lean();
      if (!competition) {
        throw new Error("Competition not found");
      }

      // Check if competition is completed
      if (competition.status !== "completed") {
        throw new Error(
          "Can only send winner announcements for completed competitions",
        );
      }

      // Check if winner announcement has already been sent
      if (competition.winnerAnnouncement.sent) {
        throw new Error(
          "Winner announcement has already been sent for this competition",
        );
      }

      // Get final rankings
      const rankings = await getCompetitionRankings(competitionId, true); // Force refresh
      if (rankings.rankings.length === 0) {
        throw new Error("No final rankings available for this competition");
      }

      // Determine winners
      const winners = this.determineWinners(rankings.rankings);

      // Get enrolled subscribers with valid phone numbers
      const subscribers = await EmailSubscriptionModel.find({
        _id: { $in: competition.enrolledSubscribers },
        "smsCoaching.isActive": true,
        "smsCoaching.phoneNumber": { $exists: true, $ne: "" },
      }).lean();

      if (subscribers.length === 0) {
        throw new Error("No subscribers with valid phone numbers found");
      }

      console.log(
        `[WinnerAnnouncementService] Found ${subscribers.length} subscribers with valid phone numbers`,
      );

      // Prepare SMS data
      const smsData: WinnerAnnouncementData = {
        competitionId: competition._id.toString(),
        competitionName: competition.name,
        competitionType: competition.type,
        dashboard: competition.dashboard,
        startDate: competition.startDate,
        endDate: competition.endDate,
        prizes: competition.prizes,
        customMessage: customMessage || "",
        finalRankings: rankings.rankings,
        winners,
        enrolledSubscribers: subscribers.map((sub: any) => ({
          _id: sub._id.toString(),
          name: sub.name,
          email: sub.email,
          smsCoaching: {
            isActive: sub.smsCoaching?.isActive || false,
            phoneNumber: sub.smsCoaching?.phoneNumber || "",
          },
          personalizedGoals: sub.personalizedGoals,
        })),
      };

      // Send SMS to each subscriber
      const results = await this.sendToSubscribers(smsData);

      // Mark winner announcement as sent if any SMS were sent successfully
      if (results.sentCount > 0) {
        await this.markWinnerAnnouncementSent(competitionId, winners);
        console.log(
          `[WinnerAnnouncementService] ✅ Winner announcement sent to ${results.sentCount} subscribers`,
        );
      }

      return {
        ...results,
        winners,
      };
    } catch (error: any) {
      console.error(
        "[WinnerAnnouncementService] Error sending winner announcement:",
        error,
      );
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Determine winners from final rankings
   */
  private determineWinners(rankings: RankingEntry[]): {
    first: RankingEntry | null;
    second: RankingEntry | null;
    third: RankingEntry | null;
  } {
    const sortedRankings = [...rankings].sort((a, b) => a.rank - b.rank);

    return {
      first: sortedRankings.find((r) => r.rank === 1) || null,
      second: sortedRankings.find((r) => r.rank === 2) || null,
      third: sortedRankings.find((r) => r.rank === 3) || null,
    };
  }

  /**
   * Send winner announcement SMS to individual subscribers
   */
  private async sendToSubscribers(
    smsData: WinnerAnnouncementData,
  ): Promise<WinnerAnnouncementResult> {
    const results: WinnerAnnouncementResult = {
      success: true,
      sentCount: 0,
      failedCount: 0,
      errors: [],
    };

    for (const subscriber of smsData.enrolledSubscribers) {
      try {
        const message = await this.generateWinnerAnnouncementMessage(
          smsData,
          subscriber,
        );
        const success = await this.smsService.sendSms(
          subscriber.smsCoaching.phoneNumber,
          message,
        );

        if (success) {
          results.sentCount++;
          console.log(
            `[WinnerAnnouncementService] ✅ Winner announcement sent to ${subscriber.name} (${subscriber.smsCoaching.phoneNumber})`,
          );
        } else {
          results.failedCount++;
          results.errors.push(
            `Failed to send winner announcement to ${subscriber.name}`,
          );
          console.error(
            `[WinnerAnnouncementService] ❌ Failed to send winner announcement to ${subscriber.name}`,
          );
        }
      } catch (error: any) {
        results.failedCount++;
        results.errors.push(
          `Error sending winner announcement to ${subscriber.name}: ${error.message}`,
        );
        console.error(
          `[WinnerAnnouncementService] ❌ Error sending winner announcement to ${subscriber.name}:`,
          error,
        );
      }
    }

    return results;
  }

  /**
   * Generate personalized winner announcement message using Claude AI
   */
  private async generateWinnerAnnouncementMessage(
    smsData: WinnerAnnouncementData,
    subscriber: any,
  ): Promise<string> {
    try {
      // Find subscriber's final ranking
      const subscriberRanking = smsData.finalRankings.find(
        (r) => r.name === subscriber.name,
      );

      if (!subscriberRanking) {
        // Fallback message if no ranking found
        return this.generateFallbackWinnerMessage(smsData, subscriber);
      }

      // Check if subscriber is a winner
      const isWinner = this.isSubscriberWinner(
        smsData.winners,
        subscriber.name,
      );
      const winnerPosition = this.getWinnerPosition(
        smsData.winners,
        subscriber.name,
      );

      // Generate Claude prompt
      const prompt = this.buildWinnerAnnouncementPrompt(
        smsData,
        subscriber,
        subscriberRanking,
        isWinner,
        winnerPosition,
      );

      // Call Claude API
      const claudeResponse = await this.callClaude(prompt);

      // Format the final message
      return this.formatWinnerAnnouncementMessage(
        smsData,
        subscriber,
        subscriberRanking,
        claudeResponse,
        isWinner,
        winnerPosition,
      );
    } catch (error: any) {
      console.error(
        `[WinnerAnnouncementService] Error generating winner announcement for ${subscriber.name}:`,
        error,
      );
      // Fallback to simple message
      return this.generateFallbackWinnerMessage(smsData, subscriber);
    }
  }

  /**
   * Check if subscriber is a winner
   */
  private isSubscriberWinner(winners: any, subscriberName: string): boolean {
    return (
      winners.first?.name === subscriberName ||
      winners.second?.name === subscriberName ||
      winners.third?.name === subscriberName
    );
  }

  /**
   * Get winner position (1st, 2nd, 3rd)
   */
  private getWinnerPosition(
    winners: any,
    subscriberName: string,
  ): string | null {
    if (winners.first?.name === subscriberName) return "1st";
    if (winners.second?.name === subscriberName) return "2nd";
    if (winners.third?.name === subscriberName) return "3rd";
    return null;
  }

  /**
   * Build Claude prompt for winner announcement message generation
   */
  private buildWinnerAnnouncementPrompt(
    smsData: WinnerAnnouncementData,
    subscriber: any,
    ranking: RankingEntry,
    isWinner: boolean,
    winnerPosition: string | null,
  ): string {
    const firstName = subscriber.name.split(" ")[0];
    const totalParticipants = smsData.finalRankings.length;
    const competitionDuration = Math.ceil(
      (new Date(smsData.endDate).getTime() -
        new Date(smsData.startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // Build winner context
    let winnerContext = "";
    if (isWinner && winnerPosition) {
      winnerContext = `
🎉 CONGRATULATIONS! You are the ${winnerPosition} place winner!
🏆 Prize: ${this.getPrizeForPosition(smsData.prizes, winnerPosition)}
`;
    } else {
      winnerContext = `
📊 Final Result: You finished in ${ranking.rank}${ranking.tied ? " (tied)" : ""} place out of ${totalParticipants} participants.
`;
    }

    // Build winners list
    let winnersList = "";
    if (smsData.winners.first) {
      winnersList += `🥇 1st: ${smsData.winners.first.name} - ${smsData.prizes.first}\n`;
    }
    if (smsData.winners.second) {
      winnersList += `🥈 2nd: ${smsData.winners.second.name} - ${smsData.prizes.second}\n`;
    }
    if (smsData.winners.third) {
      winnersList += `🥉 3rd: ${smsData.winners.third.name} - ${smsData.prizes.third}\n`;
    }

    const prompt = `You are a celebration coach for a completed wine sales competition. Generate a personalized winner announcement SMS message.

Competition Context:
- Competition: ${smsData.competitionName}
- Type: ${this.getTypeLabel(smsData.competitionType)}
- Period: ${this.getDashboardLabel(smsData.dashboard)}
- Duration: ${competitionDuration} days
- Total Participants: ${totalParticipants}

Subscriber Context:
- Name: ${subscriber.name} (${firstName})
- Final Rank: ${ranking.rank}${ranking.tied ? " (tied)" : ""} out of ${totalParticipants}
- Final Metric Value: ${ranking.metricValue}${this.getMetricUnit(smsData.competitionType)}
- Is Winner: ${isWinner ? "Yes" : "No"}
${winnerPosition ? `- Winner Position: ${winnerPosition}` : ""}

${winnerContext}

Final Winners:
${winnersList}

${smsData.customMessage ? `Custom Message: ${smsData.customMessage}\n` : ""}

Requirements:
1. Keep the message under 160 characters for SMS
2. Be celebratory and congratulatory for winners
3. Be encouraging and appreciative for non-winners
4. Include their final rank and total participants
5. Mention the competition completion
6. Use emojis sparingly but effectively
7. Make it personal and engaging
8. For winners: emphasize their achievement and prize
9. For non-winners: thank them for participation and encourage future competitions
10. AOV should be displayed as dollars (e.g., $113.44), NOT as a percentage

Generate a concise, celebratory winner announcement message:`;

    return prompt;
  }

  /**
   * Get prize for specific position
   */
  private getPrizeForPosition(prizes: any, position: string): string {
    switch (position) {
      case "1st":
        return prizes.first;
      case "2nd":
        return prizes.second;
      case "3rd":
        return prizes.third;
      default:
        return "";
    }
  }

  /**
   * Call Claude API for message generation
   */
  private async callClaude(prompt: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 300,
        temperature: 0.8,
        system:
          "You are a celebration coach for completed competitions. Generate concise, celebratory SMS messages for winner announcements. Keep messages under 160 characters and use emojis sparingly.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || "No response from Claude.";
  }

  /**
   * Format the final winner announcement message
   */
  private formatWinnerAnnouncementMessage(
    smsData: WinnerAnnouncementData,
    subscriber: any,
    ranking: RankingEntry,
    claudeResponse: string,
    isWinner: boolean,
    winnerPosition: string | null,
  ): string {
    const firstName = subscriber.name.split(" ")[0];

    // Start with a personalized header
    let message = `Hi ${firstName}! 🏆\n\n`;

    // Add Claude's response
    message += claudeResponse.trim();

    // Add footer
    message += `\n\nThank you for participating! 🍷✨`;

    return message;
  }

  /**
   * Generate fallback message if Claude fails
   */
  private generateFallbackWinnerMessage(
    smsData: WinnerAnnouncementData,
    subscriber: any,
  ): string {
    const firstName = subscriber.name.split(" ")[0];
    const isWinner = this.isSubscriberWinner(smsData.winners, subscriber.name);
    const winnerPosition = this.getWinnerPosition(
      smsData.winners,
      subscriber.name,
    );

    if (isWinner && winnerPosition) {
      return `Hi ${firstName}! 🏆\n\n🎉 CONGRATULATIONS! You won ${winnerPosition} place in ${smsData.competitionName}! 🏆\n\nThank you for participating! 🍷✨`;
    } else {
      return `Hi ${firstName}! 🏆\n\nThe ${smsData.competitionName} has ended! Thank you for your participation and great work! 🍷✨`;
    }
  }

  /**
   * Mark winner announcement as sent in the database
   */
  private async markWinnerAnnouncementSent(
    competitionId: string,
    winners: any,
  ): Promise<void> {
    try {
      const competition = await CompetitionModel.findById(competitionId);
      if (competition) {
        (competition as any).markWinnerAnnouncementSent();

        // Update final rankings if not already set
        if (
          !competition.finalRankings ||
          competition.finalRankings.length === 0
        ) {
          const rankings = await getCompetitionRankings(competitionId, false);
          competition.finalRankings = rankings.rankings.map((r: any) => ({
            subscriberId: r.subscriberId,
            rank: r.rank,
            value: r.metricValue,
            name: r.name,
          }));
        }

        await competition.save();
        console.log(
          `[WinnerAnnouncementService] ✅ Winner announcement marked as sent for competition: ${competitionId}`,
        );
      }
    } catch (error) {
      console.error(
        "[WinnerAnnouncementService] Error marking winner announcement as sent:",
        error,
      );
    }
  }

  /**
   * Validate competition and subscribers before sending
   */
  async validateWinnerAnnouncement(competitionId: string): Promise<{
    valid: boolean;
    competition?: any;
    rankings?: any;
    winners?: any;
    subscribers?: any[];
    errors: string[];
  }> {
    try {
      await connectToDatabase();

      const competition = await CompetitionModel.findById(competitionId).lean();
      if (!competition) {
        return { valid: false, errors: ["Competition not found"] };
      }

      if (competition.status !== "completed") {
        return {
          valid: false,
          errors: [
            "Can only send winner announcements for completed competitions",
          ],
        };
      }

      if (competition.winnerAnnouncement.sent) {
        return {
          valid: false,
          errors: ["Winner announcement has already been sent"],
        };
      }

      const rankings = await getCompetitionRankings(competitionId, false);
      if (rankings.rankings.length === 0) {
        return {
          valid: false,
          errors: ["No final rankings available for this competition"],
        };
      }

      const winners = this.determineWinners(rankings.rankings);

      const subscribers = await EmailSubscriptionModel.find({
        _id: { $in: competition.enrolledSubscribers },
        "smsCoaching.isActive": true,
        "smsCoaching.phoneNumber": { $exists: true, $ne: "" },
      }).lean();

      if (subscribers.length === 0) {
        return {
          valid: false,
          errors: ["No subscribers with valid phone numbers found"],
        };
      }

      return {
        valid: true,
        competition,
        rankings,
        winners,
        subscribers,
        errors: [],
      };
    } catch (error: any) {
      return { valid: false, errors: [error.message] };
    }
  }

  /**
   * Get preview of winner announcement message for a subscriber
   */
  async getWinnerAnnouncementPreview(
    competitionId: string,
    subscriberName: string,
  ): Promise<string> {
    try {
      const validation = await this.validateWinnerAnnouncement(competitionId);
      if (!validation.valid) {
        throw new Error(validation.errors[0]);
      }

      const subscriber = validation.subscribers?.find(
        (s) => s.name === subscriberName,
      );
      if (!subscriber) {
        throw new Error("Subscriber not found");
      }

      const ranking = validation.rankings?.rankings.find(
        (r: any) => r.name === subscriberName,
      );
      if (!ranking) {
        return this.generateFallbackWinnerMessage(
          {
            competitionId,
            competitionName: validation.competition.name,
            competitionType: validation.competition.type,
            dashboard: validation.competition.dashboard,
            startDate: validation.competition.startDate,
            endDate: validation.competition.endDate,
            prizes: validation.competition.prizes,
            customMessage: "",
            finalRankings: validation.rankings.rankings,
            winners: validation.winners,
            enrolledSubscribers: validation.subscribers || [],
          },
          subscriber,
        );
      }

      const isWinner = this.isSubscriberWinner(
        validation.winners,
        subscriberName,
      );
      const winnerPosition = this.getWinnerPosition(
        validation.winners,
        subscriberName,
      );

      const prompt = this.buildWinnerAnnouncementPrompt(
        {
          competitionId,
          competitionName: validation.competition.name,
          competitionType: validation.competition.type,
          dashboard: validation.competition.dashboard,
          startDate: validation.competition.startDate,
          endDate: validation.competition.endDate,
          prizes: validation.competition.prizes,
          customMessage: "",
          finalRankings: validation.rankings.rankings,
          winners: validation.winners,
          enrolledSubscribers: validation.subscribers || [],
        },
        subscriber,
        ranking,
        isWinner,
        winnerPosition,
      );

      const claudeResponse = await this.callClaude(prompt);
      return this.formatWinnerAnnouncementMessage(
        {
          competitionId,
          competitionName: validation.competition.name,
          competitionType: validation.competition.type,
          dashboard: validation.competition.dashboard,
          startDate: validation.competition.startDate,
          endDate: validation.competition.endDate,
          prizes: validation.competition.prizes,
          customMessage: "",
          finalRankings: validation.rankings.rankings,
          winners: validation.winners,
          enrolledSubscribers: validation.subscribers || [],
        },
        subscriber,
        ranking,
        claudeResponse,
        isWinner,
        winnerPosition,
      );
    } catch (error: any) {
      console.error(
        `[WinnerAnnouncementService] Error generating preview for ${subscriberName}:`,
        error,
      );
      return `Error generating preview: ${error.message}`;
    }
  }

  /**
   * Helper methods for formatting
   */
  private getTypeLabel(type: string): string {
    const labels = {
      bottleConversion: "🍷 Bottle Conversion",
      clubConversion: "👥 Club Conversion",
      aov: "💰 Average Order Value",
    };
    return labels[type as keyof typeof labels] || type;
  }

  private getDashboardLabel(dashboard: string): string {
    const labels = {
      mtd: "Month-to-Date",
      qtd: "Quarter-to-Date",
      ytd: "Year-to-Date",
    };
    return labels[dashboard as keyof typeof labels] || dashboard;
  }

  private getMetricUnit(type: string): string {
    const units = {
      bottleConversion: "%",
      clubConversion: "%",
      aov: "",
    };
    return units[type as keyof typeof units] || "";
  }
}

// Export singleton instance
export const winnerAnnouncementService = new WinnerAnnouncementService();
