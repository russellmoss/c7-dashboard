"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, AlertTriangle, TrendingUp, Target, Award, AlertCircle, TrendingDown, CheckCircle } from 'lucide-react';

interface AIInsight {
  strengths: string[];
  opportunities: string[];
  weaknesses: string[];
  threats: string[];
  staffPraise: Array<{
    name: string;
    reason: string;
    metrics: string[];
  }>;
  staffCoaching: Array<{
    name: string;
    reason: string;
    metrics: string[];
  }>;
  recommendations: string[];
  generatedAt: string;
  error?: string;
}

interface AIInsightsPanelProps {
  insights?: AIInsight;
  loading?: boolean;
}

export function AIInsightsPanel({ insights, loading }: AIInsightsPanelProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <div className="flex flex-row items-center space-y-0 pb-2 px-4 pt-4">
          <Award className="h-5 w-5 text-primary mr-2" />
          <h2 className="text-lg font-semibold text-card-foreground">AI Insights</h2>
        </div>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Analyzing data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="h-full">
        <div className="flex flex-row items-center space-y-0 pb-2 px-4 pt-4">
          <Award className="h-5 w-5 text-muted-foreground mr-2" />
          <h2 className="text-lg font-semibold text-card-foreground">AI Insights</h2>
        </div>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-card-foreground">No insights available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Generate new data to see AI analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Defensive: default all arrays to [] if missing
  const {
    strengths = [],
    opportunities = [],
    weaknesses = [],
    threats = [],
    staffPraise = [],
    staffCoaching = [],
    recommendations = [],
    generatedAt = "",
    error,
  } = insights;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "Unknown";
    }
  };

  return (
    <Card className="h-full">
      <div className="flex flex-row items-center space-y-0 pb-2 px-4 pt-4">
        <Award className="h-5 w-5 text-primary mr-2" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-card-foreground">AI Insights</h2>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3 mr-1" />
            Generated: {formatDate(generatedAt)}
          </div>
        </div>
        {error && (
          <span className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2 py-1 rounded text-xs font-semibold ml-2">
            Limited Analysis
          </span>
        )}
      </div>
      <CardContent className="space-y-4">
        {/* SWOT Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="space-y-2">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
              <h4 className="font-semibold text-green-700">Strengths</h4>
            </div>
            <div className="space-y-1">
              {strengths.length > 0 ? (
                strengths.map((strength, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-card-foreground bg-green-50 dark:bg-green-900/20 p-2 rounded border-l-2 border-green-200 dark:border-green-800"
                  >
                    {strength}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">None identified</p>
              )}
            </div>
          </div>

          {/* Opportunities */}
          <div className="space-y-2">
            <div className="flex items-center">
              <Target className="h-4 w-4 text-blue-600 mr-2" />
              <h4 className="font-semibold text-blue-700">Opportunities</h4>
            </div>
            <div className="space-y-1">
              {opportunities.length > 0 ? (
                opportunities.map((opportunity, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-card-foreground bg-blue-50 dark:bg-blue-900/20 p-2 rounded border-l-2 border-blue-200 dark:border-blue-800"
                  >
                    {opportunity}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">None identified</p>
              )}
            </div>
          </div>

          {/* Weaknesses */}
          <div className="space-y-2">
            <div className="flex items-center">
              <TrendingDown className="h-4 w-4 text-amber-600 mr-2" />
              <h4 className="font-semibold text-amber-700">
                Areas for Improvement
              </h4>
            </div>
            <div className="space-y-1">
              {weaknesses.length > 0 ? (
                weaknesses.map((weakness, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-card-foreground bg-amber-50 dark:bg-amber-900/20 p-2 rounded border-l-2 border-amber-200 dark:border-amber-800"
                  >
                    {weakness}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">None identified</p>
              )}
            </div>
          </div>

          {/* Threats */}
          <div className="space-y-2">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
              <h4 className="font-semibold text-red-700">Concerns</h4>
            </div>
            <div className="space-y-1">
              {threats.length > 0 ? (
                threats.map((threat, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-card-foreground bg-red-50 dark:bg-red-900/20 p-2 rounded border-l-2 border-red-200 dark:border-red-800"
                  >
                    {threat}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">None identified</p>
              )}
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="my-4 border-t border-border" />

        {/* Staff Performance */}
        {(staffPraise.length > 0 || staffCoaching.length > 0) && (
          <div className="space-y-3">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-primary mr-2" />
              <h4 className="font-semibold text-card-foreground">Staff Performance</h4>
            </div>

            {staffPraise.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-green-700 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Recognition
                </h5>
                {staffPraise.map((praise, idx) => (
                  <div
                    key={idx}
                    className="text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded border-l-2 border-green-200 dark:border-green-800"
                  >
                    <p className="font-medium text-card-foreground">{praise.name}</p>
                    <p className="text-card-foreground">{praise.reason}</p>
                    {praise.metrics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {praise.metrics.map((metric, mIdx) => (
                          <span
                            key={mIdx}
                            className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded text-xs font-medium"
                          >
                            {metric}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {staffCoaching.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-amber-700 flex items-center">
                  <Target className="h-3 w-3 mr-1" />
                  Development Opportunities
                </h5>
                {staffCoaching.map((coaching, idx) => (
                  <div
                    key={idx}
                    className="text-sm bg-amber-50 dark:bg-amber-900/20 p-3 rounded border-l-2 border-amber-200 dark:border-amber-800"
                  >
                    <p className="font-medium text-card-foreground">{coaching.name}</p>
                    <p className="text-card-foreground">{coaching.reason}</p>
                    {coaching.metrics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {coaching.metrics.map((metric, mIdx) => (
                          <span
                            key={mIdx}
                            className="bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded text-xs font-medium"
                          >
                            {metric}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Separator */}
        <div className="my-4 border-t border-border" />

        {/* Recommendations */}
        <div className="space-y-2">
          <div className="flex items-center">
            <Target className="h-4 w-4 text-primary mr-2" />
            <h4 className="font-semibold text-card-foreground">Recommendations</h4>
          </div>
          <div className="space-y-1">
            {recommendations.length > 0 ? (
              recommendations.map((recommendation, idx) => (
                <div
                  key={idx}
                  className="text-sm text-card-foreground bg-primary/10 p-2 rounded border-l-2 border-primary/30"
                >
                  <span className="font-medium text-primary">{idx + 1}.</span>{" "}
                  {recommendation}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No recommendations available
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                AI analysis partially available. Some insights may be limited.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
