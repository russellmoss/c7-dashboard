'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, CheckCircle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  periodType: 'mtd' | 'qtd' | 'ytd' | 'all-quarters';
  onRefreshComplete?: () => void;
  className?: string;
}

export function RefreshButton({ periodType, onRefreshComplete, className }: RefreshButtonProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>('');

  const estimatedTimes = {
    'mtd': '8-10 min', 'qtd': '1-2 min',
    'ytd': '5-8 min', 'all-quarters': '15-20 min'
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'running') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/kpi/status/${periodType}`);
          const data = await res.json();
          setProgress(data.progress || 0);
          if (data.status === 'completed' || data.status === 'failed') {
            setStatus(data.status);
            clearInterval(interval);
            if (data.status === 'completed' && onRefreshComplete) onRefreshComplete();
          }
        } catch (err) {
            setStatus('failed');
            setError('Status check failed.');
            clearInterval(interval);
        }
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, periodType, onRefreshComplete]);

  const handleRefresh = async () => {
    setStatus('running');
    setProgress(0);
    setError('');
    try {
      const res = await fetch('/api/kpi/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodType })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to start generation');
    } catch (err) {
      setStatus('failed');
      setError(err instanceof Error ? err.message : 'Failed to start generation');
    }
  };

  const getStatusIcon = () => {
    if (status === 'running') return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-red-600" />;
    return <RefreshCw className="h-4 w-4" />;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Button onClick={handleRefresh} disabled={status === 'running'} className="bg-wine-600 hover:bg-wine-700 text-white">
        {getStatusIcon()}
        <span className="ml-2">{status === 'running' ? 'Generating...' : `Refresh ${periodType.toUpperCase()}`}</span>
      </Button>
      {status === 'running' && (
        <div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-slate-600 mt-1">Estimated time: {estimatedTimes[periodType]}</p>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
} 