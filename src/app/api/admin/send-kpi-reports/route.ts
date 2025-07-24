import { NextRequest, NextResponse } from 'next/server';
import { EmailTemplates, KPIDashboardData } from '@/lib/email-templates';
import { Resend } from 'resend';
import { connectToDatabase } from '@/lib/mongodb';
import { KPIDataModel } from '@/lib/models';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, subscribedReports } = body;

    if (!email || !subscribedReports || !Array.isArray(subscribedReports)) {
      return NextResponse.json({ error: 'Email and subscribedReports array are required' }, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();
    const currentYear = new Date().getFullYear();

    // Fetch KPI data for all subscribed reports
    const kpiDataPromises = subscribedReports.map(async (periodType: string) => {
      const kpiData = await KPIDataModel.findOne({
        periodType: periodType,
        year: currentYear
      }).sort({ createdAt: -1 });

      if (!kpiData) {
        throw new Error(`No KPI data found for ${periodType.toUpperCase()} ${currentYear}`);
      }

      return {
        periodType,
        data: kpiData
      };
    });

    const kpiDataResults = await Promise.all(kpiDataPromises);

    // Generate email content for each report
    const reportSections = kpiDataResults.map(({ periodType, data }) => {
      const kpiData: KPIDashboardData = {
        periodType: data.periodType,
        periodLabel: data.data.current.periodLabel || data.periodType.toUpperCase(),
        dateRange: data.data.current.dateRange,
        overallMetrics: {
          totalRevenue: data.data.current.overallMetrics.totalRevenue,
          totalOrders: data.data.current.overallMetrics.totalOrders,
          totalGuests: data.data.current.overallMetrics.totalGuests,
          totalBottlesSold: data.data.current.overallMetrics.totalBottlesSold,
          avgOrderValue: data.data.current.overallMetrics.avgOrderValue,
          wineBottleConversionRate: data.data.current.overallMetrics.wineBottleConversionRate,
          clubConversionRate: data.data.current.overallMetrics.clubConversionRate
        },
        yearOverYear: {
          revenue: data.data.yearOverYear.revenue,
          guests: data.data.yearOverYear.guests,
          orders: data.data.yearOverYear.orders
        },
        associatePerformance: data.data.current.associatePerformance,
        insights: data.insights ? {
          strengths: data.insights.strengths || [],
          recommendations: data.insights.recommendations || []
        } : undefined
      };

      return EmailTemplates.generateKPIDashboardEmailSection(kpiData);
    }).join('<hr style="margin: 40px 0; border: none; border-top: 2px solid #a92020;">');

    // Create comprehensive email
    const comprehensiveEmail = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Milea Estate Vineyard - KPI Reports</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #a92020 0%, #8b1a1a 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
            letter-spacing: 1px;
          }
          .header .subtitle {
            margin-top: 10px;
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 30px 20px;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 30px;
            color: #555;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Milea Estate Vineyard</h1>
            <div class="subtitle">KPI Dashboard Reports</div>
            <div class="subtitle" style="font-size: 14px; margin-top: 5px;">
              ${subscribedReports.length} Report${subscribedReports.length > 1 ? 's' : ''} - ${new Date().toLocaleDateString()}
            </div>
          </div>
          
          <div class="content">
            <div class="greeting">
              Hello ${name},
            </div>
            
            <div class="greeting">
              Here are your KPI dashboard reports for the following periods: ${subscribedReports.map(r => r.toUpperCase()).join(', ')}.
            </div>
            
            ${reportSections}
          </div>
          
          <div class="footer">
            <p>These reports were generated automatically by the Milea Estate Vineyard KPI Dashboard system.</p>
            <p>If you have any questions, please contact your system administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send the comprehensive email
    const { data, error } = await resend.emails.send({
      from: 'Milea Estate Vineyard <onboarding@resend.dev>',
      to: [email],
      subject: `Milea Estate Vineyard - KPI Dashboard Reports (${subscribedReports.length} Report${subscribedReports.length > 1 ? 's' : ''})`,
      html: comprehensiveEmail,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    console.log('Comprehensive KPI email sent successfully:', data);
    return NextResponse.json({ 
      success: true, 
      message: `Comprehensive KPI dashboard email sent successfully with ${subscribedReports.length} report(s)!`,
      data 
    });

  } catch (error) {
    console.error('Error sending comprehensive KPI email:', error);
    return NextResponse.json({ 
      error: 'Failed to send comprehensive KPI email: ' + (error instanceof Error ? error.message : 'Unknown error') 
    }, { status: 500 });
  }
} 