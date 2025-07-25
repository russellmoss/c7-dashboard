import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/email/email-service';
import { EmailTemplates, KPIDashboardData } from '@/lib/email-templates';
import { Resend } from 'resend';
import { connectToDatabase } from '@/lib/mongodb';
import { KPIDataModel } from '@/lib/models';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, periodType = 'mtd' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Connect to database and fetch real KPI data
    await connectToDatabase();
    
    // Get the current year
    const currentYear = new Date().getFullYear();
    
    // Fetch real KPI data from database
    const kpiData = await KPIDataModel.findOne({
      periodType: periodType,
      year: currentYear
    }).sort({ createdAt: -1 });

    if (!kpiData) {
      return NextResponse.json({ 
        error: `No KPI data found for ${periodType.toUpperCase()} ${currentYear}` 
      }, { status: 404 });
    }

    // Transform the real KPI data to match our email template format
    const realKPIData: KPIDashboardData = {
      periodType: kpiData.periodType,
      periodLabel: kpiData.data.current.periodLabel || kpiData.periodType.toUpperCase(),
      dateRange: kpiData.data.current.dateRange,
      overallMetrics: {
        totalRevenue: kpiData.data.current.overallMetrics.totalRevenue,
        totalOrders: kpiData.data.current.overallMetrics.totalOrders,
        totalGuests: kpiData.data.current.overallMetrics.totalGuests,
        totalBottlesSold: kpiData.data.current.overallMetrics.totalBottlesSold,
        avgOrderValue: kpiData.data.current.overallMetrics.avgOrderValue,
        wineBottleConversionRate: kpiData.data.current.overallMetrics.wineBottleConversionRate,
        clubConversionRate: kpiData.data.current.overallMetrics.clubConversionRate
      },
      yearOverYear: {
        revenue: kpiData.data.yearOverYear.revenue,
        guests: kpiData.data.yearOverYear.guests,
        orders: kpiData.data.yearOverYear.orders
      },
      associatePerformance: kpiData.data.current.associatePerformance,
      insights: kpiData.insights ? {
        strengths: kpiData.insights.strengths || [],
        recommendations: kpiData.insights.recommendations || []
      } : undefined
    };

    // Create a mock subscription
    const mockSubscription = {
      _id: 'test',
      name: name || 'Test User',
      email: email,
      subscribedReports: ['mtd', 'qtd', 'ytd'] as ('mtd' | 'qtd' | 'ytd' | 'all-quarters')[],
      frequency: 'weekly' as const,
      timeEST: '09:00',
      isActive: true
    };

    // Generate the beautiful email content
    const emailContent = EmailTemplates.generateKPIDashboardEmail(mockSubscription, realKPIData);

    // Send the email
    const { data, error } = await resend.emails.send({
      from: 'Milea Estate Vineyard <onboarding@resend.dev>',
      to: [email],
      subject: 'Test Email - Beautiful KPI Dashboard Report',
      html: emailContent,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    console.log('Beautiful KPI email sent successfully:', data);
    return NextResponse.json({ 
      success: true, 
      message: 'Beautiful KPI dashboard email sent successfully!',
      data 
    });

  } catch (error) {
    console.error('Error sending beautiful KPI email:', error);
    return NextResponse.json({ error: 'Failed to send beautiful KPI email' }, { status: 500 });
  }
} 