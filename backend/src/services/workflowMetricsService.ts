//aggregator for project metrics for AIML

import { performance } from "node:perf_hooks";
import { supabase } from "../lib/supabaseClient";
import { AppError } from "../lib/errors";
import { requireProjectAccess } from "./accessService";
import {
  buildStatusTimeline,
  extractAssigneeHandoffs,
  extractStatusChange,
  getUserProgressMetrics,
  sumIdleHours,
} from "./historyService";
import { getDependenciesForTaskIds } from "./dependencyService";
import {
  loadProjectAnalyticsSnapshot,
} from "./projectAnalyticsDataService";
import type { ProjectAnalyticsSnapshot } from "./projectAnalyticsDataService";
import {
  Section,
  StatusTimeline,
  StatusType,
  Task,
  TaskDep,
} from "../types/database";
// import { calcRiskScore } from "./dependencyAnalysisService";

const ALL_STATUSES: StatusType[] = [
  "to_do",
  "in_progress",
  "waiting",
  "blocked",
  "done",
];

const EMPTY_STATUS_COUNTS = (): Record<StatusType, number> => ({
  to_do: 0,
  in_progress: 0,
  waiting: 0,
  blocked: 0,
  done: 0,
});

type HealthStatus = "healthy" | "at_risk" | "critical";
type HealthImpact = "positive" | "neutral" | "negative";

export interface ProjectTaskCounts {
  projectId: string;
  total: number;
  completed: number;
  remaining: number;
  byStatus: Record<StatusType, number>;
}

export interface ProjectHealthFactor {
  key: string;
  label: string;
  value: number;
  unit: "count" | "percent" | "hours";
  impact: HealthImpact;
}

export interface ProjectHealth {
  status: HealthStatus;
  score: number;
  summary: string;
  factors: ProjectHealthFactor[];
  supportingMetrics: {
    overdueCount: number;
    dependencyBlockedCount: number;
    stalledCount: number;
    totalIdleHours: number;
    depCount: number;
    completionRate: number;
    activeSectionCount: number;
    unsectionedTaskCount: number;
  };
}

export interface ProjectOverview {
  projectId: string;
  tasks: ProjectTaskCounts;
  health: ProjectHealth;
}

export interface SectionProgressItem {
  sectionId: string;
  name: string;
  description: string | null;
  position: number;
  taskCount: number;
  completedTaskCount: number;
  progressPercent: number;
}

export interface ProjectSectionProgress {
  projectId: string;
  sections: SectionProgressItem[];
  unsectioned: {
    taskCount: number;
    completedTaskCount: number;
    progressPercent: number;
  };
}

interface ActiveTaskRow {
  id: string;
  status: StatusType;
  section_id: string | null;
  due_date: string | null;
}

async function fetchActiveProjectTasks(
  projectId: string
): Promise<ActiveTaskRow[]> {
  const { data, error } = await supabase
    .from("task")
    .select("id, status, section_id, due_date")
    .eq("project_id", projectId)
    .eq("is_deleted", false);

  if (error) throw new AppError(error.message, 500);
  return (data ?? []) as ActiveTaskRow[];
}

// Build project status segments from the grouped history snapshot.
function buildProjectStatusSegments(
  snapshot: ProjectAnalyticsSnapshot
): StatusTimeline[] {
  const segments: StatusTimeline[] = [];

  for (const task of snapshot.tasks) {
    const taskHistory = snapshot.historyByTaskId.get(task.id) ?? [];
    segments.push(
      ...buildStatusTimeline(task.id, taskHistory, task as Task)
    );
  }

  return segments;
}

function countTasksByStatus(
  tasks: Pick<ActiveTaskRow, "status">[]
): Record<StatusType, number> {
  const byStatus = EMPTY_STATUS_COUNTS();
  for (const task of tasks) {
    if (ALL_STATUSES.includes(task.status)) {
      byStatus[task.status]++;
    }
  }
  return byStatus;
}

function buildTaskCounts(
  projectId: string,
  tasks: Pick<ActiveTaskRow, "status">[]
): ProjectTaskCounts {
  const byStatus = countTasksByStatus(tasks);
  const total = tasks.length;
  const completed = byStatus.done;
  return {
    projectId,
    total,
    completed,
    remaining: total - completed,
    byStatus,
  };
}

function countOverdueTasks(tasks: ActiveTaskRow[]): number {
  const now = Date.now();
  return tasks.filter(
    (task) =>
      task.status !== "done" &&
      task.due_date !== null &&
      new Date(task.due_date).getTime() < now
  ).length;
}

