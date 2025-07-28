import { NextResponse } from "next/server";
import { comprehensiveTestingService } from "@/lib/comprehensive-testing";

export async function GET() {
  try {
    console.log(
      "[API] GET /api/test-comprehensive - Starting comprehensive testing suite",
    );

    // Run comprehensive tests
    const testSummary =
      await comprehensiveTestingService.runComprehensiveTests();

    console.log(
      `[API] ✅ Comprehensive testing completed: ${testSummary.passedTests}/${testSummary.totalTests} tests passed`,
    );

    return NextResponse.json({
      success: true,
      message: "Comprehensive testing suite completed successfully",
      data: {
        summary: {
          totalTests: testSummary.totalTests,
          passedTests: testSummary.passedTests,
          failedTests: testSummary.failedTests,
          successRate: testSummary.successRate,
          totalDuration: testSummary.totalDuration,
          status:
            testSummary.successRate >= 90
              ? "excellent"
              : testSummary.successRate >= 80
                ? "good"
                : testSummary.successRate >= 70
                  ? "fair"
                  : "needs_improvement",
        },
        testResults: {
          database: {
            connection: {
              name: testSummary.testResults.database.connection.testName,
              success: testSummary.testResults.database.connection.success,
              message: testSummary.testResults.database.connection.message,
            },
            schemaValidation: {
              name: testSummary.testResults.database.schemaValidation.testName,
              success:
                testSummary.testResults.database.schemaValidation.success,
              message:
                testSummary.testResults.database.schemaValidation.message,
            },
            dataIntegrity: {
              name: testSummary.testResults.database.dataIntegrity.testName,
              success: testSummary.testResults.database.dataIntegrity.success,
              message: testSummary.testResults.database.dataIntegrity.message,
            },
          },
          competitionManagement: {
            creation: {
              name: testSummary.testResults.competitionManagement.creation
                .testName,
              success:
                testSummary.testResults.competitionManagement.creation.success,
              message:
                testSummary.testResults.competitionManagement.creation.message,
            },
            activation: {
              name: testSummary.testResults.competitionManagement.activation
                .testName,
              success:
                testSummary.testResults.competitionManagement.activation
                  .success,
              message:
                testSummary.testResults.competitionManagement.activation
                  .message,
            },
            updates: {
              name: testSummary.testResults.competitionManagement.updates
                .testName,
              success:
                testSummary.testResults.competitionManagement.updates.success,
              message:
                testSummary.testResults.competitionManagement.updates.message,
            },
            deletion: {
              name: testSummary.testResults.competitionManagement.deletion
                .testName,
              success:
                testSummary.testResults.competitionManagement.deletion.success,
              message:
                testSummary.testResults.competitionManagement.deletion.message,
            },
            statusTransitions: {
              name: testSummary.testResults.competitionManagement
                .statusTransitions.testName,
              success:
                testSummary.testResults.competitionManagement.statusTransitions
                  .success,
              message:
                testSummary.testResults.competitionManagement.statusTransitions
                  .message,
            },
          },
          rankingSystem: {
            calculation: {
              name: testSummary.testResults.rankingSystem.calculation.testName,
              success:
                testSummary.testResults.rankingSystem.calculation.success,
              message:
                testSummary.testResults.rankingSystem.calculation.message,
            },
            tieHandling: {
              name: testSummary.testResults.rankingSystem.tieHandling.testName,
              success:
                testSummary.testResults.rankingSystem.tieHandling.success,
              message:
                testSummary.testResults.rankingSystem.tieHandling.message,
            },
            caching: {
              name: testSummary.testResults.rankingSystem.caching.testName,
              success: testSummary.testResults.rankingSystem.caching.success,
              message: testSummary.testResults.rankingSystem.caching.message,
            },
            realTimeUpdates: {
              name: testSummary.testResults.rankingSystem.realTimeUpdates
                .testName,
              success:
                testSummary.testResults.rankingSystem.realTimeUpdates.success,
              message:
                testSummary.testResults.rankingSystem.realTimeUpdates.message,
            },
          },
          smsSystem: {
            welcomeSms: {
              name: testSummary.testResults.smsSystem.welcomeSms.testName,
              success: testSummary.testResults.smsSystem.welcomeSms.success,
              message: testSummary.testResults.smsSystem.welcomeSms.message,
            },
            progressSms: {
              name: testSummary.testResults.smsSystem.progressSms.testName,
              success: testSummary.testResults.smsSystem.progressSms.success,
              message: testSummary.testResults.smsSystem.progressSms.message,
            },
            winnerAnnouncement: {
              name: testSummary.testResults.smsSystem.winnerAnnouncement
                .testName,
              success:
                testSummary.testResults.smsSystem.winnerAnnouncement.success,
              message:
                testSummary.testResults.smsSystem.winnerAnnouncement.message,
            },
            validation: {
              name: testSummary.testResults.smsSystem.validation.testName,
              success: testSummary.testResults.smsSystem.validation.success,
              message: testSummary.testResults.smsSystem.validation.message,
            },
            scheduling: {
              name: testSummary.testResults.smsSystem.scheduling.testName,
              success: testSummary.testResults.smsSystem.scheduling.success,
              message: testSummary.testResults.smsSystem.scheduling.message,
            },
          },
          analytics: {
            overviewMetrics: {
              name: testSummary.testResults.analytics.overviewMetrics.testName,
              success:
                testSummary.testResults.analytics.overviewMetrics.success,
              message:
                testSummary.testResults.analytics.overviewMetrics.message,
            },
            trendAnalysis: {
              name: testSummary.testResults.analytics.trendAnalysis.testName,
              success: testSummary.testResults.analytics.trendAnalysis.success,
              message: testSummary.testResults.analytics.trendAnalysis.message,
            },
            performanceAnalytics: {
              name: testSummary.testResults.analytics.performanceAnalytics
                .testName,
              success:
                testSummary.testResults.analytics.performanceAnalytics.success,
              message:
                testSummary.testResults.analytics.performanceAnalytics.message,
            },
            filtering: {
              name: testSummary.testResults.analytics.filtering.testName,
              success: testSummary.testResults.analytics.filtering.success,
              message: testSummary.testResults.analytics.filtering.message,
            },
            insights: {
              name: testSummary.testResults.analytics.insights.testName,
              success: testSummary.testResults.analytics.insights.success,
              message: testSummary.testResults.analytics.insights.message,
            },
          },
          archiveManagement: {
            search: {
              name: testSummary.testResults.archiveManagement.search.testName,
              success: testSummary.testResults.archiveManagement.search.success,
              message: testSummary.testResults.archiveManagement.search.message,
            },
            filtering: {
              name: testSummary.testResults.archiveManagement.filtering
                .testName,
              success:
                testSummary.testResults.archiveManagement.filtering.success,
              message:
                testSummary.testResults.archiveManagement.filtering.message,
            },
            statistics: {
              name: testSummary.testResults.archiveManagement.statistics
                .testName,
              success:
                testSummary.testResults.archiveManagement.statistics.success,
              message:
                testSummary.testResults.archiveManagement.statistics.message,
            },
            archiveRestore: {
              name: testSummary.testResults.archiveManagement.archiveRestore
                .testName,
              success:
                testSummary.testResults.archiveManagement.archiveRestore
                  .success,
              message:
                testSummary.testResults.archiveManagement.archiveRestore
                  .message,
            },
          },
          apiEndpoints: {
            competitions: {
              name: testSummary.testResults.apiEndpoints.competitions.testName,
              success:
                testSummary.testResults.apiEndpoints.competitions.success,
              message:
                testSummary.testResults.apiEndpoints.competitions.message,
            },
            rankings: {
              name: testSummary.testResults.apiEndpoints.rankings.testName,
              success: testSummary.testResults.apiEndpoints.rankings.success,
              message: testSummary.testResults.apiEndpoints.rankings.message,
            },
            analytics: {
              name: testSummary.testResults.apiEndpoints.analytics.testName,
              success: testSummary.testResults.apiEndpoints.analytics.success,
              message: testSummary.testResults.apiEndpoints.analytics.message,
            },
            archive: {
              name: testSummary.testResults.apiEndpoints.archive.testName,
              success: testSummary.testResults.apiEndpoints.archive.success,
              message: testSummary.testResults.apiEndpoints.archive.message,
            },
            sms: {
              name: testSummary.testResults.apiEndpoints.sms.testName,
              success: testSummary.testResults.apiEndpoints.sms.success,
              message: testSummary.testResults.apiEndpoints.sms.message,
            },
          },
          integration: {
            endToEnd: {
              name: testSummary.testResults.integration.endToEnd.testName,
              success: testSummary.testResults.integration.endToEnd.success,
              message: testSummary.testResults.integration.endToEnd.message,
            },
            dataFlow: {
              name: testSummary.testResults.integration.dataFlow.testName,
              success: testSummary.testResults.integration.dataFlow.success,
              message: testSummary.testResults.integration.dataFlow.message,
            },
            errorHandling: {
              name: testSummary.testResults.integration.errorHandling.testName,
              success:
                testSummary.testResults.integration.errorHandling.success,
              message:
                testSummary.testResults.integration.errorHandling.message,
            },
            performance: {
              name: testSummary.testResults.integration.performance.testName,
              success: testSummary.testResults.integration.performance.success,
              message: testSummary.testResults.integration.performance.message,
            },
          },
        },
        recommendations: testSummary.recommendations,
        criticalIssues: testSummary.criticalIssues,
        testingFeatures: {
          comprehensiveCoverage:
            "Complete system testing across all components",
          automatedTestData: "Automated test data creation and cleanup",
          detailedReporting:
            "Detailed test results with success/failure tracking",
          performanceMonitoring:
            "Performance testing and optimization recommendations",
          errorHandling: "Comprehensive error handling validation",
          integrationTesting: "End-to-end integration testing",
          recommendations: "Automated recommendations for system improvements",
          criticalIssues: "Identification of critical system issues",
        },
        testCategories: {
          database:
            "Database connection, schema validation, and data integrity",
          competitionManagement:
            "Competition CRUD operations and status transitions",
          rankingSystem: "Ranking calculations, tie handling, and caching",
          smsSystem: "SMS validation, preview, and scheduling functionality",
          analytics:
            "Analytics calculations, filtering, and insights generation",
          archiveManagement: "Archive search, filtering, and statistics",
          apiEndpoints: "API endpoint availability and functionality",
          integration: "End-to-end system integration and performance",
        },
      },
    });
  } catch (error: any) {
    console.error("[API] Error in comprehensive testing:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Comprehensive testing failed",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
