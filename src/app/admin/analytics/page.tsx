"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface StaffInsight {
  staffName: string;
  totalCompetitions: number;
  totalWins: number;
  winRate: number;
  averageRank: number;
  performanceTrend: "increasing" | "decreasing" | "stable";
  favoriteType: string;
  effectivenessScore: number;
}

interface CompetitionInsight {
  competitionName: string;
  type: string;
  dashboard: string;
  participants: number;
  completionRate: number;
  averageRank: number;
  effectivenessScore: number;
}

interface CompetitionAnalytics {
  overview: {
    totalCompetitions: number;
    totalParticipants: number;
    totalWinners: number;
    averageParticipants: number;
    averageWinners: number;
    averageDuration: number;
    averageCompletionRate: number;
  };
  trends: {
    monthly: Array<{
      month: string;
      competitions: number;
      participants: number;
      winners: number;
      averageParticipants: number;
    }>;
    quarterly: Array<{
      quarter: string;
      competitions: number;
      participants: number;
      winners: number;
      averageParticipants: number;
    }>;
    yearly: Array<{
      year: string;
      competitions: number;
      participants: number;
      winners: number;
      averageParticipants: number;
    }>;
  };
  performance: {
    byType: {
      bottleConversion: CompetitionTypeAnalytics;
      clubConversion: CompetitionTypeAnalytics;
      aov: CompetitionTypeAnalytics;
    };
    byDashboard: {
      mtd: DashboardAnalytics;
      qtd: DashboardAnalytics;
      ytd: DashboardAnalytics;
    };
    byStaff: Array<StaffPerformanceAnalytics>;
  };
  effectiveness: {
    participationRates: {
      overall: number;
      byType: { [key: string]: number };
      byDashboard: { [key: string]: number };
    };
    completionRates: {
      welcomeMessage: number;
      progressNotifications: number;
      winnerAnnouncement: number;
      overall: number;
    };
    engagementMetrics: {
      averageRank: number;
      rankDistribution: { [key: string]: number };
      winnerRepeatRate: number;
      participationGrowth: number;
    };
  };
  insights: {
    topPerformers: Array<StaffInsight>;
    mostEffectiveCompetitions: Array<CompetitionInsight>;
    trends: Array<AnalyticsInsight>;
    recommendations: Array<string>;
  };
}

interface CompetitionTypeAnalytics {
  count: number;
  totalParticipants: number;
  totalWinners: number;
  averageParticipants: number;
  averageWinners: number;
  averageDuration: number;
  averageCompletionRate: number;
  participationRate: number;
  winnerDistribution: {
    firstPlace: number;
    secondPlace: number;
    thirdPlace: number;
  };
  performanceTrend: "increasing" | "decreasing" | "stable";
  effectivenessScore: number;
}

interface DashboardAnalytics {
  count: number;
  totalParticipants: number;
  totalWinners: number;
  averageParticipants: number;
  averageWinners: number;
  averageDuration: number;
  averageCompletionRate: number;
  participationRate: number;
  mostPopularType: string;
  performanceTrend: "increasing" | "decreasing" | "stable";
  effectivenessScore: number;
}

interface StaffPerformanceAnalytics {
  staffName: string;
  totalCompetitions: number;
  totalParticipations: number;
  totalWins: number;
  averageRank: number;
  bestRank: number;
  winRate: number;
  participationRate: number;
  performanceTrend: "increasing" | "decreasing" | "stable";
  favoriteType: string;
  favoriteDashboard: string;
  effectivenessScore: number;
  recentPerformance: Array<{
    competitionName: string;
    rank: number;
    value: number;
    date: string;
  }>;
}

