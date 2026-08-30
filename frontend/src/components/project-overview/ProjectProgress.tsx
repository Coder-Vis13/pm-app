import type { ProjectOverviewViewModel } from "@/data/project-overview/formatters";
import { MetricBar } from "./shared";

interface ProjectProgressProps {
  rows: ProjectOverviewViewModel["statusRows"];
}

export function ProjectProgress({ rows }: ProjectProgressProps) {
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div
          key={row.status}
          className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3 sm:grid-cols-[6.5rem_1fr_2.5rem]"
        >
          <span className="text-sm text-neutral-600">{row.label}</span>
          <MetricBar value={row.barPercent} />
          <span className="text-right text-sm tabular-nums text-neutral-800">
            {row.count}
          </span>
        </div>
      ))}
    </div>
  );
}