function countDependencyBlockedTasks(
  tasks: Pick<ActiveTaskRow, "id" | "status">[],
  deps: TaskDep[]
): number {
  const statusById = new Map(tasks.map((task) => [task.id, task.status]));
  const blockedByDeps = new Set<string>();

  for (const dep of deps) {
    if (!dep.blocking_task_id || !dep.blocked_task_id) continue;

    const blockingStatus = statusById.get(dep.blocking_task_id);
    const blockedStatus = statusById.get(dep.blocked_task_id);
    if (!blockingStatus || !blockedStatus || blockedStatus === "done") continue;

    if (blockingStatus !== "done") {
      blockedByDeps.add(dep.blocked_task_id);
    }
  }

  return blockedByDeps.size;
}

function buildHealthSummary(
  status: HealthStatus,
  context: {
    completionRate: number;
    stalledCount: number;
    overdueCount: number;
    dependencyBlockedCount: number;
  }
): string {
  const { completionRate, stalledCount, overdueCount, dependencyBlockedCount } =
    context;

  if (status === "healthy") {
    if (completionRate >= 0.75) {
      return "Project is progressing well with strong completion momentum.";
    }
    return "Project workflow is stable with no major blockers detected.";
  }

  const issues: string[] = [];
  if (stalledCount > 0) {
    issues.push(
      `${stalledCount} task${stalledCount === 1 ? "" : "s"} waiting or blocked`
    );
  }
  if (overdueCount > 0) {
    issues.push(`${overdueCount} overdue task${overdueCount === 1 ? "" : "s"}`);
  }
  if (dependencyBlockedCount > 0) {
    issues.push(
      `${dependencyBlockedCount} task${dependencyBlockedCount === 1 ? "" : "s"} blocked by incomplete dependencies`
    );
  }

  if (issues.length === 0) {
    return status === "critical"
      ? "Project health is critical based on overall workflow signals."
      : "Project has emerging workflow risks that may need attention.";
  }

  const prefix =
    status === "critical"
      ? "Project health is critical:"
      : "Project is at risk:";

  return `${prefix} ${issues.join("; ")}.`;
}

function computeProjectHealth(
  tasks: ActiveTaskRow[],
  deps: TaskDep[],
  totalIdleHours: number,
  activeSectionCount: number
): ProjectHealth {
  const total = tasks.length;
  const byStatus = countTasksByStatus(tasks);
  const completed = byStatus.done;
  const remaining = total - completed;
  const completionRate = total > 0 ? completed / total : 0;
  const stalledCount = byStatus.waiting + byStatus.blocked;
  const overdueCount = countOverdueTasks(tasks);
  const dependencyBlockedCount = countDependencyBlockedTasks(tasks, deps);
  const unsectionedTaskCount = tasks.filter((task) => !task.section_id).length;

  if (total === 0) {
    return {
      status: "healthy",
      score: 100,
      summary: "No tasks in this project yet.",
      factors: [],
      supportingMetrics: {
        overdueCount: 0,
        dependencyBlockedCount: 0,
        stalledCount: 0,
        totalIdleHours: 0,
        depCount: deps.length,
        completionRate: 0,
        activeSectionCount,
        unsectionedTaskCount: 0,
      },
    };
  }

  const stalledRate = remaining > 0 ? stalledCount / remaining : 0;
  const overdueRate = remaining > 0 ? overdueCount / remaining : 0;
  const depBlockedRate =
    remaining > 0 ? dependencyBlockedCount / remaining : 0;

  let score = 100;
  score -= Math.min(35, stalledRate * 100 * 0.35);
  score -= Math.min(30, overdueRate * 100 * 0.3);
  score -= Math.min(20, depBlockedRate * 100 * 0.2);
  if (completionRate < 0.25 && total >= 5) {
    score -= 15;
  }
  score = Math.max(0, Math.round(score));

  let status: HealthStatus = "healthy";
  if (score < 40) status = "critical";
  else if (score < 70) status = "at_risk";

  if (remaining > 0 && stalledRate >= 0.5 && status === "healthy") {
    status = "at_risk";
  }
  if (remaining > 0 && overdueRate >= 0.3) {
    status = "critical";
  }

  const factors: ProjectHealthFactor[] = [
    {
      key: "completion",
      label: "Completion rate",
      value: Math.round(completionRate * 100),
      unit: "percent",
      impact:
        completionRate >= 0.5
          ? "positive"
          : completionRate >= 0.25
            ? "neutral"
            : "negative",
    },
    {
      key: "stalled",
      label: "Stalled tasks (waiting or blocked)",
      value: stalledCount,
      unit: "count",
      impact:
        stalledCount === 0
          ? "positive"
          : stalledCount <= 2
            ? "neutral"
            : "negative",
    },
    {
      key: "overdue",
      label: "Overdue tasks",
      value: overdueCount,
      unit: "count",
      impact: overdueCount === 0 ? "positive" : "negative",
    },
    {
      key: "dependency_blocked",
      label: "Tasks blocked by incomplete dependencies",
      value: dependencyBlockedCount,
      unit: "count",
      impact: dependencyBlockedCount === 0 ? "positive" : "negative",
    },
    {
      key: "idle_time",
      label: "Total idle hours (waiting/blocked)",
      value: Math.round(totalIdleHours * 10) / 10,
      unit: "hours",
      impact: totalIdleHours < 8 ? "neutral" : "negative",
    },
  ];

  return {
    status,
    score,
    summary: buildHealthSummary(status, {
      completionRate,
      stalledCount,
      overdueCount,
      dependencyBlockedCount,
    }),
    factors,
    supportingMetrics: {
      overdueCount,
      dependencyBlockedCount,
      stalledCount,
      totalIdleHours: Math.round(totalIdleHours * 10) / 10,
      depCount: deps.length,
      completionRate: Math.round(completionRate * 100) / 100,
      activeSectionCount,
      unsectionedTaskCount,
    },
  };
}

