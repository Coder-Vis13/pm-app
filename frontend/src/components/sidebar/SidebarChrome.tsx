import { Layers, PanelLeftClose } from "lucide-react";

interface SidebarHeaderProps {
  appName?: string;
  onCollapse: () => void;
}

export function SidebarHeader({
  appName = "PM App",
  onCollapse,
}: SidebarHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between px-3 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <Layers className="size-4 shrink-0 text-neutral-700" strokeWidth={1.75} />
        <span className="truncate text-sm font-semibold text-neutral-900">
          {appName}
        </span>
      </div>
      <button
        type="button"
        aria-label="Collapse sidebar"
        onClick={onCollapse}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
      >
        <PanelLeftClose className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
