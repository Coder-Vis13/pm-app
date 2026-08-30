import { LayoutList, MoreHorizontal } from "lucide-react";
import type { Section } from "../../types/database";
import type { OpenMenu } from "./types";
import {
  SidebarDropdownMenu,
  SidebarMenuItem,
  SidebarMenuSeparator,
} from "./SidebarDropdownMenu";
import { cn, isNavSelected } from "./sidebar-utils";

interface SectionRowProps {
  section: Section;
  projectId: string;
  selected: { type: string; projectId?: string; sectionId?: string };
  openMenu: OpenMenu | null;
  onSelect: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function SectionRow({
  section,
  projectId,
  selected,
  openMenu,
  onSelect,
  onOpenMenu,
  onCloseMenu,
  onRename,
  onDelete,
}: SectionRowProps) {
  const isSelected = isNavSelected(selected, {
    type: "section",
    projectId,
    sectionId: section.id,
  });
  const isMenuOpen =
    openMenu?.kind === "section" &&
    openMenu.projectId === projectId &&
    openMenu.sectionId === section.id;

  return (
    <div
      className={cn(
        "group/section flex items-center gap-1 rounded-md pr-1 transition-colors",
        isSelected ? "bg-neutral-100" : "hover:bg-neutral-50"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2.5 py-1.5 pl-9 pr-1 text-left text-sm transition-colors",
          isSelected
            ? "font-medium text-neutral-900"
            : "text-neutral-600 group-hover/section:text-neutral-900"
        )}
      >
        <LayoutList
          className={cn(
            "size-3.5 shrink-0",
            isSelected ? "text-neutral-700" : "text-neutral-400"
          )}
          strokeWidth={1.75}
        />
        <span className="truncate">{section.name}</span>
      </button>

      <SidebarDropdownMenu
        open={isMenuOpen}
        onClose={onCloseMenu}
        trigger={
          <button
            type="button"
            aria-label={`Section options for ${section.name}`}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={(event) => {
              event.stopPropagation();
              if (isMenuOpen) {
                onCloseMenu();
              } else {
                onOpenMenu();
              }
            }}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-all",
              "opacity-0 group-hover/section:opacity-100 focus-visible:opacity-100",
              isMenuOpen && "bg-neutral-100 text-neutral-600 opacity-100"
            )}
          >
            <MoreHorizontal className="size-3.5" strokeWidth={1.75} />
          </button>
        }
      >
        <SidebarMenuItem label="Rename section" onClick={onRename} />
        <SidebarMenuSeparator />
        <SidebarMenuItem label="Delete section" onClick={onDelete} destructive />
      </SidebarDropdownMenu>
    </div>
  );
}
