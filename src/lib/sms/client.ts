import { TwilioSmsService } from "./base";

let smsService: TwilioSmsService | null = null;

export function getSmsService(): TwilioSmsService {
  if (!smsService) {
    smsService = new TwilioSmsService();
  }
  return smsService;
}

export async function sendSMS(
  to: string, 
  body: string, 
  fromName?: string
): Promise<boolean> {
  const service = getSmsService();
  
  if (!service.isInitialized()) {
    console.error("[sendSMS] SMS service not initialized");
    return false;
  }

  try {
    console.log(`[sendSMS] Sending SMS to ${to} from ${fromName || 'C7 Dashboard'}`);
    const result = await service.sendSms(to, body);
    
    if (result) {
      console.log(`[sendSMS] SMS sent successfully to ${to}`);
    } else {
      console.error(`[sendSMS] Failed to send SMS to ${to}`);
    }
    
    return result;
  } catch (error) {
    console.error(`[sendSMS] Error sending SMS to ${to}:`, error);
    return false;
  }
}
