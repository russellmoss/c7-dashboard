import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import React from "react";
import { AIInsightsPanel } from './ai-insights-panel';

interface ComprehensiveMetricsProps {
  data: any;
  insights: any;
}

export function ComprehensiveMetrics({ data, insights }: ComprehensiveMetricsProps) {
  if (!data) return <div className="text-center text-red-600">No data available.</div>;
  const { current, previous, yearOverYear, periodLabel, dateRange } = {
    ...data,
    ...data.current,
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0);
  const formatPercent = (value: number) => value == null ? 'N/A' : `${Number(value).toFixed(1)}%`;

  // Section Heading
  const SectionHeading = ({ children, color = "wine" }: { children: React.ReactNode, color?: string }) => (
    <h2 className={`text-xl md:text-2xl font-bold mb-4 mt-8 text-${color}-700 tracking-tight`}>{children}</h2>
  );

  // Metric Card
  const MetricCard = ({ title, value, sub, change, color = "wine", format = 'currency' }: any) => {
    const isPositive = change > 0;
    const formatter = format === 'currency' ? formatCurrency : formatPercent;
    return (
      <Card className={`transition-shadow shadow-sm hover:shadow-lg bg-${color}-50/60 border-${color}-100`}> 
        <CardContent className="py-6 flex flex-col gap-2 items-start animate-fade-in">
          <span className={`text-xs font-semibold uppercase text-${color}-700 tracking-wider`}>{title}</span>
          <span className="text-3xl md:text-4xl font-extrabold text-slate-900">{formatter(value)}</span>
          {sub && <span className="text-xs text-slate-500">{sub}</span>}
          {change != null && (
            <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <ArrowUpIcon className="w-4 h-4 mr-1" /> : <ArrowDownIcon className="w-4 h-4 mr-1" />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </CardContent>
      </Card>
    );
  };

  // Responsive grid for metric cards
  const MetricGrid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">{children}</div>
  );

  // Club Signup Breakdown
  const ClubSignupCard = ({ breakdown }: { breakdown: any }) => (
    <Card className="bg-amber-50/60 border-amber-100 animate-fade-in">
      <CardContent className="py-4">
        <h3 className="font-semibold text-amber-700 mb-2">Club Signup Breakdown</h3>
        <ul className="space-y-1">
          {Object.entries(breakdown || {}).map(([club, count]: [string, any]) => (
            <li key={club} className="flex justify-between">
              <span>{club}</span>
              <span className="font-semibold">{count}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );

  // Guest Breakdown
  const GuestBreakdownCard = ({ breakdown }: { breakdown: any }) => (
    <Card className="bg-amber-50/60 border-amber-100 animate-fade-in">
      <CardContent className="py-4">
        <h3 className="font-semibold text-amber-700 mb-2">Guest Breakdown</h3>
        <ul className="space-y-1">
          {Object.entries(breakdown || {}).map(([type, count]: [string, any]) => (
            <li key={type} className="flex justify-between">
              <span>{type}</span>
              <span className="font-semibold">{count}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );

  // Conversion Funnel
  const ConversionFunnelCard = ({ funnel }: { funnel: any }) => (
    <Card className="bg-amber-50/60 border-amber-100 animate-fade-in">
      <CardContent className="py-4">
        <h3 className="font-semibold text-amber-700 mb-2">Conversion Funnel</h3>
        <ul className="space-y-1">
          {Object.entries(funnel || {}).map(([type, count]: [string, any]) => (
            <li key={type} className="flex justify-between">
              <span className="capitalize">{type.replace(/([A-Z])/g, ' $1')}</span>
              <span className="font-semibold">{count}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );

  // Staff/Associate Performance Table
  const StaffTable = ({ associates }: { associates: any }) => (
    <Card className="bg-wine-50/60 border-wine-100 animate-fade-in overflow-x-auto">
      <CardContent className="py-4">
        <h3 className="font-semibold text-wine-700 mb-2">Staff Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-right">Orders</th>
                <th className="p-2 text-right">Guests</th>
                <th className="p-2 text-right">Revenue</th>
                <th className="p-2 text-right">Bottles</th>
                <th className="p-2 text-right">Wine Conv%</th>
                <th className="p-2 text-right">Club Conv%</th>
                <th className="p-2 text-right">Club Signups</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(associates || {}).map(([name, perf]: [string, any]) => (
                <tr key={name} className="border-b hover:bg-amber-50">
                  <td className="p-2 font-medium whitespace-nowrap">{name}</td>
                  <td className="p-2 text-right">{perf.orders}</td>
                  <td className="p-2 text-right">{perf.guests}</td>
                  <td className="p-2 text-right">{formatCurrency(perf.revenue)}</td>
                  <td className="p-2 text-right">{perf.bottles}</td>
                  <td className="p-2 text-right">{formatPercent(Number(perf.wineBottleConversionRate) || 0)}</td>
                  <td className="p-2 text-right">{formatPercent(Number(perf.clubConversionRate) || 0)}</td>
                  <td className="p-2 text-right">{perf.clubSignups}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  // Service Type Bar Chart
  const ServiceTypeChart = () => (
    <Card className="bg-wine-50/60 border-wine-100 animate-fade-in">
      <CardContent className="py-4">
        <h3 className="font-semibold text-wine-700 mb-2">Service Type Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={Object.entries(current.serviceTypeAnalysis || {}).map(([type, metrics]: [string, any]) => ({
            name: type,
            revenue: metrics.revenue,
            orders: metrics.orders,
            guests: metrics.guests
          }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Bar yAxisId="left" dataKey="revenue" fill="#a92020" name="Revenue" />
            <Bar yAxisId="right" dataKey="orders" fill="#f59e0b" name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  // Summary Banner
  const SummaryBanner = () => (
    <div className="rounded-xl bg-wine-600 text-white px-6 py-4 mb-8 shadow-md animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{current?.periodLabel || data?.periodLabel}</h1>
          <p className="text-sm md:text-base text-wine-100 font-medium">
            {current?.dateRange?.start} to {current?.dateRange?.end}
          </p>
        </div>
        <div className="text-amber-200 text-sm font-semibold">
          {data?.definitions?.totalRevenue}: <span className="ml-1">{formatCurrency(current?.overallMetrics?.totalRevenue)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-2 md:px-6">
      <SummaryBanner />

      {/* Key Metrics */}
      <SectionHeading color="wine">Key Metrics</SectionHeading>
      <MetricGrid>
        <MetricCard
          title="Total Revenue"
          value={current?.overallMetrics?.totalRevenue}
          sub="All sales in period"
          change={yearOverYear?.revenue?.change}
          color="wine"
        />
        <MetricCard
          title="Wine Conversion Rate"
          value={current?.overallMetrics?.wineBottleConversionRate}
          sub="% of guests who bought wine"
          change={yearOverYear?.wineConversionRate?.change}
          color="amber"
          format="percent"
        />
        <MetricCard
          title="Club Conversion Rate"
          value={current?.overallMetrics?.clubConversionRate}
          sub="% of guests who joined club"
          change={yearOverYear?.clubConversionRate?.change}
          color="amber"
          format="percent"
        />
        <MetricCard
          title="Total Guests"
          value={current?.overallMetrics?.totalGuests}
          sub="Unique guests in period"
          change={yearOverYear?.guests?.change}
          color="wine"
        />
      </MetricGrid>

      {/* Service Type, Club, Guest, Funnel */}
      <SectionHeading color="amber">Breakdowns & Funnels</SectionHeading>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ServiceTypeChart />
        <ClubSignupCard breakdown={current?.clubSignupBreakdown} />
        <GuestBreakdownCard breakdown={current?.guestBreakdown} />
        <ConversionFunnelCard funnel={current?.conversionFunnel} />
      </div>

      {/* Staff Performance */}
      <SectionHeading color="wine">Staff Performance</SectionHeading>
      <StaffTable associates={current?.associatePerformance} />

      {/* AI Insights */}
      <SectionHeading color="amber">AI Insights</SectionHeading>
      <AIInsightsPanel insights={insights} />
    </div>
  );
} 