import { performance } from "node:perf_hooks";
import { supabase } from "../lib/supabaseClient";
import { AppError } from "../lib/errors";
import {
  AssigneeEvent,
  Section,
  TaskDep,
  TaskHistory,
  StatusType,
} from "../types/database";
import { requireProjectAccess } from "./accessService";
import { getDependenciesForTaskIds } from "./dependencyService";

export interface ProjectAnalyticsTask {
  id: string;
  status: StatusType;
  section_id: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

export type ProjectAnalyticsSection = Pick<
  Section,
  "id" | "name" | "description" | "position"
>;

export interface ProjectAnalyticsSnapshot {
  projectId: string;
  tasks: ProjectAnalyticsTask[];
  tasksById: Map<string, ProjectAnalyticsTask>;
  sections: ProjectAnalyticsSection[];
  dependencies: TaskDep[];
  dependenciesByTaskId: Map<string, TaskDep[]>;
  history: TaskHistory[];
  historyByTaskId: Map<string, TaskHistory[]>;
  assigneeEvents: AssigneeEvent[];
  assigneeEventsByTaskId: Map<string, AssigneeEvent[]>;
  taskAssigneeIdsByTaskId: Map<string, string[]>;
}

// Group task-related rows by task ID.
function groupByTaskId<T extends { task_id: string | null }>(
  rows: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    if (!row.task_id) continue;

    const taskRows = grouped.get(row.task_id) ?? [];
    taskRows.push(row);
    grouped.set(row.task_id, taskRows);
  }

  return grouped;
}

// Group dependencies under both related task IDs.
function groupDependenciesByTaskId(
  dependencies: TaskDep[]
): Map<string, TaskDep[]> {
  const grouped = new Map<string, TaskDep[]>();

  for (const dependency of dependencies) {
    const taskIds = new Set([
      dependency.blocking_task_id,
      dependency.blocked_task_id,
    ]);

    for (const taskId of taskIds) {
      if (!taskId) continue;

      const taskDependencies = grouped.get(taskId) ?? [];
      taskDependencies.push(dependency);
      grouped.set(taskId, taskDependencies);
    }
  }

  return grouped;
}

// Group current assignee IDs by task.
function groupTaskAssignees(
  rows: Array<{ task_id: string; user_id: string }>
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const row of rows) {
    const assigneeIds = grouped.get(row.task_id) ?? [];
    assigneeIds.push(row.user_id);
    grouped.set(row.task_id, assigneeIds);
  }

  return grouped;
}

// TEMP PERF: Time one analytics query while keeping parallel execution.
function timePerformanceOperation<T>(
  label: string | undefined,
  operation: () => PromiseLike<T>
): Promise<T> {
  if (!label) return Promise.resolve(operation());

  const startedAt = performance.now();
  return Promise.resolve(operation()).finally(() => {
    console.log(
      `[PERF] ${label}: ${(performance.now() - startedAt).toFixed(2)} ms`
    );
  });
}

// Load the raw project data used by project analytics.
export async function loadProjectAnalyticsSnapshot(
  projectId: string,
  userId: string,
  performanceLabel?: string
): Promise<ProjectAnalyticsSnapshot> {
  await timePerformanceOperation(
    performanceLabel ? `${performanceLabel}.requireProjectAccess` : undefined,
    () => requireProjectAccess(userId, projectId, "viewer")
  );

  const [tasksResult, sectionsResult] = await Promise.all([
    timePerformanceOperation(
      performanceLabel ? `${performanceLabel}.taskLoading` : undefined,
      () =>
        supabase
          .from("task")
          .select(
            "id, status, section_id, start_date, due_date, created_at, is_deleted, deleted_at"
          )
          .eq("project_id", projectId)
          .eq("is_deleted", false)
    ),
    timePerformanceOperation(
      performanceLabel ? `${performanceLabel}.sectionLoading` : undefined,
      () =>
        supabase
          .from("section")
          .select("id, name, description, position")
          .eq("project_id", projectId)
          .eq("is_deleted", false)
          .order("position", { ascending: true })
    ),
  ]);

  if (tasksResult.error) {
    throw new AppError(tasksResult.error.message, 500);
  }

  if (sectionsResult.error) {
    throw new AppError(sectionsResult.error.message, 500);
  }

  const tasks = (tasksResult.data ?? []) as ProjectAnalyticsTask[];
  const sections = (sectionsResult.data ?? []) as ProjectAnalyticsSection[];
  const taskIds = tasks.map((task) => task.id);

  if (taskIds.length === 0) {
    return {
      projectId,
      tasks,
      tasksById: new Map(),
      sections,
      dependencies: [],
      dependenciesByTaskId: new Map(),
      history: [],
      historyByTaskId: new Map(),
      assigneeEvents: [],
      assigneeEventsByTaskId: new Map(),
      taskAssigneeIdsByTaskId: new Map(),
    };
  }

  const [historyResult, assigneeEventsResult, taskAssigneesResult, dependencies] =
    await Promise.all([
      timePerformanceOperation(
        performanceLabel ? `${performanceLabel}.taskHistoryLoading` : undefined,
        () =>
          supabase
            .from("task_history")
            .select(
              "id, task_id, task_snapshot, user_id, event_type, created_at, actor_id"
            )
            .in("task_id", taskIds)
            .order("created_at", { ascending: true })
      ),
      timePerformanceOperation(
        performanceLabel ? `${performanceLabel}.assigneeEventLoading` : undefined,
        () =>
          supabase
            .from("assignee_event")
            .select(
              "id, task_id, project_id, user_id, event_type, from_value, to_value, created_at, actor_id"
            )
            .eq("project_id", projectId)
            .order("created_at", { ascending: true })
      ),
      timePerformanceOperation(
        performanceLabel ? `${performanceLabel}.assigneeLoading` : undefined,
        () =>
          supabase
            .from("task_assignees")
            .select("task_id, user_id")
            .in("task_id", taskIds)
      ),
      timePerformanceOperation(
        performanceLabel ? `${performanceLabel}.dependencyLoading` : undefined,
        () => getDependenciesForTaskIds(taskIds)
      ),
    ]);

  if (historyResult.error) {
    throw new AppError(historyResult.error.message, 500);
  }

  if (assigneeEventsResult.error) {
    throw new AppError(assigneeEventsResult.error.message, 500);
  }

  if (taskAssigneesResult.error) {
    throw new AppError(taskAssigneesResult.error.message, 500);
  }

  const history = (historyResult.data ?? []) as TaskHistory[];
  const assigneeEvents = (assigneeEventsResult.data ?? []) as AssigneeEvent[];
  const taskAssignees = (taskAssigneesResult.data ?? []) as Array<{
    task_id: string;
    user_id: string;
  }>;

  return {
    projectId,
    tasks,
    tasksById: new Map(tasks.map((task) => [task.id, task])),
    sections,
    dependencies,
    dependenciesByTaskId: groupDependenciesByTaskId(dependencies),
    history,
    historyByTaskId: groupByTaskId(history),
    assigneeEvents,
    assigneeEventsByTaskId: groupByTaskId(assigneeEvents),
    taskAssigneeIdsByTaskId: groupTaskAssignees(taskAssignees),
  };
}
