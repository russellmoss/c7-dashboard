'use client';

import { useState, useEffect, useCallback } from 'react';
import { KPICard } from '@/components/dashboard/KPICard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { StaffTable } from '@/components/dashboard/StaffTable';
import { RefreshButton } from '@/components/dashboard/RefreshButton';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, TrendingUp, Wine, Crown, Users } from 'lucide-react';

export default function YTDDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/kpi/ytd');
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="text-center p-10">Loading YTD Dashboard...</div>;
  }

  if (error) {
    return (
      <div className="p-10">
        <Card className="border-amber-200 bg-amber-50 max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-amber-900">No Data Available</h2>
              <p className="text-amber-700 my-2">{error}</p>
              <RefreshButton periodType="ytd" onRefreshComplete={fetchData} />
            </CardContent>
          </Card>
      </div>
    );
  }

  const current = data?.data?.current;
  const yoy = data?.data?.yearOverYear;
  const staff = current?.associatePerformance ? Object.entries(current.associatePerformance).map(([name, perf]: any) => ({
    name,
    orders: perf.orders,
    revenue: perf.revenue,
    bottles: perf.bottles,
    clubSignups: perf.clubSignups,
  })) : [];
  const praise = data?.insights?.staffPraise || [];
  const coaching = data?.insights?.staffCoaching || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Year to Date Performance</h1>
        <RefreshButton periodType="ytd" onRefreshComplete={fetchData} />
      </div>
      <p className="text-slate-600 mb-6">
        {current?.periodLabel} | Last updated: {new Date(data?.lastUpdated).toLocaleString()}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard title="Total Revenue" value={`$${yoy?.revenue?.current?.toLocaleString()}`} change={yoy?.revenue?.change} icon={<TrendingUp />} />
          <KPICard title="Wine Conversion" value={`${yoy?.wineConversionRate?.current}%`} goal={yoy?.wineConversionRate?.goal} goalVariance={yoy?.wineConversionRate?.goalVariance} icon={<Wine />} />
          <KPICard title="Club Conversion" value={`${yoy?.clubConversionRate?.current}%`} goal={yoy?.clubConversionRate?.goal} goalVariance={yoy?.clubConversionRate?.goalVariance} icon={<Crown />} />
          <KPICard title="Total Guests" value={yoy?.guests?.current?.toLocaleString()} change={yoy?.guests?.change} icon={<Users />} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <RevenueChart data={current} />
        </div>
        <div>
            {/* AI Insights Component would go here */}
        </div>
      </div>
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4 text-wine-700">Staff Performance</h2>
        <StaffTable staff={staff} praise={praise} coaching={coaching} />
      </div>
    </div>
  );
} 