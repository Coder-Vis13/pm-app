import { useCallback, useMemo, useRef, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { queryKeys } from "../../lib/query-keys";
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
  const queryClient = useQueryClient();
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const isMutatingRef = useRef(false);

  const workspacesQuery = useQuery({
    queryKey: queryKeys.workspaces(),
    queryFn: getWorkspaces,
  });

  const workspaceId = workspacesQuery.data?.[0]?.id ?? null;

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects(workspaceId ?? ""),
    queryFn: () => apiGetProjects(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const projectList = projectsQuery.data ?? [];

  const sectionQueries = useQueries({
    queries: projectList.map((project) => ({
      queryKey: queryKeys.sections(project.id),
      queryFn: () => apiGetSections(project.id),
    })),
  });

  const projects = useMemo((): ProjectWithSections[] => {
    return projectList.map((project, index) =>
      toProjectWithSections(project, sectionQueries[index]?.data ?? [])
    );
  }, [projectList, sectionQueries]);

  const isLoading =
    workspacesQuery.isPending ||
    (Boolean(workspaceId) && projectsQuery.isPending) ||
    (projectList.length > 0 &&
      sectionQueries.some((query) => query.isPending));

  const loadError = useMemo(() => {
    if (workspacesQuery.error) {
      return getErrorMessage(workspacesQuery.error);
    }

    if (
      workspacesQuery.isSuccess &&
      workspacesQuery.data.length === 0
    ) {
      return "No workspace found for your account";
    }

    if (projectsQuery.error) {
      return getErrorMessage(projectsQuery.error);
    }

    const sectionError = sectionQueries.find((query) => query.error)?.error;
    if (sectionError) {
      return getErrorMessage(sectionError);
    }

    return null;
  }, [
    workspacesQuery.data,
    workspacesQuery.error,
    workspacesQuery.isSuccess,
    projectsQuery.error,
    sectionQueries,
  ]);

  const clearMutationError = useCallback(() => {
    setMutationError(null);
  }, []);

  const loadSidebarData = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.workspaces(),
    });
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    await queryClient.invalidateQueries({ queryKey: ["sections"] });
  }, [queryClient]);

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
        await queryClient.invalidateQueries({
          queryKey: queryKeys.projects(workspaceId),
        });
        onProjectCreated?.(project.id);
      });
    },
    [workspaceId, runMutation, onProjectCreated, queryClient]
  );

  const addSection = useCallback(
    async (projectId: string, name: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) return false;

      return runMutation(async () => {
        await apiCreateSection(projectId, trimmed);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.sections(projectId),
        });
      });
    },
    [runMutation, queryClient]
  );

  const renameProject = useCallback(
    async (projectId: string, name: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) return false;

      return runMutation(async () => {
        await apiUpdateProject(projectId, { name: trimmed });
        if (workspaceId) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.projects(workspaceId),
          });
        }
      });
    },
    [runMutation, queryClient, workspaceId]
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
        await apiUpdateSection(projectId, sectionId, {
          name: trimmed,
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.sections(projectId),
        });
      });
    },
    [runMutation, queryClient]
  );

  const deleteProject = useCallback(
    async (projectId: string): Promise<boolean> => {
      return runMutation(async () => {
        await apiDeleteProject(projectId);
        if (workspaceId) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.projects(workspaceId),
          });
        }
        onProjectDeleted?.(projectId);
      });
    },
    [runMutation, queryClient, workspaceId, onProjectDeleted]
  );

  const deleteSection = useCallback(
    async (projectId: string, sectionId: string): Promise<boolean> => {
      return runMutation(async () => {
        await apiDeleteSection(projectId, sectionId);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.sections(projectId),
        });
        onSectionDeleted?.(projectId, sectionId);
      });
    },
    [runMutation, queryClient, onSectionDeleted]
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
