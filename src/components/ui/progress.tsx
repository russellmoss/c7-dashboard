import * as React from "react";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative h-2 w-full rounded-full bg-slate-200 overflow-hidden ${className || ""}`}
        {...props}
      >
        <div
          className="absolute left-0 top-0 h-full bg-wine-600 transition-all"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";
