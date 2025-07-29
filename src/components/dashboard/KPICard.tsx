import { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  goal?: number;
  goalVariance?: number;
  change?: number | null;
  icon?: ReactNode;
}

export function KPICard({
  title,
  value,
  goal,
  goalVariance,
  change,
  icon,
}: KPICardProps) {
  const isPositive = typeof change === "number" && change > 0;
  const isNegative = typeof change === "number" && change < 0;
  return (
    <Card className="shadow-sm border-wine-100 bg-card">
      <CardContent className="flex flex-col gap-2 pt-4 pb-4 px-4">
        <div className="flex items-center gap-2 text-primary">
          {icon}
          <span className="font-semibold text-sm uppercase tracking-wide">
            {title}
          </span>
        </div>
        <div className="text-2xl font-bold text-card-foreground">{value}</div>
        {typeof goal === "number" && (
          <div className="text-xs text-muted-foreground">
            Goal: <span className="font-semibold text-amber-600 dark:text-amber-400">{goal}</span>
          </div>
        )}
        {typeof goalVariance === "number" && (
          <div
            className={cn(
              "text-xs font-medium",
              goalVariance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
            )}
          >
            {goalVariance >= 0 ? "+" : ""}
            {goalVariance} vs goal
          </div>
        )}
        {typeof change === "number" && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isPositive
                ? "text-green-600 dark:text-green-400"
                : isNegative
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground",
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : isNegative ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {change > 0 ? "+" : ""}
            {change}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}
