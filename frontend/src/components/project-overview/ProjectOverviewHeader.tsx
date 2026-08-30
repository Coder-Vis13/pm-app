import { MoreHorizontal, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectOverviewViewModel } from "@/data/project-overview/formatters";

interface ProjectOverviewHeaderProps {
  data: Pick<
    ProjectOverviewViewModel,
    | "workspaceName"
    | "projectName"
    | "description"
    | "memberCount"
    | "updatedLabel"
  >;
}

export function ProjectOverviewHeader({ data }: ProjectOverviewHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <nav className="text-sm text-neutral-500">
          <span>{data.workspaceName}</span>
          <span className="mx-2 text-neutral-300">/</span>
          <span>Projects</span>
          <span className="mx-2 text-neutral-300">/</span>
          <span className="text-neutral-800">{data.projectName}</span>
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="More options">
            <MoreHorizontal className="size-4" strokeWidth={1.75} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Project settings">
            <Settings className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground opacity-100">
            {data.projectName}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">
            {data.description}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
            <span className="text-neutral-300">·</span>
            <span>{data.memberCount} members</span>
            <span className="text-neutral-300">·</span>
            <span>{data.updatedLabel}</span>
          </p>
        </div>

        <Button variant="outline" size="sm" className="shrink-0">
          Edit team
        </Button>
      </div>
    </div>
  );
}
