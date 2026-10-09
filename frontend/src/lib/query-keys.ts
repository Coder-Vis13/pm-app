// Shared React Query keys — same key means the same cached API data.

export const queryKeys = {
  workspaces: () => ["workspaces"] as const,

  projects: (workspaceId: string) => ["projects", workspaceId] as const,

  sections: (projectId: string) => ["sections", projectId] as const,

  sidebarTree: () => ["sidebar-tree"] as const,

  myTasks: () => ["my-tasks"] as const,

  projectOverview: (projectId: string) =>
    ["project-overview", projectId] as const,

  homeProjectOverviews: (projectIds: string[]) =>
    ["home-project-overviews", [...projectIds].sort().join(",")] as const,

  projectOverviewCore: (projectId: string) =>
    ["project-overview-core", projectId] as const,

  projectOverviewSecondary: (projectId: string) =>
    ["project-overview-secondary", projectId] as const,

  sectionSummary: (projectId: string, sectionId: string) =>
    ["section-summary", projectId, sectionId] as const,

  sectionTasks: (
    projectId: string,
    sectionId: string,
    tab: string
  ) => ["section-tasks", projectId, sectionId, tab] as const,

  taskDetailBundle: (taskId: string) => ["task-detail", taskId] as const,

  task: (taskId: string) => ["task", taskId] as const,

  taskSubtasks: (taskId: string) => ["task-subtasks", taskId] as const,

  taskDependencyDetails: (taskId: string) =>
    ["task-dependency-details", taskId] as const,

  taskAssignees: (taskId: string) => ["task-assignees", taskId] as const,

  taskImpact: (taskId: string) => ["task-impact", taskId] as const,
};
