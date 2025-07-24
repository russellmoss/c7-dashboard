'use client';

import { useState, useEffect, useCallback } from 'react';
import { KPICard } from '@/components/dashboard/KPICard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { StaffTable } from '@/components/dashboard/StaffTable';
import { RefreshButton } from '@/components/dashboard/RefreshButton';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, TrendingUp, Wine, Crown, Users } from 'lucide-react';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import PDFExportButton from '@/components/dashboard/PDFExportButton';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const AIChat = dynamic(() => import('@/components/ai-assistant/AIChat'), { ssr: false });

export default function AllQuartersDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<any>(data?.insights || {});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/kpi/all-quarters');
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch data');
      }
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date(result.lastUpdated));
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
    return <div className="text-center p-10">Loading All-Quarters Dashboard...</div>;
  }

  if (error) {
    return (
      <div className="p-10">
        <Card className="border-amber-200 bg-amber-50 max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-amber-900">No Data Available</h2>
              <p className="text-amber-700 my-2">{error}</p>
              <RefreshButton periodType="all-quarters" onRefreshComplete={fetchData} />
            </CardContent>
          </Card>
      </div>
    );
  }

  const quarters = data?.data?.quarters || {};
  const quarterComparisons = data?.data?.quarterComparisons || {};
  // insights is now managed in state

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center px-3 py-1.5 rounded bg-wine-600 text-white hover:bg-wine-700 transition font-semibold text-sm shadow">
            Home
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">All Quarters Performance</h1>
            <div className="flex items-center text-slate-600 mt-1">
              {lastUpdated && (
                <span className="ml-4 text-sm">
                  Last updated: {lastUpdated.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <PDFExportButton periodType="all-quarters" />
          <RefreshButton periodType="all-quarters" onRefreshComplete={fetchData} />
        </div>
      </div>
      <p className="text-slate-600 mb-6">
        Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'N/A'}
      </p>
      {/* Quarter Summaries */}
      {Object.keys(quarters).length === 0 && (
        <div className="text-center text-slate-500">No quarter data available.</div>
      )}
      <div className="space-y-10">
        {Object.entries(quarters).map(([quarter, qData]: any) => {
          const comparison = quarterComparisons[quarter];
          const current = qData.current;
          const staff = current?.associatePerformance
            ? Object.entries(current.associatePerformance).map(([name, perf]: any) => ({
                name,
                guests: perf.guests,
                ...perf,
              }))
            : [];
          const quarterInsights = insights?.[quarter] || insights || null;
          return (
            <div key={quarter} className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-xl font-semibold mb-2 text-wine-700">{quarter.toUpperCase()} Performance</h2>
              <p className="text-slate-600 mb-4">{current?.periodLabel}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <KPICard title="Total Revenue" value={`$${comparison?.revenue?.current?.toLocaleString()}`} change={comparison?.revenue?.change} icon={<TrendingUp />} />
                <KPICard title="Wine Conversion" value={`${comparison?.wineConversionRate?.current}%`} goal={comparison?.wineConversionRate?.goal} goalVariance={comparison?.wineConversionRate?.goalVariance} icon={<Wine />} />
                <KPICard title="Club Conversion" value={`${comparison?.clubConversionRate?.current}%`} goal={comparison?.clubConversionRate?.goal} goalVariance={comparison?.clubConversionRate?.goalVariance} icon={<Crown />} />
                <KPICard title="Total Guests" value={comparison?.guests?.current?.toLocaleString()} change={comparison?.guests?.change} icon={<Users />} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <AIInsightsPanel insights={quarterInsights} loading={loading} />
                </div>
                <div>
                  <AIChat />
                </div>
              </div>
              {staff.length > 0 && (
                <div className="mt-8">
                  <StaffTable staff={staff} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 