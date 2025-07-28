"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Competition {
  _id: string;
  name: string;
  type: "bottleConversion" | "clubConversion" | "aov";
  competitionType: "ranking" | "target";
  dashboard: "mtd" | "qtd" | "ytd";
  status: "draft" | "active" | "completed" | "archived";
  startDate: string;
  endDate: string;
  prizes: {
    first: string;
    second: string;
    third: string;
  };
  targetGoals?: {
    bottleConversionRate?: number;
    clubConversionRate?: number;
    aov?: number;
  };
  welcomeMessage: {
    customText: string;
    sendAt: string | null;
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
    scheduledAt: string;
    sent: boolean;
    sentAt: string | null;
  };
  enrolledSubscribers: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
  totalParticipants: number;
  statistics?: {
    hasFinalRankings: boolean;
    winnerCount: number;
    averageRank: number | null;
  };
  createdAt: string;
  updatedAt: string;
}

interface Subscriber {
  _id: string;
  name: string;
  email: string;
  smsCoaching: {
    isActive: boolean;
    phoneNumber: string;
  };
}

export default function CompetitionAdmin() {
  const [activeTab, setActiveTab] = useState<"active" | "draft" | "archived">(
    "active",
  );
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [smsPreview, setSmsPreview] = useState<any>(null);

  const [progressSmsPreview, setProgressSmsPreview] = useState<any>(null);
  const [isProgressSmsPreviewLoading, setIsProgressSmsPreviewLoading] =
    useState(false);
  const [customProgressMessage, setCustomProgressMessage] = useState("");
  const [winnerAnnouncementPreview, setWinnerAnnouncementPreview] =
    useState<any>(null);
  const [
    isWinnerAnnouncementPreviewLoading,
    setIsWinnerAnnouncementPreviewLoading,
  ] = useState(false);
  const [customWinnerMessage, setCustomWinnerMessage] = useState("");

  // Form data for create/edit
  const [formData, setFormData] = useState({
    name: "",
    type: "bottleConversion" as "bottleConversion" | "clubConversion" | "aov",
    competitionType: "ranking" as "ranking" | "target",
    dashboard: "mtd" as "mtd" | "qtd" | "ytd",
    startDate: "",
    endDate: "",
    prizes: {
      first: "",
      second: "",
      third: "",
    },
    targetGoals: {
      bottleConversionRate: undefined as number | undefined,
      clubConversionRate: undefined as number | undefined,
      aov: undefined as number | undefined,
    },
    welcomeMessage: {
      customText: "",
      sendAt: null as string | null,
      scheduledDate: "",
      scheduledTime: "09:00",
    },
    progressNotifications: [] as Array<{
      scheduledDate: string;
      scheduledTime: string;
      customMessage: string;
    }>,
    winnerAnnouncement: {
      scheduledDate: "",
      scheduledTime: "10:00",
    },
    enrolledSubscribers: [] as string[],
  });

  // Populate form when editing competition
  useEffect(() => {
    if (editingCompetition) {
      setFormData({
        name: editingCompetition.name,
        type: editingCompetition.type,
        competitionType: editingCompetition.competitionType,
        dashboard: editingCompetition.dashboard,
        startDate: editingCompetition.startDate,
        endDate: editingCompetition.endDate,
        prizes: editingCompetition.prizes,
        targetGoals: {
          bottleConversionRate:
            editingCompetition.targetGoals?.bottleConversionRate,
          clubConversionRate:
            editingCompetition.targetGoals?.clubConversionRate,
          aov: editingCompetition.targetGoals?.aov,
        },
        welcomeMessage: {
          customText: editingCompetition.welcomeMessage.customText,
          sendAt: editingCompetition.welcomeMessage.sendAt,
          scheduledDate: editingCompetition.welcomeMessage.sendAt
            ? new Date(editingCompetition.welcomeMessage.sendAt)
                .toISOString()
                .split("T")[0]
            : "",
          scheduledTime: editingCompetition.welcomeMessage.sendAt
            ? new Date(editingCompetition.welcomeMessage.sendAt)
                .toTimeString()
                .slice(0, 5)
            : "09:00",
        },
        progressNotifications: editingCompetition.progressNotifications.map(
          (notification: any) => ({
            scheduledDate: new Date(notification.scheduledAt)
              .toISOString()
              .split("T")[0],
            scheduledTime: new Date(notification.scheduledAt)
              .toTimeString()
              .slice(0, 5),
            customMessage: notification.customMessage || "",
          }),
        ),
        winnerAnnouncement: {
          scheduledDate: editingCompetition.winnerAnnouncement.scheduledAt
            ? new Date(editingCompetition.winnerAnnouncement.scheduledAt)
                .toISOString()
                .split("T")[0]
            : "",
          scheduledTime: editingCompetition.winnerAnnouncement.scheduledAt
            ? new Date(editingCompetition.winnerAnnouncement.scheduledAt)
                .toTimeString()
                .slice(0, 5)
            : "10:00",
        },
        enrolledSubscribers: editingCompetition.enrolledSubscribers.map(
          (s) => s._id,
        ),
      });
      setIsModalOpen(true);
    }
  }, [editingCompetition]);

  useEffect(() => {
    fetchCompetitions();
    fetchSubscribers();
  }, [activeTab]);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const url =
        activeTab === "archived"
          ? "/api/competitions/archived"
          : `/api/competitions?status=${activeTab}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCompetitions(data.data.competitions || []);
      }
    } catch (error) {
      console.error("Error fetching competitions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const response = await fetch("/api/admin/subscriptions");
      if (response.ok) {
        const data = await response.json();
        setSubscribers(data.filter((s: any) => s.smsCoaching?.isActive));
      }
    } catch (error) {
      console.error("Error fetching subscribers:", error);
    }
  };

  const handleUpdateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompetition) return;

    try {
      const response = await fetch(
        `/api/competitions/${editingCompetition._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      if (response.ok) {
        console.log("Competition updated successfully");
        setIsModalOpen(false);
        setEditingCompetition(null);
        resetForm();
        fetchCompetitions();
      } else {
        const error = await response.json();
        console.error("Failed to update competition:", error);
        alert(
          `Failed to update competition: ${error.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Error updating competition:", error);
      alert("Error updating competition");
    }
  };

  const handleCreateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
        }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchCompetitions();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating competition:", error);
      alert("Failed to create competition");
    }
  };

  const handleActivateCompetition = async (id: string) => {
    try {
      const response = await fetch(`/api/competitions/${id}/activate`, {
        method: "POST",
      });

      if (response.ok) {
        fetchCompetitions();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error activating competition:", error);
      alert("Failed to activate competition");
    }
  };

  const handleSendWelcomeSMS = async (id: string) => {
    try {
      const response = await fetch(`/api/competitions/${id}/welcome-sms/send`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        fetchCompetitions();
        alert(
          `Welcome SMS sent successfully to ${result.data.sentCount} subscribers!`,
        );
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error sending welcome SMS:", error);
      alert("Failed to send welcome SMS");
    }
  };



  const handlePreviewProgressSMS = async (id: string) => {
    try {
      setIsProgressSmsPreviewLoading(true);
      const response = await fetch(
        `/api/competitions/${id}/progress-sms/preview`,
      );

      if (response.ok) {
        const result = await response.json();
        setProgressSmsPreview(result.data);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error previewing progress SMS:", error);
      alert("Failed to preview progress SMS");
    } finally {
      setIsProgressSmsPreviewLoading(false);
    }
  };

  const handleSendProgressSMS = async (id: string) => {
    try {
      const response = await fetch(
        `/api/competitions/${id}/progress-sms/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customMessage: customProgressMessage,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        fetchCompetitions();
        alert(
          `Progress SMS sent successfully to ${result.data.sentCount} subscribers!`,
        );
        setCustomProgressMessage("");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error sending progress SMS:", error);
      alert("Failed to send progress SMS");
    }
  };

  const handlePreviewWinnerAnnouncement = async (id: string) => {
    try {
      setIsWinnerAnnouncementPreviewLoading(true);
      const response = await fetch(
        `/api/competitions/${id}/winner-announcement/preview`,
      );

      if (response.ok) {
        const result = await response.json();
        setWinnerAnnouncementPreview(result.data);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error previewing winner announcement:", error);
      alert("Failed to preview winner announcement");
    } finally {
      setIsWinnerAnnouncementPreviewLoading(false);
    }
  };

  const handleSendWinnerAnnouncement = async (id: string) => {
    try {
      const response = await fetch(
        `/api/competitions/${id}/winner-announcement/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customMessage: customWinnerMessage,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        fetchCompetitions();
        alert(
          `Winner announcement sent successfully to ${result.data.sentCount} subscribers!`,
        );
        setCustomWinnerMessage("");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error sending winner announcement:", error);
      alert("Failed to send winner announcement");
    }
  };

  const handleDeleteCompetition = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this competition?")) return;

    try {
      const response = await fetch(`/api/competitions/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchCompetitions();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting competition:", error);
      alert("Failed to delete competition");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "bottleConversion" as "bottleConversion" | "clubConversion" | "aov",
      competitionType: "ranking" as "ranking" | "target",
      dashboard: "mtd" as "mtd" | "qtd" | "ytd",
      startDate: "",
      endDate: "",
      prizes: { first: "", second: "", third: "" },
      targetGoals: {
        bottleConversionRate: undefined,
        clubConversionRate: undefined,
        aov: undefined,
      },
      welcomeMessage: {
        customText: "",
        sendAt: null,
        scheduledDate: "",
        scheduledTime: "09:00",
      },
      progressNotifications: [],
      winnerAnnouncement: { scheduledDate: "", scheduledTime: "10:00" },
      enrolledSubscribers: [],
    });
    setEditingCompetition(null);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "bg-gray-100 text-gray-800",
      active: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      archived: "bg-purple-100 text-purple-800",
    };
    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {status}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      bottleConversion: "🍷 Bottle Conversion",
      clubConversion: "👥 Club Conversion",
      aov: "💰 Average Order Value",
    };
    return labels[type as keyof typeof labels];
  };

  const getDashboardLabel = (dashboard: string) => {
    const labels = {
      mtd: "Month-to-Date",
      qtd: "Quarter-to-Date",
      ytd: "Year-to-Date",
    };
    return labels[dashboard as keyof typeof labels];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 rounded bg-wine-600 text-white hover:bg-wine-700 transition font-semibold text-sm shadow"
          >
            Home
          </a>
          <a
            href="/admin"
            className="inline-flex items-center px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-semibold text-sm shadow"
          >
            📧 Subscriptions
          </a>
          <a
            href="/admin/competitions"
            className="inline-flex items-center px-4 py-2 rounded bg-wine-600 text-white hover:bg-wine-700 transition font-semibold text-sm shadow"
          >
            🏆 Competitions
          </a>
          <a
            href="/admin/archive"
            className="inline-flex items-center px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-semibold text-sm shadow"
          >
            📚 Archive
          </a>
          <a
            href="/admin/analytics"
            className="inline-flex items-center px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-semibold text-sm shadow"
          >
            📊 Analytics
          </a>
          <a
            href="/admin/testing"
            className="inline-flex items-center px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-semibold text-sm shadow"
          >
            🧪 Testing
          </a>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Competition Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage staff competitions and SMS scheduling
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-wine-600 hover:bg-wine-700"
        >
          ➕ Create Competition
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {(["active", "draft", "archived"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-wine-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Competitions
          </button>
        ))}
      </div>

      {/* Competitions List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wine-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading competitions...</p>
        </div>
      ) : competitions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-600">No {activeTab} competitions found.</p>
            {activeTab === "draft" && (
              <Button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 bg-wine-600 hover:bg-wine-700"
              >
                Create Your First Competition
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {competitions.map((competition) => (
            <Card
              key={competition._id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">
                      {competition.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-2">
                      {getTypeLabel(competition.type)} •{" "}
                      {getDashboardLabel(competition.dashboard)} •{" "}
                      {competition.competitionType === "ranking"
                        ? "🏆 Ranking"
                        : "🎯 Target"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(competition.status)}
                    <div className="text-sm text-gray-500">
                      {competition.totalParticipants} participants
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Start:</span>
                    <div className="text-gray-600">
                      {new Date(competition.startDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">End:</span>
                    <div className="text-gray-600">
                      {new Date(competition.endDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Welcome SMS:</span>
                    <div className="text-gray-600">
                      {competition.welcomeMessage.sent
                        ? "✅ Sent"
                        : "⏳ Pending"}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Notifications:</span>
                    <div className="text-gray-600">
                      {competition.progressNotifications.length} scheduled
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Created{" "}
                    {new Date(competition.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex space-x-2">
                    {competition.status === "draft" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleActivateCompetition(competition._id)
                          }
                          className="bg-green-600 hover:bg-green-700"
                        >
                          🚀 Activate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCompetition(competition)}
                        >
                          ✏️ Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleDeleteCompetition(competition._id)
                          }
                        >
                          🗑️ Delete
                        </Button>
                      </>
                    )}
                    {competition.status === "active" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCompetition(competition)}
                        >
                          ✏️ Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleDeleteCompetition(competition._id)
                          }
                        >
                          🗑️ Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handlePreviewProgressSMS(competition._id)
                          }
                          disabled={isProgressSmsPreviewLoading}
                          className="mr-2"
                        >
                          📊 Preview Progress SMS
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSendProgressSMS(competition._id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          🚀 Send Progress SMS
                        </Button>
                      </>
                    )}
                    {competition.status === "completed" &&
                      !competition.winnerAnnouncement.sent && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handlePreviewWinnerAnnouncement(competition._id)
                            }
                            disabled={isWinnerAnnouncementPreviewLoading}
                            className="mr-2"
                          >
                            🏆 Preview Winner Announcement
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleSendWinnerAnnouncement(competition._id)
                            }
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            🎉 Send Winner Announcement
                          </Button>
                        </>
                      )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedCompetition(competition)}
                    >
                      👁️ View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Competition Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {editingCompetition
                  ? "Edit Competition"
                  : "Create New Competition"}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCompetition(null);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={
                editingCompetition
                  ? handleUpdateCompetition
                  : handleCreateCompetition
              }
              className="space-y-4"
            >
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Competition Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="QTD Bottle Conversion Challenge"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Competition Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {formData.type === "bottleConversion"
                          ? "🍷 Bottle Conversion"
                          : formData.type === "clubConversion"
                            ? "👥 Club Conversion"
                            : "💰 Average Order Value"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottleConversion">
                        🍷 Bottle Conversion
                      </SelectItem>
                      <SelectItem value="clubConversion">
                        👥 Club Conversion
                      </SelectItem>
                      <SelectItem value="aov">
                        💰 Average Order Value
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="competitionType">Competition Format *</Label>
                  <Select
                    value={formData.competitionType}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, competitionType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {formData.competitionType === "ranking"
                          ? "🏆 Ranking (Top 3)"
                          : "🎯 Target (Hit Goals)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ranking">
                        🏆 Ranking (Top 3)
                      </SelectItem>
                      <SelectItem value="target">
                        🎯 Target (Hit Goals)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Target Goals - Only show for target competitions */}
              {formData.competitionType === "target" && (
                <div>
                  <Label className="text-base font-medium">
                    🎯 Target Goals
                  </Label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <Label htmlFor="bottleTarget">
                        🍷 Bottle Conversion Rate (%)
                      </Label>
                      <Input
                        id="bottleTarget"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.targetGoals.bottleConversionRate || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            targetGoals: {
                              ...formData.targetGoals,
                              bottleConversionRate: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        placeholder="53.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="clubTarget">
                        👥 Club Conversion Rate (%)
                      </Label>
                      <Input
                        id="clubTarget"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.targetGoals.clubConversionRate || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            targetGoals: {
                              ...formData.targetGoals,
                              clubConversionRate: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        placeholder="6.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="aovTarget">💰 AOV Target ($)</Label>
                      <Input
                        id="aovTarget"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.targetGoals.aov || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            targetGoals: {
                              ...formData.targetGoals,
                              aov: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        placeholder="113.44"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dashboard">Dashboard Period *</Label>
                  <Select
                    value={formData.dashboard}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, dashboard: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {formData.dashboard === "mtd"
                          ? "Month-to-Date"
                          : formData.dashboard === "qtd"
                            ? "Quarter-to-Date"
                            : "Year-to-Date"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mtd">Month-to-Date</SelectItem>
                      <SelectItem value="qtd">Quarter-to-Date</SelectItem>
                      <SelectItem value="ytd">Year-to-Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {/* Prizes */}
              <div>
                <Label className="text-base font-medium">Prizes</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div>
                    <Label htmlFor="firstPrize">🥇 First Place</Label>
                    <Input
                      id="firstPrize"
                      value={formData.prizes.first}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prizes: { ...formData.prizes, first: e.target.value },
                        })
                      }
                      placeholder="🏆 $500 Gift Card"
                    />
                  </div>
                  <div>
                    <Label htmlFor="secondPrize">🥈 Second Place</Label>
                    <Input
                      id="secondPrize"
                      value={formData.prizes.second}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prizes: {
                            ...formData.prizes,
                            second: e.target.value,
                          },
                        })
                      }
                      placeholder="🥈 $250 Gift Card"
                    />
                  </div>
                  <div>
                    <Label htmlFor="thirdPrize">🥉 Third Place</Label>
                    <Input
                      id="thirdPrize"
                      value={formData.prizes.third}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prizes: { ...formData.prizes, third: e.target.value },
                        })
                      }
                      placeholder="🥉 $100 Gift Card"
                    />
                  </div>
                </div>
              </div>

              {/* Welcome Message */}
              <div>
                <Label htmlFor="welcomeMessage">Welcome Message *</Label>
                <textarea
                  id="welcomeMessage"
                  value={formData.welcomeMessage.customText}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      welcomeMessage: {
                        ...formData.welcomeMessage,
                        customText: e.target.value,
                      },
                    })
                  }
                  placeholder="Welcome to the competition! This is your custom welcome message..."
                  className="w-full p-3 border border-gray-300 rounded-md mt-2 h-24 resize-none"
                  required
                />
              </div>

              {/* Enrolled Subscribers */}
              <div>
                <Label className="text-base font-medium">
                  Enrolled Subscribers
                </Label>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                  {subscribers.map((subscriber) => (
                    <label
                      key={subscriber._id}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        checked={formData.enrolledSubscribers.includes(
                          subscriber._id,
                        )}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              enrolledSubscribers: [
                                ...formData.enrolledSubscribers,
                                subscriber._id,
                              ],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              enrolledSubscribers:
                                formData.enrolledSubscribers.filter(
                                  (id) => id !== subscriber._id,
                                ),
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">
                        {subscriber.name} ({subscriber.email})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* SMS Scheduling */}
              <div>
                <Label className="text-base font-medium">
                  📱 SMS Scheduling
                </Label>

                {/* Welcome Message Scheduling */}
                <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                  <Label className="text-sm font-medium">
                    🎉 Welcome Message
                  </Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label htmlFor="welcomeDate">Scheduled Date</Label>
                      <Input
                        id="welcomeDate"
                        type="date"
                        value={formData.welcomeMessage.scheduledDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            welcomeMessage: {
                              ...formData.welcomeMessage,
                              scheduledDate: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="welcomeTime">Scheduled Time</Label>
                      <Input
                        id="welcomeTime"
                        type="time"
                        value={formData.welcomeMessage.scheduledTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            welcomeMessage: {
                              ...formData.welcomeMessage,
                              scheduledTime: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label htmlFor="welcomeText">Welcome Message Text</Label>
                    <textarea
                      id="welcomeText"
                      className="w-full mt-1 p-2 border rounded-md"
                      rows={3}
                      value={formData.welcomeMessage.customText}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          welcomeMessage: {
                            ...formData.welcomeMessage,
                            customText: e.target.value,
                          },
                        })
                      }
                      placeholder="Welcome to our competition! This is a custom welcome message..."
                    />
                  </div>
                </div>

                {/* Progress Notifications Scheduling */}
                <div className="mt-4 p-4 border rounded-lg bg-blue-50">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm font-medium">
                      📊 Progress Notifications
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          progressNotifications: [
                            ...formData.progressNotifications,
                            {
                              scheduledDate: "",
                              scheduledTime: "14:00",
                              customMessage: "",
                            },
                          ],
                        })
                      }
                    >
                      ➕ Add Notification
                    </Button>
                  </div>

                  {formData.progressNotifications.map((notification, index) => (
                    <div
                      key={index}
                      className="mt-3 p-3 border rounded bg-white"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-sm">
                          Notification #{index + 1}
                        </Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              progressNotifications:
                                formData.progressNotifications.filter(
                                  (_, i) => i !== index,
                                ),
                            })
                          }
                        >
                          🗑️ Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`progressDate${index}`}>Date</Label>
                          <Input
                            id={`progressDate${index}`}
                            type="date"
                            value={notification.scheduledDate}
                            onChange={(e) => {
                              const updated = [
                                ...formData.progressNotifications,
                              ];
                              updated[index].scheduledDate = e.target.value;
                              setFormData({
                                ...formData,
                                progressNotifications: updated,
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`progressTime${index}`}>Time</Label>
                          <Input
                            id={`progressTime${index}`}
                            type="time"
                            value={notification.scheduledTime}
                            onChange={(e) => {
                              const updated = [
                                ...formData.progressNotifications,
                              ];
                              updated[index].scheduledTime = e.target.value;
                              setFormData({
                                ...formData,
                                progressNotifications: updated,
                              });
                            }}
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label htmlFor={`progressMessage${index}`}>
                          Custom Message (Optional)
                        </Label>
                        <textarea
                          id={`progressMessage${index}`}
                          className="w-full mt-1 p-2 border rounded-md"
                          rows={2}
                          value={notification.customMessage}
                          onChange={(e) => {
                            const updated = [...formData.progressNotifications];
                            updated[index].customMessage = e.target.value;
                            setFormData({
                              ...formData,
                              progressNotifications: updated,
                            });
                          }}
                          placeholder="Optional custom message for this progress update..."
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Winner Announcement Scheduling */}
                <div className="mt-4 p-4 border rounded-lg bg-green-50">
                  <Label className="text-sm font-medium">
                    🏆 Winner Announcement
                  </Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label htmlFor="winnerDate">Scheduled Date</Label>
                      <Input
                        id="winnerDate"
                        type="date"
                        value={formData.winnerAnnouncement.scheduledDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            winnerAnnouncement: {
                              ...formData.winnerAnnouncement,
                              scheduledDate: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="winnerTime">Scheduled Time</Label>
                      <Input
                        id="winnerTime"
                        type="time"
                        value={formData.winnerAnnouncement.scheduledTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            winnerAnnouncement: {
                              ...formData.winnerAnnouncement,
                              scheduledTime: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-wine-600 hover:bg-wine-700">
                  {editingCompetition
                    ? "Update Competition"
                    : "Create Competition"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Competition Details Modal */}
      {selectedCompetition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">{selectedCompetition.name}</h2>
              <Button
                variant="outline"
                onClick={() => setSelectedCompetition(null)}
              >
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Competition Details */}
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Competition Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Type:</span>{" "}
                    {getTypeLabel(selectedCompetition.type)}
                  </div>
                  <div>
                    <span className="font-medium">Dashboard:</span>{" "}
                    {getDashboardLabel(selectedCompetition.dashboard)}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    {getStatusBadge(selectedCompetition.status)}
                  </div>
                  <div>
                    <span className="font-medium">Participants:</span>{" "}
                    {selectedCompetition.totalParticipants}
                  </div>
                  <div>
                    <span className="font-medium">Start Date:</span>{" "}
                    {new Date(selectedCompetition.startDate).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">End Date:</span>{" "}
                    {new Date(selectedCompetition.endDate).toLocaleString()}
                  </div>
                </div>

                <h4 className="text-md font-semibold mt-4 mb-2">Prizes</h4>
                <div className="space-y-1 text-sm">
                  <div>🥇 {selectedCompetition.prizes.first}</div>
                  <div>🥈 {selectedCompetition.prizes.second}</div>
                  <div>🥉 {selectedCompetition.prizes.third}</div>
                </div>
              </div>

              {/* SMS Status */}
              <div>
                <h3 className="text-lg font-semibold mb-3">SMS Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Welcome SMS</span>
                    <Badge
                      className={
                        selectedCompetition.welcomeMessage.sent
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {selectedCompetition.welcomeMessage.sent
                        ? "Sent"
                        : "Pending"}
                    </Badge>
                  </div>

                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <span>Progress Notifications</span>
                      <Badge>
                        {selectedCompetition.progressNotifications.length}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      {selectedCompetition.progressNotifications.map(
                        (notification) => (
                          <div
                            key={notification.id}
                            className="flex justify-between"
                          >
                            <span>
                              {new Date(
                                notification.scheduledAt,
                              ).toLocaleString()}
                            </span>
                            <Badge
                              className={
                                notification.sent
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {notification.sent ? "Sent" : "Scheduled"}
                            </Badge>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Winner Announcement</span>
                    <Badge
                      className={
                        selectedCompetition.winnerAnnouncement.sent
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {selectedCompetition.winnerAnnouncement.sent
                        ? "Sent"
                        : "Scheduled"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Participants</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {selectedCompetition.enrolledSubscribers.map((subscriber) => (
                  <div
                    key={subscriber._id}
                    className="p-2 bg-gray-50 rounded text-sm"
                  >
                    {subscriber.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMS Preview Modal */}
      {smsPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Welcome SMS Preview</h2>
              <Button variant="outline" onClick={() => setSmsPreview(null)}>
                ✕
              </Button>
            </div>

            {/* Competition Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">
                {smsPreview.competition.name}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span>{" "}
                  {getTypeLabel(smsPreview.competition.type)}
                </div>
                <div>
                  <span className="font-medium">Dashboard:</span>{" "}
                  {getDashboardLabel(smsPreview.competition.dashboard)}
                </div>
                <div>
                  <span className="font-medium">Participants:</span>{" "}
                  {smsPreview.statistics.totalSubscribers}
                </div>
                <div>
                  <span className="font-medium">Valid Phones:</span>{" "}
                  {smsPreview.statistics.validPhoneSubscribers}
                </div>
              </div>
            </div>

            {/* SMS Previews */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Message Previews</h3>
              {smsPreview.previews.map((preview: any, index: number) => (
                <div
                  key={preview.subscriberId}
                  className="border rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{preview.subscriberName}</h4>
                      <p className="text-sm text-gray-600">
                        {preview.subscriberEmail}
                      </p>
                    </div>
                    <Badge
                      className={
                        preview.hasValidPhone
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {preview.hasValidPhone ? "📱 Valid Phone" : "❌ No Phone"}
                    </Badge>
                  </div>
                  {preview.hasValidPhone && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">
                        Phone: {preview.phoneNumber}
                      </p>
                      <div className="bg-gray-100 p-3 rounded text-sm whitespace-pre-wrap font-mono">
                        {preview.message}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setSmsPreview(null)}>
                Close
              </Button>
              {smsPreview.statistics.canSendSms && (
                <Button
                  onClick={() => {
                    setSmsPreview(null);
                    handleSendWelcomeSMS(smsPreview.competition.id);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  📱 Send Welcome SMS
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress SMS Preview Modal */}
      {progressSmsPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Progress SMS Preview</h2>
              <Button
                variant="outline"
                onClick={() => setProgressSmsPreview(null)}
              >
                ✕
              </Button>
            </div>

            {/* Competition Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">
                {progressSmsPreview.competition.name}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span>{" "}
                  {getTypeLabel(progressSmsPreview.competition.type)}
                </div>
                <div>
                  <span className="font-medium">Dashboard:</span>{" "}
                  {getDashboardLabel(progressSmsPreview.competition.dashboard)}
                </div>
                <div>
                  <span className="font-medium">Participants:</span>{" "}
                  {progressSmsPreview.statistics.totalSubscribers}
                </div>
                <div>
                  <span className="font-medium">Valid Phones:</span>{" "}
                  {progressSmsPreview.statistics.validPhoneSubscribers}
                </div>
              </div>
            </div>

            {/* Rankings Summary */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Current Rankings</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total:</span>{" "}
                  {progressSmsPreview.rankings.statistics.totalParticipants}
                </div>
                <div>
                  <span className="font-medium">Average Rank:</span>{" "}
                  {progressSmsPreview.rankings.statistics.averageRank.toFixed(
                    1,
                  )}
                </div>
                <div>
                  <span className="font-medium">Top Rank:</span>{" "}
                  {progressSmsPreview.rankings.statistics.topRank}
                </div>
                <div>
                  <span className="font-medium">Bottom Rank:</span>{" "}
                  {progressSmsPreview.rankings.statistics.bottomRank}
                </div>
              </div>
            </div>

            {/* Custom Message Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Custom Message (Optional)
              </label>
              <textarea
                value={customProgressMessage}
                onChange={(e) => setCustomProgressMessage(e.target.value)}
                placeholder="Add a custom message to include in all progress SMS..."
                className="w-full p-2 border rounded-md"
                rows={3}
              />
            </div>

            {/* SMS Previews */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                AI-Generated Progress Messages
              </h3>
              {progressSmsPreview.previews.map(
                (preview: any, index: number) => (
                  <div
                    key={preview.subscriberId}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">
                          {preview.subscriberName}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {preview.subscriberEmail}
                        </p>
                        {preview.ranking && (
                          <p className="text-sm text-blue-600">
                            Rank: {preview.ranking.rank} of{" "}
                            {
                              progressSmsPreview.rankings.statistics
                                .totalParticipants
                            }
                            {preview.ranking.tied && " (tied)"}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={
                          preview.hasValidPhone
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {preview.hasValidPhone
                          ? "📱 Valid Phone"
                          : "❌ No Phone"}
                      </Badge>
                    </div>
                    {preview.hasValidPhone && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 mb-2">
                          Phone: {preview.phoneNumber}
                        </p>
                        <div className="bg-gray-100 p-3 rounded text-sm whitespace-pre-wrap font-mono">
                          {preview.message}
                        </div>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setProgressSmsPreview(null)}
              >
                Close
              </Button>
              {progressSmsPreview.statistics.canSendSms && (
                <Button
                  onClick={() => {
                    setProgressSmsPreview(null);
                    handleSendProgressSMS(progressSmsPreview.competition.id);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  🚀 Send Progress SMS
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Winner Announcement Preview Modal */}
      {winnerAnnouncementPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">
                Winner Announcement Preview
              </h2>
              <Button
                variant="outline"
                onClick={() => setWinnerAnnouncementPreview(null)}
              >
                ✕
              </Button>
            </div>

            {/* Competition Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">
                {winnerAnnouncementPreview.competition.name}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span>{" "}
                  {getTypeLabel(winnerAnnouncementPreview.competition.type)}
                </div>
                <div>
                  <span className="font-medium">Dashboard:</span>{" "}
                  {getDashboardLabel(
                    winnerAnnouncementPreview.competition.dashboard,
                  )}
                </div>
                <div>
                  <span className="font-medium">Participants:</span>{" "}
                  {winnerAnnouncementPreview.statistics.totalSubscribers}
                </div>
                <div>
                  <span className="font-medium">Valid Phones:</span>{" "}
                  {winnerAnnouncementPreview.statistics.validPhoneSubscribers}
                </div>
              </div>
            </div>

            {/* Winners Summary */}
            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">🏆 Winners</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {winnerAnnouncementPreview.winners.first && (
                  <div className="text-center p-3 bg-yellow-100 rounded-lg">
                    <div className="text-2xl">🥇</div>
                    <div className="font-bold">
                      {winnerAnnouncementPreview.winners.first.name}
                    </div>
                    <div className="text-xs">
                      {winnerAnnouncementPreview.winners.first.metricValue}
                      {winnerAnnouncementPreview.competition.type === "aov"
                        ? ""
                        : "%"}
                    </div>
                  </div>
                )}
                {winnerAnnouncementPreview.winners.second && (
                  <div className="text-center p-3 bg-gray-100 rounded-lg">
                    <div className="text-2xl">🥈</div>
                    <div className="font-bold">
                      {winnerAnnouncementPreview.winners.second.name}
                    </div>
                    <div className="text-xs">
                      {winnerAnnouncementPreview.winners.second.metricValue}
                      {winnerAnnouncementPreview.competition.type === "aov"
                        ? ""
                        : "%"}
                    </div>
                  </div>
                )}
                {winnerAnnouncementPreview.winners.third && (
                  <div className="text-center p-3 bg-orange-100 rounded-lg">
                    <div className="text-2xl">🥉</div>
                    <div className="font-bold">
                      {winnerAnnouncementPreview.winners.third.name}
                    </div>
                    <div className="text-xs">
                      {winnerAnnouncementPreview.winners.third.metricValue}
                      {winnerAnnouncementPreview.competition.type === "aov"
                        ? ""
                        : "%"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Final Rankings */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Final Rankings</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total:</span>{" "}
                  {
                    winnerAnnouncementPreview.rankings.statistics
                      .totalParticipants
                  }
                </div>
                <div>
                  <span className="font-medium">Average Rank:</span>{" "}
                  {winnerAnnouncementPreview.rankings.statistics.averageRank.toFixed(
                    1,
                  )}
                </div>
                <div>
                  <span className="font-medium">Top Rank:</span>{" "}
                  {winnerAnnouncementPreview.rankings.statistics.topRank}
                </div>
                <div>
                  <span className="font-medium">Bottom Rank:</span>{" "}
                  {winnerAnnouncementPreview.rankings.statistics.bottomRank}
                </div>
              </div>
            </div>

            {/* Custom Message Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Custom Message (Optional)
              </label>
              <textarea
                value={customWinnerMessage}
                onChange={(e) => setCustomWinnerMessage(e.target.value)}
                placeholder="Add a custom message to include in all winner announcement SMS..."
                className="w-full p-2 border rounded-md"
                rows={3}
              />
            </div>

            {/* SMS Previews */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                AI-Generated Winner Announcement Messages
              </h3>
              {winnerAnnouncementPreview.previews.map(
                (preview: any, index: number) => (
                  <div
                    key={preview.subscriberId}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">
                          {preview.subscriberName}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {preview.subscriberEmail}
                        </p>
                        {preview.ranking && (
                          <p className="text-sm text-blue-600">
                            Final Rank: {preview.ranking.rank} of{" "}
                            {
                              winnerAnnouncementPreview.rankings.statistics
                                .totalParticipants
                            }
                            {preview.ranking.tied && " (tied)"}
                          </p>
                        )}
                        {preview.isWinner && preview.winnerPosition && (
                          <p className="text-sm text-green-600 font-bold">
                            🏆 {preview.winnerPosition} Place Winner!
                          </p>
                        )}
                      </div>
                      <Badge
                        className={
                          preview.hasValidPhone
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {preview.hasValidPhone
                          ? "📱 Valid Phone"
                          : "❌ No Phone"}
                      </Badge>
                    </div>
                    {preview.hasValidPhone && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 mb-2">
                          Phone: {preview.phoneNumber}
                        </p>
                        <div className="bg-gray-100 p-3 rounded text-sm whitespace-pre-wrap font-mono">
                          {preview.message}
                        </div>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setWinnerAnnouncementPreview(null)}
              >
                Close
              </Button>
              {winnerAnnouncementPreview.statistics.canSendSms && (
                <Button
                  onClick={() => {
                    setWinnerAnnouncementPreview(null);
                    handleSendWinnerAnnouncement(
                      winnerAnnouncementPreview.competition.id,
                    );
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  🎉 Send Winner Announcement
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
