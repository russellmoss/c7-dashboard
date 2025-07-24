import { EmailSubscription } from './email-service';

export interface KPIDashboardData {
  periodType: string;
  periodLabel: string;
  dateRange: {
    start: string;
    end: string;
  };
  overallMetrics: {
    totalRevenue: number;
    totalOrders: number;
    totalGuests: number;
    totalBottlesSold: number;
    avgOrderValue: number;
    wineBottleConversionRate: number;
    clubConversionRate: number;
  };
  yearOverYear: {
    revenue: { current: number; previous: number; change: number | null };
    guests: { current: number; previous: number; change: number | null };
    orders: { current: number; previous: number; change: number | null };
  };
  associatePerformance: { [key: string]: any };
  insights?: {
    strengths: string[];
    recommendations: string[];
  };
}

export class EmailTemplates {
  static generateKPIDashboardEmail(subscription: EmailSubscription, kpiData: KPIDashboardData): string {
    const periodLabel = kpiData.periodLabel || kpiData.periodType.toUpperCase();
    const dateRange = `${kpiData.dateRange.start} to ${kpiData.dateRange.end}`;
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Milea Estate Vineyard - ${periodLabel} KPI Report</title>
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
          .header .period {
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
          .metrics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .metric-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border-left: 4px solid #a92020;
          }
          .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #a92020;
            margin-bottom: 5px;
          }
          .metric-label {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .yoy-section {
            background: #f0f8ff;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
          }
          .yoy-title {
            font-size: 18px;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 15px;
            text-align: center;
          }
          .yoy-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
          }
          .yoy-item {
            text-align: center;
          }
          .yoy-current {
            font-size: 20px;
            font-weight: bold;
            color: #2c5aa0;
          }
          .yoy-change {
            font-size: 14px;
            margin-top: 5px;
          }
          .yoy-positive {
            color: #28a745;
          }
          .yoy-negative {
            color: #dc3545;
          }
          .yoy-neutral {
            color: #6c757d;
          }
          .staff-section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #a92020;
          }
          .staff-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .staff-table th {
            background: #a92020;
            color: white;
            padding: 12px 8px;
            font-size: 14px;
            font-weight: 600;
            text-align: left;
          }
          .staff-table td {
            padding: 12px 8px;
            border-bottom: 1px solid #eee;
            font-size: 14px;
          }
          .staff-table tr:nth-child(even) {
            background: #f8f9fa;
          }
          .conversion-rate {
            font-weight: bold;
          }
          .conversion-good {
            color: #28a745;
          }
          .conversion-warning {
            color: #ffc107;
          }
          .conversion-poor {
            color: #dc3545;
          }
          .insights-section {
            background: #fff3cd;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
          }
          .insights-title {
            font-size: 18px;
            font-weight: bold;
            color: #856404;
            margin-bottom: 15px;
          }
          .insights-list {
            margin: 0;
            padding-left: 20px;
          }
          .insights-list li {
            margin-bottom: 8px;
            color: #856404;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .footer a {
            color: #a92020;
            text-decoration: none;
          }
          @media (max-width: 600px) {
            .metrics-grid {
              grid-template-columns: 1fr;
            }
            .yoy-grid {
              grid-template-columns: 1fr;
            }
            .staff-table {
              font-size: 12px;
            }
            .staff-table th,
            .staff-table td {
              padding: 8px 4px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Milea Estate Vineyard</h1>
            <div class="period">${periodLabel} KPI Report</div>
            <div class="period" style="font-size: 14px; margin-top: 5px;">${dateRange}</div>
          </div>
          
          <div class="content">
            <div class="greeting">
              Hello ${subscription.name},
            </div>
            
            <div class="greeting">
              Here's your ${periodLabel.toLowerCase()} KPI dashboard report. Below you'll find key metrics, year-over-year comparisons, and staff performance insights.
            </div>
            
            <!-- Key Metrics -->
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value">$${kpiData.overallMetrics.totalRevenue.toLocaleString()}</div>
                <div class="metric-label">Total Revenue</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${kpiData.overallMetrics.totalGuests.toLocaleString()}</div>
                <div class="metric-label">Total Guests</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${kpiData.overallMetrics.totalOrders.toLocaleString()}</div>
                <div class="metric-label">Total Orders</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${kpiData.overallMetrics.totalBottlesSold.toLocaleString()}</div>
                <div class="metric-label">Bottles Sold</div>
              </div>
            </div>
            
            <!-- Year Over Year -->
            <div class="yoy-section">
              <div class="yoy-title">Year Over Year Comparison</div>
              <div class="yoy-grid">
                <div class="yoy-item">
                  <div class="yoy-current">$${kpiData.yearOverYear.revenue.current.toLocaleString()}</div>
                  <div class="yoy-change ${this.getYoYClass(kpiData.yearOverYear.revenue.change)}">
                    ${this.formatYoYChange(kpiData.yearOverYear.revenue.change)} Revenue
                  </div>
                </div>
                <div class="yoy-item">
                  <div class="yoy-current">${kpiData.yearOverYear.guests.current.toLocaleString()}</div>
                  <div class="yoy-change ${this.getYoYClass(kpiData.yearOverYear.guests.change)}">
                    ${this.formatYoYChange(kpiData.yearOverYear.guests.change)} Guests
                  </div>
                </div>
                <div class="yoy-item">
                  <div class="yoy-current">${kpiData.yearOverYear.orders.current.toLocaleString()}</div>
                  <div class="yoy-change ${this.getYoYClass(kpiData.yearOverYear.orders.change)}">
                    ${this.formatYoYChange(kpiData.yearOverYear.orders.change)} Orders
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Staff Performance -->
            ${this.generateStaffPerformanceTable(kpiData.associatePerformance)}
            
            <!-- AI Insights -->
            ${kpiData.insights ? this.generateInsightsSection(kpiData.insights) : ''}
          </div>
          
          <div class="footer">
            <p>This report was generated automatically by the Milea Estate Vineyard KPI Dashboard system.</p>
            <p>If you have any questions, please contact your system administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private static getYoYClass(change: number | null): string {
    if (change === null) return 'yoy-neutral';
    return change > 0 ? 'yoy-positive' : change < 0 ? 'yoy-negative' : 'yoy-neutral';
  }

  private static formatYoYChange(change: number | null): string {
    if (change === null) return 'N/A';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }

  private static generateStaffPerformanceTable(associatePerformance: { [key: string]: any }): string {
    const associates = Object.entries(associatePerformance);
    
    if (associates.length === 0) {
      return `
        <div class="staff-section">
          <div class="section-title">Staff Performance</div>
          <p style="color: #666; font-style: italic;">No staff performance data available for this period.</p>
        </div>
      `;
    }

    const rows = associates.map(([name, data]) => {
      const wineConversionClass = this.getConversionClass(data.wineBottleConversionRate);
      const clubConversionClass = this.getConversionClass(data.clubConversionRate);
      
      return `
        <tr>
          <td>${name}</td>
          <td>${data.guests.toLocaleString()}</td>
          <td>$${data.revenue.toLocaleString()}</td>
          <td class="conversion-rate ${wineConversionClass}">${data.wineBottleConversionRate}%</td>
          <td class="conversion-rate ${clubConversionClass}">${data.clubConversionRate}%</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="staff-section">
        <div class="section-title">Staff Performance</div>
        <table class="staff-table">
          <thead>
            <tr>
              <th>Associate</th>
              <th>Guests</th>
              <th>Revenue</th>
              <th>Wine Conv.</th>
              <th>Club Conv.</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  private static getConversionClass(rate: number | string): string {
    const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
    if (numRate >= 25) return 'conversion-good';
    if (numRate >= 15) return 'conversion-warning';
    return 'conversion-poor';
  }

  private static generateInsightsSection(insights: { strengths: string[]; recommendations: string[] }): string {
    const strengthsList = insights.strengths.map(strength => `<li>${strength}</li>`).join('');
    const recommendationsList = insights.recommendations.map(rec => `<li>${rec}</li>`).join('');

    return `
      <div class="insights-section">
        <div class="insights-title">AI Insights & Recommendations</div>
        ${insights.strengths.length > 0 ? `
          <div style="margin-bottom: 15px;">
            <strong style="color: #856404;">Key Strengths:</strong>
            <ul class="insights-list">
              ${strengthsList}
            </ul>
          </div>
        ` : ''}
        ${insights.recommendations.length > 0 ? `
          <div>
            <strong style="color: #856404;">Recommendations:</strong>
            <ul class="insights-list">
              ${recommendationsList}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Generate just the content section (without header/footer) for multi-report emails
  static generateKPIDashboardEmailSection(kpiData: KPIDashboardData): string {
    const periodLabel = kpiData.periodLabel || kpiData.periodType.toUpperCase();
    const dateRange = `${kpiData.dateRange.start} to ${kpiData.dateRange.end}`;
    
    return `
      <div style="margin-bottom: 40px;">
        <h2 style="color: #a92020; font-size: 24px; margin-bottom: 10px; border-bottom: 2px solid #a92020; padding-bottom: 10px;">
          ${periodLabel} Report
        </h2>
        <p style="color: #666; font-size: 14px; margin-bottom: 20px;">${dateRange}</p>
        
        <!-- Key Metrics -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border-left: 4px solid #a92020;">
            <div style="font-size: 24px; font-weight: bold; color: #a92020; margin-bottom: 5px;">$${kpiData.overallMetrics.totalRevenue.toLocaleString()}</div>
            <div style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Total Revenue</div>
          </div>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border-left: 4px solid #a92020;">
            <div style="font-size: 24px; font-weight: bold; color: #a92020; margin-bottom: 5px;">${kpiData.overallMetrics.totalGuests.toLocaleString()}</div>
            <div style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Total Guests</div>
          </div>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border-left: 4px solid #a92020;">
            <div style="font-size: 24px; font-weight: bold; color: #a92020; margin-bottom: 5px;">${kpiData.overallMetrics.totalOrders.toLocaleString()}</div>
            <div style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Total Orders</div>
          </div>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border-left: 4px solid #a92020;">
            <div style="font-size: 24px; font-weight: bold; color: #a92020; margin-bottom: 5px;">${kpiData.overallMetrics.totalBottlesSold.toLocaleString()}</div>
            <div style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Bottles Sold</div>
          </div>
        </div>
        
        <!-- Year Over Year -->
        <div style="background: #f0f8ff; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
          <div style="font-size: 18px; font-weight: bold; color: #2c5aa0; margin-bottom: 15px; text-align: center;">Year Over Year Comparison</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div style="text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: #2c5aa0;">$${kpiData.yearOverYear.revenue.current.toLocaleString()}</div>
              <div style="font-size: 14px; margin-top: 5px; color: ${this.getYoYClass(kpiData.yearOverYear.revenue.change) === 'yoy-positive' ? '#28a745' : this.getYoYClass(kpiData.yearOverYear.revenue.change) === 'yoy-negative' ? '#dc3545' : '#6c757d'}">
                ${this.formatYoYChange(kpiData.yearOverYear.revenue.change)} Revenue
              </div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: #2c5aa0;">${kpiData.yearOverYear.guests.current.toLocaleString()}</div>
              <div style="font-size: 14px; margin-top: 5px; color: ${this.getYoYClass(kpiData.yearOverYear.guests.change) === 'yoy-positive' ? '#28a745' : this.getYoYClass(kpiData.yearOverYear.guests.change) === 'yoy-negative' ? '#dc3545' : '#6c757d'}">
                ${this.formatYoYChange(kpiData.yearOverYear.guests.change)} Guests
              </div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: #2c5aa0;">${kpiData.yearOverYear.orders.current.toLocaleString()}</div>
              <div style="font-size: 14px; margin-top: 5px; color: ${this.getYoYClass(kpiData.yearOverYear.orders.change) === 'yoy-positive' ? '#28a745' : this.getYoYClass(kpiData.yearOverYear.orders.change) === 'yoy-negative' ? '#dc3545' : '#6c757d'}">
                ${this.formatYoYChange(kpiData.yearOverYear.orders.change)} Orders
              </div>
            </div>
          </div>
        </div>
        
        <!-- Staff Performance -->
        ${this.generateStaffPerformanceTable(kpiData.associatePerformance)}
        
        <!-- AI Insights -->
        ${kpiData.insights ? this.generateInsightsSection(kpiData.insights) : ''}
      </div>
    `;
  }
} 