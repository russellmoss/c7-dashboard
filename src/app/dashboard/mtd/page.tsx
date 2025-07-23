'use client';

import { useState, useEffect, useCallback } from 'react';
import { KPICard } from '@/components/dashboard/KPICard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { StaffTable } from '@/components/dashboard/StaffTable';
import { RefreshButton } from '@/components/dashboard/RefreshButton';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Calendar, TrendingUp, Wine, Crown, Users } from 'lucide-react';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import Link from 'next/link';

export default function MTDDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[MTD] Fetching MTD data...');
      const response = await fetch('/api/kpi/mtd');
      if (!response.ok) {
        const errData = await response.json();
        console.error('[MTD] Error response from API:', errData);
        throw new Error(errData.error || 'Failed to fetch data');
      }
      const result = await response.json();
      console.log('[MTD] API Response:', result);
      setData(result);
      setLastUpdated(new Date());
      // Extract and set insights for the panel
      if (result.data?.insights) {
        setInsights(result.data.insights);
        console.log('[MTD] ✅ AI Insights found:', result.data.insights);
      } else {
        setInsights(null);
        console.warn('[MTD] ⚠️ No AI insights in response');
      }
    } catch (err) {
      console.error('[MTD] Error fetching MTD data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setInsights(null);
    } finally {
      setLoading(false);
      console.log('[MTD] Loading state set to false');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="text-center p-10">Loading MTD Dashboard...</div>;
  }

  if (error) {
    return (
      <div className="p-10">
        <Card className="border-amber-200 bg-amber-50 max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-amber-900">No Data Available</h2>
              <p className="text-amber-700 my-2">{error}</p>
              <RefreshButton periodType="mtd" onRefreshComplete={fetchData} />
            </CardContent>
          </Card>
      </div>
    );
  }

  const current = data?.data?.current;
  const yoy = data?.data?.yearOverYear;
  const staff = current?.associatePerformance ? 
    Object.entries(current.associatePerformance).map(([name, perf]: any) => ({
      name,
      orders: perf.orders,
      revenue: perf.revenue,
      bottles: perf.bottles,
      clubSignups: perf.clubSignups,
      wineBottleConversionRate: perf.wineBottleConversionRate,
      clubConversionRate: perf.clubConversionRate,
      wineBottleConversionGoalVariance: perf.wineBottleConversionGoalVariance,
      clubConversionGoalVariance: perf.clubConversionGoalVariance,
    })) : [];
  const praise = data?.insights?.staffPraise || [];
  const coaching = data?.insights?.staffCoaching || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center px-3 py-1.5 rounded bg-wine-600 text-white hover:bg-wine-700 transition font-semibold text-sm shadow">
            Home
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Month to Date Performance</h1>
            <div className="flex items-center text-slate-600 mt-1">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{current?.periodLabel}</span>
              {lastUpdated && (
                <span className="ml-4 text-sm">
                  Last updated: {lastUpdated.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <RefreshButton periodType="mtd" onRefreshComplete={fetchData} />
      </div>
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard title="Total Revenue" value={`$${yoy?.revenue?.current?.toLocaleString()}`} change={yoy?.revenue?.change} icon={<TrendingUp />} />
          <KPICard title="Wine Conversion" value={`${yoy?.wineConversionRate?.current}%`} goal={yoy?.wineConversionRate?.goal} goalVariance={yoy?.wineConversionRate?.goalVariance} icon={<Wine />} />
          <KPICard title="Club Conversion" value={`${yoy?.clubConversionRate?.current}%`} goal={yoy?.clubConversionRate?.goal} goalVariance={yoy?.clubConversionRate?.goalVariance} icon={<Crown />} />
          <KPICard title="Total Guests" value={yoy?.guests?.current?.toLocaleString()} change={yoy?.guests?.change} icon={<Users />} />
      </div>
      {/* Charts and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <RevenueChart data={current} />
        </div>
        {/* AI Insights Panel */}
        <div>
          <AIInsightsPanel 
            insights={insights}
            loading={loading}
          />
        </div>
      </div>
      {/* Staff Table */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4 text-wine-700">Staff Performance</h2>
        <StaffTable staff={staff} praise={praise} coaching={coaching} />
      </div>
    </div>
  );
} 