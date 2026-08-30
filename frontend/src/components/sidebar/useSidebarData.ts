import { useCallback, useEffect, useRef, useState } from "react";
import {
  createProject as apiCreateProject,
  deleteProject as apiDeleteProject,
  getProjects as apiGetProjects,
  updateProject as apiUpdateProject,
} from "../../api/project";
import {
  createSection as apiCreateSection,
  deleteSection as apiDeleteSection,
  getSections as apiGetSections,
  updateSection as apiUpdateSection,
} from "../../api/section";
import { getWorkspaces } from "../../api/workspace";
import type { ProjectWithSections } from "./types";
import { getErrorMessage } from "./sidebar-errors";
import { toProjectWithSections } from "./sidebar-utils";

interface UseSidebarDataOptions {
  onProjectCreated?: (projectId: string) => void;
  onProjectDeleted?: (projectId: string) => void;
  onSectionDeleted?: (projectId: string, sectionId: string) => void;
}

export function useSidebarData({
  onProjectCreated,
  onProjectDeleted,
  onSectionDeleted,
}: UseSidebarDataOptions = {}) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectWithSections[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const isMutatingRef = useRef(false);

  const clearMutationError = useCallback(() => {
    setMutationError(null);
  }, []);

  const loadSidebarData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const workspaces = await getWorkspaces();
      if (workspaces.length === 0) {
        throw new Error("No workspace found for your account");
      }

      const workspace = workspaces[0];
      setWorkspaceId(workspace.id);

      const projectList = await apiGetProjects(workspace.id);
      const projectsWithSections = await Promise.all(
        projectList.map(async (project) => {
          const sections = await apiGetSections(project.id);
          return toProjectWithSections(project, sections);
        })
      );

      setProjects(projectsWithSections);
    } catch (error) {
      setWorkspaceId(null);
      setProjects([]);
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSidebarData();
  }, [loadSidebarData]);

  const runMutation = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      if (isMutatingRef.current) return false;

      isMutatingRef.current = true;
      setIsMutating(true);
      setMutationError(null);

      try {
        await action();
        return true;
      } catch (error) {
        setMutationError(getErrorMessage(error));
        return false;
      } finally {
        isMutatingRef.current = false;
        setIsMutating(false);
      }
    },
    []
  );

  const createProject = useCallback(
    async (name: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) return false;

      if (!workspaceId) {
        setMutationError("Workspace is not loaded. Please refresh and try again.");
        return false;
      }

      return runMutation(async () => {
        const project = await apiCreateProject(trimmed, workspaceId);
        setProjects((prev) => [...prev, toProjectWithSections(project)]);
        onProjectCreated?.(project.id);
      });
    },
    [workspaceId, runMutation, onProjectCreated]
  );

  const addSection = useCallback(
    async (projectId: string, name: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) return false;

      return runMutation(async () => {
        const section = await apiCreateSection(projectId, trimmed);
        setProjects((prev) =>
          prev.map((project) =>
            project.id === projectId
              ? { ...project, sections: [...project.sections, section] }
              : project
          )
        );
      });
    },
    [runMutation]
  );

  const renameProject = useCallback(
    async (projectId: string, name: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) return false;

      return runMutation(async () => {
        const updated = await apiUpdateProject(projectId, { name: trimmed });
        setProjects((prev) =>
          prev.map((project) =>
            project.id === projectId
              ? { ...project, ...updated, sections: project.sections }
              : project
          )
        );
      });
    },
    [runMutation]
  );

  const renameSection = useCallback(
    async (
      projectId: string,
      sectionId: string,
      name: string
    ): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) return false;

      return runMutation(async () => {
        const updated = await apiUpdateSection(projectId, sectionId, {
          name: trimmed,
        });
        setProjects((prev) =>
          prev.map((project) => {
            if (project.id !== projectId) return project;
            return {
              ...project,
              sections: project.sections.map((section) =>
                section.id === sectionId ? updated : section
              ),
            };
          })
        );
      });
    },
    [runMutation]
  );

  const deleteProject = useCallback(
    async (projectId: string): Promise<boolean> => {
      return runMutation(async () => {
        await apiDeleteProject(projectId);
        setProjects((prev) => prev.filter((project) => project.id !== projectId));
        onProjectDeleted?.(projectId);
      });
    },
    [runMutation, onProjectDeleted]
  );

  const deleteSection = useCallback(
    async (projectId: string, sectionId: string): Promise<boolean> => {
      return runMutation(async () => {
        await apiDeleteSection(projectId, sectionId);
        setProjects((prev) =>
          prev.map((project) => {
            if (project.id !== projectId) return project;
            return {
              ...project,
              sections: project.sections.filter(
                (section) => section.id !== sectionId
              ),
            };
          })
        );
        onSectionDeleted?.(projectId, sectionId);
      });
    },
    [runMutation, onSectionDeleted]
  );

  return {
    projects,
    isLoading,
    loadError,
    isMutating,
    mutationError,
    clearMutationError,
    loadSidebarData,
    createProject,
    addSection,
    renameProject,
    renameSection,
    deleteProject,
    deleteSection,
  };
}

export type SidebarData = ReturnType<typeof useSidebarData>;
