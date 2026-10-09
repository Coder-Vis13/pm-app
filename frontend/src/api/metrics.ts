import { get, post } from "../lib/api-client";
import type {
  AssigneeHandoff,
  FocusMetrics,
  ProjectOverview,
  ProjectTaskCounts,
  ProjectSectionProgress,
} from "../types/database";

export interface ProjectWorkflowMetrics {
  projectId: string;
  depCount: number;
  totalStatusSegments: number;
  waitingSegmentCount: number;
  blockedSegmentCount: number;
  totalIdleHours: number;
  statusTransitions: unknown[];
  assigneeHandoffs: AssigneeHandoff[];
  longestWaits: { taskId: string; idleHours: number }[];
}

const getProjectMetrics = (
  projectId: string
): Promise<ProjectWorkflowMetrics> =>
  get(`/api/metrics/projects/${projectId}/metrics`);

const getUserFocusSignals = (
  projectId: string,
  targetUserId: string
): Promise<FocusMetrics> =>
  get(
    `/api/metrics/projects/${projectId}/users/${targetUserId}/focus`
  );

const getProjectOverview = (
  projectId: string
): Promise<ProjectOverview> =>
  get(`/api/metrics/projects/${projectId}/overview`);

export interface ProjectOverviewCoreResponse {
  overview: ProjectOverview;
  sectionProgress: ProjectSectionProgress;
}

const getProjectOverviewCore = (
  projectId: string
): Promise<ProjectOverviewCoreResponse> =>
  get(`/api/metrics/projects/${projectId}/overview-core`);

const getHomeProjectOverviews = (
  projectIds: string[]
): Promise<{ overviews: Record<string, ProjectOverview> }> =>
  post("/api/metrics/projects/home-overviews", { projectIds });

const getProjectTaskCounts = (
  projectId: string
): Promise<ProjectTaskCounts> =>
  get(`/api/metrics/projects/${projectId}/task-counts`);

const getProjectSectionProgress = (
  projectId: string
): Promise<ProjectSectionProgress> =>
  get(`/api/metrics/projects/${projectId}/sections/progress`);

export {
  getProjectMetrics,
  getUserFocusSignals,
  getProjectOverview,
  getProjectOverviewCore,
  getHomeProjectOverviews,
  getProjectTaskCounts,
  getProjectSectionProgress,
};