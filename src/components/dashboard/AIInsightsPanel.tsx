import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertTriangle, Award, Target, ThumbsUp, AlertCircle } from "lucide-react";

interface AIInsights {
  strengths?: string[];
  opportunities?: string[];
  weaknesses?: string[];
  threats?: string[];
  staffPraise?: Array<{
    name: string;
    reason: string;
    metrics: string[];
  }>;
  staffCoaching?: Array<{
    name: string;
    reason: string;
    metrics: string[];
  }>;
  recommendations?: string[];
  generatedAt?: string;
}

interface AIInsightsPanelProps {
  insights: AIInsights | null | undefined;
}

export function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  if (!insights) {
    return (
      <Card>
        <CardContent>
          <h3 className="text-wine-700 text-lg font-semibold mb-2 flex items-center">
            <Target className="w-5 h-5 mr-2" />AI Insights
          </h3>
          <p className="text-gray-500 text-sm">No AI insights available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const SectionCard = ({ 
    title, 
    items, 
    icon: Icon, 
    colorClass 
  }: {
    title: string;
    items: string[];
    icon: any;
    colorClass: string;
  }) => (
    <div className={`border-l-4 ${colorClass} bg-white p-4 rounded-r-lg`}>
      <div className="flex items-center mb-3">
        <Icon className="w-4 h-4 mr-2" />
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <ul className="space-y-1">
        {items.slice(0, 3).map((item, index) => (
          <li key={index} className="text-xs text-gray-700">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="mb-2">
            <h3 className="text-wine-700 text-lg font-semibold flex items-center">
              <Target className="w-5 h-5 mr-2" />AI Insights
            </h3>
            {insights.generatedAt && (
              <p className="text-xs text-gray-500">
                Generated: {new Date(insights.generatedAt).toLocaleString()}
              </p>
            )}
          </div>
          {/* SWOT Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.strengths && insights.strengths.length > 0 && (
              <SectionCard
                title="Strengths"
                items={insights.strengths}
                icon={TrendingUp}
                colorClass="border-l-green-500"
              />
            )}
            {insights.opportunities && insights.opportunities.length > 0 && (
              <SectionCard
                title="Opportunities"
                items={insights.opportunities}
                icon={Target}
                colorClass="border-l-blue-500"
              />
            )}
            {insights.weaknesses && insights.weaknesses.length > 0 && (
              <SectionCard
                title="Weaknesses"
                items={insights.weaknesses}
                icon={AlertTriangle}
                colorClass="border-l-yellow-500"
              />
            )}
            {insights.threats && insights.threats.length > 0 && (
              <SectionCard
                title="Threats"
                items={insights.threats}
                icon={AlertTriangle}
                colorClass="border-l-red-500"
              />
            )}
          </div>

          {/* Staff Feedback */}
          {((insights.staffPraise && insights.staffPraise.length > 0) || 
            (insights.staffCoaching && insights.staffCoaching.length > 0)) && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-3">Staff Feedback</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.staffPraise && insights.staffPraise.length > 0 && (
                  <div className="border border-green-200 bg-green-50 p-3 rounded">
                    <div className="flex items-center mb-2">
                      <ThumbsUp className="w-4 h-4 text-green-600 mr-2" />
                      <span className="font-medium text-green-800 text-sm">Praise</span>
                    </div>
                    {insights.staffPraise.slice(0, 2).map((praise, index) => (
                      <div key={index} className="mb-2">
                        <p className="font-medium text-xs text-green-800">{praise.name}</p>
                        <p className="text-xs text-green-700">{praise.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
                {insights.staffCoaching && insights.staffCoaching.length > 0 && (
                  <div className="border border-amber-200 bg-amber-50 p-3 rounded">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mr-2" />
                      <span className="font-medium text-amber-800 text-sm">Coaching</span>
                    </div>
                    {insights.staffCoaching.slice(0, 2).map((coaching, index) => (
                      <div key={index} className="mb-2">
                        <p className="font-medium text-xs text-amber-800">{coaching.name}</p>
                        <p className="text-xs text-amber-700">{coaching.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {insights.recommendations && insights.recommendations.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-3">Top Recommendations</h4>
              <div className="space-y-2">
                {insights.recommendations.slice(0, 4).map((rec, index) => (
                  <div key={index} className="flex items-start bg-wine-50 p-2 rounded">
                    <span className="bg-wine-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-xs text-wine-800">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 