import { Layers, PanelLeftClose, User } from "lucide-react";
import { cn } from "./sidebar-utils";
import type { SidebarState } from "./useSidebarState";

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

interface SidebarAccountProps {
  selected: SidebarState["selected"];
  onSelect: () => void;
}

export function SidebarAccount({ selected, onSelect }: SidebarAccountProps) {
  const isSelected = selected.type === "account";

  return (
    <div className="shrink-0 border-t border-neutral-100 p-2">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
          isSelected
            ? "bg-neutral-100 font-medium text-neutral-900"
            : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
        )}
      >
        <User
          className={cn(
            "size-4 shrink-0",
            isSelected ? "text-neutral-800" : "text-neutral-400"
          )}
          strokeWidth={1.75}
        />
        <span className="truncate">Account</span>
      </button>
    </div>
  );
}
