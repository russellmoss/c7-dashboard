import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import React from "react";

interface ComprehensiveMetricsProps {
  data: any;
  insights: any;
}

export function ComprehensiveMetrics({ data, insights }: ComprehensiveMetricsProps) {
  const { current, previous, yearOverYear } = data;
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  
  const formatPercent = (value: number) => `${value?.toFixed(1)}%`;
  
  const MetricCard = ({ title, current, previous, change, goal, goalVariance, format = 'currency' }: any) => {
    const isPositive = change > 0;
    const formatter = format === 'currency' ? formatCurrency : formatPercent;
    
    return (
      <Card>
        <div className="pb-2 p-4 border-b">
          <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        </div>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                {formatter(current)}
              </span>
              <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <ArrowUpIcon className="w-3 h-3 mr-1" /> : <ArrowDownIcon className="w-3 h-3 mr-1" />}
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
            
            {goal !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Goal: {formatter(goal)}</span>
                  <span className={goalVariance > 0 ? 'text-green-600' : 'text-red-600'}>
                    {goalVariance > 0 ? '+' : ''}{goalVariance?.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={goal ? Math.min((current / goal) * 100, 100) : 0} 
                  className="h-2"
                />
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              Previous: {formatter(previous)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Year-over-Year Metrics */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Year-over-Year Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            current={yearOverYear.revenue.current}
            previous={yearOverYear.revenue.previous}
            change={yearOverYear.revenue.change}
            goal={yearOverYear.revenue.goal}
            goalVariance={yearOverYear.revenue.goalVariance}
          />
          <MetricCard
            title="Wine Conversion Rate"
            current={yearOverYear.wineConversionRate.current}
            previous={yearOverYear.wineConversionRate.previous}
            change={yearOverYear.wineConversionRate.change}
            goal={yearOverYear.wineConversionRate.goal}
            goalVariance={yearOverYear.wineConversionRate.goalVariance}
            format="percent"
          />
          <MetricCard
            title="Club Conversion Rate"
            current={yearOverYear.clubConversionRate.current}
            previous={yearOverYear.clubConversionRate.previous}
            change={yearOverYear.clubConversionRate.change}
            goal={yearOverYear.clubConversionRate.goal}
            goalVariance={yearOverYear.clubConversionRate.goalVariance}
            format="percent"
          />
          <MetricCard
            title="Average Order Value"
            current={yearOverYear.avgOrderValue.current}
            previous={yearOverYear.avgOrderValue.previous}
            change={yearOverYear.avgOrderValue.change}
            goal={yearOverYear.avgOrderValue.goal}
            goalVariance={yearOverYear.avgOrderValue.goalVariance}
          />
        </div>
      </div>

      {/* Service Type Analysis */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Service Type Performance</h3>
        </div>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(current.serviceTypeAnalysis).map(([type, metrics]: [string, any]) => ({
              name: type,
              revenue: metrics.revenue,
              orders: metrics.orders,
              guests: metrics.guests
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue" />
              <Bar yAxisId="right" dataKey="orders" fill="#82ca9d" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* AI Insights Panel */}
      <AIInsightsPanel insights={insights} />
      
      {/* Staff Performance */}
      <StaffPerformanceCards 
        topPerformers={current.staffAnalysis?.topPerformers || []}
        needsCoaching={current.staffAnalysis?.needsCoaching || []}
      />
    </div>
  );
}

// AI Insights Panel
interface AIInsightsPanelProps {
  insights: any;
}

function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  if (!insights) return null;
  return (
    <Card className="mt-6">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">AI Insights (SWOT Analysis)</h3>
      </div>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-1">Strengths</h4>
            <ul className="list-disc ml-5 text-green-700">
              {insights.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
            <h4 className="font-semibold mt-4 mb-1">Opportunities</h4>
            <ul className="list-disc ml-5 text-blue-700">
              {insights.opportunities?.map((o: string, i: number) => <li key={i}>{o}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Weaknesses</h4>
            <ul className="list-disc ml-5 text-red-700">
              {insights.weaknesses?.map((w: string, i: number) => <li key={i}>{w}</li>)}
            </ul>
            <h4 className="font-semibold mt-4 mb-1">Threats</h4>
            <ul className="list-disc ml-5 text-yellow-700">
              {insights.threats?.map((t: string, i: number) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        </div>
        <div className="mt-6">
          <h4 className="font-semibold mb-1">Recommendations</h4>
          <ul className="list-disc ml-5 text-slate-700">
            {insights.recommendations?.map((r: string, i: number) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// Staff Performance Cards
interface StaffPerformanceCardsProps {
  topPerformers: any[];
  needsCoaching: any[];
}

function StaffPerformanceCards({ topPerformers, needsCoaching }: StaffPerformanceCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      <Card>
        <div className="p-4 border-b">
          <h4 className="text-lg font-semibold">Top Performers</h4>
        </div>
        <CardContent>
          <ul className="space-y-2">
            {topPerformers?.length === 0 && <li className="text-muted-foreground">No top performers found.</li>}
            {topPerformers?.map((staff, i) => (
              <li key={i} className="flex flex-col">
                <span className="font-semibold">{staff.name}</span>
                <span className="text-xs text-green-700">{staff.reason}</span>
                <span className="text-xs text-muted-foreground">Metrics: {staff.metrics?.join(', ')}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <div className="p-4 border-b">
          <h4 className="text-lg font-semibold">Needs Coaching</h4>
        </div>
        <CardContent>
          <ul className="space-y-2">
            {needsCoaching?.length === 0 && <li className="text-muted-foreground">No coaching needs found.</li>}
            {needsCoaching?.map((staff, i) => (
              <li key={i} className="flex flex-col">
                <span className="font-semibold">{staff.name}</span>
                <span className="text-xs text-red-700">{staff.reason}</span>
                <span className="text-xs text-muted-foreground">Metrics: {staff.metrics?.join(', ')}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
} 