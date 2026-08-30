import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function SectionLabel({
  children,
  className,
  action,
}: SectionLabelProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 text-sm font-semibold text-foreground",
        className
      )}
    >
      {children}

      {action}
    </div>
  );
}

interface MetricBarProps {
  value: number;
  className?: string;
  trackClassName?: string;
}

export function MetricBar({
  value,
  className,
  trackClassName,
}: MetricBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100",
        trackClassName
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-neutral-800 transition-all",
          className
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}