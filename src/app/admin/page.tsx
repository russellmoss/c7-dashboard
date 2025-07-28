"use client";

import React, { useState, useEffect } from "react";
import { EmailSubscription } from "@/types/email";
import SubscriptionModal from "@/components/admin/SubscriptionModal";

export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  const [subscriptions, setSubscriptions] = useState<EmailSubscription[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSubscription, setModalSubscription] =
    useState<EmailSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);



  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch("/api/admin/subscriptions");
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    } finally {
      setIsLoading(false);
    }
  };



  const handleEdit = (subscription: EmailSubscription) => {
    setModalSubscription(subscription);
    setIsModalOpen(true);
  };

  const handleModalSave = async (updatedSubscription: EmailSubscription) => {
    try {
      const response = await fetch(
        `/api/admin/subscriptions/${updatedSubscription._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: updatedSubscription.name,
            email: updatedSubscription.email,
            subscribedReports: updatedSubscription.subscribedReports,
            frequency: updatedSubscription.frequency,
            timeEST: updatedSubscription.timeEST,
            isActive: updatedSubscription.isActive,
          }),
        },
      );

      if (response.ok) {
        // Fetch the updated subscription to get the latest data from the server
        const updatedResponse = await fetch(
          `/api/admin/subscriptions/${updatedSubscription._id}`,
        );
        if (updatedResponse.ok) {
          const freshSubscription = await updatedResponse.json();
          // Update the modal subscription with fresh data
          setModalSubscription(freshSubscription);
        }
        fetchSubscriptions();
        setIsModalOpen(false);
        setModalSubscription(null);
      } else {
        const errorData = await response.json();
        alert(
          "Error updating subscription: " +
            (errorData.error || "Unknown error"),
        );
      }
    } catch (error) {
      console.error("Error updating subscription:", error);
      alert("Error updating subscription. Please try again.");
    }
  };

  const handleSendReports = async (subscription: EmailSubscription) => {
    try {
      // Send emails for each subscribed report
      const promises = subscription.subscribedReports.map(
        async (reportType) => {
          const response = await fetch("/api/admin/test-kpi-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: subscription.email,
              name: subscription.name,
              periodType: reportType,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              `${reportType.toUpperCase()}: ${errorData.error || "Unknown error"}`,
            );
          }

          return response.json();
        },
      );

      await Promise.all(promises);
      alert(
        `KPI dashboard emails sent successfully for ${subscription.subscribedReports.length} report(s)! Check your inbox.`,
      );
    } catch (error) {
      console.error("Error sending KPI dashboard emails:", error);
      alert(
        "Error sending KPI dashboard emails: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  };

  const handleSendSMSCoaching = async (
    subscription: EmailSubscription,
    periodType: string = "mtd",
  ) => {
    try {
      const response = await fetch("/api/admin/send-sms-coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: subscription._id,
          periodType: periodType,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`SMS coaching sent successfully! ${result.message}`);
      } else {
        const errorData = await response.json();
        alert(
          "Failed to send SMS coaching: " +
            (errorData.error || "Unknown error"),
        );
      }
    } catch (error) {
      console.error("Error sending SMS coaching:", error);
      alert("Error sending SMS coaching. Please try again.");
    }
  };

  const handleTestSMS = async (phoneNumber: string, name: string) => {
    try {
      const response = await fetch("/api/admin/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          name,
        }),
      });

      if (response.ok) {
        alert("Test SMS sent successfully! Check your phone.");
      } else {
        const errorData = await response.json();
        alert(
          "Failed to send test SMS: " + (errorData.error || "Unknown error"),
        );
      }
    } catch (error) {
      console.error("Error sending test SMS:", error);
      alert("Error sending test SMS. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this subscription?")) {
      try {
        const response = await fetch(`/api/admin/subscriptions/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          fetchSubscriptions();
        }
      } catch (error) {
        console.error("Error deleting subscription:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              Loading subscription management system...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 rounded bg-wine-600 text-white hover:bg-wine-700 transition font-semibold text-sm shadow mr-4"
          >
            Home
          </a>
          <h1 className="text-2xl font-bold text-wine-900">Admin Dashboard</h1>
        </div>
        <div className="flex space-x-4">
          <a
            href="/admin"
            className="inline-flex items-center px-4 py-2 rounded bg-wine-600 text-white hover:bg-wine-700 transition font-semibold text-sm shadow"
          >
            📧 Subscriptions
          </a>
          <a
            href="/admin/competitions"
            className="inline-flex items-center px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-semibold text-sm shadow"
          >
            🏆 Competitions
          </a>
        </div>
      </div>
      <div className="max-w-5xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Subscription Management System
            </h1>
            <p className="text-gray-600">
              Manage email subscriptions and SMS coaching for KPI dashboards and
              staff performance updates.
            </p>
          </div>
          <button
            className="mt-4 md:mt-0 bg-wine-600 text-white px-6 py-2 rounded-lg hover:bg-wine-700 transition-colors font-semibold shadow"
            onClick={() => {
              setModalSubscription({
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
                },
                personalizedGoals: {
                  bottleConversionRate: { enabled: false, value: undefined },
                  clubConversionRate: { enabled: false, value: undefined },
                  aov: { enabled: false, value: undefined },
                },
              });
              setIsModalOpen(true);
            }}
          >
            + Add Subscriber
          </button>
        </div>
        {/* Subscriptions Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Active Subscriptions
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Services
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subscriptions.map((subscription) => (
                  <tr key={subscription._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {subscription.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subscription.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          subscription.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {subscription.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-600">📧</span>
                          <span>
                            {subscription.subscribedReports.length} Email
                            Reports
                          </span>
                        </div>
                        {subscription.smsCoaching?.isActive && (
                          <div className="flex items-center space-x-2">
                            <span className="text-green-600">📱</span>
                            <span>SMS Coaching</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(subscription)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(subscription._id!)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subscription Modal */}
        {isModalOpen && modalSubscription && (
          <SubscriptionModal
            subscription={modalSubscription}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setModalSubscription(null);
            }}
            onSave={async (subscription) => {
              if (!subscription._id) {
                // New subscriber: POST
                try {
                  const response = await fetch("/api/admin/subscriptions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(subscription),
                  });
                  if (response.ok) {
                    fetchSubscriptions();
                    setIsModalOpen(false);
                    setModalSubscription(null);
                  } else {
                    const errorData = await response.json();
                    alert(
                      "Error creating subscription: " +
                        (errorData.error || "Unknown error"),
                    );
                  }
                } catch (error) {
                  alert("Error creating subscription. Please try again.");
                }
              } else {
                // Existing: PUT
                await handleModalSave(subscription);
              }
            }}
            onDelete={handleDelete}
            onSendReports={handleSendReports}
            onSendSMSCoaching={handleSendSMSCoaching}
            onTestSMS={handleTestSMS}
          />
        )}
      </div>
    </div>
  );
}
