import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { EmailSubscriptionModel } from '@/lib/models';
import { SMSCoaching } from '@/types/sms';

export async function GET() {
  try {
    await connectToDatabase();
    const subscriptions = await EmailSubscriptionModel.find({}).sort({ createdAt: -1 });
    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subscribedReports, reportSchedules, smsCoaching, personalizedGoals } = body;

    // Validate required fields
    if (!name || !email || !subscribedReports || !reportSchedules) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if email already exists
    const existingSubscription = await EmailSubscriptionModel.findOne({ email });
    if (existingSubscription) {
      return NextResponse.json({ error: 'Email already subscribed' }, { status: 400 });
    }

    const subscription = new EmailSubscriptionModel({
      name,
      email,
      subscribedReports,
      reportSchedules,
      smsCoaching,
      isActive: true,
      ...(typeof personalizedGoals !== 'undefined' ? { personalizedGoals } : {})
    });

    await subscription.save();
    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
} 