import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { connectToDatabase } from '@/lib/mongodb';
import { KPIDataModel } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodType = searchParams.get('periodType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!periodType) {
      return NextResponse.json({ error: 'Period type is required' }, { status: 400 });
    }

    console.log(`[PDF] Generating PDF for: ${periodType}`);

    // Get the data from MongoDB
    await connectToDatabase();
    let kpiData;
    
    if (periodType === 'custom' && startDate && endDate) {
      kpiData = await KPIDataModel.findOne({
        periodType: 'custom',
        startDate,
        endDate
      });
    } else {
      kpiData = await KPIDataModel.findOne({
        periodType,
        year: new Date().getFullYear()
      });
    }

    if (!kpiData) {
      return NextResponse.json({ error: 'No data found for this period' }, { status: 404 });
    }

    // Launch Puppeteer
    console.log('[PDF] Launching Puppeteer...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    
    // Set viewport for better PDF rendering
    await page.setViewport({ width: 1200, height: 800 });
    
    // Generate HTML content for the PDF
    const htmlContent = generateDashboardHTML(kpiData, periodType, startDate || undefined, endDate || undefined);
    
    console.log('[PDF] Setting HTML content...');
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    // Wait for content to load
    console.log('[PDF] Waiting for content...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate PDF with proper settings
    console.log('[PDF] Generating PDF...');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; padding: 10px; text-align: center; width: 100%;">
          <span style="color: #a92020; font-weight: bold;">Milea Estate Vineyard</span> - KPI Dashboard
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; padding: 10px; text-align: center; width: 100%;">
          Generated on <span class="date"></span> | Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
      timeout: 30000
    });

    await browser.close();
    console.log('[PDF] PDF generated successfully');

    // Return the PDF
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="milea-kpi-${periodType}-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

function generateDashboardHTML(kpiData: any, periodType: string, startDate?: string, endDate?: string) {
  const data = kpiData.data;
  const current = data?.current;
  const yoy = data?.yearOverYear;
  
  const getPeriodTitle = () => {
    switch (periodType) {
      case 'mtd': return 'Month to Date Performance';
      case 'qtd': return 'Quarter to Date Performance';
      case 'ytd': return 'Year to Date Performance';
      case 'all-quarters': return 'All Quarters Performance';
      case 'custom': return `Custom Period: ${startDate} to ${endDate}`;
      default: return 'KPI Dashboard';
    }
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Milea Estate KPI Dashboard</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: #fdf2f2;
          color: #2d1a1a;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header h1 {
          color: #a92020;
          margin: 0;
          font-size: 28px;
        }
        .header p {
          color: #666;
          margin: 10px 0 0 0;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .metric-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        }
        .metric-title {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }
        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: #a92020;
          margin-bottom: 5px;
        }
        .metric-change {
          font-size: 12px;
          color: #666;
        }
        .section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        .section h2 {
          color: #a92020;
          margin-top: 0;
          font-size: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        th {
          background: #f8f9fa;
          font-weight: bold;
          color: #333;
        }
        .positive { color: #28a745; }
        .negative { color: #dc3545; }
        .insights {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin-top: 15px;
        }
        .insights h3 {
          margin-top: 0;
          color: #a92020;
        }
        .insights ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .insights li {
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Milea Estate Vineyard</h1>
        <p>${getPeriodTitle()}</p>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-title">Total Revenue</div>
          <div class="metric-value">$${yoy?.revenue?.current?.toLocaleString() || '0'}</div>
          <div class="metric-change">${yoy?.revenue?.change ? `${yoy.revenue.change > 0 ? '+' : ''}${yoy.revenue.change}%` : 'N/A'}</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Wine Conversion Rate</div>
          <div class="metric-value">${yoy?.wineConversionRate?.current || 0}%</div>
          <div class="metric-change">Goal: ${yoy?.wineConversionRate?.goal || 0}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Club Conversion Rate</div>
          <div class="metric-value">${yoy?.clubConversionRate?.current || 0}%</div>
          <div class="metric-change">Goal: ${yoy?.clubConversionRate?.goal || 0}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Total Guests</div>
          <div class="metric-value">${yoy?.guests?.current?.toLocaleString() || '0'}</div>
          <div class="metric-change">${yoy?.guests?.change ? `${yoy.guests.change > 0 ? '+' : ''}${yoy.guests.change}%` : 'N/A'}</div>
        </div>
      </div>

      ${current?.associatePerformance ? `
        <div class="section">
          <h2>Staff Performance</h2>
          <table>
            <thead>
              <tr>
                <th>Associate</th>
                <th>Orders</th>
                <th>Guests</th>
                <th>Revenue</th>
                <th>Wine Conv. Rate</th>
                <th>Club Conv. Rate</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(current.associatePerformance).map(([name, perf]: any) => `
                <tr>
                  <td>${name}</td>
                  <td>${perf.orders || 0}</td>
                  <td>${perf.guests || 0}</td>
                  <td>$${perf.revenue?.toLocaleString() || 0}</td>
                  <td>${perf.wineBottleConversionRate || 0}%</td>
                  <td>${perf.clubConversionRate || 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${kpiData.insights ? `
        <div class="section">
          <h2>AI Insights</h2>
          <div class="insights">
            ${kpiData.insights.strengths?.length ? `
              <h3>Strengths</h3>
              <ul>
                ${kpiData.insights.strengths.map((s: string) => `<li>${s}</li>`).join('')}
              </ul>
            ` : ''}
            ${kpiData.insights.recommendations?.length ? `
              <h3>Recommendations</h3>
              <ul>
                ${kpiData.insights.recommendations.map((r: string) => `<li>${r}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        </div>
      ` : ''}
    </body>
    </html>
  `;
} 