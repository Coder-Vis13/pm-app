import type { Project, Section } from "../../types/database";
import type { ProjectWithSections } from "./types";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function toProjectWithSections(
  project: Project,
  sections: Section[] = []
): ProjectWithSections {
  return { ...project, sections };
}

export function isProjectExpanded(
  expandedProjectIds: Set<string>,
  projectId: string
): boolean {
  return expandedProjectIds.has(projectId);
}

export function toggleExpandedProject(
  expandedProjectIds: Set<string>,
  projectId: string
): Set<string> {
  const next = new Set(expandedProjectIds);
  if (next.has(projectId)) {
    next.delete(projectId);
  } else {
    next.add(projectId);
  }
  return next;
}

export function isNavSelected(
  selected: { type: string; projectId?: string; sectionId?: string },
  target: { type: string; projectId?: string; sectionId?: string }
): boolean {
  if (selected.type !== target.type) return false;
  if ("projectId" in target && selected.projectId !== target.projectId) {
    return false;
  }
  if ("sectionId" in target && selected.sectionId !== target.sectionId) {
    return false;
  }
  return true;
}
