import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { EmailSubscriptionModel, CoachingSMSHistoryModel } from '@/lib/models';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const subscription = await EmailSubscriptionModel.findById(params.id);
    
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }
    
    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, email, subscribedReports, reportSchedules, smsCoaching } = body;

    // Validate required fields
    if (!name || !email || !subscribedReports || !reportSchedules) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if email already exists for different subscription
    const existingSubscription = await EmailSubscriptionModel.findOne({ 
      email, 
      _id: { $ne: params.id } 
    });
    if (existingSubscription) {
      return NextResponse.json({ error: 'Email already subscribed' }, { status: 400 });
    }

    const subscription = await EmailSubscriptionModel.findByIdAndUpdate(
      params.id,
      { name, email, subscribedReports, reportSchedules, smsCoaching },
      { new: true, runValidators: true }
    );

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    await connectToDatabase();

    const subscription = await EmailSubscriptionModel.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    );

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const subscription = await EmailSubscriptionModel.findByIdAndDelete(params.id);

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }
} 

// Add a GET handler for /api/admin/subscriptions/[id]/sms-archive
export async function GET_SMS_ARCHIVE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const subscription = await EmailSubscriptionModel.findById(params.id);
    if (!subscription || !subscription.smsCoaching?.phoneNumber) {
      return NextResponse.json({ error: 'Subscription or phone number not found' }, { status: 404 });
    }
    const messages = await CoachingSMSHistoryModel.find({
      phoneNumber: subscription.smsCoaching.phoneNumber
    })
      .sort({ sentAt: -1 })
      .lean();
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching SMS archive:', error);
    return NextResponse.json({ error: 'Failed to fetch SMS archive' }, { status: 500 });
  }
} 