import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-98",
          // Variants
          variant === "default" && "bg-wine-600 text-white hover:bg-wine-700 active:bg-wine-800",
          variant === "destructive" && "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
          variant === "outline" &&
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
          variant === "secondary" &&
            "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300",
          variant === "ghost" && "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
          variant === "link" &&
            "text-primary underline-offset-4 hover:underline",
          // Sizes with mobile touch targets
          size === "default" && "h-11 px-4 py-2 min-h-[44px]",
          size === "sm" && "h-10 rounded-md px-3 min-h-[44px]",
          size === "lg" && "h-12 rounded-md px-8 min-h-[44px]",
          size === "icon" && "h-11 w-11 min-h-[44px] min-w-[44px]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