function sectionProgressFromTasks(
  section: Pick<Section, "id" | "name" | "description" | "position">,
  tasks: Pick<ActiveTaskRow, "status">[]
): SectionProgressItem {
  const taskCount = tasks.length;
  const completedTaskCount = tasks.filter((task) => task.status === "done").length;
  const progressPercent =
    taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

  return {
    sectionId: section.id,
    name: section.name,
    description: section.description,
    position: section.position,
    taskCount,
    completedTaskCount,
    progressPercent,
  };
}

export async function getProjectTaskCounts(
  projectId: string,
  userId: string
): Promise<ProjectTaskCounts> {
  await requireProjectAccess(userId, projectId, "viewer");
  const tasks = await fetchActiveProjectTasks(projectId);
  return buildTaskCounts(projectId, tasks);
}

// Lighter overview for Home cards (no task history / workflow timeline).
export async function getProjectOverviewSummary(
  projectId: string,
  userId: string
): Promise<ProjectOverview> {
  await requireProjectAccess(userId, projectId, "viewer");

  const tasks = await fetchActiveProjectTasks(projectId);
  const taskIds = tasks.map((task) => task.id);

  const [sectionsResult, dependencies] = await Promise.all([
    supabase
      .from("section")
      .select("id")
      .eq("project_id", projectId)
      .eq("is_deleted", false),
    taskIds.length > 0
      ? getDependenciesForTaskIds(taskIds)
      : Promise.resolve([] as TaskDep[]),
  ]);

  if (sectionsResult.error) {
    throw new AppError(sectionsResult.error.message, 500);
  }

  const sectionCount = sectionsResult.data?.length ?? 0;

  return {
    projectId,
    tasks: buildTaskCounts(projectId, tasks),
    health: computeProjectHealth(tasks, dependencies, 0, sectionCount),
  };
}

export async function getHomeProjectOverviews(
  projectIds: string[],
  userId: string
): Promise<Record<string, ProjectOverview>> {
  const overviews: Record<string, ProjectOverview> = {};

  await Promise.all(
    projectIds.map(async (projectId) => {
      try {
        overviews[projectId] = await getProjectOverviewSummary(
          projectId,
          userId
        );
      } catch {
        // Skip projects the user cannot load, same as Home's per-project try/catch.
      }
    })
  );

  return overviews;
}

function buildOverviewFromSnapshot(
  projectId: string,
  snapshot: ProjectAnalyticsSnapshot
): ProjectOverview {
  const statusSegments = buildProjectStatusSegments(snapshot);
  const totalIdleHours = sumIdleHours(statusSegments);

  return {
    projectId,
    tasks: buildTaskCounts(projectId, snapshot.tasks),
    health: computeProjectHealth(
      snapshot.tasks,
      snapshot.dependencies,
      totalIdleHours,
      snapshot.sections.length
    ),
  };
}

function buildSectionProgressFromSnapshot(
  snapshot: ProjectAnalyticsSnapshot
): ProjectSectionProgress {
  const tasksBySection = new Map<string, ActiveTaskRow[]>();
  const unsectionedTasks: ActiveTaskRow[] = [];

  for (const task of snapshot.tasks) {
    const row: ActiveTaskRow = {
      id: task.id,
      status: task.status,
      section_id: task.section_id,
      due_date: task.due_date,
    };

    if (!task.section_id) {
      unsectionedTasks.push(row);
      continue;
    }

    const sectionTasks = tasksBySection.get(task.section_id) ?? [];
    sectionTasks.push(row);
    tasksBySection.set(task.section_id, sectionTasks);
  }

  const sectionProgress = snapshot.sections.map((section) =>
    sectionProgressFromTasks(section, tasksBySection.get(section.id) ?? [])
  );

  const unsectionedCompleted = unsectionedTasks.filter(
    (task) => task.status === "done"
  ).length;
  const unsectionedCount = unsectionedTasks.length;

  return {
    projectId: snapshot.projectId,
    sections: sectionProgress,
    unsectioned: {
      taskCount: unsectionedCount,
      completedTaskCount: unsectionedCompleted,
      progressPercent:
        unsectionedCount > 0
          ? Math.round((unsectionedCompleted / unsectionedCount) * 100)
          : 0,
    },
  };
}

