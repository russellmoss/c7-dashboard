"use client";

import React from "react";
import { useAuth } from "../components/AuthProvider";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  React.useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Milea Estate Vineyard
          </h1>
          <h2 className="text-2xl font-semibold text-primary mb-2">
            KPI Dashboard & Subscription Management System
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive business intelligence platform with automated email
            reporting and SMS coaching for staff performance optimization.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* MTD Dashboard */}
          <div className="bg-card rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              Month-to-Date
            </h3>
            <p className="text-muted-foreground mb-4">
              Current month performance metrics and insights
            </p>
            <a
              href="/dashboard/mtd"
              className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              View MTD Dashboard
            </a>
          </div>

          {/* QTD Dashboard */}
          <div className="bg-card rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              Quarter-to-Date
            </h3>
            <p className="text-muted-foreground mb-4">
              Quarterly performance analysis and trends
            </p>
            <a
              href="/dashboard/qtd"
              className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              View QTD Dashboard
            </a>
          </div>

          {/* YTD Dashboard */}
          <div className="bg-card rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              Year-to-Date
            </h3>
            <p className="text-muted-foreground mb-4">
              Annual performance overview and strategic insights
            </p>
            <a
              href="/dashboard/ytd"
              className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              View YTD Dashboard
            </a>
          </div>

          {/* All Quarters Dashboard */}
          <div className="bg-card rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              All Quarters
            </h3>
            <p className="text-muted-foreground mb-4">
              Comprehensive quarterly comparison analysis
            </p>
            <a
              href="/dashboard/ytd"
              className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              View All Quarters
            </a>
          </div>

          {/* Custom Date Range */}
          <div className="bg-card rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              Custom Date Range
            </h3>
            <p className="text-muted-foreground mb-4">
              Analyze performance for specific time periods
            </p>
            <a
              href="/dashboard/custom"
              className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Custom Analysis
            </a>
          </div>

          {/* Subscription Management */}
          <div className="bg-card rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              Subscription Management
            </h3>
            <p className="text-muted-foreground mb-4">
              Manage email reports and SMS coaching for staff
            </p>
            <a
              href="/admin"
              className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Manage Subscriptions
            </a>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="bg-card rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-semibold text-card-foreground mb-4">
              🍷 Wine Industry Intelligence Platform
            </h3>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div>
                <h4 className="text-lg font-semibold text-primary mb-3">
                  📊 KPI Dashboards
                </h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Real-time performance metrics</li>
                  <li>• Wine conversion rate tracking</li>
                  <li>• Club membership analytics</li>
                  <li>• Staff performance insights</li>
                  <li>• AI-powered recommendations</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-primary mb-3">
                  📧 Email & SMS Management
                </h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Automated email reports</li>
                  <li>• SMS coaching for staff</li>
                  <li>• Flexible scheduling options</li>
                  <li>• Wine industry best practices</li>
                  <li>• Performance optimization tips</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
