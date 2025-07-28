import { getSmsService } from './client';
import { connectToDatabase } from '../mongodb';
import { CompetitionModel, EmailSubscriptionModel } from '../models';

export interface WelcomeSmsResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
  messageId?: string;
}

export interface WelcomeSmsData {
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
  welcomeMessage: string;
  enrolledSubscribers: Array<{
    _id: string;
    name: string;
    email: string;
    smsCoaching: {
      isActive: boolean;
      phoneNumber: string;
    };
  }>;
}

export class WelcomeSmsService {
  private smsService = getSmsService();

  /**
   * Send welcome SMS to all enrolled subscribers for a competition
   */
  async sendWelcomeSms(competitionId: string): Promise<WelcomeSmsResult> {
    try {
      console.log(`[WelcomeSmsService] Starting welcome SMS for competition: ${competitionId}`);
      
      await connectToDatabase();

      // Get competition details
      const competition = await CompetitionModel.findById(competitionId).lean();
      if (!competition) {
        throw new Error('Competition not found');
      }

      // Check if welcome message has already been sent
      if (competition.welcomeMessage.sent) {
        throw new Error('Welcome message has already been sent for this competition');
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

      console.log(`[WelcomeSmsService] Found ${subscribers.length} subscribers with valid phone numbers`);

      // Prepare SMS data
      const smsData: WelcomeSmsData = {
        competitionId: competition._id.toString(),
        competitionName: competition.name,
        competitionType: competition.type,
        dashboard: competition.dashboard,
        startDate: competition.startDate,
        endDate: competition.endDate,
        prizes: competition.prizes,
        welcomeMessage: competition.welcomeMessage.customText,
        enrolledSubscribers: subscribers.map((sub: any) => ({
          _id: sub._id.toString(),
          name: sub.name,
          email: sub.email,
          smsCoaching: {
            isActive: sub.smsCoaching?.isActive || false,
            phoneNumber: sub.smsCoaching?.phoneNumber || ''
          }
        }))
      };

      // Send SMS to each subscriber
      const results = await this.sendToSubscribers(smsData);

      // Mark welcome message as sent if any SMS were sent successfully
      if (results.sentCount > 0) {
        await this.markWelcomeMessageSent(competitionId);
        console.log(`[WelcomeSmsService] ✅ Welcome SMS sent to ${results.sentCount} subscribers`);
      }

      return results;

    } catch (error: any) {
      console.error('[WelcomeSmsService] Error sending welcome SMS:', error);
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Send welcome SMS to individual subscribers
   */
  private async sendToSubscribers(smsData: WelcomeSmsData): Promise<WelcomeSmsResult> {
    const results: WelcomeSmsResult = {
      success: true,
      sentCount: 0,
      failedCount: 0,
      errors: []
    };

    console.log(`[WelcomeSmsService] 📱 Sending welcome SMS to ${smsData.enrolledSubscribers.length} subscribers`);

    // Process subscribers with a small delay between each to prevent overwhelming the API
    for (let i = 0; i < smsData.enrolledSubscribers.length; i++) {
      const subscriber = smsData.enrolledSubscribers[i];
      
      try {
        console.log(`[WelcomeSmsService] 📤 Sending to ${subscriber.name} (${i + 1}/${smsData.enrolledSubscribers.length})`);
        
        const message = this.formatWelcomeMessage(smsData, subscriber.name);
        const success = await this.smsService.sendSms(subscriber.smsCoaching.phoneNumber, message);
        
        if (success) {
          results.sentCount++;
          console.log(`[WelcomeSmsService] ✅ SMS sent to ${subscriber.name} (${subscriber.smsCoaching.phoneNumber})`);
        } else {
          results.failedCount++;
          results.errors.push(`Failed to send SMS to ${subscriber.name}`);
          console.error(`[WelcomeSmsService] ❌ Failed to send SMS to ${subscriber.name}`);
        }
        
        // Add a small delay between messages to prevent rate limiting
        if (i < smsData.enrolledSubscribers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
        
      } catch (error: any) {
        results.failedCount++;
        results.errors.push(`Error sending SMS to ${subscriber.name}: ${error.message}`);
        console.error(`[WelcomeSmsService] ❌ Error sending SMS to ${subscriber.name}:`, error);
      }
    }

    console.log(`[WelcomeSmsService] 📊 Batch complete: ${results.sentCount} sent, ${results.failedCount} failed`);
    return results;
  }

  /**
   * Format welcome message for individual subscriber
   */
  private formatWelcomeMessage(smsData: WelcomeSmsData, subscriberName: string): string {
    const firstName = subscriberName.split(' ')[0];
    const startDate = new Date(smsData.startDate).toLocaleDateString();
    const endDate = new Date(smsData.endDate).toLocaleDateString();
    
    // Format competition type for display
    const typeLabels = {
      bottleConversion: '🍷 Bottle Conversion',
      clubConversion: '👥 Club Conversion',
      aov: '💰 Average Order Value'
    };
    
    const dashboardLabels = {
      mtd: 'Month-to-Date',
      qtd: 'Quarter-to-Date',
      ytd: 'Year-to-Date'
    };

    // Build the message
    let message = `Hi ${firstName}! 🏆\n\n`;
    message += `Welcome to: ${smsData.competitionName}\n`;
    message += `Type: ${typeLabels[smsData.competitionType as keyof typeof typeLabels]}\n`;
    message += `Period: ${dashboardLabels[smsData.dashboard as keyof typeof dashboardLabels]}\n`;
    message += `Duration: ${startDate} - ${endDate}\n\n`;
    
    // Add custom message if provided
    if (smsData.welcomeMessage && smsData.welcomeMessage.trim()) {
      message += `${smsData.welcomeMessage}\n\n`;
    }
    
    // Add prizes
    message += `🏆 Prizes:\n`;
    message += `🥇 1st: ${smsData.prizes.first}\n`;
    message += `🥈 2nd: ${smsData.prizes.second}\n`;
    message += `🥉 3rd: ${smsData.prizes.third}\n\n`;
    
    message += `Good luck! 🍷✨`;

    return message;
  }

  /**
   * Mark welcome message as sent in the database
   */
  private async markWelcomeMessageSent(competitionId: string): Promise<void> {
    try {
      const competition = await CompetitionModel.findById(competitionId);
      if (competition) {
        (competition as any).markWelcomeMessageSent();
        await competition.save();
        console.log(`[WelcomeSmsService] ✅ Welcome message marked as sent for competition: ${competitionId}`);
      }
    } catch (error) {
      console.error('[WelcomeSmsService] Error marking welcome message as sent:', error);
    }
  }

  /**
   * Validate competition and subscribers before sending
   */
  async validateWelcomeSms(competitionId: string): Promise<{
    valid: boolean;
    competition?: any;
    subscribers?: any[];
    errors: string[];
  }> {
    try {
      await connectToDatabase();

      const competition = await CompetitionModel.findById(competitionId).lean();
      if (!competition) {
        return { valid: false, errors: ['Competition not found'] };
      }

      if (competition.welcomeMessage.sent) {
        return { valid: false, errors: ['Welcome message has already been sent'] };
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
        subscribers,
        errors: []
      };

    } catch (error: any) {
      return { valid: false, errors: [error.message] };
    }
  }

  /**
   * Get preview of welcome message for a subscriber
   */
  async getWelcomeMessagePreview(competitionIdOrObject: string | any, subscriberName: string): Promise<string> {
    try {
      let competition: any;

      // Handle both competition ID string and competition object
      if (typeof competitionIdOrObject === 'string') {
        await connectToDatabase();
        competition = await CompetitionModel.findById(competitionIdOrObject).lean();
        if (!competition) {
          throw new Error('Competition not found');
        }
      } else {
        competition = competitionIdOrObject;
      }

      const smsData: WelcomeSmsData = {
        competitionId: competition._id.toString(),
        competitionName: competition.name,
        competitionType: competition.type,
        dashboard: competition.dashboard,
        startDate: competition.startDate,
        endDate: competition.endDate,
        prizes: competition.prizes,
        welcomeMessage: competition.welcomeMessage.customText,
        enrolledSubscribers: []
      };

      return this.formatWelcomeMessage(smsData, subscriberName);
    } catch (error: any) {
      console.error('[WelcomeSmsService] Error generating welcome message preview:', error);
      return `Error generating preview: ${error.message}`;
    }
  }
}

// Export singleton instance
export const welcomeSmsService = new WelcomeSmsService(); 