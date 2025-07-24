import { TwilioSmsService } from './base.js';

let smsService: TwilioSmsService | null = null;

export function getSmsService(): TwilioSmsService {
  if (!smsService) {
    smsService = new TwilioSmsService();
  }
  return smsService;
}

export const sendSms = async (to: string, body: string): Promise<boolean> => {
  return getSmsService().sendSms(to, body);
};

// --- Coaching message generation logic from previous worker ---
export async function generateCoachingMessage(
  performance: any,
  config: any,
  periodType: string
): Promise<string> {
  // Use only the first name for greeting
  const firstName = performance.name.split(' ')[0];
  const metrics = buildMetricsString(performance, config);

  // Fallback: no AI, just a simple message
  let message = `Hi ${firstName}! 📊\n\n${periodType.toUpperCase()} Performance:\n${metrics}`;

  if (config.customMessage) {
    message += `\n\n${config.customMessage}`;
  }

  message += '\n\nKeep up the great work! 🍷';
  return message;
}

function buildMetricsString(performance: any, config: any): string {
  let metrics = [];
  metrics.push(`🍷 Wine Conversion: ${typeof performance.wineBottleConversionRate === 'number' ? performance.wineBottleConversionRate.toFixed(1) : performance.wineBottleConversionRate}%`);
  metrics.push(`👥 Club Conversion: ${typeof performance.clubConversionRate === 'number' ? performance.clubConversionRate.toFixed(1) : performance.clubConversionRate}%`);
  metrics.push(`💰 Revenue: $${performance.revenue.toLocaleString()}`);
  return metrics.join('\n');
} 