export async function getProjectOverviewCore(
  projectId: string,
  userId: string
): Promise<{
  overview: ProjectOverview;
  sectionProgress: ProjectSectionProgress;
}> {
  const snapshot = await loadProjectAnalyticsSnapshot(
    projectId,
    userId,
    "overview"
  );

  return {
    overview: buildOverviewFromSnapshot(projectId, snapshot),
    sectionProgress: buildSectionProgressFromSnapshot(snapshot),
  };
}

export async function getProjectOverview(
  projectId: string,
  userId: string
): Promise<ProjectOverview> {
  const startedAt = performance.now();

  try {
    const snapshot = await loadProjectAnalyticsSnapshot(
      projectId,
      userId,
      "overview"
    );
    return buildOverviewFromSnapshot(projectId, snapshot);
  } finally {
    console.log(
      `[PERF] overview.total: ${(performance.now() - startedAt).toFixed(2)} ms`
    );
  }
}

export async function getProjectSectionProgress(
  projectId: string,
  userId: string
): Promise<ProjectSectionProgress> {
  await requireProjectAccess(userId, projectId, "viewer");

  const [sectionsResult, tasks] = await Promise.all([
    supabase
      .from("section")
      .select("id, name, description, position")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("position", { ascending: true }),
    fetchActiveProjectTasks(projectId),
  ]);

  if (sectionsResult.error) {
    throw new AppError(sectionsResult.error.message, 500);
  }

  const sections = (sectionsResult.data ?? []) as Section[];
  const tasksBySection = new Map<string, ActiveTaskRow[]>();
  const unsectionedTasks: ActiveTaskRow[] = [];

  for (const task of tasks) {
    if (!task.section_id) {
      unsectionedTasks.push(task);
      continue;
    }

    const sectionTasks = tasksBySection.get(task.section_id) ?? [];
    sectionTasks.push(task);
    tasksBySection.set(task.section_id, sectionTasks);
  }

  const sectionProgress = sections.map((section) =>
    sectionProgressFromTasks(section, tasksBySection.get(section.id) ?? [])
  );

  const unsectionedCompleted = unsectionedTasks.filter(
    (task) => task.status === "done"
  ).length;
  const unsectionedCount = unsectionedTasks.length;

  return {
    projectId,
    sections: sectionProgress,
    unsectioned: {
      taskCount: unsectionedCount,
      completedTaskCount: unsectionedCompleted,
      progressPercent:
        unsectionedCount > 0
          ? Math.round((unsectionedCompleted / unsectionedCount) * 100)
          : 0,
    },
  };
}


export async function getProjectWorkflowMetrics(projectId: string, userId: string) {
  const snapshot = await loadProjectAnalyticsSnapshot(
    projectId,
    userId
  );

  const segments = buildProjectStatusSegments(snapshot);
  const transitions = extractStatusChange(snapshot.history);
  const assigneeHandoffs = extractAssigneeHandoffs(
    snapshot.assigneeEvents
  );

  const waitingSegments = segments.filter((s) => s.status === "waiting");
  const blockedSegments = segments.filter((s) => s.status === "blocked");

  const idleByTask = new Map<string, number>();
  for (const seg of segments) {
    if (seg.status === "waiting" || seg.status === "blocked") {
      idleByTask.set(
        seg.taskId,
        (idleByTask.get(seg.taskId) ?? 0) + (seg.durationHours ?? 0)
      );
    }
  }

  const longestWaits = [...idleByTask.entries()]
    .map(([taskId, hours]) => ({ taskId, idleHours: hours }))
    .sort((a, b) => b.idleHours - a.idleHours)
    .slice(0, 10);

  return {
    projectId,
    depCount: snapshot.dependencies.length,
    totalStatusSegments: segments.length,
    waitingSegmentCount: waitingSegments.length,
    blockedSegmentCount: blockedSegments.length,
    totalIdleHours: sumIdleHours(segments),
    statusTransitions: transitions,
    assigneeHandoffs,
    longestWaits,
  };
}

export { getUserProgressMetrics as getUserFocusSignals };
