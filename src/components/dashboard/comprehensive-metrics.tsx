import React from 'react';

import { DollarSign, Wine, Users, TrendingUp } from 'lucide-react';
import { AIInsightsPanel } from "./ai-insights-panel";
import { KPICard } from "./KPICard";

interface ComprehensiveMetricsProps {
  data: any;
  insights: any;
}

export function ComprehensiveMetrics({
  data,
  insights,
}: ComprehensiveMetricsProps) {
  if (!data)
    return <div className="text-center text-red-600">No data available.</div>;
  const { current, yearOverYear } = data;

  // Section Heading
  const SectionHeading = ({
    children,
    color = "wine",
  }: {
    children: React.ReactNode;
    color?: string;
  }) => (
    <h2
      className={`text-xl md:text-2xl font-bold mb-4 mt-8 text-${color}-700 tracking-tight`}
    >
      {children}
    </h2>
  );

  // Summary Banner
  const SummaryBanner = () => (
    <div className="rounded-xl bg-wine-600 text-white px-6 py-4 mb-8 shadow-md animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {current?.periodLabel || data?.periodLabel}
          </h1>
          <p className="text-sm md:text-base text-wine-100 font-medium">
            {current?.dateRange?.start} to {current?.dateRange?.end}
          </p>
        </div>
        <div className="text-amber-200 text-sm font-semibold">
          {data?.definitions?.totalRevenue}:{" "}
          <span className="ml-1">
            {current?.overallMetrics?.totalRevenue?.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-2 md:px-6">
      <SummaryBanner />

      {/* Key Metrics */}
      <SectionHeading color="wine">Key Metrics</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <KPICard
          title="Total Revenue"
          value={current?.overallMetrics?.totalRevenue}
          change={yearOverYear?.revenue?.change}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <KPICard
          title="Wine Conversion Rate"
          value={current?.overallMetrics?.wineBottleConversionRate}
          change={yearOverYear?.wineConversionRate?.change}
          goal={yearOverYear?.wineConversionRate?.goal}
          goalVariance={yearOverYear?.wineConversionRate?.goalVariance}
          icon={<Wine className="w-5 h-5" />}
        />
        <KPICard
          title="Club Conversion Rate"
          value={current?.overallMetrics?.clubConversionRate}
          change={yearOverYear?.clubConversionRate?.change}
          goal={yearOverYear?.clubConversionRate?.goal}
          goalVariance={yearOverYear?.clubConversionRate?.goalVariance}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KPICard
          title="Total Guests"
          value={current?.overallMetrics?.totalGuests}
          change={yearOverYear?.guests?.change}
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      {/* Service Type, Club, Guest, Funnel */}
      <SectionHeading color="amber">Breakdowns & Funnels</SectionHeading>
      {/* TODO: Add ServiceTypeChart, ClubSignupCard, GuestBreakdownCard, ConversionFunnelCard here */}

      {/* Staff Performance */}
      <SectionHeading color="wine">Staff Performance</SectionHeading>
      {/* TODO: Add StaffTable here */}

      {/* AI Insights */}
      <SectionHeading color="amber">AI Insights</SectionHeading>
      <AIInsightsPanel insights={insights} />
    </div>
  );
}
