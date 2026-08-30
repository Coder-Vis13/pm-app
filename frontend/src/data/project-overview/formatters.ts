import type { HealthStatus, StatusType } from "@/types/database";
import {
  HEALTH_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  type ProjectOverviewRawData,
} from "./mockData";

export type IntelligenceFilter = "all" | "waiting" | "handoff" | "focus";

export interface HealthDisplay {
  status: HealthStatus;
  label: string;
  summary: string;
  progressPercent: number;
  completedTasks: number;
  totalTasks: number;
  attentionCount: number;
  attentionLabel: string;
}

export interface StatusProgressRow {
  status: StatusType;
  label: string;
  count: number;
  barPercent: number;
}

export interface SectionProgressRow {
  sectionId: string;
  name: string;
  taskCount: number;
  progressPercent: number;
}

export interface IntelligenceCardViewModel {
  id: string;
  type: IntelligenceFilter;
  typeLabel: string;
  title: string;
  metric: string;
  explanation: string;
}

export interface WorkflowSignalsViewModel {
  waitingHours: string;
  handoffCount: number;
  focusPeopleCount: number;
}

export interface ProjectOverviewViewModel {
  projectId: string;
  workspaceName: string;
  projectName: string;
  description: string;
  memberCount: number;
  updatedLabel: string;
  health: HealthDisplay;
  statusRows: StatusProgressRow[];
  sections: SectionProgressRow[];
  intelligence: IntelligenceCardViewModel[];
  intelligenceTotal: number;
  workflowSignals: WorkflowSignalsViewModel;
}

function formatUpdatedLabel(minutesAgo: number): string {
  if (minutesAgo < 1) return "Updated just now";
  if (minutesAgo === 1) return "Updated 1 min ago";
  if (minutesAgo < 60) return `Updated ${minutesAgo} min ago`;
  const hours = Math.floor(minutesAgo / 60);
  return hours === 1 ? "Updated 1 hour ago" : `Updated ${hours} hours ago`;
}

function computeAttentionCount(raw: ProjectOverviewRawData): number {
  const { supportingMetrics } = raw.overview.health;
  return (
    supportingMetrics.stalledCount +
    supportingMetrics.overdueCount +
    supportingMetrics.dependencyBlockedCount
  );
}

export function formatHealthDisplay(
  raw: ProjectOverviewRawData
): HealthDisplay {
  const { health, tasks } = raw.overview;
  const progressPercent =
    tasks.total > 0 ? Math.round((tasks.completed / tasks.total) * 100) : 0;
  const attentionCount = computeAttentionCount(raw);

  return {
    status: health.status,
    label: HEALTH_LABELS[health.status],
    summary: health.summary,
    progressPercent,
    completedTasks: tasks.completed,
    totalTasks: tasks.total,
    attentionCount,
    attentionLabel: attentionCount === 1 ? "needs review" : "need review",
  };
}

export function formatStatusRows(
  raw: ProjectOverviewRawData
): StatusProgressRow[] {
  const { byStatus } = raw.overview.tasks;
  const maxCount = Math.max(...STATUS_ORDER.map((s) => byStatus[s]), 1);

  return STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    count: byStatus[status],
    barPercent: Math.round((byStatus[status] / maxCount) * 100),
  }));
}

export function formatSectionRows(
  raw: ProjectOverviewRawData
): SectionProgressRow[] {
  return raw.sectionProgress.sections.map((section) => ({
    sectionId: section.sectionId,
    name: section.name,
    taskCount: section.taskCount,
    progressPercent: section.progressPercent,
  }));
}

function normalizeInsightType(
  insightType: string
): Exclude<IntelligenceFilter, "all"> {
  if (insightType === "handoffs") return "handoff";
  if (insightType === "waiting" || insightType === "handoff" || insightType === "focus") {
    return insightType;
  }
  return "waiting";
}

const INSIGHT_TYPE_LABELS: Record<
  Exclude<IntelligenceFilter, "all">,
  string
> = {
  waiting: "Waiting",
  handoff: "Handoff",
  focus: "Focus",
};

function formatInsightMetric(
  type: Exclude<IntelligenceFilter, "all">,
  metrics: Record<string, unknown>
): string {
  if (type === "waiting") {
    const hours = Number(metrics.idleHours ?? metrics.currentIdleHours ?? 0);
    const segments = Number(metrics.idleSegmentCount ?? 0);
    if (hours > 0) return `${hours.toFixed(1)}h waiting`;
    if (segments > 0) {
      return `${segments} waiting period${segments === 1 ? "" : "s"}`;
    }
    return "Waiting activity detected";
  }

  if (type === "handoff") {
    const handoffs = Number(metrics.handoffCount ?? 0);
    const gap = Number(metrics.maxGapHours ?? metrics.averageGapHours ?? 0);
    if (handoffs > 0) {
      return `${handoffs} ownership change${handoffs === 1 ? "" : "s"}`;
    }
    if (gap > 0) return `${gap.toFixed(1)}h without owner`;
    return "Ownership changed";
  }

  const active = Number(metrics.concurrentInProgress ?? 0);
  if (active > 0) {
    return `${active} task${active === 1 ? "" : "s"} in progress`;
  }
  return "Heavy workload";
}


