import { NextRequest, NextResponse } from 'next/server';
import { welcomeSmsService } from '@/lib/sms/welcome-sms';
import { connectToDatabase } from '@/lib/mongodb';
import { CompetitionModel, EmailSubscriptionModel } from '@/lib/models';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`[API] GET /api/competitions/${id}/welcome-sms/preview`);

    await connectToDatabase();

    // Get competition details
    const competition = await CompetitionModel.findById(id).lean();
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    // Get enrolled subscribers
    const subscribers = await EmailSubscriptionModel.find({
      _id: { $in: competition.enrolledSubscribers }
    }).lean();

    // Generate preview messages for each subscriber
    const previews = subscribers.map(subscriber => ({
      subscriberId: subscriber._id,
      subscriberName: subscriber.name,
      subscriberEmail: subscriber.email,
      hasValidPhone: subscriber.smsCoaching?.isActive && subscriber.smsCoaching?.phoneNumber,
      phoneNumber: subscriber.smsCoaching?.phoneNumber || 'No phone number',
      message: welcomeSmsService.getWelcomeMessagePreview(competition, subscriber.name)
    }));

    // Calculate statistics
    const totalSubscribers = subscribers.length;
    const validPhoneSubscribers = subscribers.filter(s => 
      s.smsCoaching?.isActive && s.smsCoaching?.phoneNumber
    ).length;
    const invalidPhoneSubscribers = totalSubscribers - validPhoneSubscribers;

    return NextResponse.json({
      success: true,
      data: {
        competition: {
          id: competition._id,
          name: competition.name,
          type: competition.type,
          dashboard: competition.dashboard,
          startDate: competition.startDate,
          endDate: competition.endDate,
          welcomeMessageSent: competition.welcomeMessage.sent,
          totalParticipants: totalSubscribers
        },
        previews,
        statistics: {
          totalSubscribers,
          validPhoneSubscribers,
          invalidPhoneSubscribers,
          canSendSms: validPhoneSubscribers > 0 && !competition.welcomeMessage.sent
        }
      }
    });

  } catch (error: any) {
    console.error(`[API] Error generating welcome SMS preview for competition ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 