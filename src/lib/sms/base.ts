import twilio from 'twilio';

export const baseDebug = 'base-runtime-value';

export interface SmsService {
  sendSms(to: string, body: string): Promise<boolean>;
  isInitialized(): boolean;
}

export class TwilioSmsService implements SmsService {
  private client: ReturnType<typeof twilio> | null = null;
  private error: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      this.error = 'Missing Twilio credentials';
      console.error('[TwilioSmsService]', this.error);
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      console.log('[TwilioSmsService] Initialized successfully');
    } catch (error) {
      this.error = `Initialization failed: ${error}`;
      console.error('[TwilioSmsService]', this.error);
    }
  }

  isInitialized(): boolean {
    return this.client !== null;
  }

  async sendSms(to: string, body: string): Promise<boolean> {
    if (!this.client) {
      console.error('[TwilioSmsService] Cannot send SMS:', this.error);
      return false;
    }

    try {
      const message = await this.client.messages.create({
        body,
        to,
        from: process.env.TWILIO_PHONE_NUMBER!
      });
      console.log(`[TwilioSmsService] SMS sent: ${message.sid}`);
      return true;
    } catch (error) {
      console.error('[TwilioSmsService] Send failed:', error);
      return false;
    }
  }
} 