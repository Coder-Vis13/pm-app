import {
  getProjectMetrics,
  getProjectOverview,
  getProjectSectionProgress,
} from "@/api/metrics";
import { getProjectInsights } from "@/api/insights";
import type {
  HealthStatus,
  ProjectInsight,
  ProjectOverview,
  ProjectSectionProgress,
  StatusType,
} from "@/types/database";

/** Raw bundle from backend API responses. */
export interface ProjectOverviewRawData {
  overview: ProjectOverview;
  sectionProgress: ProjectSectionProgress;
  insights: ProjectInsight[];
  workflowMetrics: {
    totalIdleHours: number;
    handoffCount: number;
    overloadedMemberCount: number;
  };
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

export async function fetchProjectOverviewRaw(
  projectId: string
): Promise<ProjectOverviewRawData> {
  const [overview, sectionProgress, insights, metrics] = await Promise.all([
    getProjectOverview(projectId),
    getProjectSectionProgress(projectId),
    getProjectInsights(projectId),
    getProjectMetrics(projectId),
  ]);

  return {
    overview,
    sectionProgress,
    insights: insights ?? [],
    workflowMetrics: {
      totalIdleHours: metrics.totalIdleHours ?? 0,
      handoffCount: metrics.assigneeHandoffs?.length ?? 0,
      overloadedMemberCount: countFocusInsights(insights ?? []),
    },
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
