"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";

export const dynamic = 'force-dynamic';

interface ArchiveCompetition {
  _id: string;
  name: string;
  type: "bottleConversion" | "clubConversion" | "aov";
  dashboard: "mtd" | "qtd" | "ytd";
  startDate: string;
  endDate: string;
  status: "completed" | "archived";
  participantCount: number;
  winnerCount: number;
  winners: {
    first: { name: string; value: number } | null;
    second: { name: string; value: number } | null;
    third: { name: string; value: number } | null;
  };
  prizes: {
    first: string;
    second: string;
    third: string;
  };
  welcomeMessage: {
    sent: boolean;
    sentAt: string | null;
  };
  progressNotifications: Array<{
    id: string;
    scheduledAt: string;
    sent: boolean;
    sentAt: string | null;
  }>;
  winnerAnnouncement: {
    sent: boolean;
    sentAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
  duration: number;
  completionRate: number;
}

interface ArchiveStatistics {
  totalCompetitions: number;
  totalParticipants: number;
  totalWinners: number;
  averageParticipants: number;
  averageWinners: number;
  byType: {
    bottleConversion: { count: number; participants: number; winners: number };
    clubConversion: { count: number; participants: number; winners: number };
    aov: { count: number; participants: number; winners: number };
  };
  byDashboard: {
    mtd: { count: number; participants: number; winners: number };
    qtd: { count: number; participants: number; winners: number };
    ytd: { count: number; participants: number; winners: number };
  };
  byMonth: Array<{
    month: string;
    count: number;
    participants: number;
    winners: number;
  }>;
  recentActivity: {
    lastCompleted: string | null;
    lastArchived: string | null;
    competitionsThisMonth: number;
    competitionsThisQuarter: number;
  };
}

export default function ArchiveManagement() {
  const [competitions, setCompetitions] = useState<ArchiveCompetition[]>([]);
  const [statistics, setStatistics] = useState<ArchiveStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    dashboard: "",
    status: "",
    hasWinners: "",
    hasWinnerAnnouncement: "",
    participants: "",
    duration: "",
  });
  const [sort, setSort] = useState({
    field: "endDate",
    direction: "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });

  // Fetch competitions and statistics
  const fetchData = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortField: sort.field,
        sortDirection: sort.direction,
      });

      if (searchTerm) params.append("search", searchTerm);
      if (filters.type) params.append("type", filters.type);
      if (filters.dashboard) params.append("dashboard", filters.dashboard);
      if (filters.status) params.append("status", filters.status);
      if (filters.hasWinners !== "")
        params.append("hasWinners", filters.hasWinners);
      if (filters.hasWinnerAnnouncement !== "")
        params.append("hasWinnerAnnouncement", filters.hasWinnerAnnouncement);
      if (filters.participants)
        params.append("participants", filters.participants);
      if (filters.duration) params.append("duration", filters.duration);

      // Fetch competitions
      const competitionsResponse = await fetch(
        `/api/archive/competitions?${params}`,
      );
      const competitionsData = await competitionsResponse.json();

      if (competitionsData.success) {
        setCompetitions(competitionsData.data.competitions);
        setPagination((prev) => ({
          ...prev,
          totalCount: competitionsData.data.totalCount,
          totalPages: competitionsData.data.totalPages,
        }));
      }

      // Fetch statistics
      const statsResponse = await fetch("/api/archive/statistics");
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStatistics(statsData.data);
      }
    } catch (error) {
      console.error("Error fetching archive data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.page, sort, filters, searchTerm]);

  // Handle archive/restore action
  const handleArchiveAction = async (
    competitionId: string,
    action: "archive" | "restore",
  ) => {
    try {
      const response = await fetch(
        `/api/archive/competitions/${competitionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        },
      );

      if (response.ok) {
        alert(`Competition ${action}d successfully!`);
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing competition:`, error);
      alert(`Failed to ${action} competition`);
    }
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: "bg-green-100 text-green-800",
      archived: "bg-gray-100 text-gray-800",
    };
    return badges[status as keyof typeof badges] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading archive data...</div>
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
            📚 Archive Management
          </h1>
        </div>
        <div className="text-sm text-gray-600">
          {pagination.totalCount} competitions found
        </div>
      </div>

      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Competitions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.totalCompetitions}
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
                {statistics.totalParticipants}
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
                {statistics.totalWinners}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.averageParticipants}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🔍 Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <Input
                placeholder="Search competitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type-filter">Type</Label>
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
                    Bottle Conversion
                  </SelectItem>
                  <SelectItem value="clubConversion">
                    Club Conversion
                  </SelectItem>
                  <SelectItem value="aov">Average Order Value</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dashboard-filter">Dashboard</Label>
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

            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
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

            <div className="space-y-2">
              <Label htmlFor="participants-filter">Participants</Label>
              <Select
                value={filters.participants}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, participants: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue>All</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="high">High (10+)</SelectItem>
                  <SelectItem value="medium">Medium (5-9)</SelectItem>
                  <SelectItem value="low">Low (1-4)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration-filter">Duration</Label>
              <Select
                value={filters.duration}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, duration: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue>All</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="short">Short (1-7 days)</SelectItem>
                  <SelectItem value="medium">Medium (8-30 days)</SelectItem>
                  <SelectItem value="long">Long (31+ days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Has Winners
              </label>
              <Select
                value={filters.hasWinners}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, hasWinners: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue>All</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Winner Announcement
              </label>
              <Select
                value={filters.hasWinnerAnnouncement}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    hasWinnerAnnouncement: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue>All</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="true">Sent</SelectItem>
                  <SelectItem value="false">Not Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sort Options */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium">Sort by:</label>
          <Select
            value={sort.field}
            onValueChange={(value) =>
              setSort((prev) => ({ ...prev, field: value as any }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue>Sort By</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="endDate">End Date</SelectItem>
              <SelectItem value="startDate">Start Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="participantCount">Participants</SelectItem>
              <SelectItem value="winnerCount">Winners</SelectItem>
              <SelectItem value="createdAt">Created</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSort((prev) => ({
                ...prev,
                direction: prev.direction === "asc" ? "desc" : "asc",
              }))
            }
          >
            {sort.direction === "asc" ? "↑" : "↓"}
          </Button>
        </div>
      </div>

      {/* Competitions List */}
      <div className="space-y-4">
        {competitions.map((competition) => (
          <Card key={competition._id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{competition.name}</CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge className={getStatusBadge(competition.status)}>
                      {competition.status}
                    </Badge>
                    <Badge variant="outline">
                      {getTypeLabel(competition.type)}
                    </Badge>
                    <Badge variant="outline">
                      {getDashboardLabel(competition.dashboard)}
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {competition.status === "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleArchiveAction(competition._id, "archive")
                      }
                    >
                      📚 Archive
                    </Button>
                  )}
                  {competition.status === "archived" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleArchiveAction(competition._id, "restore")
                      }
                    >
                      🔄 Restore
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-600">
                    Duration
                  </h4>
                  <p className="text-lg">{competition.duration} days</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-600">
                    Participants
                  </h4>
                  <p className="text-lg">{competition.participantCount}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Winners</h4>
                  <p className="text-lg">{competition.winnerCount}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-600">
                    Completion Rate
                  </h4>
                  <p className="text-lg">{competition.completionRate}%</p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Winners */}
              {competition.winnerCount > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-sm text-gray-600 mb-2">
                    🏆 Winners
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {competition.winners.first && (
                      <div className="text-center p-3 bg-yellow-100 rounded-lg">
                        <div className="text-2xl">🥇</div>
                        <div className="font-bold">
                          {competition.winners.first.name}
                        </div>
                        <div className="text-xs">
                          {competition.winners.first.value}
                          {competition.type === "aov" ? "" : "%"}
                        </div>
                      </div>
                    )}
                    {competition.winners.second && (
                      <div className="text-center p-3 bg-gray-100 rounded-lg">
                        <div className="text-2xl">🥈</div>
                        <div className="font-bold">
                          {competition.winners.second.name}
                        </div>
                        <div className="text-xs">
                          {competition.winners.second.value}
                          {competition.type === "aov" ? "" : "%"}
                        </div>
                      </div>
                    )}
                    {competition.winners.third && (
                      <div className="text-center p-3 bg-orange-100 rounded-lg">
                        <div className="text-2xl">🥉</div>
                        <div className="font-bold">
                          {competition.winners.third.name}
                        </div>
                        <div className="text-xs">
                          {competition.winners.third.value}
                          {competition.type === "aov" ? "" : "%"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Start:</span>{" "}
                  {formatDate(competition.startDate)}
                </div>
                <div>
                  <span className="font-medium">End:</span>{" "}
                  {formatDate(competition.endDate)}
                </div>
              </div>

              {/* SMS Status */}
              <div className="mt-4 flex space-x-4 text-sm">
                <div
                  className={`flex items-center ${competition.welcomeMessage.sent ? "text-green-600" : "text-gray-400"}`}
                >
                  {competition.welcomeMessage.sent ? "✅" : "❌"} Welcome SMS
                </div>
                <div
                  className={`flex items-center ${competition.winnerAnnouncement.sent ? "text-green-600" : "text-gray-400"}`}
                >
                  {competition.winnerAnnouncement.sent ? "✅" : "❌"} Winner
                  Announcement
                </div>
                <div className="flex items-center text-blue-600">
                  📊{" "}
                  {
                    competition.progressNotifications.filter((n) => n.sent)
                      .length
                  }
                  /{competition.progressNotifications.length} Progress SMS
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <Button
            variant="outline"
            disabled={pagination.page === 1}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
            }
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={pagination.page === pagination.totalPages}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
            }
          >
            Next
          </Button>
        </div>
      )}

      {competitions.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No competitions found matching your criteria.
        </div>
      )}
    </div>
  );
}
