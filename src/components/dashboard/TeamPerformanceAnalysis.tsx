"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Minus, Trophy, Target, AlertTriangle, Wine, Crown } from "lucide-react";

interface PerformanceData {
  name: string;
  wineBottleConversionRate: number;
  clubConversionRate: number;
}

interface PerformanceDistribution {
  period: string;
  metrics: {
    wineBottleConversion: {
      teamAverage: number;
      standardDeviation: number;
      samplesUsed: number;
      samplesExcluded: number;
      topPerformers: Array<{
        name: string;
        rate: number;
        deviationFromAverage: string;
        percentageAboveAverage: string;
      }>;
      onPar: Array<{
        name: string;
        rate: number;
        deviationFromAverage: string;
        percentageAboveAverage: string;
      }>;
      trainingOpportunity: Array<{
        name: string;
        rate: number;
        deviationFromAverage: string;
        percentageBelowAverage: string;
      }>;
    };
    clubConversion: {
      teamAverage: number;
      standardDeviation: number;
      samplesUsed: number;
      samplesExcluded: number;
      topPerformers: Array<{
        name: string;
        rate: number;
        deviationFromAverage: string;
        percentageAboveAverage: string;
      }>;
      onPar: Array<{
        name: string;
        rate: number;
        deviationFromAverage: string;
        percentageAboveAverage: string;
      }>;
      trainingOpportunity: Array<{
        name: string;
        rate: number;
        deviationFromAverage: string;
        percentageBelowAverage: string;
      }>;
    };
  };
  summary: {
    totalTopPerformers: number;
    totalOnPar: number;
    totalTrainingOpportunity: number;
    recommendations: string[];
  };
}

interface TeamPerformanceAnalysisProps {
  associatePerformance: Record<string, any>;
  periodLabel: string;
}

