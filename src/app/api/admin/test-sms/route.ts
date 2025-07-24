import { NextRequest, NextResponse } from 'next/server';
import { SMSService } from '@/lib/sms-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, name } = body;

    if (!phoneNumber || !name) {
      return NextResponse.json({ error: 'Phone number and name are required' }, { status: 400 });
    }

    const success = await SMSService.sendTestSMS(phoneNumber, name);

    if (success) {
      return NextResponse.json({ 
        message: 'Test SMS sent successfully!',
        phoneNumber,
        name
      });
    } else {
      return NextResponse.json({ error: 'Failed to send test SMS' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error sending test SMS:', error);
    return NextResponse.json({ error: 'Failed to send test SMS' }, { status: 500 });
  }
} 