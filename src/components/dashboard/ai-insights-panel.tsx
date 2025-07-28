import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertTriangle, Target } from "lucide-react";
import React from "react";

export function AIInsightsPanel({ insights }: { insights: any }) {
  if (!insights) return null;

  const SWOTCard = ({
    title,
    items,
    icon: Icon,
    color,
  }: {
    title: string;
    items: string[];
    icon: any;
    color: string;
  }) => (
    <Card className={`border-l-4 border-l-${color}-500 animate-fade-in`}>
      <div className="pb-3 p-4 border-b flex items-center">
        <Icon className={`w-5 h-5 mr-2 text-${color}-500`} />
        <h4 className="text-base font-semibold">{title}</h4>
      </div>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="text-sm flex items-start">
              <span className={`text-${color}-500 mr-2`}>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );

  const StaffList = ({
    title,
    items,
    color,
  }: {
    title: string;
    items: any[];
    color: string;
  }) => (
    <Card className={`animate-fade-in`}>
      <div className="pb-3 p-4 border-b">
        <h4 className="text-base font-semibold text-{color}-700">{title}</h4>
      </div>
      <CardContent>
        <ul className="space-y-2">
          {items.length === 0 && (
            <li className="text-muted-foreground">None found.</li>
          )}
          {items.map((staff, i) => (
            <li key={i} className="flex flex-col">
              <span className="font-semibold">{staff.name}</span>
              <span className={`text-xs text-${color}-700`}>
                {staff.reason}
              </span>
              <span className="text-xs text-muted-foreground">
                Metrics: {staff.metrics?.join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );

  // Simple badge replacement
  const Badge = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-200 text-xs font-semibold text-slate-700 mr-2 min-w-[1.5rem] text-center">
      {children}
    </span>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">AI-Generated Insights</h2>
      {/* SWOT Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SWOTCard
          title="Strengths"
          items={insights.strengths}
          icon={TrendingUp}
          color="green"
        />
        <SWOTCard
          title="Opportunities"
          items={insights.opportunities}
          icon={Target}
          color="blue"
        />
        <SWOTCard
          title="Weaknesses"
          items={insights.weaknesses}
          icon={AlertTriangle}
          color="yellow"
        />
        <SWOTCard
          title="Threats"
          items={insights.threats}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Staff Praise and Coaching */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StaffList
          title="Staff Praise"
          items={insights.staffPraise || []}
          color="green"
        />
        <StaffList
          title="Staff Coaching"
          items={insights.staffCoaching || []}
          color="red"
        />
      </div>

      {/* Recommendations */}
      <Card className="animate-fade-in">
        <div className="p-4 border-b">
          <h4 className="text-lg font-semibold">Actionable Recommendations</h4>
        </div>
        <CardContent>
          <div className="space-y-3">
            {insights.recommendations.map((rec: string, index: number) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-muted rounded-lg animate-fade-in"
              >
                <Badge>{index + 1}</Badge>
                <p className="text-sm flex-1">{rec}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
