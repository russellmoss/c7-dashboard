import { Resend } from 'resend';
import { EmailTemplates, KPIDashboardData } from './email-templates.js';
import PQueue from 'p-queue';

function getResendInstance() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}

// Rate limit: 1 email/sec
export const emailQueue = new PQueue({ interval: 1000, intervalCap: 1 });

export interface EmailSubscription {
  _id?: string;
  name: string;
  email: string;
  subscribedReports: ('mtd' | 'qtd' | 'ytd' | 'all-quarters')[];
  frequency: 'daily' | 'weekly' | 'monthly';
  timeEST: string;
  isActive: boolean;
}

export interface KPIData {
  periodType: string;
  data: any;
  insights?: any;
}

export class EmailService {
  static async sendKPIDashboard(
    subscription: EmailSubscription,
    kpiData: KPIDashboardData
  ) {
    try {
      const emailContent = EmailTemplates.generateKPIDashboardEmail(subscription, kpiData);
      
      const emailData = {
        from: 'Milea Estate Vineyard <onboarding@resend.dev>',
        to: [subscription.email],
        subject: `Milea Estate Vineyard - ${kpiData.periodType.toUpperCase()} KPI Report`,
        html: emailContent,
      };

      let data, error: any;
      await emailQueue.add(async () => {
        try {
          const resend = getResendInstance();
          const result = await resend.emails.send(emailData);
          data = result.data;
          error = result.error;
        } catch (err) {
          throw err;
        }
      });

      if (error) {
        console.error('Error sending KPI email:', error);
        throw new Error(`Failed to send email: ${(error as any)?.message || String(error)}`);
      }

      console.log('KPI email sent successfully:', data);
      return data;

    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  static async sendTestEmail(subscription: EmailSubscription) {
    try {
      const testEmailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #a92020;">Milea Estate Vineyard - Test Email</h1>
          <p>Hello ${subscription.name},</p>
          <p>This is a test email from your KPI Dashboard system to verify that email functionality is working correctly.</p>
          <p>If you received this email, it means:</p>
          <ul>
            <li>✅ Resend API is configured correctly</li>
            <li>✅ Email templates are working</li>
            <li>✅ Your subscription is active</li>
          </ul>
          <p>You will receive regular KPI reports based on your subscription settings:</p>
          <ul>
            <li><strong>Reports:</strong> ${subscription.subscribedReports.join(', ')}</li>
            <li><strong>Frequency:</strong> ${subscription.frequency}</li>
            <li><strong>Time:</strong> ${subscription.timeEST} EST</li>
          </ul>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is a test email from the Milea Estate Vineyard KPI Dashboard system.
          </p>
        </div>
      `;

      const resend = getResendInstance();
      const { data, error } = await resend.emails.send({
        from: 'Milea Estate Vineyard <onboarding@resend.dev>',
        to: [subscription.email],
        subject: 'Test Email - KPI Dashboard System',
        html: testEmailContent,
      });

      if (error) {
        console.error('Resend error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log('Test email sent successfully:', data);
      return data;

    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

} 