interface AnalyticsInsight {
  type: "trend" | "anomaly" | "opportunity" | "warning";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  recommendation: string;
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<CompetitionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "",
    dashboard: "",
    staffMember: "",
    status: "all",
    startDate: "",
    endDate: "",
  });

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.type) params.append("type", filters.type);
      if (filters.dashboard) params.append("dashboard", filters.dashboard);
      if (filters.staffMember)
        params.append("staffMember", filters.staffMember);
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const response = await fetch(`/api/analytics/competitions?${params}`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [filters]);

  // Helper functions
  const getTypeLabel = (type: string) => {
    const labels = {
      bottleConversion: "🍷 Bottle Conversion",
      clubConversion: "👥 Club Conversion",
      aov: "💰 Average Order Value",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getDashboardLabel = (dashboard: string) => {
    const labels = {
      mtd: "Month-to-Date",
      qtd: "Quarter-to-Date",
      ytd: "Year-to-Date",
    };
    return labels[dashboard as keyof typeof labels] || dashboard;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return "📈";
      case "decreasing":
        return "📉";
      default:
        return "➡️";
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "trend":
        return "📊";
      case "anomaly":
        return "⚠️";
      case "opportunity":
        return "🎯";
      case "warning":
        return "🚨";
      default:
        return "ℹ️";
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "trend":
        return "bg-blue-100 text-blue-800";
      case "anomaly":
        return "bg-yellow-100 text-yellow-800";
      case "opportunity":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading analytics data...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          Failed to load analytics data
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <a
            href="/admin"
            className="inline-flex items-center px-4 py-2 rounded bg-wine-600 text-white hover:bg-wine-700 transition font-semibold text-sm shadow mr-4"
          >
            ← Back to Admin
          </a>
          <h1 className="text-2xl font-bold text-wine-900">
            📊 Competition Analytics Dashboard
          </h1>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🔍 Analytics Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Competition Type
              </label>
              <Select
                value={filters.type}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue>All Types</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="bottleConversion">
                    🍷 Bottle Conversion
                  </SelectItem>
                  <SelectItem value="clubConversion">
                    👥 Club Conversion
                  </SelectItem>
                  <SelectItem value="aov">💰 Average Order Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Dashboard
              </label>
              <Select
                value={filters.dashboard}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, dashboard: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue>All Dashboards</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Dashboards</SelectItem>
                  <SelectItem value="mtd">Month-to-Date</SelectItem>
                  <SelectItem value="qtd">Quarter-to-Date</SelectItem>
                  <SelectItem value="ytd">Year-to-Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue>All Statuses</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Staff Member
              </label>
              <Input
                placeholder="Filter by staff member..."
                value={filters.staffMember}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    staffMember: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Competitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.overview.totalCompetitions}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.overview.totalParticipants}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Winners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.overview.totalWinners}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.overview.averageCompletionRate}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {Object.entries(analytics.performance.byType).map(([type, data]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{getTypeLabel(type)}</span>
                <Badge
                  className={
                    data.effectivenessScore >= 80
                      ? "bg-green-100 text-green-800"
                      : data.effectivenessScore >= 60
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                  }
                >
                  {data.effectivenessScore}/100
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Competitions:</span>
                  <span className="font-medium">{data.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Avg Participants:
                  </span>
                  <span className="font-medium">
                    {data.averageParticipants}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Winners:</span>
                  <span className="font-medium">{data.averageWinners}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Participation Rate:
                  </span>
                  <span className="font-medium">{data.participationRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Trend:</span>
                  <span className="font-medium">
                    {getTrendIcon(data.performanceTrend)}{" "}
                    {data.performanceTrend}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance by Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {Object.entries(analytics.performance.byDashboard).map(
          ([dashboard, data]) => (
            <Card key={dashboard}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{getDashboardLabel(dashboard)}</span>
                  <Badge
                    className={
                      data.effectivenessScore >= 80
                        ? "bg-green-100 text-green-800"
                        : data.effectivenessScore >= 60
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }
                  >
                    {data.effectivenessScore}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Competitions:</span>
                    <span className="font-medium">{data.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Avg Participants:
                    </span>
                    <span className="font-medium">
                      {data.averageParticipants}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Most Popular Type:
                    </span>
                    <span className="font-medium">
                      {getTypeLabel(data.mostPopularType)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Participation Rate:
                    </span>
                    <span className="font-medium">
                      {data.participationRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Trend:</span>
                    <span className="font-medium">
                      {getTrendIcon(data.performanceTrend)}{" "}
                      {data.performanceTrend}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      {/* Staff Performance */}
      {analytics.performance.byStaff.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>👥 Staff Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.performance.byStaff.map((staff, index) => (
                <div key={staff.staffName} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-blue-100 text-blue-800">
                        #{index + 1}
                      </Badge>
                      <h3 className="font-semibold">{staff.staffName}</h3>
                    </div>
                    <Badge
                      className={
                        staff.effectivenessScore >= 80
                          ? "bg-green-100 text-green-800"
                          : staff.effectivenessScore >= 60
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }
                    >
                      {staff.effectivenessScore}/100
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Win Rate:</span>
                      <div className="font-medium">{staff.winRate}%</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Rank:</span>
                      <div className="font-medium">{staff.averageRank}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Best Rank:</span>
                      <div className="font-medium">{staff.bestRank}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Trend:</span>
                      <div className="font-medium">
                        {getTrendIcon(staff.performanceTrend)}{" "}
                        {staff.performanceTrend}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Effectiveness Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>📊 Participation Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Overall:</span>
                <span className="font-medium">
                  {analytics.effectiveness.participationRates.overall}%
                </span>
              </div>
              {Object.entries(
                analytics.effectiveness.participationRates.byType,
              ).map(([type, rate]) => (
                <div key={type} className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    {getTypeLabel(type)}:
                  </span>
                  <span className="font-medium">{rate}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>📱 Completion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Welcome SMS:</span>
                <span className="font-medium">
                  {analytics.effectiveness.completionRates.welcomeMessage}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Progress SMS:</span>
                <span className="font-medium">
                  {
                    analytics.effectiveness.completionRates
                      .progressNotifications
                  }
                  %
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Winner Announcement:
                </span>
                <span className="font-medium">
                  {analytics.effectiveness.completionRates.winnerAnnouncement}%
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Overall:</span>
                <span>{analytics.effectiveness.completionRates.overall}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {analytics.insights.trends.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>💡 Analytics Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.insights.trends.map((insight, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold">{insight.title}</h4>
                        <Badge className={getInsightColor(insight.type)}>
                          {insight.impact} impact
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {insight.description}
                      </p>
                      <p className="text-sm font-medium text-blue-600">
                        💡 {insight.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analytics.insights.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.insights.recommendations.map(
                (recommendation, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-blue-600">•</span>
                    <span className="text-sm">{recommendation}</span>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
