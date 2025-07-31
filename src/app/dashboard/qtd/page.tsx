"use client";

import React, { useState, useEffect, useCallback } from "react";
import { KPICard } from "@/components/dashboard/KPICard";
import { StaffTable, useSortableTable } from "@/components/dashboard/StaffTable";
import { RefreshButton } from "@/components/dashboard/RefreshButton";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, TrendingUp, Wine, Crown, Users } from "lucide-react";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";
import PDFExportButton from "@/components/dashboard/PDFExportButton";
import { TeamPerformanceAnalysis } from "@/components/dashboard/TeamPerformanceAnalysis";
import Link from "next/link";
import dynamicImport from "next/dynamic";

export const dynamic = 'force-dynamic';

const AIChat = dynamicImport(() => import("@/components/ai-assistant/AIChat"), {
  ssr: false,
});


export default function QTDDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/kpi/qtd");
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch data");
      }
      const result = await response.json();
      setData(result);
      setLastUpdated(
        result.data?.generatedAt ? new Date(result.data.generatedAt) : null,
      );
      if (result.data?.insights) {
        setInsights(result.data.insights);
      } else {
        setInsights(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpiData = data?.data;
  const current = kpiData?.current;
  const yoy = kpiData?.yearOverYear;
  const staff = current?.associatePerformance
    ? Object.entries(current.associatePerformance).map(([name, perf]: any) => ({
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
      }))
    : [];
  const serviceTypeAnalysis = current?.serviceTypeAnalysis;
  const experienceTypes = ["tasting", "dining", "retail", "byTheGlass"];
  const experienceRows = experienceTypes.map((type) => ({
    type: type.replace("byTheGlass", "By The Glass"),
    ...(serviceTypeAnalysis?.[type] || {}),
  }));
  const experienceColumns = [
    { key: "type", label: "Type" },
    { key: "orders", label: "Orders", isNumeric: true },
    { key: "guests", label: "Guests", isNumeric: true },
    { key: "bottles", label: "Bottles", isNumeric: true },
    { key: "revenue", label: "Revenue", isNumeric: true },
    {
      key: "bottleConversionRate",
      label: "Bottle Conv. Rate",
      isNumeric: true,
    },
    { key: "clubConversionRate", label: "Club Conv. Rate", isNumeric: true },
    { key: "aov", label: "AOV", isNumeric: true },
  ];
  const {
    sortedData: sortedExperienceRows,
    sortKey: expSortKey,
    sortOrder: expSortOrder,
    handleSort: handleExpSort,
  } = useSortableTable(experienceRows, experienceColumns);

  if (loading) {
    return <div className="text-center p-10">Loading QTD Dashboard...</div>;
  }

  if (error) {
    return (
      <div className="p-10">
        <Card className="border-amber-200 bg-amber-50 max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-amber-900">
              No Data Available
            </h2>
            <p className="text-amber-700 my-2">{error}</p>
            <RefreshButton periodType="qtd" onRefreshComplete={fetchData} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center px-3 py-1.5 rounded bg-wine-600 text-white hover:bg-wine-700 transition font-semibold text-sm shadow"
          >
            Home
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Quarter to Date Performance
            </h1>
            <div className="flex items-center text-slate-600 mt-1">
              <span>{current?.periodLabel}</span>
              {lastUpdated && (
                <span className="ml-4 text-sm">
                  Last updated: {lastUpdated.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <PDFExportButton periodType="qtd" />
          <RefreshButton periodType="qtd" onRefreshComplete={fetchData} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Revenue"
          value={`$${yoy?.revenue?.current?.toLocaleString() || "0"}`}
          change={yoy?.revenue?.change}
          icon={<TrendingUp />}
        />
        <KPICard
          title="Wine Conversion"
          value={`${yoy?.wineConversionRate?.current || 0}%`}
          goal={yoy?.wineConversionRate?.goal}
          goalVariance={yoy?.wineConversionRate?.goalVariance}
          icon={<Wine />}
        />
        <KPICard
          title="Club Conversion"
          value={`${yoy?.clubConversionRate?.current || 0}%`}
          goal={yoy?.clubConversionRate?.goal}
          goalVariance={yoy?.clubConversionRate?.goalVariance}
          icon={<Crown />}
        />
        <KPICard
          title="Total Guests"
          value={yoy?.guests?.current?.toLocaleString() || "0"}
          change={yoy?.guests?.change}
          icon={<Users />}
        />
      </div>
      {/* Experience Type Breakdown */}
      {serviceTypeAnalysis && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2 text-foreground">
            Experience Type Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border rounded-lg bg-card">
              <thead>
                <tr className="bg-muted">
                  {experienceColumns.map((col) => (
                    <th
                      key={col.key as string}
                      onClick={() => handleExpSort(col.key as any)}
                      className="px-3 py-2 text-left cursor-pointer select-none group text-card-foreground"
                    >
                      <span className="flex items-center">
                        {col.label}
                        {expSortKey === col.key && (
                          <span className="ml-1 text-xs">
                            {expSortOrder === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedExperienceRows.map((row, idx) => (
                  <tr key={row.type || idx} className="border-t border-border">
                    <td className="px-3 py-2 font-medium capitalize text-card-foreground">
                      {row.type}
                    </td>
                    <td className="px-3 py-2 text-right text-card-foreground">
                      {row.orders ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-card-foreground">
                      {row.guests ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-card-foreground">
                      {row.bottles ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-card-foreground">
                      {row.revenue != null
                        ? `$${row.revenue.toLocaleString()}`
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-card-foreground">
                      {row.bottleConversionRate != null
                        ? `${row.bottleConversionRate}%`
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-card-foreground">
                      {row.clubConversionRate != null
                        ? `${row.clubConversionRate}%`
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-card-foreground">
                      {row.aov != null ? `$${row.aov.toLocaleString()}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Charts and Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <AIInsightsPanel insights={insights} loading={loading} />
        </div>
      </div>
      {staff.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-wine-700">
            Staff Performance
          </h2>
          <StaffTable staff={staff} />
        </div>
      )}

      {/* Team Performance Analysis */}
      {current?.associatePerformance && (
        <TeamPerformanceAnalysis 
          associatePerformance={current.associatePerformance}
          periodLabel="Quarter-to-Date"
        />
      )}
    </div>
  );
}
