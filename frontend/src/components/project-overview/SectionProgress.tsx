import type { ProjectOverviewViewModel } from "@/data/project-overview/formatters";
import { cn } from "@/lib/utils";
import { MetricBar } from "./shared";

interface SectionProgressProps {
  sections: ProjectOverviewViewModel["sections"];
  onSectionSelect?: (sectionId: string) => void;
}

export function SectionProgress({
  sections,
  onSectionSelect,
}: SectionProgressProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      <div className="grid grid-cols-[1fr_4rem_7rem] gap-4 border-b border-neutral-100 bg-neutral-50/80 px-4 py-2.5 text-xs font-medium text-neutral-500 sm:grid-cols-[1fr_5rem_8rem] sm:px-5">
        <span>Section</span>
        <span className="text-right">Tasks</span>
        <span className="text-right">Progress</span>
      </div>

      <ul className="divide-y divide-neutral-100">
        {sections.map((section) => (
          <li key={section.sectionId}>
            <button
              type="button"
              onClick={() => onSectionSelect?.(section.sectionId)}
              className={cn(
                "grid w-full grid-cols-[1fr_4rem_7rem] items-center gap-4 px-4 py-3.5 text-left transition-colors sm:grid-cols-[1fr_5rem_8rem] sm:px-5",
                onSectionSelect && "hover:bg-neutral-50"
              )}
            >
              <span className="text-sm font-medium text-neutral-900">
                {section.name}
              </span>
              <span className="text-right text-sm tabular-nums text-neutral-600">
                {section.taskCount}
              </span>
              <span className="flex items-center justify-end gap-2">
                <MetricBar
                  value={section.progressPercent}
                  className="bg-neutral-700"
                  trackClassName="hidden min-w-[4rem] sm:block"
                />
                <span className="w-10 text-right text-sm tabular-nums text-neutral-700">
                  {section.progressPercent}%
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
