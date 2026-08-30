import { Plus } from "lucide-react";

interface ProjectsSectionHeaderProps {
  onAddProject: () => void;
  disabled?: boolean;
}

export function ProjectsSectionHeader({
  onAddProject,
  disabled = false,
}: ProjectsSectionHeaderProps) {
  return (
    <div className="mb-2 flex items-center justify-between px-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        Projects
      </span>
      <button
        type="button"
        aria-label="Create project"
        onClick={onAddProject}
        disabled={disabled}
        className="flex size-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="size-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
