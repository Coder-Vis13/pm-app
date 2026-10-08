import type { Project, Section } from "../../types/database";

export type NavTarget =
  | { type: "home" }
  | { type: "my-tasks" }
  | { type: "project"; projectId: string }
  | { type: "section"; projectId: string; sectionId: string };

export interface ProjectWithSections extends Project {
  sections: Section[];
}

export type OpenMenu =
  | { kind: "project"; projectId: string }
  | { kind: "section"; projectId: string; sectionId: string };

export type SidebarDialog =
  | { kind: "rename-project"; projectId: string; currentName: string }
  | { kind: "rename-section"; projectId: string; sectionId: string; currentName: string }
  | { kind: "add-project" }
  | { kind: "add-section"; projectId: string }
  | { kind: "delete-project"; projectId: string; projectName: string }
  | { kind: "delete-section"; projectId: string; sectionId: string; sectionName: string };

export interface SidebarUiState {
  isOpen: boolean;
  selected: NavTarget;
  expandedProjectIds: Set<string>;
  openMenu: OpenMenu | null;
  dialog: SidebarDialog | null;
}
