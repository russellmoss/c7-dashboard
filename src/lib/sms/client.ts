import { TwilioSmsService } from './base.js';

let smsService: TwilioSmsService | null = null;

export function getSmsService(): TwilioSmsService {
  if (!smsService) {
    smsService = new TwilioSmsService();
  }
  return smsService;
} 