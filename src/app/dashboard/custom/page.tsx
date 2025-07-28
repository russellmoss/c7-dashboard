'use client';

import { useState, useEffect, useCallback } from 'react';
import { KPICard } from '@/components/dashboard/KPICard';
import { StaffTable, useSortableTable } from '@/components/dashboard/StaffTable';
import { CustomRefreshButton } from '@/components/dashboard/CustomRefreshButton';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Calendar, TrendingUp, Wine, Crown, Users } from 'lucide-react';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import PDFExportButton from '@/components/dashboard/PDFExportButton';
import Link from 'next/link';

const AIChat = dynamic(() => import('@/components/ai-assistant/AIChat'), { ssr: false });

interface KPIData {
  periodType: string;
  startDate: string;
  endDate: string;
  data: any;
  insights: any;
  lastUpdated: string;
}

export default function CustomDashboard() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<KPIData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Set default dates (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const generateCustomReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/kpi/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodType: 'custom',
          startDate,
          endDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start generation');
      }

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/kpi/status/custom?startDate=${startDate}&endDate=${endDate}`);
          const statusData = await statusResponse.json();

          if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            setGenerating(false);
            fetchCustomData();
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            setGenerating(false);
            setError('Generation failed: ' + statusData.error);
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      }, 2000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setGenerating(false);
        setError('Generation timed out. Please try again.');
      }, 300000);

    } catch (error) {
      setGenerating(false);
      setError('Failed to start generation');
    }
  };

  const fetchCustomData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kpi/custom?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const result = await response.json();
      setData(result);
      setLastUpdated(result.data?.generatedAt ? new Date(result.data.generatedAt) : null);
    } catch (error) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Load data when dates change
  useEffect(() => {
    if (startDate && endDate) {
      fetchCustomData();
    }
  }, [startDate, endDate, fetchCustomData]);

  const current = data?.data?.current;
  const yoy = data?.data?.yearOverYear;
  const insights = data?.insights;

  // Prepare staff data
  const staff = current?.associatePerformance ? 
    Object.entries(current.associatePerformance).map(([name, perf]: any) => ({
      name,
      orders: perf.orders,
      guests: perf.guests,
      revenue: perf.revenue,
      bottles: perf.bottles,
      clubSignups: perf.clubSignups,
      wineBottleConversionRate: perf.wineBottleConversionRate,
      clubConversionRate: perf.clubConversionRate,
      wineBottleConversionGoalVariance: perf.wineBottleConversionGoalVariance,
      clubConversionGoalVariance: perf.clubConversionGoalVariance,
      aov: perf.aov, // <-- Pass AOV
    })) : [];

  // Prepare experience breakdown data
  const serviceTypeAnalysis = current?.serviceTypeAnalysis;
  const experienceTypes = ['tasting', 'dining', 'retail', 'byTheGlass'];
  const experienceRows = experienceTypes.map((type) => ({
    type: type.replace('byTheGlass', 'By The Glass'),
    ...(serviceTypeAnalysis?.[type] || {}),
  }));

  const experienceColumns = [
    { key: 'type', label: 'Type' },
    { key: 'orders', label: 'Orders', isNumeric: true },
    { key: 'guests', label: 'Guests', isNumeric: true },
    { key: 'bottles', label: 'Bottles', isNumeric: true },
    { key: 'revenue', label: 'Revenue', isNumeric: true },
    { key: 'bottleConversionRate', label: 'Bottle Conv. Rate', isNumeric: true },
    { key: 'clubConversionRate', label: 'Club Conv. Rate', isNumeric: true },
    { key: 'aov', label: 'AOV', isNumeric: true },
  ];

  const { sortedData: sortedExperienceRows, sortKey: expSortKey, sortOrder: expSortOrder, handleSort: handleExpSort } = useSortableTable(experienceRows, experienceColumns);

  if (loading) {
    return <div className="text-center p-10">Loading Custom Dashboard...</div>;
  }

  if (error && !current) {
    return (
      <div className="p-10">
        <Card className="border-amber-200 bg-amber-50 max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-amber-900">No Data Available</h2>
            <p className="text-amber-700 my-2">{error}</p>
            <CustomRefreshButton 
              onRefresh={generateCustomReport}
              loading={generating}
              disabled={!startDate || !endDate}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center px-3 py-1.5 rounded bg-wine-600 text-white hover:bg-wine-700 transition font-semibold text-sm shadow">
            Home
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Custom Date Range Analysis</h1>
            <div className="flex items-center text-slate-600 mt-1">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{startDate} to {endDate}</span>
              {lastUpdated && (
                <span className="ml-4 text-sm">
                  Last updated: {lastUpdated.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <PDFExportButton 
            periodType="custom" 
            startDate={startDate} 
            endDate={endDate}
          />
          <CustomRefreshButton 
            onRefresh={generateCustomReport}
            loading={generating}
            disabled={!startDate || !endDate}
          />
        </div>
      </div>

      {/* Date Selection */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-wine-700">Date Range Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium text-slate-700">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium text-slate-700">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Button
                onClick={generateCustomReport}
                disabled={!startDate || !endDate || generating}
                className="w-full bg-wine-600 hover:bg-wine-700"
              >
                {generating ? 'Generating...' : 'Run Analysis'}
              </Button>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {current && (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard 
              title="Total Revenue" 
              value={`$${yoy?.revenue?.current?.toLocaleString() || '0'}`} 
              change={yoy?.revenue?.change} 
              icon={<TrendingUp />} 
            />
            <KPICard 
              title="Wine Conversion" 
              value={`${yoy?.wineConversionRate?.current || 0}%`} 
              goal={yoy?.wineConversionRate?.goal || 53} 
              goalVariance={yoy?.wineConversionRate?.goalVariance} 
              icon={<Wine />} 
            />
            <KPICard 
              title="Club Conversion" 
              value={`${yoy?.clubConversionRate?.current || 0}%`} 
              goal={yoy?.clubConversionRate?.goal || 6} 
              goalVariance={yoy?.clubConversionRate?.goalVariance} 
              icon={<Crown />} 
            />
            <KPICard 
              title="Total Guests" 
              value={yoy?.guests?.current?.toLocaleString() || '0'} 
              change={yoy?.guests?.change} 
              icon={<Users />} 
            />
          </div>

          {/* Experience Type Breakdown */}
          {serviceTypeAnalysis && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2 text-wine-700">Experience Type Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border rounded-lg bg-white">
                  <thead>
                    <tr className="bg-wine-50">
                      {experienceColumns.map((col) => (
                        <th
                          key={col.key as string}
                          onClick={() => handleExpSort(col.key as any)}
                          className="px-3 py-2 text-left cursor-pointer select-none group"
                        >
                          <span className="flex items-center">
                            {col.label}
                            {expSortKey === col.key && (
                              <span className="ml-1 text-xs">{expSortOrder === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedExperienceRows.map((row, idx) => (
                      <tr key={row.type || idx} className="border-t">
                        <td className="px-3 py-2 font-medium capitalize">{row.type}</td>
                        <td className="px-3 py-2 text-right">{row.orders ?? '-'}</td>
                        <td className="px-3 py-2 text-right">{row.guests ?? '-'}</td>
                        <td className="px-3 py-2 text-right">{row.bottles ?? '-'}</td>
                        <td className="px-3 py-2 text-right">{row.revenue != null ? `$${row.revenue.toLocaleString()}` : '-'}</td>
                        <td className="px-3 py-2 text-right">{row.bottleConversionRate != null ? `${row.bottleConversionRate}%` : '-'}</td>
                        <td className="px-3 py-2 text-right">{row.clubConversionRate != null ? `${row.clubConversionRate}%` : '-'}</td>
                        <td className="px-3 py-2 text-right">{row.aov != null ? `$${row.aov}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Insights Panel and AI Chat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <AIInsightsPanel insights={insights} loading={loading} />
            </div>
            <div>
              <AIChat />
            </div>
          </div>

          {/* Staff Table */}
          {staff.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-4 text-wine-700">Staff Performance</h2>
              <StaffTable staff={staff} />
            </div>
          )}
        </>
      )}
    </div>
  );
} 