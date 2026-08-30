/**
  metricsExtractorService
 
  Feature engineering layer for the ML pipeline.
 
  Converts workflow history into numerical feature vectors.
  Does not perform anomaly detection, statistics, database writes, or narrative generation.
 */

import {
  AssigneeHandoff,
  FocusMetrics,
  HandoffMetrics,
  ProjectMetrics,
  StatusTimeline,
  StatusType,
  TaskHistory,
  WaitingMetrics,
  AssigneeEvent,
} from "../types/database";
import {
  extractAssigneeHandoffs,
  extractStatusChange,
  getProjectHistory,
  getProjectStatusDuration,
  getProjectAssigneeEvents,
  getUserProgressMetrics,
  sumIdleHours,
} from "./historyService";

const IDLE_STATUSES: StatusType[] = ["waiting", "blocked"];

type StatusChange = ReturnType<typeof extractStatusChange>[number];

function groupTimelineByTask(
  timelines: StatusTimeline[]
): Map<string, StatusTimeline[]> {
  const byTask = new Map<string, StatusTimeline[]>();
  for (const segment of timelines) {
    const list = byTask.get(segment.taskId) ?? [];
    list.push(segment);
    byTask.set(segment.taskId, list);
  }
  return byTask;
}

// function collectProjectUserIds(
//   history: TaskHistory[],
//   events: WorkflowEvent[]
// ): string[] {
//   const userIds = new Set<string>();

//   for (const row of history) {
//     if (row.user_id) userIds.add(row.user_id);
//   }

//   for (const event of events) {
//     if (event.user_id) userIds.add(event.user_id);
//     if (event.from_value) userIds.add(event.from_value);
//     if (event.to_value) userIds.add(event.to_value);
//   }

//   return [...userIds];
// }

function collectProjectUserIds(
  history: TaskHistory[],
  events: AssigneeEvent[]
): string[] {
  const userIds = new Set<string>();

  for (const row of history) {
    if (row.user_id) {
      userIds.add(row.user_id);
    }
  }

  for (const event of events) {
    if (event.user_id) {
      userIds.add(event.user_id);
    }

    if (event.event_type === "assignee_changed") {
      if (event.from_value) userIds.add(event.from_value);
      if (event.to_value) userIds.add(event.to_value);
    }
  }

  return [...userIds];
}

//Derive waiting/blocked features for one task from its status timeline
export function extractWaitingMetrics(
  taskId: string,
  timeline: StatusTimeline[]
): WaitingMetrics {
  const segments = timeline.filter((s) => s.taskId === taskId);
  const idleSegments = segments.filter((s) => IDLE_STATUSES.includes(s.status));
  const last = segments[segments.length - 1];

  const currentIdleHours =
    last && IDLE_STATUSES.includes(last.status) ? last.durationHours ?? 0 : 0;

  return {
    taskId,
    idleHours: sumIdleHours(segments),
    idleSegmentCount: idleSegments.length,
    currentIdleHours,
  };
}

// //Derive assignee and status-transition handoff features for one task
// export function extractHandoffMetrics(
//   taskId: string,
//   handoffs: AssigneeHandoff[],
//   statusChanges: StatusChange[]
// ): HandoffMetrics {
//   const taskHandoffs = handoffs.filter((h) => h.taskId === taskId);
//   const gaps = taskHandoffs
//     .map((h) => h.gapHours)
//     .filter((gap): gap is number => gap !== null);

//   const transitionDelays = statusChanges
//     .filter((change) => change.taskId === taskId)
//     .map((change) => change.durationHours);

//   const averageGapHours =
//     gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0;

//   const statusTransitionDelayHours =
//     transitionDelays.length > 0
//       ? transitionDelays.reduce((sum, delay) => sum + delay, 0) /
//         transitionDelays.length
//       : 0;

//   return {
//     taskId,
//     assigneeChangeCount: taskHandoffs.length,
//     averageGapHours,
//     maxGapHours: gaps.length > 0 ? Math.max(...gaps) : 0,
//     statusTransitionDelayHours,
//   };
// }


// Derive ownership-transition features for one task.
//
// A handoff is counted only when the task becomes completely
// unassigned and later receives a new assignee.
export function extractHandoffMetrics(
  taskId: string,
  handoffs: AssigneeHandoff[],
  statusChanges: StatusChange[]
): HandoffMetrics {
  const taskHandoffs = handoffs.filter((handoff) => handoff.taskId === taskId);

  const gaps = taskHandoffs
    .map((handoff) => handoff.gapHours)
    .filter((gap): gap is number => gap !== null && Number.isFinite(gap) && gap >= 0);

  const transitionDelays = statusChanges
    .filter((change) => change.taskId === taskId)
    .map((change) => change.durationHours)
    .filter((delay) => Number.isFinite(delay) && delay >= 0);

  const averageGapHours =
    gaps.length > 0
      ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
      : 0;

  const statusTransitionDelayHours =
    transitionDelays.length > 0
      ? transitionDelays.reduce((sum, delay) => sum + delay, 0) /
        transitionDelays.length
      : 0;

  return {
    taskId,
    handoffCount: taskHandoffs.length,
    averageGapHours,
    maxGapHours: gaps.length > 0 ? Math.max(...gaps) : 0,
    statusTransitionDelayHours,
  };
}


/** Derive context-switching features for one user in a project. */
export async function extractFocusMetrics(
  userId: string,
  projectId: string
): Promise<FocusMetrics> {
  const progress = await getUserProgressMetrics(userId, projectId);

  return {
    userId: progress.userId,
    concurrentInProgress: progress.concurrentInProgress,
    tasksStarted: progress.tasksStarted,
  };
}

/**
 Build the complete feature vector for a project.
 Direct input to anomalyDetectionService.
 */
export async function extractProjectMetrics(
  projectId: string
): Promise<ProjectMetrics> {
  const [timelines, history, events] = await Promise.all([
    getProjectStatusDuration(projectId),
    getProjectHistory(projectId),
    getProjectAssigneeEvents(projectId),
  ]);

  const handoffs = extractAssigneeHandoffs(events);
  const statusChanges = extractStatusChange(history);
  const timelineByTask = groupTimelineByTask(timelines);

  const taskIds = new Set<string>(timelineByTask.keys());
  for (const handoff of handoffs) {
    taskIds.add(handoff.taskId);
  }

  const sortedTaskIds = [...taskIds].sort();

  const waiting = sortedTaskIds.map((taskId) =>
    extractWaitingMetrics(taskId, timelineByTask.get(taskId) ?? [])
  );

  const handoffMetrics = sortedTaskIds.map((taskId) =>
    extractHandoffMetrics(taskId, handoffs, statusChanges)
  );

  const userIds = collectProjectUserIds(history, events);
  const focus = await Promise.all(
    userIds.map((userId) => extractFocusMetrics(userId, projectId))
  );

  return {
    waiting,
    handoffs: handoffMetrics,
    focus,
  };
}
