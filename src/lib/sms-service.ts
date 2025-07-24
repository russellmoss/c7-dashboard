import { chatWithAssistant } from './ai-insights';
import { CoachingSMSHistoryModel } from './models';

export interface StaffPerformance {
  name: string;
  wineBottleConversionRate: number;
  clubConversionRate: number | string;
  wineBottleConversionGoalVariance: number | string;
  clubConversionGoalVariance: number | string;
  orders: number;
  guests: number;
  revenue: number;
  bottles: number;
}

export interface SMSCoachingConfig {
  isActive: boolean;
  phoneNumber: string;
  staffMembers: StaffMemberCoaching[];
  coachingStyle: 'encouraging' | 'analytical' | 'motivational' | 'balanced';
  customMessage?: string;
}

export interface StaffMemberCoaching {
  name: string;
  isActive: boolean;
  dashboards: DashboardSchedule[];
}

export interface DashboardSchedule {
  periodType: 'mtd' | 'qtd' | 'ytd' | 'all-quarters';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  timeEST: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  weekOfMonth?: number;
  monthOfQuarter?: number;
  isActive: boolean;
  includeMetrics: {
    wineConversionRate: boolean;
    clubConversionRate: boolean;
    goalVariance: boolean;
    overallPerformance: boolean;
  };
}

export class SMSService {
  private static client: any;

