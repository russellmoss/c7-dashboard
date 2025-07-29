"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = 'force-dynamic';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
}

interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  totalDuration: number;
  status: "excellent" | "good" | "fair" | "needs_improvement";
}

interface ComprehensiveTestData {
  summary: TestSummary;
  testResults: {
    database: {
      connection: TestResult;
      schemaValidation: TestResult;
      dataIntegrity: TestResult;
    };
    competitionManagement: {
      creation: TestResult;
      activation: TestResult;
      updates: TestResult;
      deletion: TestResult;
      statusTransitions: TestResult;
    };
    rankingSystem: {
      calculation: TestResult;
      tieHandling: TestResult;
      caching: TestResult;
      realTimeUpdates: TestResult;
    };
    smsSystem: {
      welcomeSms: TestResult;
      progressSms: TestResult;
      winnerAnnouncement: TestResult;
      validation: TestResult;
      scheduling: TestResult;
    };
    analytics: {
      overviewMetrics: TestResult;
      trendAnalysis: TestResult;
      performanceAnalytics: TestResult;
      filtering: TestResult;
      insights: TestResult;
    };
    archiveManagement: {
      search: TestResult;
      filtering: TestResult;
      statistics: TestResult;
      archiveRestore: TestResult;
    };
    apiEndpoints: {
      competitions: TestResult;
      rankings: TestResult;
      analytics: TestResult;
      archive: TestResult;
      sms: TestResult;
    };
    integration: {
      endToEnd: TestResult;
      dataFlow: TestResult;
      errorHandling: TestResult;
      performance: TestResult;
    };
  };
  recommendations: string[];
  criticalIssues: string[];
}

export default function TestingDashboard() {
  const [testData, setTestData] = useState<ComprehensiveTestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  // Run comprehensive tests
  const runTests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/test-comprehensive");
      const data = await response.json();

      if (data.success) {
        setTestData(data.data);
        setLastRun(new Date());
      } else {
        console.error("Test failed:", data.message);
      }
    } catch (error) {
      console.error("Error running tests:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      case "fair":
        return "bg-yellow-100 text-yellow-800";
      case "needs_improvement":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get test result icon
  const getTestIcon = (success: boolean) => {
    return success ? "✅" : "❌";
  };

  // Get test result color
  const getTestColor = (success: boolean) => {
    return success ? "text-green-600" : "text-red-600";
  };

  // Render test category
  const renderTestCategory = (title: string, tests: any, icon: string) => {
    const testArray = Object.values(tests) as TestResult[];
    const passedTests = testArray.filter((test) => test.success).length;
    const totalTests = testArray.length;

    return (
      <Card key={title} className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <span className="mr-2">{icon}</span>
              {title}
            </span>
            <Badge
              className={
                passedTests === totalTests
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }
            >
              {passedTests}/{totalTests} Passed
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {testArray.map((test, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 border rounded-lg"
              >
                <span className={`text-lg ${getTestColor(test.success)}`}>
                  {getTestIcon(test.success)}
                </span>
                <div className="flex-1">
                  <div className="font-medium">{test.name}</div>
                  <div className="text-sm text-gray-600">{test.message}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

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
            🧪 Comprehensive Testing Dashboard
          </h1>
        </div>
        <Button
          onClick={runTests}
          disabled={loading}
          className="bg-wine-600 hover:bg-wine-700"
        >
          {loading ? "🔄 Running Tests..." : "🚀 Run Comprehensive Tests"}
        </Button>
      </div>

      {/* Last Run Info */}
      {lastRun && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600">
              Last test run: {lastRun.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}

      {!testData && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-4xl mb-4">🧪</div>
            <h3 className="text-xl font-semibold mb-2">Ready to Run Tests</h3>
            <p className="text-gray-600 mb-4">
              Click the button above to run comprehensive tests on the entire
              competition management system.
            </p>
            <Button
              onClick={runTests}
              className="bg-wine-600 hover:bg-wine-700"
            >
              🚀 Start Testing
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold mb-2 text-card-foreground">
              Running Comprehensive Tests
            </h3>
            <p className="text-muted-foreground">
              Testing all system components... This may take a few moments.
            </p>
          </CardContent>
        </Card>
      )}

      {testData && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>📊 Test Summary</span>
                <Badge className={getStatusColor(testData.summary.status)}>
                  {testData.summary.status.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {testData.summary.totalTests}
                  </div>
                  <div className="text-sm text-gray-600">Total Tests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {testData.summary.passedTests}
                  </div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {testData.summary.failedTests}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-wine-600">
                    {testData.summary.successRate}%
                  </div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Total Duration: {testData.summary.totalDuration}ms
              </div>
            </CardContent>
          </Card>

          {/* Critical Issues */}
          {testData.criticalIssues.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800">
                  🚨 Critical Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testData.criticalIssues.map((issue, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg"
                    >
                      <span className="text-red-600">⚠️</span>
                      <span className="text-red-800">{issue}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {testData.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>💡 Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testData.recommendations.map((recommendation, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg"
                    >
                      <span className="text-blue-600">💡</span>
                      <span className="text-blue-800">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test Results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderTestCategory(
              "Database",
              testData.testResults.database,
              "🗄️",
            )}
            {renderTestCategory(
              "Competition Management",
              testData.testResults.competitionManagement,
              "🏆",
            )}
            {renderTestCategory(
              "Ranking System",
              testData.testResults.rankingSystem,
              "📊",
            )}
            {renderTestCategory(
              "SMS System",
              testData.testResults.smsSystem,
              "📱",
            )}
            {renderTestCategory(
              "Analytics",
              testData.testResults.analytics,
              "📈",
            )}
            {renderTestCategory(
              "Archive Management",
              testData.testResults.archiveManagement,
              "📚",
            )}
            {renderTestCategory(
              "API Endpoints",
              testData.testResults.apiEndpoints,
              "🌐",
            )}
            {renderTestCategory(
              "Integration",
              testData.testResults.integration,
              "🔗",
            )}
          </div>

          {/* Test Features */}
          <Card>
            <CardHeader>
              <CardTitle>🔧 Testing Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Comprehensive Coverage</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Database connection and schema validation</li>
                    <li>• Competition CRUD operations</li>
                    <li>• Ranking system calculations</li>
                    <li>• SMS system functionality</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Advanced Testing</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Analytics and insights generation</li>
                    <li>• Archive management operations</li>
                    <li>• API endpoint validation</li>
                    <li>• End-to-end integration testing</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
