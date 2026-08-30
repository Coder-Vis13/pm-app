import type { LucideIcon } from "lucide-react";
import { cn } from "./sidebar-utils";

interface SidebarNavItemProps {
  label: string;
  icon: LucideIcon;
  selected?: boolean;
  onClick: () => void;
}

export function SidebarNavItem({
  label,
  icon: Icon,
  selected = false,
  onClick,
}: SidebarNavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        selected
          ? "bg-neutral-100 font-medium text-neutral-900"
          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          selected ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"
        )}
        strokeWidth={1.75}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}
