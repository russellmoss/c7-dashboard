'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, BarChart3, TrendingUp, Wine, Clock, CheckCircle, XCircle } from "lucide-react";

export default function Home() {
  const [statuses, setStatuses] = useState<any>({});
  
  const dashboards = [
    { title: 'Month to Date', href: '/dashboard/mtd', icon: Calendar, periodType: 'mtd' },
    { title: 'Quarter to Date', href: '/dashboard/qtd', icon: BarChart3, periodType: 'qtd' },
    { title: 'Year to Date', href: '/dashboard/ytd', icon: TrendingUp, periodType: 'ytd' },
    { title: 'All Quarters', href: '/dashboard/all-quarters', icon: Wine, periodType: 'all-quarters' }
  ];

  useEffect(() => {
    dashboards.forEach(d => {
      fetch(`/api/kpi/status/${d.periodType}`)
        .then(res => res.json())
        .then(data => setStatuses((prev: any) => ({ ...prev, [d.periodType]: data })))
        .catch(console.error);
    });
  }, []);

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === 'running') return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
    if (status === 'failed') return <XCircle className="h-5 w-5 text-red-500" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="text-center mb-12">
        <Wine className="h-16 w-16 text-wine-700 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-slate-900">Milea Estate KPI Dashboard</h1>
        <p className="text-lg text-slate-600 mt-2">Business Intelligence & Performance Analytics</p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {dashboards.map((d) => {
          const status = statuses[d.periodType];
          const Icon = d.icon;
          return (
            <Link key={d.href} href={d.href}>
              <Card className="hover:shadow-xl transition-shadow cursor-pointer">
                <div className="flex justify-between items-start p-4 pb-0">
                  <div className="p-3 bg-wine-100 rounded-lg">
                    <Icon className="h-8 w-8 text-wine-700" />
                  </div>
                  {status && getStatusIcon(status.status)}
                </div>
                <CardContent>
                  <div className="text-xl font-semibold mb-2">{d.title}</div>
                  <p className="text-sm text-slate-500">
                    Last updated: {status?.lastUpdated ? new Date(status.lastUpdated).toLocaleDateString() : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