  static initialize() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn('Twilio credentials not found. SMS functionality will be disabled.');
      return;
    }

    try {
      // Dynamic import to avoid issues if Twilio is not installed
      const twilio = require('twilio');
      this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    } catch (error) {
      console.warn('Twilio not installed. SMS functionality will be disabled.');
    }
  }

  static async sendCoachingSMS(
    phoneNumber: string,
    staffPerformance: StaffPerformance,
    config: SMSCoachingConfig,
    periodType: string = 'mtd'
  ): Promise<boolean> {
    if (!this.client) {
      console.warn('SMS client not initialized');
      return false;
    }

    try {
      const message = await this.generateCoachingMessage(staffPerformance, config, periodType);
      
      await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      // Save to MongoDB coaching_sms_history
      try {
        await CoachingSMSHistoryModel.create({
          staffName: staffPerformance.name,
          phoneNumber,
          periodType,
          coachingMessage: message,
          sentAt: new Date()
          // coachingTechnique: undefined // Optionally extract and save if available
        });
      } catch (dbErr) {
        console.error('Error saving coaching SMS history:', dbErr);
      }

      console.log(`SMS sent to ${phoneNumber} for ${staffPerformance.name} (${periodType})`);
      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  private static async generateCoachingMessage(
    performance: StaffPerformance,
    config: SMSCoachingConfig,
    periodType: string
  ): Promise<string> {
    // Use only the first name for greeting
    const firstName = performance.name.split(' ')[0];
    const metrics = this.buildMetricsString(performance, config);

    // Fetch last 3 coaching messages for this staff member and periodType
    let previousMessages: string[] = [];
    try {
      const history = await CoachingSMSHistoryModel.find({
        staffName: performance.name,
        phoneNumber: config.phoneNumber,
        periodType
      })
        .sort({ sentAt: -1 })
        .limit(3)
        .lean();
      previousMessages = history.map((h: any) => h.coachingMessage);
    } catch (err) {
      console.error('Error fetching previous coaching messages:', err);
    }

    const aiCoaching = await this.generateAICoaching(performance, config, periodType, previousMessages);
    
    let message = `Hi ${firstName}! 📊\n\n${periodType.toUpperCase()} Performance:\n${metrics}`;
    
    if (aiCoaching) {
      message += `\n\n💡 ${aiCoaching}`;
    }
    
    if (config.customMessage) {
      message += `\n\n${config.customMessage}`;
    }
    
    message += '\n\nKeep up the great work! 🍷';
    
    return message;
  }

  private static buildMetricsString(performance: StaffPerformance, config: SMSCoachingConfig): string {
    // Only show wine conversion rate, club conversion rate, and revenue
    let metrics = [];
    metrics.push(`🍷 Wine Conversion: ${typeof performance.wineBottleConversionRate === 'number' ? performance.wineBottleConversionRate.toFixed(1) : performance.wineBottleConversionRate}%`);
    metrics.push(`👥 Club Conversion: ${typeof performance.clubConversionRate === 'number' ? performance.clubConversionRate.toFixed(1) : performance.clubConversionRate}%`);
    metrics.push(`💰 Revenue: $${performance.revenue.toLocaleString()}`);
    return metrics.join('\n');
  }

  private static formatGoalVariance(variance: number | string): string {
    if (typeof variance === 'number') {
      const sign = variance >= 0 ? '+' : '';
      return `${sign}${variance.toFixed(1)}%`;
    }
    return variance;
  }

  private static async generateAICoaching(
    performance: StaffPerformance,
    config: SMSCoachingConfig,
    periodType: string,
    previousMessages: string[] = []
  ): Promise<string> {
    try {
      const prompt = this.buildAIPrompt(performance, config, periodType, previousMessages);
      const response = await chatWithAssistant(prompt);
      
      // Clean up the response to fit SMS format
      let coaching = response.trim();
      
      // Remove any markdown formatting
      coaching = coaching.replace(/\*\*/g, '');
      coaching = coaching.replace(/\*/g, '');
      
      // REMOVE SMS length truncation
      // if (coaching.length > 160) {
      //   coaching = coaching.substring(0, 157) + '...';
      // }
      
      return coaching;
    } catch (error) {
      console.error('Error generating AI coaching:', error);
      return this.getFallbackCoaching(performance, config, periodType);
    }
  }

  private static buildAIPrompt(
    performance: StaffPerformance,
    config: SMSCoachingConfig,
    periodType: string,
    previousMessages: string[] = []
  ): string {
    const wineRate = typeof performance.wineBottleConversionRate === 'number' 
      ? performance.wineBottleConversionRate.toFixed(1)
      : performance.wineBottleConversionRate;
    const clubRate = typeof performance.clubConversionRate === 'number'
      ? performance.clubConversionRate.toFixed(1)
      : performance.clubConversionRate;
    const periodLabel = periodType === 'mtd' ? 'Month-to-Date' : 
                       periodType === 'qtd' ? 'Quarter-to-Date' : 
                       periodType === 'ytd' ? 'Year-to-Date' : 'All Quarters';
    let previousSection = '';
    if (previousMessages.length > 0) {
      previousSection = '\n\nPREVIOUS COACHING MESSAGES:';
      previousMessages.forEach((msg, i) => {
        previousSection += `\n${i + 1}. ${msg}`;
      });
      previousSection += '\n\nPlease do not repeat the same tip/technique as in these messages. Select a new actionable tip if possible.';
    }
    // Refined prompt: only one pointer per message, use techniques as inspiration, do not invent new discounts/incentives
    return `You are an expert wine industry coach specializing in tasting room performance optimization. Generate a thorough, ${config.coachingStyle} coaching message for ${performance.name} based on their ${periodLabel} performance.\n\nPERFORMANCE DATA:\n- Wine Conversion Rate: ${wineRate}% (Goal: 53%)\n- Club Conversion Rate: ${clubRate}% (Goal: 6%)\n- Revenue: $${performance.revenue.toLocaleString()}\n\nGOALS:\n- Wine Conversion Rate Goal: 53%\n- Club Conversion Rate Goal: 6%\n\nCOACHING STYLE: ${config.coachingStyle}\n${previousSection}\n\nTECHNIQUES TO SUGGEST IF BELOW GOAL (use as inspiration/guardrails, do not copy verbatim):\n- For low bottle sales:\n  1. Ask how they are enjoying the wine. If they like it, say: "Oh, great. I'll take note so we don't forget in case you want to take some home today."\n  2. Remind guests that a tasting fee is waived for every 3 bottles purchased.\n  3. Always ask for the sale, even with food/glass guests: "How was the chardonnay? Can I send you home with some?"\n  4. Always try to sell bottles, no matter the experience. If a guest is having food and a bottle or glass, ask how the wine was and if you can send them home with wine.\n- For low club sales:\n  1. Prime for the club: "Oh, I love that you're doing a flight. A lot of the wines in this flight are favorites of our club members."\n  2. Promote the social aspect: "Oh, you're local? I think you'd make a great addition to the club. It's mostly locals and we get together at least once a quarter to have parties."\n  3. Accentuate the value: "You get discounts on wine and free tastings throughout the year and if you join today, all of your flights are waived."\n  4. Make the big ask first: Always prime and ask for the club sale first. If they don't want it, ask for the bottle sale after.\n  5. If someone buys more than 3 bottles: "Oh, you know if you join the club you'll get 10-15% off those bottles today and you'll get your flight fees waived. You just need to take home 4, 6 or 12 bottles today depending upon what tier is best for you."\n\nREQUIREMENTS:\n- If the staff member is above goal, give kudos.\n- If below, give only one specific, actionable tip per message, inspired by the techniques above.\n- Do not invent new discounts, incentives, or experiences—stick to the provided techniques and focus on transactional and emotional sales skills.\n- Only reference wine conversion rate, club conversion rate, and revenue.\n- Be specific to wine industry and tasting room context.\n- Use encouraging, professional tone.\n- Provide concrete tips for improvement or celebration.\n- You may use more than one message if needed to be thorough, but only one pointer/tip per message.\n\nGenerate a concise, wine industry-focused coaching message:`;
  }

  private static getFallbackCoaching(performance: StaffPerformance, config: SMSCoachingConfig, periodType: string): string {
    const wineRate = typeof performance.wineBottleConversionRate === 'number' 
      ? performance.wineBottleConversionRate
      : 0;
    
    const clubRate = typeof performance.clubConversionRate === 'number'
      ? performance.clubConversionRate
      : 0;

    const wineVariance = typeof performance.wineBottleConversionGoalVariance === 'number'
      ? performance.wineBottleConversionGoalVariance
      : 0;

    const clubVariance = typeof performance.clubConversionGoalVariance === 'number'
      ? performance.clubConversionGoalVariance
      : 0;

    if (config.coachingStyle === 'encouraging') {
      if (wineVariance > 0 && clubVariance > 0) {
        return "Outstanding! You're exceeding both wine and club goals. Your wine knowledge is driving results!";
      } else if (wineVariance > 0 || clubVariance > 0) {
        return "Great work! You're making strong progress. Keep sharing your passion for wine with guests.";
      } else {
        return "Keep building those guest relationships! Every tasting is an opportunity to showcase our wines.";
      }
    } else if (config.coachingStyle === 'analytical') {
      if (wineRate < 12) {
        return "Focus on wine storytelling and guest education to boost conversion rates.";
      } else if (clubRate < 6) {
        return "Emphasize club benefits and exclusive member experiences to increase signups.";
      } else {
        return "Strong performance! Consider cross-selling techniques to maximize guest value.";
      }
    } else if (config.coachingStyle === 'motivational') {
      return "Your wine expertise and guest service skills are making a difference! Keep inspiring guests with our story.";
    } else {
      if (wineVariance > 0 && clubVariance > 0) {
        return "Excellent performance! You're exceeding goals and creating memorable guest experiences.";
      } else {
        return "You're doing great! Focus on connecting guests with wines that match their preferences.";
      }
    }
  }

  static async sendTestSMS(phoneNumber: string, name: string): Promise<boolean> {
    if (!this.client) {
      console.warn('SMS client not initialized');
      return false;
    }

    try {
      const message = `Hi ${name}! 🍷\n\nThis is a test SMS from your Milea Estate Vineyard coaching system.\n\nYour personalized performance updates will be sent here based on your schedule.\n\nKeep up the amazing work! 💪`;
      
      await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log(`Test SMS sent to ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error('Error sending test SMS:', error);
      return false;
    }
  }
}

// Initialize SMS service
SMSService.initialize(); 