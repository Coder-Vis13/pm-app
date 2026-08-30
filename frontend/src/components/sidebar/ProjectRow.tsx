import { ChevronDown, ChevronRight, FolderKanban, MoreHorizontal } from "lucide-react";
import type { ProjectWithSections, OpenMenu } from "./types";
import { SectionRow } from "./SectionRow";
import {
  SidebarDropdownMenu,
  SidebarMenuItem,
  SidebarMenuSeparator,
} from "./SidebarDropdownMenu";
import { cn, isNavSelected, isProjectExpanded } from "./sidebar-utils";

interface ProjectRowProps {
  project: ProjectWithSections;
  selected: { type: string; projectId?: string; sectionId?: string };
  expandedProjectIds: Set<string>;
  openMenu: OpenMenu | null;
  onSelectProject: () => void;
  onToggleExpanded: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onSelectSection: (sectionId: string) => void;
  onOpenSectionMenu: (sectionId: string) => void;
  onRenameProject: () => void;
  onAddSection: () => void;
  onDeleteProject: () => void;
  onRenameSection: (sectionId: string, currentName: string) => void;
  onDeleteSection: (sectionId: string, sectionName: string) => void;
}

export function ProjectRow({
  project,
  selected,
  expandedProjectIds,
  openMenu,
  onSelectProject,
  onToggleExpanded,
  onOpenMenu,
  onCloseMenu,
  onSelectSection,
  onOpenSectionMenu,
  onRenameProject,
  onAddSection,
  onDeleteProject,
  onRenameSection,
  onDeleteSection,
}: ProjectRowProps) {
  const expanded = isProjectExpanded(expandedProjectIds, project.id);
  const isSelected = isNavSelected(selected, {
    type: "project",
    projectId: project.id,
  });
  const isMenuOpen =
    openMenu?.kind === "project" && openMenu.projectId === project.id;

  return (
    <div className="mb-0.5">
      <div
        className={cn(
          "group/project flex items-center gap-0.5 rounded-md pr-1 transition-colors",
          isSelected && selected.type === "project"
            ? "bg-neutral-100"
            : "hover:bg-neutral-50"
        )}
      >
        <button
          type="button"
          aria-label={expanded ? "Collapse project" : "Expand project"}
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpanded();
          }}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
        >
          {expanded ? (
            <ChevronDown className="size-3.5" strokeWidth={1.75} />
          ) : (
            <ChevronRight className="size-3.5" strokeWidth={1.75} />
          )}
        </button>

        <button
          type="button"
          onClick={onSelectProject}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-0.5 pr-1 text-left text-sm transition-colors",
            isSelected && selected.type === "project"
              ? "font-medium text-neutral-900"
              : "text-neutral-700 group-hover/project:text-neutral-900"
          )}
        >
          <FolderKanban
            className={cn(
              "size-4 shrink-0",
              isSelected && selected.type === "project"
                ? "text-neutral-800"
                : "text-neutral-400"
            )}
            strokeWidth={1.75}
          />
          <span className="truncate">{project.name}</span>
        </button>

        <SidebarDropdownMenu
          open={isMenuOpen}
          onClose={onCloseMenu}
          trigger={
            <button
              type="button"
              aria-label={`Project options for ${project.name}`}
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
                "opacity-0 group-hover/project:opacity-100 focus-visible:opacity-100",
                isMenuOpen && "bg-neutral-100 text-neutral-600 opacity-100"
              )}
            >
              <MoreHorizontal className="size-3.5" strokeWidth={1.75} />
            </button>
          }
        >
          <SidebarMenuItem label="Rename project" onClick={onRenameProject} />
          <SidebarMenuItem label="Add section" onClick={onAddSection} />
          <SidebarMenuSeparator />
          <SidebarMenuItem
            label="Delete project"
            onClick={onDeleteProject}
            destructive
          />
        </SidebarDropdownMenu>
      </div>

      {expanded && project.sections.length > 0 && (
        <div className="mt-0.5 space-y-0.5">
          {project.sections.map((section) => (
            <SectionRow
              key={section.id}
              section={section}
              projectId={project.id}
              selected={selected}
              openMenu={openMenu}
              onSelect={() => onSelectSection(section.id)}
              onOpenMenu={() => onOpenSectionMenu(section.id)}
              onCloseMenu={onCloseMenu}
              onRename={() => onRenameSection(section.id, section.name)}
              onDelete={() => onDeleteSection(section.id, section.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