export function TeamPerformanceAnalysis({ associatePerformance, periodLabel }: TeamPerformanceAnalysisProps) {
  const calculatePerformanceDistribution = (): PerformanceDistribution => {
    // Extract performance data from associate performance
    const performanceData: PerformanceData[] = Object.entries(associatePerformance)
      .map(([name, data]) => ({
        name,
        wineBottleConversionRate: data.wineBottleConversionRate || 0,
        clubConversionRate: data.clubConversionRate || 0,
      }))
      .filter(data => data.name !== "Unknown");

    // Calculate wine bottle conversion distribution
    const wineBottleRates = performanceData
      .map(d => d.wineBottleConversionRate)
      .filter(rate => rate >= 10 && rate <= 80); // Filter valid rates

    const wineBottleStats = calculateMetricDistribution(wineBottleRates, performanceData, 'wineBottleConversionRate');

    // Calculate club conversion distribution
    const clubRates = performanceData
      .map(d => d.clubConversionRate)
      .filter(rate => rate > 0 && rate <= 15); // Filter valid rates

    const clubStats = calculateMetricDistribution(clubRates, performanceData, 'clubConversionRate');

    // Generate recommendations
    const recommendations = generateRecommendations(wineBottleStats, clubStats);

    return {
      period: periodLabel,
      metrics: {
        wineBottleConversion: wineBottleStats,
        clubConversion: clubStats,
      },
      summary: {
        totalTopPerformers: new Set([
          ...wineBottleStats.topPerformers.map(p => p.name),
          ...clubStats.topPerformers.map(p => p.name)
        ]).size,
        totalOnPar: new Set([
          ...wineBottleStats.onPar.map(p => p.name),
          ...clubStats.onPar.map(p => p.name)
        ]).size,
        totalTrainingOpportunity: new Set([
          ...wineBottleStats.trainingOpportunity.map(p => p.name),
          ...clubStats.trainingOpportunity.map(p => p.name)
        ]).size,
        recommendations,
      },
    };
  };

  const calculateMetricDistribution = (
    rates: number[],
    allData: PerformanceData[],
    metricKey: 'wineBottleConversionRate' | 'clubConversionRate'
  ) => {
    if (rates.length === 0) {
      return {
        teamAverage: 0,
        standardDeviation: 0,
        samplesUsed: 0,
        samplesExcluded: 0,
        topPerformers: [],
        onPar: [],
        trainingOpportunity: [],
      };
    }

    const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - average, 2), 0) / rates.length;
    const standardDeviation = Math.sqrt(variance);

    const validData = allData.filter(data => {
      const rate = data[metricKey];
      if (metricKey === 'wineBottleConversionRate') {
        return rate >= 10 && rate <= 80;
      } else {
        return rate > 0 && rate <= 15;
      }
    });

    const topPerformers: any[] = [];
    const onPar: any[] = [];
    const trainingOpportunity: any[] = [];

    validData.forEach(data => {
      const rate = data[metricKey];
      const deviation = (rate - average) / standardDeviation;
      const percentageDiff = ((rate - average) / average) * 100;

      const performer = {
        name: data.name,
        rate: Math.round(rate * 100) / 100,
        deviationFromAverage: `${deviation >= 0 ? '+' : ''}${Math.round(deviation * 100) / 100} SD`,
        percentageAboveAverage: `${percentageDiff >= 0 ? '+' : ''}${Math.round(percentageDiff * 10) / 10}%`,
        percentageBelowAverage: `${percentageDiff < 0 ? '' : ''}${Math.round(percentageDiff * 10) / 10}%`,
      };

      if (deviation > 1) {
        topPerformers.push(performer);
      } else if (deviation < -1) {
        trainingOpportunity.push(performer);
      } else {
        onPar.push(performer);
      }
    });

    return {
      teamAverage: Math.round(average * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      samplesUsed: validData.length,
      samplesExcluded: allData.length - validData.length,
      topPerformers,
      onPar,
      trainingOpportunity,
    };
  };

  const generateRecommendations = (wineStats: any, clubStats: any): string[] => {
    const recommendations: string[] = [];

    // Wine bottle conversion recommendations
    if (wineStats.trainingOpportunity.length > 0 && wineStats.topPerformers.length > 0) {
      const trainee = wineStats.trainingOpportunity[0];
      const mentor = wineStats.topPerformers[0];
      recommendations.push(`Consider pairing ${trainee.name} with ${mentor.name} for wine sales mentoring`);
    }

    // Club conversion recommendations
    if (clubStats.topPerformers.length > 0) {
      const topPerformer = clubStats.topPerformers[0];
      recommendations.push(`${topPerformer.name} could share club conversion techniques in next team meeting`);
    }

    if (clubStats.trainingOpportunity.length > 0) {
      recommendations.push(`Focus on club conversion training for ${clubStats.trainingOpportunity.length} team member(s)`);
    }

    return recommendations;
  };

  const distribution = calculatePerformanceDistribution();

  if (distribution.metrics.wineBottleConversion.samplesUsed === 0 && 
      distribution.metrics.clubConversion.samplesUsed === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Team Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Insufficient data for performance analysis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Team Performance Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {distribution.period} • Based on standard deviation analysis
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wine Bottle Conversion */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Wine className="h-4 w-4" />
            Wine Bottle Conversion
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {distribution.metrics.wineBottleConversion.teamAverage}%
              </div>
              <div className="text-sm text-blue-600">Team Average</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {distribution.metrics.wineBottleConversion.samplesUsed}
              </div>
              <div className="text-sm text-green-600">Samples Used</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {distribution.metrics.wineBottleConversion.standardDeviation}
              </div>
              <div className="text-sm text-orange-600">Std Deviation</div>
            </div>
          </div>

          {/* Top Performers */}
          {distribution.metrics.wineBottleConversion.topPerformers.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                Top Performers
              </h4>
              <div className="space-y-2">
                {distribution.metrics.wineBottleConversion.topPerformers.map((performer, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="font-medium">{performer.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {performer.rate}%
                      </Badge>
                      <span className="text-sm text-green-600">{performer.deviationFromAverage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* On Par */}
          {distribution.metrics.wineBottleConversion.onPar.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-1">
                <Minus className="h-4 w-4" />
                On Par
              </h4>
              <div className="space-y-2">
                {distribution.metrics.wineBottleConversion.onPar.map((performer, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="font-medium">{performer.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {performer.rate}%
                      </Badge>
                      <span className="text-sm text-blue-600">{performer.deviationFromAverage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Training Opportunity */}
          {distribution.metrics.wineBottleConversion.trainingOpportunity.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-orange-700 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Training Opportunity
              </h4>
              <div className="space-y-2">
                {distribution.metrics.wineBottleConversion.trainingOpportunity.map((performer, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                    <span className="font-medium">{performer.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        {performer.rate}%
                      </Badge>
                      <span className="text-sm text-orange-600">{performer.deviationFromAverage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Club Conversion */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Club Conversion
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {distribution.metrics.clubConversion.teamAverage}%
              </div>
              <div className="text-sm text-purple-600">Team Average</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {distribution.metrics.clubConversion.samplesUsed}
              </div>
              <div className="text-sm text-green-600">Samples Used</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {distribution.metrics.clubConversion.standardDeviation}
              </div>
              <div className="text-sm text-orange-600">Std Deviation</div>
            </div>
          </div>

          {/* Top Performers */}
          {distribution.metrics.clubConversion.topPerformers.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                Top Performers
              </h4>
              <div className="space-y-2">
                {distribution.metrics.clubConversion.topPerformers.map((performer, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="font-medium">{performer.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {performer.rate}%
                      </Badge>
                      <span className="text-sm text-green-600">{performer.deviationFromAverage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* On Par */}
          {distribution.metrics.clubConversion.onPar.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-1">
                <Minus className="h-4 w-4" />
                On Par
              </h4>
              <div className="space-y-2">
                {distribution.metrics.clubConversion.onPar.map((performer, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="font-medium">{performer.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {performer.rate}%
                      </Badge>
                      <span className="text-sm text-blue-600">{performer.deviationFromAverage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Training Opportunity */}
          {distribution.metrics.clubConversion.trainingOpportunity.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-orange-700 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Training Opportunity
              </h4>
              <div className="space-y-2">
                {distribution.metrics.clubConversion.trainingOpportunity.map((performer, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                    <span className="font-medium">{performer.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        {performer.rate}%
                      </Badge>
                      <span className="text-sm text-orange-600">{performer.deviationFromAverage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3">Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {distribution.summary.totalTopPerformers}
              </div>
              <div className="text-sm text-green-600">Top Performers</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {distribution.summary.totalOnPar}
              </div>
              <div className="text-sm text-blue-600">On Par</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {distribution.summary.totalTrainingOpportunity}
              </div>
              <div className="text-sm text-orange-600">Training Opportunity</div>
            </div>
          </div>

          {/* Recommendations */}
          {distribution.summary.recommendations.length > 0 && (
            <div>
              <h5 className="font-semibold mb-2">Recommendations</h5>
              <ul className="space-y-1">
                {distribution.summary.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 