function formatWaitingExplanation(metrics: Record<string, unknown>): string {
  const idleHours = Number(metrics.idleHours ?? 0);
  const currentIdle = Number(metrics.currentIdleHours ?? 0);
  const segments = Number(metrics.idleSegmentCount ?? 0);

  if (currentIdle > 0 && segments > 1) {
    return `Currently waiting for ${currentIdle.toFixed(1)} hours, after ${segments} waiting periods in total.`;
  }

  if (currentIdle > 0) {
    return `Currently waiting for ${currentIdle.toFixed(1)} hours with no recorded progress during this period.`;
  }

  if (idleHours > 0 && segments > 1) {
    return `Spent ${idleHours.toFixed(1)} hours waiting across ${segments} separate waiting periods.`;
  }

  if (idleHours > 0) {
    return `Spent ${idleHours.toFixed(1)} hours in a waiting state.`;
  }

  if (segments > 1) {
    return `Entered a waiting state ${segments} times during its recorded workflow.`;
  }

  return "The workflow history contains a waiting period for this task.";
}

function formatHandoffExplanation(metrics: Record<string, unknown>): string {
  const handoffs = Number(metrics.handoffCount ?? 0);
  const maxGap = Number(metrics.maxGapHours ?? 0);
  const avgGap = Number(metrics.averageGapHours ?? 0);
  const delay = Number(metrics.statusTransitionDelayHours ?? 0);

  if (handoffs > 1 && maxGap > 0) {
    return `Changed ownership ${handoffs} times, with the longest recorded gap between owners lasting ${maxGap.toFixed(1)} hours.`;
  }

  if (handoffs > 0 && maxGap > 0) {
    return `Changed ownership ${handoffs} time${handoffs === 1 ? "" : "s"}, with a ${maxGap.toFixed(1)} hour gap between owners.`;
  }

  if (handoffs > 0) {
    return `Recorded ${handoffs} ownership change${handoffs === 1 ? "" : "s"} during the task's workflow.`;
  }

  if (avgGap > 0) {
    return `Recorded an average gap of ${avgGap.toFixed(1)} hours without an assignee between ownership periods.`;
  }

  if (delay > 0) {
    return `Recorded approximately ${delay.toFixed(1)} hours between an ownership change and the related status transition.`;
  }

  return "The workflow history contains an ownership transition for this task.";
}

function formatFocusExplanation(metrics: Record<string, unknown>): string {
  const active = Number(metrics.concurrentInProgress ?? 0);
  const started = Number(metrics.tasksStarted ?? 0);

  if (active > 0 && started > 0) {
    return `Currently has ${active} tasks in progress and ${started} recently started task${started === 1 ? "" : "s"}.`;
  }

  if (active > 0) {
    return `Currently has ${active} task${active === 1 ? "" : "s"} in progress at the same time.`;
  }

  if (started > 0) {
    return `Recently started ${started} task${started === 1 ? "" : "s"} according to the recorded workflow.`;
  }

  return "The workflow history contains active work for this team member.";
}

function formatInsightExplanation(
  type: Exclude<IntelligenceFilter, "all">,
  metrics: Record<string, unknown>
): string {
  if (type === "waiting") return formatWaitingExplanation(metrics);
  if (type === "handoff") return formatHandoffExplanation(metrics);
  return formatFocusExplanation(metrics);
}

export function formatIntelligenceCards(
  raw: ProjectOverviewRawData
): IntelligenceCardViewModel[] {
  const { insights, projectMeta } = raw;

  return insights.map((insight) => {
    const type = normalizeInsightType(insight.insight_type);
    const metrics = (insight.metrics ?? {}) as Record<string, unknown>;
    const title =
      insight.entity_type === "user"
        ? (projectMeta.userLabels[insight.entity_id ?? ""] ?? "Member")
        : (projectMeta.taskLabels[insight.entity_id ?? ""] ?? "Task");

    return {
      id: insight.id,
      type,
      typeLabel: INSIGHT_TYPE_LABELS[type],
      title,
      metric: formatInsightMetric(type, metrics),
      explanation: formatInsightExplanation(type, metrics),
    };
  });
}

export function formatWorkflowSignals(
  raw: ProjectOverviewRawData
): WorkflowSignalsViewModel {
  const { workflowMetrics } = raw;
  return {
    waitingHours: `${workflowMetrics.totalIdleHours.toFixed(1)}h`,
    handoffCount: workflowMetrics.handoffCount,
    focusPeopleCount: workflowMetrics.overloadedMemberCount,
  };
}

export function buildProjectOverviewViewModel(
  raw: ProjectOverviewRawData
): ProjectOverviewViewModel {
  const intelligence = formatIntelligenceCards(raw);

  return {
    projectId: raw.overview.projectId,
    workspaceName: raw.projectMeta.workspaceName,
    projectName: raw.projectMeta.name,
    description: raw.projectMeta.description,
    memberCount: raw.projectMeta.memberCount,
    updatedLabel: formatUpdatedLabel(raw.projectMeta.updatedMinutesAgo),
    health: formatHealthDisplay(raw),
    statusRows: formatStatusRows(raw),
    sections: formatSectionRows(raw),
    intelligence,
    intelligenceTotal: intelligence.length,
    workflowSignals: formatWorkflowSignals(raw),
  };
}

export function filterIntelligenceCards(
  cards: IntelligenceCardViewModel[],
  filter: IntelligenceFilter
): IntelligenceCardViewModel[] {
  if (filter === "all") return cards;
  return cards.filter((card) => card.type === filter);
}
