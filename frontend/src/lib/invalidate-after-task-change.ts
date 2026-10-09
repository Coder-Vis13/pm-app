import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

export interface InvalidateAfterTaskChangeOptions {
  projectId?: string;
  taskId?: string;
}

/** Broad cache refresh after a task is created, updated, or deleted. */
export function invalidateAfterTaskChange(
  queryClient: QueryClient,
  options: InvalidateAfterTaskChangeOptions = {}
): void {
  const { projectId, taskId } = options;

  void queryClient.invalidateQueries({ queryKey: queryKeys.myTasks() });
  void queryClient.invalidateQueries({ queryKey: ["section-tasks"] });

  void queryClient.invalidateQueries({ queryKey: ["home-project-overviews"] });

  if (projectId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.projectOverview(projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.projectOverviewCore(projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.projectOverviewSecondary(projectId),
    });
  }

  if (taskId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.taskDetailBundle(taskId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.taskImpact(taskId),
    });
  }
}
