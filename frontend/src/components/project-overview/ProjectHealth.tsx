import { Badge } from "@/components/ui/badge";
import type { ProjectOverviewViewModel } from "@/data/project-overview/formatters";
import { cn } from "@/lib/utils";
import { MetricBar } from "./shared";

interface ProjectHealthProps {
  health: ProjectOverviewViewModel["health"];
}

const healthBadgeVariant = {
  healthy: "success",
  at_risk: "warning",
  critical: "danger",
} as const;

const healthDotClass = {
  healthy: "bg-emerald-500",
  at_risk: "bg-amber-500",
  critical: "bg-red-500",
} as const;

export function ProjectHealth({ health }: ProjectHealthProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2 lg:max-w-md">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-base font-medium text-neutral-900">
              Project health
            </h3>
            <Badge variant={healthBadgeVariant[health.status]}>
              <span
                className={cn(
                  "mr-1.5 size-1.5 rounded-full",
                  healthDotClass[health.status]
                )}
              />
              {health.label}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-neutral-600">
            {health.summary}
          </p>
        </div>

        <div className="grid flex-1 gap-6 sm:grid-cols-3 lg:max-w-xl">
          <div className="space-y-2">
            <p className="text-xs text-neutral-500">Progress</p>
            <p className="text-2xl font-semibold tabular-nums text-neutral-900">
              {health.progressPercent}%
            </p>
            <MetricBar value={health.progressPercent} />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-neutral-500">Tasks</p>
            <p className="text-2xl font-semibold tabular-nums text-neutral-900">
              {health.completedTasks}
              <span className="text-base font-normal text-neutral-400">
                {" "}
                / {health.totalTasks}
              </span>
            </p>
            <p className="text-xs text-neutral-500">completed</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-neutral-500">Attention</p>
            <p className="text-2xl font-semibold tabular-nums text-neutral-900">
              {health.attentionCount}
            </p>
            <p className="text-xs text-neutral-500">{health.attentionLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
