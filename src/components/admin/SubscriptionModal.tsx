"use client";

// @ts-nocheck - Temporarily disabling TypeScript checking for deployment
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { X } from "lucide-react";
import { EmailSubscription, StaffMemberCoaching, DashboardSchedule } from "@/types/email";

interface SubscriptionModalProps {
  subscription: EmailSubscription | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (subscription: EmailSubscription) => void;
  onDelete: (id: string) => void;
  onSendReports: (subscription: EmailSubscription) => void;
  onSendSMSCoaching: (
    subscription: EmailSubscription,
    periodType?: string,
  ) => void;
  onTestSMS: (phoneNumber: string, name: string) => void;
}

export default function SubscriptionModal({
  subscription,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onSendReports,
  onSendSMSCoaching,
  onTestSMS,
}: SubscriptionModalProps) {
  const [formData, setFormData] = useState<EmailSubscription>({
    _id: "",
    name: "",
    email: "",
    subscribedReports: [],
    frequency: "weekly",
    timeEST: "09:00",
    isActive: true,
    reportSchedules: {
      mtd: {
        frequency: "weekly",
        timeEST: "09:00",
        dayOfWeek: "3",
        isActive: true,
      },
      qtd: {
        frequency: "monthly",
        timeEST: "09:00",
        dayOfWeek: "3",
        weekOfMonth: 1,
        isActive: true,
      },
      ytd: {
        frequency: "quarterly",
        timeEST: "09:00",
        dayOfWeek: "3",
        monthOfQuarter: 1,
        isActive: true,
      },
      "all-quarters": {
        frequency: "monthly",
        timeEST: "09:00",
        isActive: true,
      },
    },
            smsCoaching: {
          isActive: false,
          phoneNumber: "",
          staffMembers: [],
          coachingStyle: "balanced",
          customMessage: "",
          adminCoaching: {
            isActive: false,
            includeTeamMetrics: true,
            includeTopPerformers: true,
            includeBottomPerformers: true,
            includeGoalComparison: true,
            includeManagementTips: true,
            dashboards: []
          },
        },
    createdAt: new Date(),
    updatedAt: new Date(),
    unsubscribeToken: "",
    personalizedGoals: {
      bottleConversionRate: { enabled: false, value: undefined },
      clubConversionRate: { enabled: false, value: undefined },
      aov: { enabled: false, value: undefined },
    },
  });

  const [availableStaffByReport, setAvailableStaffByReport] = useState<
    Record<ReportKey, string[]>
  >({
    mtd: [],
    qtd: [],
    ytd: [],
    "all-quarters": [],
  });

  const [selectedSmsPeriod, setSelectedSmsPeriod] = useState<string>("mtd");

  const coachingStyleOptions = [
    { value: "encouraging", label: "Encouraging" },
    { value: "analytical", label: "Analytical" },
    { value: "motivational", label: "Motivational" },
    { value: "balanced", label: "Balanced" },
  ];

  // Define the allowed report keys as a union type
  const reportKeys = useMemo(() => ["mtd", "qtd", "ytd", "all-quarters"] as const, []);
  type ReportKey = (typeof reportKeys)[number];

  const frequencyOptions = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Every Other Week" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
  ];

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const weeksOfMonth = ["First", "Second", "Third", "Fourth", "Last"];

  const monthsOfYear = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];



  const [smsArchiveOpen, setSmsArchiveOpen] = useState(false);
  const [smsArchive, setSmsArchive] = useState<any[]>([]);
  const [smsArchiveLoading, setSmsArchiveLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");



  useEffect(() => {
    if (subscription) {
      setFormData({
        ...subscription,
        name: subscription.name || "",
        email: subscription.email || "",
        subscribedReports: subscription.subscribedReports || [],
        reportSchedules: {
          mtd: subscription.reportSchedules?.mtd || {
            frequency: "weekly",
            timeEST: "09:00",
            dayOfWeek: "3",
            isActive: true,
          },
          qtd: subscription.reportSchedules?.qtd || {
            frequency: "monthly",
            timeEST: "09:00",
            weekOfMonth: 1,
            dayOfWeek: "3",
            isActive: true,
          },
          ytd: subscription.reportSchedules?.ytd || {
            frequency: "quarterly",
            timeEST: "09:00",
            monthOfQuarter: 1,
            weekOfMonth: 1,
            dayOfWeek: "3",
            isActive: true,
          },
          "all-quarters": subscription.reportSchedules?.["all-quarters"] || {
            frequency: "monthly",
            timeEST: "09:00",
            isActive: true,
          },
        },
        smsCoaching: {
          isActive: subscription.smsCoaching?.isActive ?? false,
          phoneNumber: subscription.smsCoaching?.phoneNumber ?? "",
          staffMembers: subscription.smsCoaching?.staffMembers ?? [],
          coachingStyle: subscription.smsCoaching?.coachingStyle ?? "balanced",
          customMessage: subscription.smsCoaching?.customMessage ?? "",
          adminCoaching: subscription.smsCoaching?.adminCoaching || {
            isActive: false,
            includeTeamMetrics: true,
            includeTopPerformers: true,
            includeBottomPerformers: true,
            includeGoalComparison: true,
            includeManagementTips: true,
            dashboards: []
          },
        },
        isActive: subscription.isActive ?? true,
        isAdmin: subscription.isAdmin ?? false,
        adminPassword: subscription.adminPassword || "",
        adminPasswordHash: subscription.adminPasswordHash || "",
        personalizedGoals: subscription.personalizedGoals || {
          bottleConversionRate: { enabled: false, value: undefined },
          clubConversionRate: { enabled: false, value: undefined },
          aov: { enabled: false, value: undefined },
        },
      });
    }
  }, [subscription]);

  useEffect(() => {
    // Fetch staff for each report type
    async function fetchStaff() {
      const newStaff: Record<ReportKey, string[]> = {
        mtd: [],
        qtd: [],
        ytd: [],
        "all-quarters": [],
      };
      for (const key of reportKeys) {
        try {
          const res = await fetch(`/api/kpi/${key}`);
          if (res.ok) {
            const data = await res.json();
            const staff = Object.keys(
              data?.data?.current?.associatePerformance || {},
            );
            newStaff[key] = staff;
          }
        } catch (e) {
          // ignore
        }
      }
      setAvailableStaffByReport(newStaff);
    }
    fetchStaff();
  }, [isOpen, reportKeys]);

  // Fetch SMS archive when modal is opened
  useEffect(() => {
    if (smsArchiveOpen && subscription?._id) {
      setSmsArchiveLoading(true);
      fetch(`/api/admin/subscriptions/${subscription._id}/sms-archive`)
        .then((res) => res.json())
        .then((data) => {
          setSmsArchive(data.messages || []);
          setSmsArchiveLoading(false);
        })
        .catch(() => setSmsArchiveLoading(false));
    }
  }, [smsArchiveOpen, subscription?._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('[DEBUG] SubscriptionModal - Starting handleSubmit');
      console.log('[DEBUG] SubscriptionModal - Current formData:', JSON.stringify(formData, null, 2));
      console.log('[DEBUG] SubscriptionModal - formData.isAdmin:', formData.isAdmin);
      console.log('[DEBUG] SubscriptionModal - formData.adminPassword:', formData.adminPassword);
      console.log('[DEBUG] SubscriptionModal - formData.adminPasswordHash:', formData.adminPasswordHash);
      console.log('[DEBUG] SubscriptionModal - formData.smsCoaching.adminCoaching:', JSON.stringify(formData.smsCoaching?.adminCoaching, null, 2));

      setAdminError("");
      setAdminSuccess("");

      // Ensure all goal values are numbers or null, never undefined
      const safeGoals = {
        bottleConversionRate: {
          enabled: !!formData.personalizedGoals?.bottleConversionRate?.enabled,
          value:
            formData.personalizedGoals?.bottleConversionRate?.value ===
              undefined ||
            (typeof formData.personalizedGoals?.bottleConversionRate?.value ===
              "string" &&
              formData.personalizedGoals?.bottleConversionRate?.value === "")
              ? null
              : Number(formData.personalizedGoals?.bottleConversionRate?.value),
        },
        clubConversionRate: {
          enabled: !!formData.personalizedGoals?.clubConversionRate?.enabled,
          value:
            formData.personalizedGoals?.clubConversionRate?.value === undefined ||
            (typeof formData.personalizedGoals?.clubConversionRate?.value ===
              "string" &&
              formData.personalizedGoals?.clubConversionRate?.value === "")
              ? null
              : Number(formData.personalizedGoals?.clubConversionRate?.value),
        },
        aov: {
          enabled: !!formData.personalizedGoals?.aov?.enabled,
          value:
            formData.personalizedGoals?.aov?.value === undefined ||
            (typeof formData.personalizedGoals?.aov?.value === "string" &&
              formData.personalizedGoals?.aov?.value === "")
              ? null
              : Number(formData.personalizedGoals?.aov?.value),
        },
      };

      if (subscription) {
        // Update existing subscription
        console.log('[DEBUG] SubscriptionModal - Updating existing subscription');
        
        const dataToSave = {
          name: formData.name,
          email: formData.email,
          subscribedReports: formData.subscribedReports,
          reportSchedules: formData.reportSchedules,
          smsCoaching: formData.smsCoaching,
          unsubscribeToken: subscription.unsubscribeToken,
          isAdmin: formData.isAdmin ?? false,
          adminPassword: formData.adminPassword || undefined,
          adminPasswordHash: formData.adminPasswordHash || undefined,
          personalizedGoals: safeGoals,
        };

        console.log('[DEBUG] SubscriptionModal - PUT dataToSave:', JSON.stringify(dataToSave, null, 2));

        const response = await fetch(`/api/admin/subscriptions/${subscription._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSave),
        });

        console.log('[DEBUG] SubscriptionModal - PUT response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('[DEBUG] SubscriptionModal - PUT error response:', errorText);
          throw new Error(`Failed to update subscription: ${errorText}`);
        }

        const updatedSubscription = await response.json();
        console.log('[DEBUG] SubscriptionModal - PUT response data:', JSON.stringify(updatedSubscription, null, 2));

        // Create Supabase user if admin is enabled
        if (formData.isAdmin && formData.adminPassword) {
          console.log('[DEBUG] SubscriptionModal - Creating Supabase user for admin');
          try {
            const supabaseResponse = await fetch("/api/admin/create-user", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: formData.email,
                password: formData.adminPassword,
                name: formData.name,
              }),
            });

            console.log('[DEBUG] SubscriptionModal - Supabase response status:', supabaseResponse.status);
            
            if (!supabaseResponse.ok) {
              const supabaseError = await supabaseResponse.text();
              console.log('[DEBUG] SubscriptionModal - Supabase error:', supabaseError);
              // Don't throw error for Supabase creation failure
            } else {
              const supabaseData = await supabaseResponse.json();
              console.log('[DEBUG] SubscriptionModal - Supabase success:', JSON.stringify(supabaseData, null, 2));
            }
          } catch (supabaseError) {
            console.log('[DEBUG] SubscriptionModal - Supabase creation error:', supabaseError);
            // Don't throw error for Supabase creation failure
          }
        }

        onSave(updatedSubscription);
      } else {
        // Create new subscription
        console.log('[DEBUG] SubscriptionModal - Creating new subscription');
        
                 const safeGoals = {
           bottleConversionRate: {
             enabled: formData.personalizedGoals?.bottleConversionRate?.enabled || false,
             value: formData.personalizedGoals?.bottleConversionRate?.value || undefined,
           },
           clubConversionRate: {
             enabled: formData.personalizedGoals?.clubConversionRate?.enabled || false,
             value: formData.personalizedGoals?.clubConversionRate?.value || undefined,
           },
           aov: {
             enabled: formData.personalizedGoals?.aov?.enabled || false,
             value: formData.personalizedGoals?.aov?.value || undefined,
           },
         };

        const dataToSave = {
          name: formData.name,
          email: formData.email,
          subscribedReports: formData.subscribedReports,
          reportSchedules: formData.reportSchedules,
          smsCoaching: formData.smsCoaching,
          isAdmin: formData.isAdmin ?? false,
          adminPassword: formData.adminPassword || undefined,
          adminPasswordHash: formData.adminPasswordHash || undefined,
          personalizedGoals: safeGoals,
        };

        console.log('[DEBUG] SubscriptionModal - POST dataToSave:', JSON.stringify(dataToSave, null, 2));

        const response = await fetch("/api/admin/subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSave),
        });

        console.log('[DEBUG] SubscriptionModal - POST response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('[DEBUG] SubscriptionModal - POST error response:', errorText);
          throw new Error(`Failed to create subscription: ${errorText}`);
        }

        const newSubscription = await response.json();
        console.log('[DEBUG] SubscriptionModal - POST response data:', JSON.stringify(newSubscription, null, 2));

        // Create Supabase user if admin is enabled
        if (formData.isAdmin && formData.adminPassword) {
          console.log('[DEBUG] SubscriptionModal - Creating Supabase user for new admin');
          try {
            const supabaseResponse = await fetch("/api/admin/create-user", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: formData.email,
                password: formData.adminPassword,
                name: formData.name,
              }),
            });

            console.log('[DEBUG] SubscriptionModal - Supabase response status:', supabaseResponse.status);
            
            if (!supabaseResponse.ok) {
              const supabaseError = await supabaseResponse.text();
              console.log('[DEBUG] SubscriptionModal - Supabase error:', supabaseError);
              // Don't throw error for Supabase creation failure
            } else {
              const supabaseData = await supabaseResponse.json();
              console.log('[DEBUG] SubscriptionModal - Supabase success:', JSON.stringify(supabaseData, null, 2));
            }
          } catch (supabaseError) {
            console.log('[DEBUG] SubscriptionModal - Supabase creation error:', supabaseError);
            // Don't throw error for Supabase creation failure
          }
        }

        onSave(newSubscription);
      }

      onClose();
    } catch (error) {
      console.error("Error saving subscription:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportToggle = (report: ReportKey) => {
    setFormData((prev) => ({
      ...prev,
      subscribedReports: (prev.subscribedReports ?? []).includes(report)
        ? (prev.subscribedReports ?? []).filter((r) => r !== report)
        : [...(prev.subscribedReports ?? []), report],
    }));
  };

  const handleScheduleChange = (
    reportType: ReportKey,
    field: string,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      reportSchedules: {
        ...(prev.reportSchedules ?? {}),
        [reportType]: {
          ...((prev.reportSchedules ?? {})[
            reportType as keyof typeof prev.reportSchedules
          ] as any ?? {}),
          [field]: value,
        },
      },
    } as any));
  };





  if (!isOpen || !subscription) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-8 relative overflow-y-auto max-h-[90vh]">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold mb-6">
          {subscription?._id ? "Edit Subscriber" : "Add Subscriber"}
        </h2>

        <div className="mb-6">
          <Label>Subscriber Name</Label>
          <Input
            type="text"
            value={formData.name ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Full name of subscriber"
            required
          />
        </div>
        <div className="mb-6">
          <Label>Email Address</Label>
          <Input
            type="email"
            value={formData.email ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="subscriber@email.com"
            required
          />
        </div>
        <div className="mb-6 flex items-center">
          <label className="mr-2 font-medium">Admin</label>
          <input
            type="checkbox"
            checked={formData.isAdmin ?? false}
            onChange={(e) => setFormData(prev => ({ ...prev, isAdmin: e.target.checked }))}
            className="accent-[#a92020]"
          />
        </div>
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium">
            Password (for dashboard login)
          </label>
          <div className="relative">
            <input
              type={showAdminPassword ? "text" : "password"}
              className="w-full border rounded px-3 py-2 pr-10"
              value={formData.adminPassword ?? ""}
              onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
              disabled={!(formData.isAdmin ?? false)}
              placeholder={
                (formData.isAdmin ?? false)
                  ? "Enter password for dashboard login"
                  : "Enable admin to set password"
              }
              style={{ backgroundColor: (formData.isAdmin ?? false) ? "white" : "#f3f3f3" }}
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowAdminPassword((v) => !v)}
              disabled={!(formData.isAdmin ?? false)}
            >
              {showAdminPassword ? (
                // Eye open SVG
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              ) : (
                // Eye closed SVG
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.249-2.383A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.043 5.306M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3l18 18"
                  />
                </svg>
              )}
            </button>
          </div>
          {adminError && <div className="text-red-600 mb-2">{adminError}</div>}
          {adminSuccess && (
            <div className="text-green-600 mb-2">{adminSuccess}</div>
          )}
        </div>
        <div className="mb-6">
          <Label>Staff Name (for SMS coaching)</Label>
          <Select
            value={formData.smsCoaching?.staffMembers?.[0]?.name ?? ""}
            onValueChange={(value) =>
              setFormData((prev) => {
                const staffMembers: StaffMemberCoaching[] = value
                  ? [
                      {
                        id: "",
                        name: value,
                        phoneNumber: "",
                        enabled: true,
                        isActive: true,
                        dashboards: reportKeys.map((periodType) => ({
                          periodType,
                          frequency: "weekly",
                          timeEST: "09:00",
                          isActive: true,
                          includeMetrics: {
                            wineConversionRate: true,
                            clubConversionRate: true,
                            goalVariance: true,
                            overallPerformance: true,
                          },
                        })),
                      },
                    ]
                  : [];

                return {
                  ...prev,
                  smsCoaching: {
                    isActive:
                      typeof prev.smsCoaching?.isActive === "boolean"
                        ? prev.smsCoaching.isActive
                        : false,
                    phoneNumber:
                      typeof prev.smsCoaching?.phoneNumber === "string"
                        ? prev.smsCoaching.phoneNumber
                        : "",
                    coachingStyle:
                      typeof prev.smsCoaching?.coachingStyle === "string"
                        ? prev.smsCoaching.coachingStyle
                        : "balanced",
                    customMessage:
                      typeof prev.smsCoaching?.customMessage === "string"
                        ? prev.smsCoaching.customMessage
                        : "",
                    staffMembers,
                  },
                };
              })
            }
            required={formData.smsCoaching?.isActive ?? false}
          >
            {(availableStaffByReport.mtd ?? []).map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="mb-6">
          <Label>Mobile Phone Number (for SMS coaching)</Label>
          <Input
            type="tel"
            value={formData.smsCoaching?.phoneNumber ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                smsCoaching: {
                  ...prev.smsCoaching,
                  phoneNumber: e.target.value,
                } as typeof prev.smsCoaching, // ensure type safety
              }))
            }
            placeholder="e.g. +15555555555"
            required={formData.smsCoaching?.isActive ?? false}
          />
        </div>

        {/* Email Reports Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Email Reports</h3>
          <div className="grid grid-cols-2 gap-4">
            {reportKeys.map((key) => (
              <div key={key} className="border rounded p-4">
                <label className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    checked={(formData.subscribedReports ?? []).includes(
                      key as ReportKey,
                    )}
                    onChange={() => handleReportToggle(key as ReportKey)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">
                    {key
                      .replace("-", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </label>
                {/* Cadence controls for email */}
                {(formData.subscribedReports ?? []).includes(
                  key as ReportKey,
                ) && (
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={
                        (formData.reportSchedules ?? {})[key]?.frequency ||
                        "weekly"
                      }
                      onValueChange={(value) =>
                        handleScheduleChange(
                          key as ReportKey,
                          "frequency",
                          value,
                        )
                      }
                    >
                      {frequencyOptions.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </Select>
                    {/* Weekly controls */}
                    {(formData.reportSchedules ?? {})[key]?.frequency ===
                      "weekly" && (
                      <>
                        <Label>Day of Week</Label>
                        <Select
                          value={String(
                            (formData.reportSchedules ?? {})[key]?.dayOfWeek ??
                              "0",
                          )}
                          onValueChange={(value) =>
                            handleScheduleChange(
                              key as ReportKey,
                              "dayOfWeek",
                              value,
                            )
                          }
                        >
                          {daysOfWeek.map((d, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {d}
                            </SelectItem>
                          ))}
                        </Select>
                        <Label>Time (EST)</Label>
                        <Input
                          type="time"
                          value={
                            (formData.reportSchedules ?? {})[key]?.timeEST || ""
                          }
                          onChange={(e) =>
                            handleScheduleChange(
                              key as ReportKey,
                              "timeEST",
                              e.target.value,
                            )
                          }
                        />
                      </>
                    )}
                    {/* Biweekly controls */}
                    {(formData.reportSchedules ?? {})[key]?.frequency ===
                      "biweekly" && (
                      <>
                        <Label>Day of Week</Label>
                        <Select
                          value={String(
                            (formData.reportSchedules ?? {})[key]?.dayOfWeek ??
                              "0",
                          )}
                          onValueChange={(value) =>
                            handleScheduleChange(
                              key as ReportKey,
                              "dayOfWeek",
                              value,
                            )
                          }
                        >
                          {daysOfWeek.map((d, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {d}
                            </SelectItem>
                          ))}
                        </Select>
                        <Label>Time (EST)</Label>
                        <Input
                          type="time"
                          value={
                            (formData.reportSchedules ?? {})[key]?.timeEST || ""
                          }
                          onChange={(e) =>
                            handleScheduleChange(
                              key as ReportKey,
                              "timeEST",
                              e.target.value,
                            )
                          }
                        />
                        <Label>Start on Week #</Label>
                        <Select
                          value={String(
                            (formData.reportSchedules ?? {})[key]?.weekStart ??
                              1,
                          )}
                          onValueChange={(value) =>
                            handleScheduleChange(
                              key as ReportKey,
                              "weekStart",
                              Number(value),
                            )
                          }
                        >
                          {[1, 2, 3, 4, 5].map((w) => (
                            <SelectItem key={w} value={String(w)}>
                              {w}
                            </SelectItem>
                          ))}
                        </Select>
                      </>
                    )}
                    {/* Monthly controls */}
                    {(formData.reportSchedules ?? {})[key]?.frequency ===
                      "monthly" && (
                      <>
                        <Label>Week of Month</Label>
                        <Select
                          value={String(
                            (formData.reportSchedules ?? {})[key]
                              ?.weekOfMonth ?? 1,
                          )}
                          onValueChange={(value) =>
                            handleScheduleChange(
                              key as ReportKey,
                              "weekOfMonth",
                              Number(value),
                            )
                          }
                        >
                          {weeksOfMonth.map((w, i) => (
                            <SelectItem key={i} value={String(i + 1)}>
                              {w}
                            </SelectItem>
                          ))}
                        </Select>
                        <Label>Day of Week</Label>
                        <Select
                          value={String(
                            (formData.reportSchedules ?? {})[key]?.dayOfWeek ??
                              "0",
                          )}
                          onValueChange={(value) =>
                            handleScheduleChange(
                              key as ReportKey,
                              "dayOfWeek",
                              value,
                            )
                          }
                        >
                          {daysOfWeek.map((d, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {d}
                            </SelectItem>
                          ))}
                        </Select>
                        <Label>Time (EST)</Label>
                        <Input
                          type="time"
                          value={
                            (formData.reportSchedules ?? {})[key]?.timeEST || ""
                          }
                          onChange={(e) =>
                            handleScheduleChange(
                              key as ReportKey,
                              "timeEST",
                              e.target.value,
                            )
                          }
                        />
                      </>
                    )}
                    {/* Quarterly controls */}
                    {(formData.reportSchedules ?? {})[key]?.frequency ===
                      "quarterly" && (
                      <>
                        <Label>Week of Quarter</Label>
                        <Select
                          value={String(
                            (formData.reportSchedules ?? {})[key]
                              ?.weekOfMonth ?? 1,
                          )}
                          onValueChange={(value) =>
                            handleScheduleChange(
                              key as ReportKey,
                              "weekOfMonth",
                              Number(value),
                            )
                          }
                        >
                          <SelectItem value="1">First Week</SelectItem>
                        </Select>
                        <Label>Day of Week</Label>
                        <Select
                          value={String(
                            (formData.reportSchedules ?? {})[key]?.dayOfWeek ??
                              "0",
                          )}
                          onValueChange={(value) =>
                            handleScheduleChange(
                              key as ReportKey,
                              "dayOfWeek",
                              value,
                            )
                          }
                        >
                          {daysOfWeek.map((d, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {d}
                            </SelectItem>
                          ))}
                        </Select>
                        <Label>Time (EST)</Label>
                        <Input
                          type="time"
                          value={
                            (formData.reportSchedules ?? {})[key]?.timeEST || ""
                          }
                          onChange={(e) =>
                            handleScheduleChange(
                              key as ReportKey,
                              "timeEST",
                              e.target.value,
                            )
                          }
                        />
                      </>
                    )}
                    {/* Yearly controls */}
                    {(formData.reportSchedules ?? {})[key]?.frequency ===
                      "yearly" && (
                      <>
                        <Label>Month</Label>
                        <Select
                          value={String(
                            (formData.reportSchedules ?? {})[key]
                              ?.monthOfYear ?? 1,
                          )}
                          onValueChange={(value) =>
                            handleScheduleChange(
                              key as ReportKey,
                              "monthOfYear",
                              Number(value),
                            )
                          }
                        >
                          {monthsOfYear.map((m, i) => (
                            <SelectItem key={i} value={String(i + 1)}>
                              {m}
                            </SelectItem>
                          ))}
                        </Select>
                        <Label>Day</Label>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          value={String(
                            (formData.reportSchedules ?? {})[key]?.dayOfMonth ??
                              1,
                          )}
                          onChange={(e) =>
                            handleScheduleChange(
                              key as ReportKey,
                              "dayOfMonth",
                              Number(e.target.value),
                            )
                          }
                        />
                        <Label>Time (EST)</Label>
                        <Input
                          type="time"
                          value={
                            (formData.reportSchedules ?? {})[key]?.timeEST || ""
                          }
                          onChange={(e) =>
                            handleScheduleChange(
                              key as ReportKey,
                              "timeEST",
                              e.target.value,
                            )
                          }
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SMS Coaching Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">SMS Coaching</h3>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="enable-sms-coaching"
              className="mr-2"
              checked={!!formData.smsCoaching?.isActive}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  smsCoaching: {
                    isActive: e.target.checked,
                    phoneNumber:
                      typeof prev.smsCoaching?.phoneNumber === "string"
                        ? prev.smsCoaching.phoneNumber
                        : "",
                    coachingStyle:
                      typeof prev.smsCoaching?.coachingStyle === "string"
                        ? prev.smsCoaching.coachingStyle
                        : "balanced",
                    customMessage:
                      typeof prev.smsCoaching?.customMessage === "string"
                        ? prev.smsCoaching.customMessage
                        : "",
                    staffMembers: Array.isArray(prev.smsCoaching?.staffMembers)
                      ? prev.smsCoaching.staffMembers.map((staff) => ({
                          ...staff,
                          id: (staff as StaffMemberCoaching).id ?? "",
                          name: staff.name ?? "",
                          phoneNumber: (staff as StaffMemberCoaching).phoneNumber ?? "",
                          enabled:
                            typeof (staff as StaffMemberCoaching).enabled === "boolean"
                              ? (staff as StaffMemberCoaching).enabled
                              : false,
                          isActive:
                            typeof (staff as StaffMemberCoaching).isActive === "boolean"
                              ? (staff as StaffMemberCoaching).isActive
                              : false,
                          dashboards: staff.dashboards ?? [],
                        }))
                      : [],
                  },
                }))
              }
            />
            <label htmlFor="enable-sms-coaching" className="font-medium">
              Enable SMS Coaching
            </label>
          </div>
          <p className="text-gray-500 mb-4 text-sm">
            SMS messages are personalized for the selected staff member, using
            their performance data for the selected report/dashboard and sent on
            the schedule you set below.
          </p>
          {formData.smsCoaching?.staffMembers &&
            formData.smsCoaching.staffMembers[0] && (
              <div className="grid grid-cols-2 gap-4">
                {reportKeys.map((key) => {
                  const staff = formData.smsCoaching!.staffMembers![0];
                  const dashboards = staff.dashboards ?? [];
                  const dashboard = dashboards.find(
                    (d) => d.periodType === key,
                  );
                  const enabled = !!dashboard;
                  return (
                    <div key={key} className="border rounded p-4">
                      <label className="flex items-center space-x-2 mb-2">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => {
                            setFormData((prev) => {
                              const staff = prev.smsCoaching?.staffMembers?.[0];
                              if (!staff) return prev;
                              let dashboards = staff.dashboards || [];
                              if (e.target.checked) {
                                if (
                                  !dashboards.find((d) => d.periodType === key)
                                ) {
                                  dashboards.push({
                                    periodType: key,
                                    frequency: "weekly",
                                    timeEST: "09:00",
                                    isActive: true,
                                    includeMetrics: {
                                      wineConversionRate: true,
                                      clubConversionRate: true,
                                      goalVariance: true,
                                      overallPerformance: true,
                                    },
                                  } as DashboardSchedule);
                                }
                              } else {
                                dashboards = dashboards.filter(
                                  (d) => d.periodType !== key,
                                );
                              }
                              return {
                                ...prev,
                                smsCoaching: {
                                  isActive:
                                    typeof prev.smsCoaching?.isActive ===
                                    "boolean"
                                      ? prev.smsCoaching.isActive
                                      : false,
                                  phoneNumber:
                                    typeof prev.smsCoaching?.phoneNumber ===
                                    "string"
                                      ? prev.smsCoaching.phoneNumber
                                      : "",
                                  coachingStyle:
                                    typeof prev.smsCoaching?.coachingStyle ===
                                    "string"
                                      ? prev.smsCoaching.coachingStyle
                                      : "balanced",
                                  customMessage:
                                    typeof prev.smsCoaching?.customMessage ===
                                    "string"
                                      ? prev.smsCoaching.customMessage
                                      : "",
                                  staffMembers: [
                                    {
                                      ...staff,
                                      dashboards,
                                    },
                                  ],
                                },
                              };
                            });
                          }}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">
                          {key
                            .replace("-", " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </label>
                      {enabled && dashboard && (
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select
                            value={(dashboard as DashboardSchedule).frequency}
                            onValueChange={(value) => {
                              setFormData((prev) => {
                                const staff =
                                  prev.smsCoaching?.staffMembers?.[0];
                                if (!staff) return prev;
                                let dashboards = staff.dashboards ?? [];
                                dashboards = dashboards.map((d) =>
                                  d.periodType === key
                                    ? {
                                        ...d,
                                        frequency:
                                          value as DashboardSchedule["frequency"],
                                      }
                                    : d,
                                );
                                return {
                                  ...prev,
                                  smsCoaching: {
                                    ...prev.smsCoaching,
                                    isActive:
                                      typeof prev.smsCoaching?.isActive ===
                                      "boolean"
                                        ? prev.smsCoaching.isActive
                                        : false,
                                    phoneNumber:
                                      typeof prev.smsCoaching?.phoneNumber ===
                                      "string"
                                        ? prev.smsCoaching.phoneNumber
                                        : "",
                                    coachingStyle:
                                      typeof prev.smsCoaching?.coachingStyle ===
                                      "string"
                                        ? prev.smsCoaching.coachingStyle
                                        : "balanced",
                                    customMessage:
                                      typeof prev.smsCoaching?.customMessage ===
                                      "string"
                                        ? prev.smsCoaching.customMessage
                                        : "",
                                    staffMembers: [
                                      {
                                        ...staff,
                                        dashboards,
                                      },
                                    ],
                                  },
                                };
                              });
                            }}
                          >
                            {frequencyOptions.map((freq) => (
                              <SelectItem key={freq.value} value={freq.value}>
                                {freq.label}
                              </SelectItem>
                            ))}
                          </Select>
                          {/* Weekly: day of week and time */}
                          {(dashboard as DashboardSchedule).frequency === "weekly" && (
                            <>
                              <Label>Day of Week</Label>
                              <Select
                                value={String((dashboard as DashboardSchedule).dayOfWeek ?? "0")}
                                onValueChange={(value) => {
                                  setFormData((prev) => {
                                    const staff =
                                      prev.smsCoaching?.staffMembers?.[0];
                                    if (!staff) return prev;
                                    let dashboards = staff.dashboards ?? [];
                                    dashboards = dashboards.map((d) =>
                                      d.periodType === key
                                        ? { ...d, dayOfWeek: parseInt(value) }
                                        : d,
                                    );
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching,
                                        isActive:
                                          typeof prev.smsCoaching?.isActive ===
                                          "boolean"
                                            ? prev.smsCoaching.isActive
                                            : false,
                                        phoneNumber:
                                          typeof prev.smsCoaching
                                            ?.phoneNumber === "string"
                                            ? prev.smsCoaching.phoneNumber
                                            : "",
                                        coachingStyle:
                                          typeof prev.smsCoaching
                                            ?.coachingStyle === "string"
                                            ? prev.smsCoaching.coachingStyle
                                            : "balanced",
                                        customMessage:
                                          typeof prev.smsCoaching
                                            ?.customMessage === "string"
                                            ? prev.smsCoaching.customMessage
                                            : "",
                                        staffMembers: [
                                          {
                                            ...staff,
                                            dashboards,
                                          },
                                        ],
                                      },
                                    };
                                  });
                                }}
                              >
                                {daysOfWeek.map((d, i) => (
                                  <SelectItem key={i} value={String(i)}>
                                    {d}
                                  </SelectItem>
                                ))}
                              </Select>
                              <Label>Time (EST)</Label>
                              <Input
                                type="time"
                                value={(dashboard as DashboardSchedule).timeEST || ""}
                                onChange={(e) => {
                                  setFormData((prev) => {
                                    const staff =
                                      prev.smsCoaching?.staffMembers?.[0];
                                    if (!staff) return prev;
                                    let dashboards = staff.dashboards ?? [];
                                    dashboards = dashboards.map((d) =>
                                      d.periodType === key
                                        ? { ...d, timeEST: e.target.value }
                                        : d,
                                    );
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching,
                                        isActive:
                                          typeof prev.smsCoaching?.isActive ===
                                          "boolean"
                                            ? prev.smsCoaching.isActive
                                            : false,
                                        phoneNumber:
                                          typeof prev.smsCoaching
                                            ?.phoneNumber === "string"
                                            ? prev.smsCoaching.phoneNumber
                                            : "",
                                        coachingStyle:
                                          typeof prev.smsCoaching
                                            ?.coachingStyle === "string"
                                            ? prev.smsCoaching.coachingStyle
                                            : "balanced",
                                        customMessage:
                                          typeof prev.smsCoaching
                                            ?.customMessage === "string"
                                            ? prev.smsCoaching.customMessage
                                            : "",
                                        staffMembers: [
                                          {
                                            ...staff,
                                            dashboards,
                                          },
                                        ],
                                      },
                                    };
                                  });
                                }}
                              />
                            </>
                          )}
                          {/* Monthly: week of month, day of week, time */}
                          {(dashboard as DashboardSchedule).frequency === "monthly" && (
                            <>
                              <Label>Week of Month</Label>
                              <Select
                                value={String((dashboard as DashboardSchedule).weekOfMonth ?? 1)}
                                onValueChange={(value) => {
                                  setFormData((prev) => {
                                    const staff =
                                      prev.smsCoaching?.staffMembers?.[0];
                                    if (!staff) return prev;
                                    let dashboards = staff.dashboards ?? [];
                                    dashboards = dashboards.map((d) =>
                                      d.periodType === key
                                        ? { ...d, weekOfMonth: Number(value) }
                                        : d,
                                    );
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching,
                                        isActive:
                                          typeof prev.smsCoaching?.isActive ===
                                          "boolean"
                                            ? prev.smsCoaching.isActive
                                            : false,
                                        phoneNumber:
                                          typeof prev.smsCoaching
                                            ?.phoneNumber === "string"
                                            ? prev.smsCoaching.phoneNumber
                                            : "",
                                        coachingStyle:
                                          typeof prev.smsCoaching
                                            ?.coachingStyle === "string"
                                            ? prev.smsCoaching.coachingStyle
                                            : "balanced",
                                        customMessage:
                                          typeof prev.smsCoaching
                                            ?.customMessage === "string"
                                            ? prev.smsCoaching.customMessage
                                            : "",
                                        staffMembers: [
                                          {
                                            ...staff,
                                            dashboards,
                                          },
                                        ],
                                      },
                                    };
                                  });
                                }}
                              >
                                {weeksOfMonth.map((w, i) => (
                                  <SelectItem key={i} value={String(i + 1)}>
                                    {w}
                                  </SelectItem>
                                ))}
                              </Select>
                              <Label>Day of Week</Label>
                              <Select
                                value={String((dashboard as DashboardSchedule).dayOfWeek ?? "0")}
                                onValueChange={(value) => {
                                  setFormData((prev) => {
                                    const staff =
                                      prev.smsCoaching?.staffMembers?.[0];
                                    if (!staff) return prev;
                                    let dashboards = staff.dashboards ?? [];
                                    dashboards = dashboards.map((d) =>
                                      d.periodType === key
                                        ? { ...d, dayOfWeek: parseInt(value) }
                                        : d,
                                    );
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching,
                                        isActive:
                                          typeof prev.smsCoaching?.isActive ===
                                          "boolean"
                                            ? prev.smsCoaching.isActive
                                            : false,
                                        phoneNumber:
                                          typeof prev.smsCoaching
                                            ?.phoneNumber === "string"
                                            ? prev.smsCoaching.phoneNumber
                                            : "",
                                        coachingStyle:
                                          typeof prev.smsCoaching
                                            ?.coachingStyle === "string"
                                            ? prev.smsCoaching.coachingStyle
                                            : "balanced",
                                        customMessage:
                                          typeof prev.smsCoaching
                                            ?.customMessage === "string"
                                            ? prev.smsCoaching.customMessage
                                            : "",
                                        staffMembers: [
                                          {
                                            ...staff,
                                            dashboards,
                                          },
                                        ],
                                      },
                                    };
                                  });
                                }}
                              >
                                {daysOfWeek.map((d, i) => (
                                  <SelectItem key={i} value={String(i)}>
                                    {d}
                                  </SelectItem>
                                ))}
                              </Select>
                              <Label>Time (EST)</Label>
                              <Input
                                type="time"
                                value={(dashboard as DashboardSchedule).timeEST || ""}
                                onChange={(e) => {
                                  setFormData((prev) => {
                                    const staff =
                                      prev.smsCoaching?.staffMembers?.[0];
                                    if (!staff) return prev;
                                    let dashboards = staff.dashboards ?? [];
                                    dashboards = dashboards.map((d) =>
                                      d.periodType === key
                                        ? { ...d, timeEST: e.target.value }
                                        : d,
                                    );
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching,
                                        isActive:
                                          typeof prev.smsCoaching?.isActive ===
                                          "boolean"
                                            ? prev.smsCoaching.isActive
                                            : false,
                                        phoneNumber:
                                          typeof prev.smsCoaching
                                            ?.phoneNumber === "string"
                                            ? prev.smsCoaching.phoneNumber
                                            : "",
                                        coachingStyle:
                                          typeof prev.smsCoaching
                                            ?.coachingStyle === "string"
                                            ? prev.smsCoaching.coachingStyle
                                            : "balanced",
                                        customMessage:
                                          typeof prev.smsCoaching
                                            ?.customMessage === "string"
                                            ? prev.smsCoaching.customMessage
                                            : "",
                                        staffMembers: [
                                          {
                                            ...staff,
                                            dashboards,
                                          },
                                        ],
                                      },
                                    };
                                  });
                                }}
                              />
                            </>
                          )}
                          {/* Quarterly: week of quarter (always 1st), day of week, time */}
                          {(dashboard as DashboardSchedule).frequency === "quarterly" && (
                            <>
                              <Label>Week of Quarter</Label>
                              <Select
                                value={String((dashboard as DashboardSchedule).weekOfMonth ?? 1)}
                                onValueChange={(value) => {
                                  setFormData((prev) => {
                                    const staff =
                                      prev.smsCoaching?.staffMembers?.[0];
                                    if (!staff) return prev;
                                    let dashboards = staff.dashboards ?? [];
                                    dashboards = dashboards.map((d) =>
                                      d.periodType === key
                                        ? { ...d, weekOfMonth: Number(value) }
                                        : d,
                                    );
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching,
                                        isActive:
                                          typeof prev.smsCoaching?.isActive ===
                                          "boolean"
                                            ? prev.smsCoaching.isActive
                                            : false,
                                        phoneNumber:
                                          typeof prev.smsCoaching
                                            ?.phoneNumber === "string"
                                            ? prev.smsCoaching.phoneNumber
                                            : "",
                                        coachingStyle:
                                          typeof prev.smsCoaching
                                            ?.coachingStyle === "string"
                                            ? prev.smsCoaching.coachingStyle
                                            : "balanced",
                                        customMessage:
                                          typeof prev.smsCoaching
                                            ?.customMessage === "string"
                                            ? prev.smsCoaching.customMessage
                                            : "",
                                        staffMembers: [
                                          {
                                            ...staff,
                                            dashboards,
                                          },
                                        ],
                                      },
                                    };
                                  });
                                }}
                              >
                                <SelectItem value="1">First Week</SelectItem>
                              </Select>
                              <Label>Day of Week</Label>
                              <Select
                                value={String((dashboard as DashboardSchedule).dayOfWeek ?? "0")}
                                onValueChange={(value) => {
                                  setFormData((prev) => {
                                    const staff =
                                      prev.smsCoaching?.staffMembers?.[0];
                                    if (!staff) return prev;
                                    let dashboards = staff.dashboards ?? [];
                                    dashboards = dashboards.map((d) =>
                                      d.periodType === key
                                        ? { ...d, dayOfWeek: parseInt(value) }
                                        : d,
                                    );
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching,
                                        isActive:
                                          typeof prev.smsCoaching?.isActive ===
                                          "boolean"
                                            ? prev.smsCoaching.isActive
                                            : false,
                                        phoneNumber:
                                          typeof prev.smsCoaching
                                            ?.phoneNumber === "string"
                                            ? prev.smsCoaching.phoneNumber
                                            : "",
                                        coachingStyle:
                                          typeof prev.smsCoaching
                                            ?.coachingStyle === "string"
                                            ? prev.smsCoaching.coachingStyle
                                            : "balanced",
                                        customMessage:
                                          typeof prev.smsCoaching
                                            ?.customMessage === "string"
                                            ? prev.smsCoaching.customMessage
                                            : "",
                                        staffMembers: [
                                          {
                                            ...staff,
                                            dashboards,
                                          },
                                        ],
                                      },
                                    };
                                  });
                                }}
                              >
                                {daysOfWeek.map((d, i) => (
                                  <SelectItem key={i} value={String(i)}>
                                    {d}
                                  </SelectItem>
                                ))}
                              </Select>
                              <Label>Time (EST)</Label>
                              <Input
                                type="time"
                                value={(dashboard as DashboardSchedule).timeEST || ""}
                                onChange={(e) => {
                                  setFormData((prev) => {
                                    const staff =
                                      prev.smsCoaching?.staffMembers?.[0];
                                    if (!staff) return prev;
                                    let dashboards = staff.dashboards ?? [];
                                    dashboards = dashboards.map((d) =>
                                      d.periodType === key
                                        ? { ...d, timeEST: e.target.value }
                                        : d,
                                    );
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching,
                                        isActive:
                                          typeof prev.smsCoaching?.isActive ===
                                          "boolean"
                                            ? prev.smsCoaching.isActive
                                            : false,
                                        phoneNumber:
                                          typeof prev.smsCoaching
                                            ?.phoneNumber === "string"
                                            ? prev.smsCoaching.phoneNumber
                                            : "",
                                        coachingStyle:
                                          typeof prev.smsCoaching
                                            ?.coachingStyle === "string"
                                            ? prev.smsCoaching.coachingStyle
                                            : "balanced",
                                        customMessage:
                                          typeof prev.smsCoaching
                                            ?.customMessage === "string"
                                            ? prev.smsCoaching.customMessage
                                            : "",
                                        staffMembers: [
                                          {
                                            ...staff,
                                            dashboards,
                                          },
                                        ],
                                      },
                                    };
                                  });
                                }}
                              />
                            </>
                          )}
                          {/* Biweekly: day of week, time, and week start */}
                          {(dashboard as DashboardSchedule).frequency === "biweekly" && (
                            <>
                              <Label>Day of Week</Label>
                              <Select
                                value={String((dashboard as DashboardSchedule).dayOfWeek ?? "0")}
                                onValueChange={(value) => {
                                  setFormData((prev) => {
                                    const staff =
                                      prev.smsCoaching?.staffMembers?.[0];
                                    if (!staff) return prev;
                                    // Fix: Define dashboards BEFORE using it
                                    let dashboards = staff.dashboards || [];
                                    dashboards = dashboards.map((d) =>
                                      d.periodType === key
                                        ? { ...d, dayOfWeek: parseInt(value) }
                                        : d,
                                    );
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching,
                                        isActive:
                                          typeof prev.smsCoaching?.isActive ===
                                          "boolean"
                                            ? prev.smsCoaching.isActive
                                            : false,
                                        phoneNumber:
                                          typeof prev.smsCoaching
                                            ?.phoneNumber === "string"
                                            ? prev.smsCoaching.phoneNumber
                                            : "",
                                        coachingStyle:
                                          typeof prev.smsCoaching
                                            ?.coachingStyle === "string"
                                            ? prev.smsCoaching.coachingStyle
                                            : "balanced",
                                        customMessage:
                                          typeof prev.smsCoaching
                                            ?.customMessage === "string"
                                            ? prev.smsCoaching.customMessage
                                            : "",
                                        staffMembers: [
                                          {
                                            ...staff,
                                            dashboards,
                                          },
                                        ],
                                      },
                                    };
                                  });
                                }}
                              >
                                {daysOfWeek.map((d, i) => (
                                  <SelectItem key={i} value={String(i)}>
                                    {d}
                                  </SelectItem>
                                ))}
                              </Select>
                              <Label>Time (EST)</Label>
                              <Input
                                type="time"
                                value={(dashboard as DashboardSchedule).timeEST || ""}
                                onChange={(e) => {
                                  setFormData((prev) => {
                                    const staff =
                                      prev.smsCoaching?.staffMembers?.[0];
                                    if (!staff) return prev;
                                    let dashboards = staff.dashboards ?? [];
                                    dashboards = dashboards.map((d) =>
                                      d.periodType === key
                                        ? { ...d, timeEST: e.target.value }
                                        : d,
                                    );
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching,
                                        isActive:
                                          typeof prev.smsCoaching?.isActive ===
                                          "boolean"
                                            ? prev.smsCoaching.isActive
                                            : false,
                                        phoneNumber:
                                          typeof prev.smsCoaching
                                            ?.phoneNumber === "string"
                                            ? prev.smsCoaching.phoneNumber
                                            : "",
                                        coachingStyle:
                                          typeof prev.smsCoaching
                                            ?.coachingStyle === "string"
                                            ? prev.smsCoaching.coachingStyle
                                            : "balanced",
                                        customMessage:
                                          typeof prev.smsCoaching
                                            ?.customMessage === "string"
                                            ? prev.smsCoaching.customMessage
                                            : "",
                                        staffMembers: [
                                          {
                                            ...staff,
                                            dashboards,
                                          },
                                        ],
                                      },
                                    };
                                  });
                                }}
                              />
                              <Label>Start on Week #</Label>
                              <Select
                                value={String((dashboard as DashboardSchedule).weekStart ?? 1)}
                                onValueChange={(value) => {
                                  setFormData((prev) => {
                                    const staff =
                                      prev.smsCoaching?.staffMembers?.[0];
                                    if (!staff) return prev;
                                    let dashboards = staff.dashboards ?? [];
                                    dashboards = dashboards.map((d) =>
                                      d.periodType === key
                                        ? { ...d, weekStart: Number(value) }
                                        : d,
                                    );
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching,
                                        isActive:
                                          typeof prev.smsCoaching?.isActive ===
                                          "boolean"
                                            ? prev.smsCoaching.isActive
                                            : false,
                                        phoneNumber:
                                          typeof prev.smsCoaching
                                            ?.phoneNumber === "string"
                                            ? prev.smsCoaching.phoneNumber
                                            : "",
                                        coachingStyle:
                                          typeof prev.smsCoaching
                                            ?.coachingStyle === "string"
                                            ? prev.smsCoaching.coachingStyle
                                            : "balanced",
                                        customMessage:
                                          typeof prev.smsCoaching
                                            ?.customMessage === "string"
                                            ? prev.smsCoaching.customMessage
                                            : "",
                                        staffMembers: [
                                          {
                                            ...staff,
                                            dashboards,
                                          },
                                        ],
                                      },
                                    };
                                  });
                                }}
                              >
                                {[1, 2, 3, 4, 5].map((w) => (
                                  <SelectItem key={w} value={String(w)}>
                                    {w}
                                  </SelectItem>
                                ))}
                              </Select>
                            </>
                          )}
                          {/* Yearly: month, day, time */}
                          {(dashboard as DashboardSchedule).frequency === "yearly" && (
                            <>
                              <Label>Month</Label>
                              <Select
                                value={String((dashboard as DashboardSchedule).monthOfYear ?? 1)}
                                onValueChange={(value) => {
                                  setFormData((prev) => {
                                    const staff =
                                      prev.smsCoaching?.staffMembers?.[0];
                                    if (!staff) return prev;
                                    let dashboards = staff.dashboards ?? [];
                                    dashboards = dashboards.map((d) =>
                                      d.periodType === key
                                        ? { ...d, monthOfYear: Number(value) }
                                        : d,
                                    );
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching,
                                        isActive:
                                          typeof prev.smsCoaching?.isActive ===
                                          "boolean"
                                            ? prev.smsCoaching.isActive
                                            : false,
                                        phoneNumber:
                                          typeof prev.smsCoaching
                                            ?.phoneNumber === "string"
                                            ? prev.smsCoaching.phoneNumber
                                            : "",
                                        coachingStyle:
                                          typeof prev.smsCoaching
                                            ?.coachingStyle === "string"
                                            ? prev.smsCoaching.coachingStyle
                                            : "balanced",
                                        customMessage:
                                          typeof prev.smsCoaching
                                            ?.customMessage === "string"
                                            ? prev.smsCoaching.customMessage
                                            : "",
                                        staffMembers: [
                                          {
                                            ...staff,
                                            dashboards,
                                          },
                                        ],
                                      },
                                    };
                                  });
                                }}
                              >
                                {monthsOfYear.map((m, i) => (
                                  <SelectItem key={i} value={String(i + 1)}>
                                    {m}
                                  </SelectItem>
                                ))}
                              </Select>
                              <Label>Day</Label>
                              <Input
                                type="number"
                                min={1}
                                max={31}
                                value={String((dashboard as DashboardSchedule).dayOfMonth ?? 1)}
                                onChange={(e) => {
                                  setFormData((prev) => {
                                    const staff =
                                      prev.smsCoaching?.staffMembers?.[0];
                                    if (!staff) return prev;
                                    let dashboards = staff.dashboards ?? [];
                                    dashboards = dashboards.map((d) =>
                                      d.periodType === key
                                        ? {
                                            ...d,
                                            dayOfMonth: Number(e.target.value),
                                          }
                                        : d,
                                    );
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching,
                                        isActive:
                                          typeof prev.smsCoaching?.isActive ===
                                          "boolean"
                                            ? prev.smsCoaching.isActive
                                            : false,
                                        phoneNumber:
                                          typeof prev.smsCoaching
                                            ?.phoneNumber === "string"
                                            ? prev.smsCoaching.phoneNumber
                                            : "",
                                        coachingStyle:
                                          typeof prev.smsCoaching
                                            ?.coachingStyle === "string"
                                            ? prev.smsCoaching.coachingStyle
                                            : "balanced",
                                        customMessage:
                                          typeof prev.smsCoaching
                                            ?.customMessage === "string"
                                            ? prev.smsCoaching.customMessage
                                            : "",
                                        staffMembers: [
                                          {
                                            ...staff,
                                            dashboards,
                                          },
                                        ],
                                      },
                                    };
                                  });
                                }}
                              />
                              <Label>Time (EST)</Label>
                              <Input
                                type="time"
                                value={(dashboard as DashboardSchedule).timeEST || ""}
                                onChange={(e) => {
                                  setFormData((prev) => {
                                    const staff =
                                      prev.smsCoaching?.staffMembers?.[0];
                                    if (!staff) return prev;
                                    let dashboards = staff.dashboards ?? [];
                                    dashboards = dashboards.map((d) =>
                                      d.periodType === key
                                        ? { ...d, timeEST: e.target.value }
                                        : d,
                                    );
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching,
                                        isActive:
                                          typeof prev.smsCoaching?.isActive ===
                                          "boolean"
                                            ? prev.smsCoaching.isActive
                                            : false,
                                        phoneNumber:
                                          typeof prev.smsCoaching
                                            ?.phoneNumber === "string"
                                            ? prev.smsCoaching.phoneNumber
                                            : "",
                                        coachingStyle:
                                          typeof prev.smsCoaching
                                            ?.coachingStyle === "string"
                                            ? prev.smsCoaching.coachingStyle
                                            : "balanced",
                                        customMessage:
                                          typeof prev.smsCoaching
                                            ?.customMessage === "string"
                                            ? prev.smsCoaching.customMessage
                                            : "",
                                        staffMembers: [
                                          {
                                            ...staff,
                                            dashboards,
                                          },
                                        ],
                                      },
                                    };
                                  });
                                }}
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
        </div>

        {/* Coaching Style and Custom Message */}
        <div className="mb-8">
          <Label>Coaching Style</Label>
          <Select
            value={formData.smsCoaching?.coachingStyle ?? "balanced"}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                smsCoaching: {
                  isActive:
                    typeof prev.smsCoaching?.isActive === "boolean"
                      ? prev.smsCoaching.isActive
                      : false,
                  phoneNumber:
                    typeof prev.smsCoaching?.phoneNumber === "string"
                      ? prev.smsCoaching.phoneNumber
                      : "",
                  coachingStyle: value as string,
                  customMessage:
                    typeof prev.smsCoaching?.customMessage === "string"
                      ? prev.smsCoaching.customMessage
                      : "",
                  staffMembers: Array.isArray(prev.smsCoaching?.staffMembers)
                    ? prev.smsCoaching.staffMembers
                    : [],
                },
              }))
            }
          >
            {coachingStyleOptions.map((style) => (
              <SelectItem key={style.value} value={style.value}>
                {style.label}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="mb-8">
          <Label>Custom Message (Optional)</Label>
          <Input
            type="text"
            value={formData.smsCoaching?.customMessage ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                smsCoaching: {
                  isActive:
                    typeof prev.smsCoaching?.isActive === "boolean"
                      ? prev.smsCoaching.isActive
                      : false,
                  phoneNumber:
                    typeof prev.smsCoaching?.phoneNumber === "string"
                      ? prev.smsCoaching.phoneNumber
                      : "",
                  coachingStyle:
                    typeof prev.smsCoaching?.coachingStyle === "string"
                      ? prev.smsCoaching.coachingStyle
                      : "balanced",
                  customMessage: e.target.value,
                  staffMembers: Array.isArray(prev.smsCoaching?.staffMembers)
                    ? prev.smsCoaching.staffMembers
                    : [],
                },
              }))
            }
            placeholder="Enter custom message"
          />
        </div>

        {/* Admin Team Coaching Section */}
        {formData.smsCoaching?.isActive && formData.isAdmin && (
          <div className="mb-8">
            <div className="mt-4 p-4 border rounded-lg bg-purple-50">
              <h4 className="font-semibold mb-2 text-gray-700">Admin Team Coaching</h4>
              <div className="flex items-start mb-2">
                <input
                  type="checkbox"
                  id="enable-admin-sms"
                  className="mr-2 mt-1"
                  checked={!!formData.smsCoaching?.adminCoaching?.isActive}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      smsCoaching: {
                        ...prev.smsCoaching!,
                        adminCoaching: {
                          isActive: e.target.checked,
                          includeTeamMetrics: true,
                          includeTopPerformers: true,
                          includeBottomPerformers: true,
                          includeGoalComparison: true,
                          includeManagementTips: true,
                          dashboards: prev.smsCoaching?.adminCoaching?.dashboards || [
                            {
                              periodType: 'mtd',
                              frequency: 'weekly',
                              timeEST: '09:00',
                              dayOfWeek: 3,
                              isActive: true
                            },
                            {
                              periodType: 'qtd',
                              frequency: 'monthly',
                              timeEST: '09:00',
                              dayOfWeek: 3,
                              weekOfMonth: 1,
                              isActive: true
                            }
                          ]
                        }
                      }
                    }));
                  }}
                />
                <div>
                  <label htmlFor="enable-admin-sms" className="text-sm font-medium">
                    Enable Admin SMS Coaching
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Receive management-focused team performance summaries
                  </p>
                </div>
              </div>
              
              {formData.smsCoaching?.adminCoaching?.isActive && (
                <div className="ml-6 space-y-4">
                  <div className="text-xs text-gray-600 space-y-1">
                    <p className="font-medium">Admin messages include:</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Critical metrics first (conversions, AOV, revenue)</li>
                      <li>Comparison to company goals (53% bottles, 6% club, $140 AOV)</li>
                      <li>Top 2 performers in each category</li>
                      <li>Specific management strategies</li>
                      <li>Staff pairing suggestions for improvement</li>
                    </ul>
                  </div>
                  
                  {/* Admin Dashboard Selection */}
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Admin Dashboard Selection</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {['mtd', 'qtd', 'ytd', 'all-quarters'].map((periodType) => {
                        const dashboard = formData.smsCoaching?.adminCoaching?.dashboards?.find(d => d.periodType === periodType);
                        const isActive = dashboard?.isActive || false;
                        
                        return (
                          <div key={periodType} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`admin-${periodType}`}
                              className="text-xs"
                              checked={isActive}
                              onChange={(e) => {
                                setFormData(prev => {
                                  const currentDashboards = prev.smsCoaching?.adminCoaching?.dashboards || [];
                                  let newDashboards;
                                  
                                  if (e.target.checked) {
                                    // Add dashboard if not exists
                                    if (!currentDashboards.find(d => d.periodType === periodType)) {
                                      newDashboards = [...currentDashboards, {
                                        periodType,
                                        frequency: periodType === 'mtd' ? 'weekly' : 'monthly',
                                        timeEST: '09:00',
                                        dayOfWeek: 3,
                                        weekOfMonth: periodType === 'qtd' ? 1 : undefined,
                                        monthOfQuarter: periodType === 'ytd' ? 1 : undefined,
                                        isActive: true
                                      }];
                                    } else {
                                      // Update existing dashboard
                                      newDashboards = currentDashboards.map(d => 
                                        d.periodType === periodType ? { ...d, isActive: true } : d
                                      );
                                    }
                                  } else {
                                    // Deactivate dashboard
                                    newDashboards = currentDashboards.map(d => 
                                      d.periodType === periodType ? { ...d, isActive: false } : d
                                    );
                                  }
                                  
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching!,
                                      adminCoaching: {
                                        ...prev.smsCoaching!.adminCoaching!,
                                        dashboards: newDashboards
                                      }
                                    }
                                  };
                                });
                              }}
                            />
                            <label htmlFor={`admin-${periodType}`} className="text-xs font-medium">
                              {periodType.toUpperCase()}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Admin Timing Configuration */}
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Admin Coaching Schedule</h5>
                    {formData.smsCoaching?.adminCoaching?.dashboards?.filter(d => d.isActive).map((dashboard, index) => (
                      <div key={dashboard.periodType} className="mb-3 p-3 border rounded bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{dashboard.periodType.toUpperCase()}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => {
                                const currentDashboards = prev.smsCoaching?.adminCoaching?.dashboards || [];
                                const newDashboards = currentDashboards.map(d => 
                                  d.periodType === dashboard.periodType ? { ...d, isActive: false } : d
                                );
                                
                                return {
                                  ...prev,
                                  smsCoaching: {
                                    ...prev.smsCoaching!,
                                    adminCoaching: {
                                      ...prev.smsCoaching!.adminCoaching!,
                                      dashboards: newDashboards
                                    }
                                  }
                                };
                              });
                            }}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                        
                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="block text-gray-600 mb-1">Frequency</label>
                            <select
                              value={dashboard.frequency}
                              onChange={(e) => {
                                setFormData(prev => {
                                  const currentDashboards = prev.smsCoaching?.adminCoaching?.dashboards || [];
                                  const newDashboards = currentDashboards.map(d => 
                                    d.periodType === dashboard.periodType ? { ...d, frequency: e.target.value } : d
                                  );
                                  
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching!,
                                      adminCoaching: {
                                        ...prev.smsCoaching!.adminCoaching!,
                                        dashboards: newDashboards
                                      }
                                    }
                                  };
                                });
                              }}
                              className="w-full px-2 py-1 border rounded text-xs"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="biweekly">Bi-weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                            </select>
                          </div>
                          
                          {/* Weekly: day of week and time */}
                          {dashboard.frequency === "weekly" && (
                            <>
                              <div>
                                <label className="block text-gray-600 mb-1">Day of Week</label>
                                <select
                                  value={String(dashboard.dayOfWeek ?? "0")}
                                  onChange={(e) => {
                                    setFormData(prev => {
                                      const currentDashboards = prev.smsCoaching?.adminCoaching?.dashboards || [];
                                      const newDashboards = currentDashboards.map(d => 
                                        d.periodType === dashboard.periodType ? { ...d, dayOfWeek: parseInt(e.target.value) } : d
                                      );
                                      
                                      return {
                                        ...prev,
                                        smsCoaching: {
                                          ...prev.smsCoaching!,
                                          adminCoaching: {
                                            ...prev.smsCoaching!.adminCoaching!,
                                            dashboards: newDashboards
                                          }
                                        }
                                      };
                                    });
                                  }}
                                  className="w-full px-2 py-1 border rounded text-xs"
                                >
                                  {daysOfWeek.map((d, i) => (
                                    <option key={i} value={String(i)}>{d}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-gray-600 mb-1">Time (EST)</label>
                                <input
                                  type="time"
                                  value={dashboard.timeEST}
                                  onChange={(e) => {
                                    setFormData(prev => {
                                      const currentDashboards = prev.smsCoaching?.adminCoaching?.dashboards || [];
                                      const newDashboards = currentDashboards.map(d => 
                                        d.periodType === dashboard.periodType ? { ...d, timeEST: e.target.value } : d
                                      );
                                      
                                      return {
                                        ...prev,
                                        smsCoaching: {
                                          ...prev.smsCoaching!,
                                          adminCoaching: {
                                            ...prev.smsCoaching!.adminCoaching!,
                                            dashboards: newDashboards
                                          }
                                        }
                                      };
                                    });
                                  }}
                                  className="w-full px-2 py-1 border rounded text-xs"
                                />
                              </div>
                            </>
                          )}
                          
                          {/* Monthly: week of month, day of week, time */}
                          {dashboard.frequency === "monthly" && (
                            <>
                              <div>
                                <label className="block text-gray-600 mb-1">Week of Month</label>
                                <select
                                  value={String(dashboard.weekOfMonth ?? 1)}
                                  onChange={(e) => {
                                    setFormData(prev => {
                                      const currentDashboards = prev.smsCoaching?.adminCoaching?.dashboards || [];
                                      const newDashboards = currentDashboards.map(d => 
                                        d.periodType === dashboard.periodType ? { ...d, weekOfMonth: Number(e.target.value) } : d
                                      );
                                      
                                      return {
                                        ...prev,
                                        smsCoaching: {
                                          ...prev.smsCoaching!,
                                          adminCoaching: {
                                            ...prev.smsCoaching!.adminCoaching!,
                                            dashboards: newDashboards
                                          }
                                        }
                                      };
                                    });
                                  }}
                                  className="w-full px-2 py-1 border rounded text-xs"
                                >
                                  {weeksOfMonth.map((w, i) => (
                                    <option key={i} value={String(i + 1)}>{w}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-gray-600 mb-1">Day of Week</label>
                                <select
                                  value={String(dashboard.dayOfWeek ?? "0")}
                                  onChange={(e) => {
                                    setFormData(prev => {
                                      const currentDashboards = prev.smsCoaching?.adminCoaching?.dashboards || [];
                                      const newDashboards = currentDashboards.map(d => 
                                        d.periodType === dashboard.periodType ? { ...d, dayOfWeek: parseInt(e.target.value) } : d
                                      );
                                      
                                      return {
                                        ...prev,
                                        smsCoaching: {
                                          ...prev.smsCoaching!,
                                          adminCoaching: {
                                            ...prev.smsCoaching!.adminCoaching!,
                                            dashboards: newDashboards
                                          }
                                        }
                                      };
                                    });
                                  }}
                                  className="w-full px-2 py-1 border rounded text-xs"
                                >
                                  {daysOfWeek.map((d, i) => (
                                    <option key={i} value={String(i)}>{d}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-gray-600 mb-1">Time (EST)</label>
                                <input
                                  type="time"
                                  value={dashboard.timeEST}
                                  onChange={(e) => {
                                    setFormData(prev => {
                                      const currentDashboards = prev.smsCoaching?.adminCoaching?.dashboards || [];
                                      const newDashboards = currentDashboards.map(d => 
                                        d.periodType === dashboard.periodType ? { ...d, timeEST: e.target.value } : d
                                      );
                                      
                                      return {
                                        ...prev,
                                        smsCoaching: {
                                          ...prev.smsCoaching!,
                                          adminCoaching: {
                                            ...prev.smsCoaching!.adminCoaching!,
                                            dashboards: newDashboards
                                          }
                                        }
                                      };
                                    });
                                  }}
                                  className="w-full px-2 py-1 border rounded text-xs"
                                />
                              </div>
                            </>
                          )}
                          
                          {/* Quarterly: week of quarter (always 1st), day of week, time */}
                          {dashboard.frequency === "quarterly" && (
                            <>
                              <div>
                                <label className="block text-gray-600 mb-1">Week of Quarter</label>
                                <select
                                  value={String(dashboard.weekOfMonth ?? 1)}
                                  onChange={(e) => {
                                    setFormData(prev => {
                                      const currentDashboards = prev.smsCoaching?.adminCoaching?.dashboards || [];
                                      const newDashboards = currentDashboards.map(d => 
                                        d.periodType === dashboard.periodType ? { ...d, weekOfMonth: Number(e.target.value) } : d
                                      );
                                      
                                      return {
                                        ...prev,
                                        smsCoaching: {
                                          ...prev.smsCoaching!,
                                          adminCoaching: {
                                            ...prev.smsCoaching!.adminCoaching!,
                                            dashboards: newDashboards
                                          }
                                        }
                                      };
                                    });
                                  }}
                                  className="w-full px-2 py-1 border rounded text-xs"
                                >
                                  <option value="1">First Week</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-gray-600 mb-1">Day of Week</label>
                                <select
                                  value={String(dashboard.dayOfWeek ?? "0")}
                                  onChange={(e) => {
                                    setFormData(prev => {
                                      const currentDashboards = prev.smsCoaching?.adminCoaching?.dashboards || [];
                                      const newDashboards = currentDashboards.map(d => 
                                        d.periodType === dashboard.periodType ? { ...d, dayOfWeek: parseInt(e.target.value) } : d
                                      );
                                      
                                      return {
                                        ...prev,
                                        smsCoaching: {
                                          ...prev.smsCoaching!,
                                          adminCoaching: {
                                            ...prev.smsCoaching!.adminCoaching!,
                                            dashboards: newDashboards
                                          }
                                        }
                                      };
                                    });
                                  }}
                                  className="w-full px-2 py-1 border rounded text-xs"
                                >
                                  {daysOfWeek.map((d, i) => (
                                    <option key={i} value={String(i)}>{d}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-gray-600 mb-1">Time (EST)</label>
                                <input
                                  type="time"
                                  value={dashboard.timeEST}
                                  onChange={(e) => {
                                    setFormData(prev => {
                                      const currentDashboards = prev.smsCoaching?.adminCoaching?.dashboards || [];
                                      const newDashboards = currentDashboards.map(d => 
                                        d.periodType === dashboard.periodType ? { ...d, timeEST: e.target.value } : d
                                      );
                                      
                                      return {
                                        ...prev,
                                        smsCoaching: {
                                          ...prev.smsCoaching!,
                                          adminCoaching: {
                                            ...prev.smsCoaching!.adminCoaching!,
                                            dashboards: newDashboards
                                          }
                                        }
                                      };
                                    });
                                  }}
                                  className="w-full px-2 py-1 border rounded text-xs"
                                />
                              </div>
                            </>
                          )}
                          
                          {/* Biweekly: day of week, time */}
                          {dashboard.frequency === "biweekly" && (
                            <>
                              <div>
                                <label className="block text-gray-600 mb-1">Day of Week</label>
                                <select
                                  value={String(dashboard.dayOfWeek ?? "0")}
                                  onChange={(e) => {
                                    setFormData(prev => {
                                      const currentDashboards = prev.smsCoaching?.adminCoaching?.dashboards || [];
                                      const newDashboards = currentDashboards.map(d => 
                                        d.periodType === dashboard.periodType ? { ...d, dayOfWeek: parseInt(e.target.value) } : d
                                      );
                                      
                                      return {
                                        ...prev,
                                        smsCoaching: {
                                          ...prev.smsCoaching!,
                                          adminCoaching: {
                                            ...prev.smsCoaching!.adminCoaching!,
                                            dashboards: newDashboards
                                          }
                                        }
                                      };
                                    });
                                  }}
                                  className="w-full px-2 py-1 border rounded text-xs"
                                >
                                  {daysOfWeek.map((d, i) => (
                                    <option key={i} value={String(i)}>{d}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-gray-600 mb-1">Time (EST)</label>
                                <input
                                  type="time"
                                  value={dashboard.timeEST}
                                  onChange={(e) => {
                                    setFormData(prev => {
                                      const currentDashboards = prev.smsCoaching?.adminCoaching?.dashboards || [];
                                      const newDashboards = currentDashboards.map(d => 
                                        d.periodType === dashboard.periodType ? { ...d, timeEST: e.target.value } : d
                                      );
                                      
                                      return {
                                        ...prev,
                                        smsCoaching: {
                                          ...prev.smsCoaching!,
                                          adminCoaching: {
                                            ...prev.smsCoaching!.adminCoaching!,
                                            dashboards: newDashboards
                                          }
                                        }
                                      };
                                    });
                                  }}
                                  className="w-full px-2 py-1 border rounded text-xs"
                                />
                              </div>
                            </>
                          )}
                          
                          {/* Daily: just time */}
                          {dashboard.frequency === "daily" && (
                            <div>
                              <label className="block text-gray-600 mb-1">Time (EST)</label>
                              <input
                                type="time"
                                value={dashboard.timeEST}
                                onChange={(e) => {
                                  setFormData(prev => {
                                    const currentDashboards = prev.smsCoaching?.adminCoaching?.dashboards || [];
                                    const newDashboards = currentDashboards.map(d => 
                                      d.periodType === dashboard.periodType ? { ...d, timeEST: e.target.value } : d
                                    );
                                    
                                    return {
                                      ...prev,
                                      smsCoaching: {
                                        ...prev.smsCoaching!,
                                        adminCoaching: {
                                          ...prev.smsCoaching!.adminCoaching!,
                                          dashboards: newDashboards
                                        }
                                      }
                                    };
                                  });
                                }}
                                className="w-full px-2 py-1 border rounded text-xs"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Authentication Section */}
        <div className="mb-8">
          <div className="mt-4 p-4 border rounded-lg bg-blue-50">
            <h4 className="font-semibold mb-2 text-gray-700">Admin Access</h4>
            <div className="flex items-start mb-2">
              <input
                type="checkbox"
                id="enable-admin-access"
                className="mr-2 mt-1"
                checked={!!formData.isAdmin}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    isAdmin: e.target.checked,
                    adminPassword: e.target.checked ? prev.adminPassword || '' : undefined
                  }));
                }}
              />
              <div>
                <label htmlFor="enable-admin-access" className="text-sm font-medium">
                  Grant Admin Access
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Allow this user to access admin dashboard and features
                </p>
              </div>
            </div>
            
            {formData.isAdmin && (
              <div className="ml-6 space-y-2">
                <div>
                  <label htmlFor="admin-password" className="text-xs font-medium text-gray-700">
                    Admin Password
                  </label>
                  <input
                    type="password"
                    id="admin-password"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-xs"
                    placeholder="Enter admin password"
                    value={formData.adminPassword || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        adminPassword: e.target.value
                      }));
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Password will be hashed and stored securely
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Personal Goals Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Personal Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bottle Conversion Rate Goal */}
            <div className="border rounded p-4 flex flex-col items-start">
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={
                    !!formData.personalizedGoals?.bottleConversionRate?.enabled
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      personalizedGoals: {
                        ...prev.personalizedGoals,
                        bottleConversionRate: {
                          ...prev.personalizedGoals?.bottleConversionRate,
                          enabled: e.target.checked,
                        },
                      },
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">
                  Bottle Conversion Rate Goal
                </span>
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={
                  formData.personalizedGoals?.bottleConversionRate?.value ?? ""
                }
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    personalizedGoals: {
                      ...prev.personalizedGoals,
                      bottleConversionRate: {
                        ...prev.personalizedGoals?.bottleConversionRate,
                        value:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      },
                    },
                  }))
                }
                disabled={
                  !formData.personalizedGoals?.bottleConversionRate?.enabled
                }
                placeholder="%"
                className="w-full"
              />
              <span className="text-xs text-gray-500 mt-1">0-100%</span>
            </div>
            {/* Club Conversion Rate Goal */}
            <div className="border rounded p-4 flex flex-col items-start">
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={
                    !!formData.personalizedGoals?.clubConversionRate?.enabled
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      personalizedGoals: {
                        ...prev.personalizedGoals,
                        clubConversionRate: {
                          ...prev.personalizedGoals?.clubConversionRate,
                          enabled: e.target.checked,
                        },
                      },
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">
                  Club Conversion Rate Goal
                </span>
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={
                  formData.personalizedGoals?.clubConversionRate?.value ?? ""
                }
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    personalizedGoals: {
                      ...prev.personalizedGoals,
                      clubConversionRate: {
                        ...prev.personalizedGoals?.clubConversionRate,
                        value:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      },
                    },
                  }))
                }
                disabled={
                  !formData.personalizedGoals?.clubConversionRate?.enabled
                }
                placeholder="%"
                className="w-full"
              />
              <span className="text-xs text-gray-500 mt-1">0-100%</span>
            </div>
            {/* AOV Goal */}
            <div className="border rounded p-4 flex flex-col items-start">
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={!!formData.personalizedGoals?.aov?.enabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      personalizedGoals: {
                        ...prev.personalizedGoals,
                        aov: {
                          ...prev.personalizedGoals?.aov,
                          enabled: e.target.checked,
                        },
                      },
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">
                  Average Order Value Goal
                </span>
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={formData.personalizedGoals?.aov?.value ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    personalizedGoals: {
                      ...prev.personalizedGoals,
                      aov: {
                        ...prev.personalizedGoals?.aov,
                        value:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      },
                    },
                  }))
                }
                disabled={!formData.personalizedGoals?.aov?.enabled}
                placeholder="$"
                className="w-full"
              />
              <span className="text-xs text-gray-500 mt-1">
                Positive number
              </span>
            </div>
          </div>
        </div>

        {/* Save/Delete/Send Buttons */}
        <div className="flex space-x-4 mt-8">
          <Button type="button" onClick={handleSubmit}>
            {subscription?._id ? "Save Changes" : "Add Subscriber"}
          </Button>
          {subscription?._id && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onDelete((subscription._id as string) || "")}
            >
              Delete
            </Button>
          )}
          {subscription?._id && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onSendReports(subscription)}
            >
              Send Email
            </Button>
          )}
          {subscription?._id &&
            formData.smsCoaching?.phoneNumber &&
            formData.smsCoaching?.staffMembers &&
            formData.smsCoaching.staffMembers[0] && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">SMS Coaching:</label>
                <select
                  className="border rounded px-3 py-2 text-sm"
                  value={selectedSmsPeriod || "mtd"}
                  onChange={(e) => setSelectedSmsPeriod(e.target.value)}
                >
                  <option value="mtd">MTD (Month-to-Date)</option>
                  <option value="qtd">QTD (Quarter-to-Date)</option>
                  <option value="ytd">YTD (Year-to-Date)</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onSendSMSCoaching(subscription, selectedSmsPeriod || "mtd")}
                  className="text-sm"
                >
                  {`Send ${(selectedSmsPeriod || "mtd").toUpperCase()} SMS`}
                </Button>
              </div>
            )}
          {subscription?._id && formData.smsCoaching?.phoneNumber && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSmsArchiveOpen(true)}
            >
              SMS Archive
            </Button>
          )}
        </div>
      </div>
      {/* SMS Archive Modal */}
      {smsArchiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">SMS Archive</h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setSmsArchiveOpen(false)}
              >
                &times;
              </button>
            </div>
            {smsArchiveLoading ? (
              <div>Loading...</div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {smsArchive.length === 0 ? (
                  <div>No SMS messages found.</div>
                ) : (
                  <ul>
                    {smsArchive.map((msg, idx) => (
                      <li
                        key={msg._id || idx}
                        className="border-b py-2 cursor-pointer"
                        onClick={() => setSelectedMessage(msg)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs text-gray-500">
                            {new Date(msg.sentAt).toLocaleString()}
                          </span>
                          <span className="ml-2 truncate w-64">
                            {msg.coachingMessage.slice(0, 48)}
                            {msg.coachingMessage.length > 48 ? "..." : ""}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {selectedMessage && (
              <div className="mt-4 p-4 border rounded bg-gray-50 max-h-80 overflow-y-auto">
                <div className="font-mono text-xs text-gray-500 mb-2">
                  {new Date(selectedMessage.sentAt).toLocaleString()}
                </div>
                <div className="whitespace-pre-line">
                  {selectedMessage.coachingMessage}
                </div>
                <button
                  className="mt-2 px-4 py-2 border rounded bg-white hover:bg-gray-100"
                  onClick={() => setSelectedMessage(null)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
