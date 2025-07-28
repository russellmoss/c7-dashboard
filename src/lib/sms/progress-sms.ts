import { getSmsService } from './client';
import { connectToDatabase } from '../mongodb';
import { CompetitionModel, EmailSubscriptionModel, CoachingSMSHistoryModel } from '../models';
import { getCompetitionRankings, RankingEntry } from '../competition-ranking';

export interface ProgressSmsResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
  messageId?: string;
}

export interface ProgressSmsData {
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
  currentRankings: RankingEntry[];
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

export class ProgressSmsService {
  private smsService = getSmsService();

  /**
   * Send progress SMS to all enrolled subscribers for a competition
   */
  async sendProgressSms(competitionId: string, customMessage?: string): Promise<ProgressSmsResult> {
    try {
      console.log(`[ProgressSmsService] Starting progress SMS for competition: ${competitionId}`);
      
      await connectToDatabase();

      // Get competition details
      const competition = await CompetitionModel.findById(competitionId).lean();
      if (!competition) {
        throw new Error('Competition not found');
      }

      // Check if competition is active
      if (competition.status !== 'active') {
        throw new Error('Can only send progress SMS for active competitions');
      }

      // Get current rankings
      const rankings = await getCompetitionRankings(competitionId, true); // Force refresh
      if (rankings.rankings.length === 0) {
        throw new Error('No rankings available for this competition');
      }

      // Get enrolled subscribers with valid phone numbers
      const subscribers = await EmailSubscriptionModel.find({
        _id: { $in: competition.enrolledSubscribers },
        'smsCoaching.isActive': true,
        'smsCoaching.phoneNumber': { $exists: true, $ne: '' }
      }).lean();

      if (subscribers.length === 0) {
        throw new Error('No subscribers with valid phone numbers found');
      }

      console.log(`[ProgressSmsService] Found ${subscribers.length} subscribers with valid phone numbers`);

      // Prepare SMS data
      const smsData: ProgressSmsData = {
        competitionId: competition._id.toString(),
        competitionName: competition.name,
        competitionType: competition.type,
        dashboard: competition.dashboard,
        startDate: competition.startDate,
        endDate: competition.endDate,
        prizes: competition.prizes,
        customMessage: customMessage || '',
        currentRankings: rankings.rankings,
        enrolledSubscribers: subscribers.map((sub: any) => ({
          _id: sub._id.toString(),
          name: sub.name,
          email: sub.email,
          smsCoaching: {
            isActive: sub.smsCoaching?.isActive || false,
            phoneNumber: sub.smsCoaching?.phoneNumber || ''
          },
          personalizedGoals: sub.personalizedGoals
        }))
      };

      // Send SMS to each subscriber
      const results = await this.sendToSubscribers(smsData);

      // Log progress notification
      if (results.sentCount > 0) {
        await this.logProgressNotification(competitionId, results);
        console.log(`[ProgressSmsService] ✅ Progress SMS sent to ${results.sentCount} subscribers`);
      }

      return results;

    } catch (error: any) {
      console.error('[ProgressSmsService] Error sending progress SMS:', error);
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Send progress SMS to individual subscribers
   */
  private async sendToSubscribers(smsData: ProgressSmsData): Promise<ProgressSmsResult> {
    const results: ProgressSmsResult = {
      success: true,
      sentCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const subscriber of smsData.enrolledSubscribers) {
      try {
        const message = await this.generateProgressMessage(smsData, subscriber);
        const success = await this.smsService.sendSms(subscriber.smsCoaching.phoneNumber, message);
        
        if (success) {
          results.sentCount++;
          console.log(`[ProgressSmsService] ✅ Progress SMS sent to ${subscriber.name} (${subscriber.smsCoaching.phoneNumber})`);
        } else {
          results.failedCount++;
          results.errors.push(`Failed to send progress SMS to ${subscriber.name}`);
          console.error(`[ProgressSmsService] ❌ Failed to send progress SMS to ${subscriber.name}`);
        }
      } catch (error: any) {
        results.failedCount++;
        results.errors.push(`Error sending progress SMS to ${subscriber.name}: ${error.message}`);
        console.error(`[ProgressSmsService] ❌ Error sending progress SMS to ${subscriber.name}:`, error);
      }
    }

    return results;
  }

  /**
   * Generate personalized progress message using Claude AI
   */
  private async generateProgressMessage(smsData: ProgressSmsData, subscriber: any): Promise<string> {
    try {
      // Find subscriber's current ranking
      const subscriberRanking = smsData.currentRankings.find(
        r => r.name === subscriber.name
      );

      if (!subscriberRanking) {
        // Fallback message if no ranking found
        return this.generateFallbackMessage(smsData, subscriber);
      }

      // Get subscriber's performance data for Claude
      const performanceData = await this.getSubscriberPerformanceData(subscriber.name, smsData.dashboard);

      // Generate Claude prompt
      const prompt = this.buildClaudePrompt(smsData, subscriber, subscriberRanking, performanceData);

      // Call Claude API
      const claudeResponse = await this.callClaude(prompt);

      // Format the final message
      return this.formatProgressMessage(smsData, subscriber, subscriberRanking, claudeResponse);

    } catch (error: any) {
      console.error(`[ProgressSmsService] Error generating progress message for ${subscriber.name}:`, error);
      // Fallback to simple message
      return this.generateFallbackMessage(smsData, subscriber);
    }
  }

  /**
   * Build Claude prompt for progress message generation
   */
  private buildClaudePrompt(
    smsData: ProgressSmsData, 
    subscriber: any, 
    ranking: RankingEntry, 
    performanceData: any
  ): string {
    const firstName = subscriber.name.split(' ')[0];
    const totalParticipants = smsData.currentRankings.length;
    const daysRemaining = Math.ceil((new Date(smsData.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    // Get recent coaching messages to avoid repetition
    const recentMessages = this.getRecentCoachingMessages(subscriber.name, smsData.dashboard);

    // Build performance context
    let performanceContext = '';
    if (performanceData) {
      performanceContext = `
Current Performance:
🍷 Wine Conversion: ${performanceData.wineBottleConversionRate?.toFixed(1) || 'N/A'}%
👥 Club Conversion: ${performanceData.clubConversionRate?.toFixed(1) || 'N/A'}%
💰 Revenue: $${performanceData.revenue?.toLocaleString() || 'N/A'}
`;
    }

    // Build personal goals context
    let personalGoalsContext = '';
    if (subscriber.personalizedGoals) {
      const goals = [];
      if (subscriber.personalizedGoals.bottleConversionRate?.enabled) {
        goals.push(`Wine Goal: ${subscriber.personalizedGoals.bottleConversionRate.value}%`);
      }
      if (subscriber.personalizedGoals.clubConversionRate?.enabled) {
        goals.push(`Club Goal: ${subscriber.personalizedGoals.clubConversionRate.value}%`);
      }
      if (subscriber.personalizedGoals.aov?.enabled) {
        goals.push(`AOV Goal: $${subscriber.personalizedGoals.aov.value}`);
      }
      if (goals.length > 0) {
        personalGoalsContext = `\nPersonal Goals: ${goals.join(', ')}`;
      }
    }

    const prompt = `You are a motivational competition coach for a wine sales competition. Generate a personalized, encouraging progress update SMS message.

Competition Context:
- Competition: ${smsData.competitionName}
- Type: ${this.getTypeLabel(smsData.competitionType)}
- Period: ${this.getDashboardLabel(smsData.dashboard)}
- Days Remaining: ${daysRemaining} days
- Total Participants: ${totalParticipants}

Subscriber Context:
- Name: ${subscriber.name} (${firstName})
- Current Rank: ${ranking.rank}${ranking.tied ? ' (tied)' : ''} out of ${totalParticipants}
- Metric Value: ${ranking.metricValue}${this.getMetricUnit(smsData.competitionType)}
${performanceContext}${personalGoalsContext}

Prizes:
🥇 1st: ${smsData.prizes.first}
🥈 2nd: ${smsData.prizes.second}
🥉 3rd: ${smsData.prizes.third}

${smsData.customMessage ? `Custom Message: ${smsData.customMessage}\n` : ''}

Recent Coaching Messages (avoid repeating these strategies):
${recentMessages}

Requirements:
1. Keep the message under 160 characters for SMS
2. Be motivational and encouraging
3. Include their current rank and days remaining
4. Mention specific prizes they could win
5. Provide one actionable tip to improve their ranking
6. Use emojis sparingly but effectively
7. Make it personal and engaging
8. Focus on their potential to move up in rankings
9. AOV should be displayed as dollars (e.g., $113.44), NOT as a percentage

Generate a concise, motivational progress update message:`;

    return prompt;
  }

  /**
   * Call Claude API for message generation
   */
  private async callClaude(prompt: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 300,
        temperature: 0.8,
        system: 'You are a motivational competition coach. Generate concise, encouraging SMS messages for wine sales competitions. Keep messages under 160 characters and use emojis sparingly.',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || 'No response from Claude.';
  }

  /**
   * Format the final progress message
   */
  private formatProgressMessage(
    smsData: ProgressSmsData, 
    subscriber: any, 
    ranking: RankingEntry, 
    claudeResponse: string
  ): string {
    const firstName = subscriber.name.split(' ')[0];
    const daysRemaining = Math.ceil((new Date(smsData.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    // Start with a personalized header
    let message = `Hi ${firstName}! 🏆\n\n`;
    
    // Add Claude's response
    message += claudeResponse.trim();
    
    // Add footer with competition info
    message += `\n\n${daysRemaining} days left! 🍷✨`;

    return message;
  }

  /**
   * Generate fallback message if Claude fails
   */
  private generateFallbackMessage(smsData: ProgressSmsData, subscriber: any): string {
    const firstName = subscriber.name.split(' ')[0];
    const daysRemaining = Math.ceil((new Date(smsData.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return `Hi ${firstName}! 🏆\n\nKeep pushing in the ${smsData.competitionName}! You're doing great and every effort counts. ${daysRemaining} days left to climb the rankings! 🍷✨`;
  }

  /**
   * Get subscriber's performance data for the current period
   */
  private async getSubscriberPerformanceData(staffName: string, dashboard: string): Promise<any> {
    try {
              const { KPIDataModel } = await import('../models');
      
      const kpiData = await KPIDataModel.findOne({
        periodType: dashboard,
        year: new Date().getFullYear(),
        status: 'completed'
      }).sort({ createdAt: -1 }).lean();

      if (kpiData?.data?.current?.associatePerformance?.[staffName]) {
        return kpiData.data.current.associatePerformance[staffName];
      }

      return null;
    } catch (error) {
      console.error(`[ProgressSmsService] Error getting performance data for ${staffName}:`, error);
      return null;
    }
  }

  /**
   * Get recent coaching messages to avoid repetition
   */
  private getRecentCoachingMessages(staffName: string, dashboard: string): string {
    try {
      // This would typically fetch from CoachingSMSHistoryModel
      // For now, return empty string to avoid complexity
      return '';
    } catch (error) {
      console.error(`[ProgressSmsService] Error getting recent messages for ${staffName}:`, error);
      return '';
    }
  }

  /**
   * Log progress notification in database
   */
  private async logProgressNotification(competitionId: string, results: ProgressSmsResult): Promise<void> {
    try {
      const competition = await CompetitionModel.findById(competitionId);
      if (competition) {
        // Add progress notification to competition
        (competition as any).addProgressNotification({
          scheduledAt: new Date(),
          customText: 'Progress update sent',
          sent: true,
          sentAt: new Date()
        });
        await competition.save();
      }
    } catch (error) {
      console.error('[ProgressSmsService] Error logging progress notification:', error);
    }
  }

  /**
   * Helper methods for formatting
   */
  private getTypeLabel(type: string): string {
    const labels = {
      bottleConversion: '🍷 Bottle Conversion',
      clubConversion: '👥 Club Conversion',
      aov: '💰 Average Order Value'
    };
    return labels[type as keyof typeof labels] || type;
  }

  private getDashboardLabel(dashboard: string): string {
    const labels = {
      mtd: 'Month-to-Date',
      qtd: 'Quarter-to-Date',
      ytd: 'Year-to-Date'
    };
    return labels[dashboard as keyof typeof labels] || dashboard;
  }

  private getMetricUnit(type: string): string {
    const units = {
      bottleConversion: '%',
      clubConversion: '%',
      aov: ''
    };
    return units[type as keyof typeof units] || '';
  }

  /**
   * Validate competition and subscribers before sending
   */
  async validateProgressSms(competitionId: string): Promise<{
    valid: boolean;
    competition?: any;
    rankings?: any;
    subscribers?: any[];
    errors: string[];
  }> {
    try {
      await connectToDatabase();

      const competition = await CompetitionModel.findById(competitionId).lean();
      if (!competition) {
        return { valid: false, errors: ['Competition not found'] };
      }

      if (competition.status !== 'active') {
        return { valid: false, errors: ['Can only send progress SMS for active competitions'] };
      }

      const rankings = await getCompetitionRankings(competitionId, false);
      if (rankings.rankings.length === 0) {
        return { valid: false, errors: ['No rankings available for this competition'] };
      }

      const subscribers = await EmailSubscriptionModel.find({
        _id: { $in: competition.enrolledSubscribers },
        'smsCoaching.isActive': true,
        'smsCoaching.phoneNumber': { $exists: true, $ne: '' }
      }).lean();

      if (subscribers.length === 0) {
        return { valid: false, errors: ['No subscribers with valid phone numbers found'] };
      }

      return {
        valid: true,
        competition,
        rankings,
        subscribers,
        errors: []
      };

    } catch (error: any) {
      return { valid: false, errors: [error.message] };
    }
  }

  /**
   * Get preview of progress message for a subscriber
   */
  async getProgressMessagePreview(competitionId: string, subscriberName: string): Promise<string> {
    try {
      const validation = await this.validateProgressSms(competitionId);
      if (!validation.valid) {
        throw new Error(validation.errors[0]);
      }

      const subscriber = validation.subscribers?.find(s => s.name === subscriberName);
      if (!subscriber) {
        throw new Error('Subscriber not found');
      }

      const ranking = validation.rankings?.rankings.find((r: any) => r.name === subscriberName);
      if (!ranking) {
        return this.generateFallbackMessage({
          competitionId,
          competitionName: validation.competition.name,
          competitionType: validation.competition.type,
          dashboard: validation.competition.dashboard,
          startDate: validation.competition.startDate,
          endDate: validation.competition.endDate,
          prizes: validation.competition.prizes,
          customMessage: '',
          currentRankings: validation.rankings.rankings,
          enrolledSubscribers: validation.subscribers || []
        }, subscriber);
      }

      const performanceData = await this.getSubscriberPerformanceData(subscriberName, validation.competition.dashboard);
      const prompt = this.buildClaudePrompt({
        competitionId,
        competitionName: validation.competition.name,
        competitionType: validation.competition.type,
        dashboard: validation.competition.dashboard,
        startDate: validation.competition.startDate,
        endDate: validation.competition.endDate,
        prizes: validation.competition.prizes,
        customMessage: '',
        currentRankings: validation.rankings.rankings,
        enrolledSubscribers: validation.subscribers || []
      }, subscriber, ranking, performanceData);

      const claudeResponse = await this.callClaude(prompt);
      return this.formatProgressMessage({
        competitionId,
        competitionName: validation.competition.name,
        competitionType: validation.competition.type,
        dashboard: validation.competition.dashboard,
        startDate: validation.competition.startDate,
        endDate: validation.competition.endDate,
        prizes: validation.competition.prizes,
        customMessage: '',
        currentRankings: validation.rankings.rankings,
        enrolledSubscribers: validation.subscribers || []
      }, subscriber, ranking, claudeResponse);

    } catch (error: any) {
      console.error(`[ProgressSmsService] Error generating preview for ${subscriberName}:`, error);
      return `Error generating preview: ${error.message}`;
    }
  }
}

// Export singleton instance
export const progressSmsService = new ProgressSmsService(); 