"use client";


import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface CustomRefreshButtonProps {
  onRefresh: () => Promise<void>;
  loading: boolean;
  disabled: boolean;
  className?: string;
}

export function CustomRefreshButton({
  onRefresh,
  loading,
  disabled,
  className,
}: CustomRefreshButtonProps) {
  return (
    <div className={className}>
      <Button
        onClick={onRefresh}
        disabled={disabled || loading}
        className="bg-wine-600 hover:bg-wine-700 text-white"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        <span className="ml-2">
          {loading ? "Generating..." : "Run Analysis"}
        </span>
      </Button>
    </div>
  );
}
