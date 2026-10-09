import {
  getProjectMetrics,
  getProjectOverviewCore,
} from "@/api/metrics";
import { getProjectInsights } from "@/api/insights";
import type {
  HealthStatus,
  ProjectInsight,
  ProjectOverview,
  ProjectSectionProgress,
  StatusType,
} from "@/types/database";

export interface ProjectOverviewCoreData {
  overview: ProjectOverview;
  sectionProgress: ProjectSectionProgress;
}

export interface ProjectOverviewSecondaryData {
  insights: ProjectInsight[];
  workflowMetrics: {
    totalIdleHours: number;
    handoffCount: number;
    overloadedMemberCount: number;
  };
}

/** Raw bundle from backend API responses. */
export interface ProjectOverviewRawData
  extends ProjectOverviewCoreData,
    ProjectOverviewSecondaryData {
  projectMeta: {
    workspaceName: string;
    name: string;
    description: string;
    memberCount: number;
    updatedMinutesAgo: number;
    taskLabels: Record<string, string>;
    userLabels: Record<string, string>;
  };
}

function countFocusInsights(insights: ProjectInsight[]): number {
  return insights.filter((insight) => {
    const type = insight.insight_type;
    return type === "focus" || type === "focus_overload";
  }).length;
}

// Load the data needed for the main project overview.
export async function fetchProjectOverviewCore(
  projectId: string
): Promise<ProjectOverviewCoreData> {
  return getProjectOverviewCore(projectId);
}

// Load workflow metrics and insights for the project overview.
export async function fetchProjectOverviewSecondary(
  projectId: string
): Promise<ProjectOverviewSecondaryData> {
  const [insights, metrics] = await Promise.all([
    getProjectInsights(projectId),
    getProjectMetrics(projectId),
  ]);

  const normalizedInsights = insights ?? [];

  return {
    insights: normalizedInsights,
    workflowMetrics: {
      totalIdleHours: metrics.totalIdleHours ?? 0,
      handoffCount: metrics.assigneeHandoffs?.length ?? 0,
      overloadedMemberCount: countFocusInsights(normalizedInsights),
    },
  };
}

export async function fetchProjectOverviewRaw(
  projectId: string
): Promise<ProjectOverviewRawData> {
  const [core, secondary] = await Promise.all([
    fetchProjectOverviewCore(projectId),
    fetchProjectOverviewSecondary(projectId),
  ]);

  return {
    ...core,
    ...secondary,
    projectMeta: {
      workspaceName: "",
      name: "",
      description: "",
      memberCount: 0,
      updatedMinutesAgo: 0,
      taskLabels: {},
      userLabels: {},
    },
  };
}

export const STATUS_LABELS: Record<StatusType, string> = {
  to_do: "To do",
  in_progress: "In progress",
  waiting: "Waiting",
  blocked: "Blocked",
  done: "Done",
};

export const STATUS_ORDER: StatusType[] = [
  "to_do",
  "in_progress",
  "waiting",
  "blocked",
  "done",
];

export const HEALTH_LABELS: Record<HealthStatus, string> = {
  healthy: "Healthy",
  at_risk: "At risk",
  critical: "Critical",
};
