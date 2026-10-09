"use strict";
/**
 * historyService
 *
 * Central source for workflow history analysis.
 *
 * Responsibilities:
 * - Read task/project history
 * - Build status timeline segments
 * - Read workflow events
 * - Extract workflow metrics used by dependency analysis
 * - Provide reusable historical data for the ML pipeline
 *
 * Every AI/ML feature starts from this service.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskHistory = getTaskHistory;
exports.getProjectHistory = getProjectHistory;
exports.buildStatusTimeline = buildStatusTimeline;
exports.getTaskStatusDuration = getTaskStatusDuration;
exports.getProjectStatusDuration = getProjectStatusDuration;
exports.sumIdleHours = sumIdleHours;
exports.extractStatusChange = extractStatusChange;
exports.getProjectAssigneeEvents = getProjectAssigneeEvents;
exports.extractAssigneeHandoffs = extractAssigneeHandoffs;
exports.getUserProgressMetrics = getUserProgressMetrics;
exports.getTaskAssigneeEvents = getTaskAssigneeEvents;
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const workingTime_1 = require("../utils/workingTime");
const IDLE_STATUSES = ["waiting", "blocked"];
const TERMINAL_STATUSES = ["done"];
//read task history in db
async function getTaskHistory(taskId) {
    const { data, error } = await supabaseClient_1.supabase
        .from("task_history")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return (data ?? []);
}
//read project history in db
async function getProjectHistory(projectId) {
    const { data: tasks, error: taskError } = await supabaseClient_1.supabase
        .from("task")
        .select("id")
        .eq("project_id", projectId)
        .eq("is_deleted", false);
    if (taskError)
        throw new errors_1.AppError(taskError.message, 500);
    const taskIds = (tasks ?? []).map((t) => t.id);
    if (taskIds.length === 0)
        return [];
    const { data, error } = await supabaseClient_1.supabase
        .from("task_history")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true });
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return (data ?? []);
}
//Need status change for the ML pipeline
function extractStatus(snapshot) {
    return snapshot?.status ?? "to_do";
}
// Turn task_history rows into time-in-status segments. Core input for AI metrics
//timeline segment = One continuous period that a task spent in a particular status.
function buildStatusTimeline(taskId, history, currentTask) {
    const rows = history.filter((h) => h.task_id === taskId);
    if (rows.length === 0 && currentTask) {
        return [
            {
                taskId,
                status: currentTask.status,
                enteredAt: currentTask.created_at,
                exitedAt: null,
                durationHours: (0, workingTime_1.calculateWorkingHours)(currentTask.created_at, null),
            },
        ];
    }
    const timeline = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const status = extractStatus(row.task_snapshot);
        const enteredAt = row.created_at;
        const nextRow = rows[i + 1];
        const exitedAt = nextRow?.created_at ?? null;
        // Skip duplicate snapshots with the same status
        const prev = timeline[timeline.length - 1];
        if (prev && prev.status === status && prev.exitedAt === null) {
            prev.exitedAt = exitedAt;
            prev.durationHours = (0, workingTime_1.calculateWorkingHours)(prev.enteredAt, exitedAt);
            continue;
        }
        timeline.push({
            taskId,
            status,
            enteredAt,
            exitedAt,
            durationHours: (0, workingTime_1.calculateWorkingHours)(enteredAt, exitedAt),
        });
    }
    // Extend the final status segment
    // Active tasks continue until "now"
    // Deleted tasks end at deleted_at because no workflow exists after deletion
    const last = timeline[timeline.length - 1];
    if (last && last.exitedAt === null) {
        const endTime = currentTask?.is_deleted && currentTask.deleted_at
            ? currentTask.deleted_at
            : TERMINAL_STATUSES.includes(last.status)
                ? last.enteredAt
                : null;
        last.exitedAt = endTime;
        last.durationHours = (0, workingTime_1.calculateWorkingHours)(last.enteredAt, endTime);
    }
    return timeline;
}
//How long a task spent in each status
async function getTaskStatusDuration(taskId) {
    const history = await getTaskHistory(taskId);
    const { data: task, error } = await supabaseClient_1.supabase
        .from("task")
        .select("*")
        .eq("id", taskId)
        .maybeSingle();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return buildStatusTimeline(taskId, history, task);
}
//How much time spent in each status for every task in the project
async function getProjectStatusDuration(projectId) {
    const history = await getProjectHistory(projectId);
    const { data: tasks, error } = await supabaseClient_1.supabase
        .from("task")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_deleted", false);
    if (error)
        throw new errors_1.AppError(error.message, 500);
    const all = [];
    for (const task of tasks ?? []) {
        all.push(...buildStatusTimeline(task.id, history, task));
    }
    return all;
}
// Sums operational hours in waiting/blocked — used by waiting-time and delay features
function sumIdleHours(segments) {
    return segments
        .filter((s) => IDLE_STATUSES.includes(s.status))
        .reduce((sum, s) => sum + (s.durationHours ?? 0), 0);
}
// function hoursBetween(start: string, end: string | null): number {
//   const startMs = new Date(start).getTime();
//   const endMs = end ? new Date(end).getTime() : Date.now();
//   return Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
// }
function hoursBetween(start, end) {
    return (0, workingTime_1.calculateWorkingHours)(start, end ?? new Date().toISOString());
}
// Status change for handoff analysis (status changes from task_history). */
function extractStatusChange(history) {
    const change = [];
    const byTask = new Map();
    for (const row of history) {
        if (!row.task_id)
            continue;
        const list = byTask.get(row.task_id) ?? [];
        list.push(row);
        byTask.set(row.task_id, list);
    }
    for (const [taskId, rows] of byTask) {
        const sorted = [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        for (let i = 1; i < sorted.length; i++) {
            const prev = extractStatus(sorted[i - 1].task_snapshot);
            const next = extractStatus(sorted[i].task_snapshot);
            if (prev === next)
                continue;
            const changedAt = sorted[i].created_at;
            const durationHours = hoursBetween(sorted[i - 1].created_at, changedAt);
            change.push({
                taskId,
                fromStatus: prev,
                toStatus: next,
                changedAt,
                durationHours,
            });
        }
    }
    return change;
}
//Reads assignee_event table
async function getProjectAssigneeEvents(projectId) {
    const { data, error } = await supabaseClient_1.supabase
        .from("assignee_event")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return (data ?? []);
}
//Assignee add/remove events — used for handoff detection
// export function extractAssigneeHandoffs(events: AssigneeEvent[]): AssigneeHandoff[] {
//   const assigneeEvents = events.filter((e) =>
//     ["assignee_added", "assignee_removed"].includes(e.event_type)
//   );
//   const historyByTask = new Map<string, AssigneeEvent[]>();
//   for (const event of assigneeEvents) {
//     if (!event.task_id) continue;
//     const list = historyByTask.get(event.task_id) ?? [];
//     list.push(event);
//     historyByTask.set(event.task_id, list);
//   }
//   const handoffs: AssigneeHandoff[] = [];
//   for (const [taskId, rows] of historyByTask) {
//     const sorted = [...rows].sort(
//       (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
//     );
//     for (let i = 0; i < sorted.length; i++) {
//       const row = sorted[i];
//       const prev = sorted[i - 1];
//       const gapHours = prev
//         ? hoursBetween(prev.created_at, row.created_at)
//         : null;
//       handoffs.push({
//         taskId,
//         eventType: row.event_type as AssigneeHandoff["eventType"],
//         fromUserId: row.from_value,
//         toUserId: row.to_value,
//         changedAt: row.created_at,
//         gapHours: gapHours,
//       });
//     }
//   }
//   return handoffs;
// }
// Detect actual ownership gaps.
//
// A handoff gap exists only when:
//   1. the task becomes completely unassigned, and
//   2. a new assignee is subsequently added.
//
// Example:
//
//   A added
//   A removed       ← gap starts
//   B added         ← gap ends
//
// The gap is therefore measured from A's removal to B's addition.
//
// If another assignee is still present, no gap exists:
//
//   A added
//   B added
//   A removed
//
// The task is still assigned to B, so this is not a handoff gap.
function extractAssigneeHandoffs(events) {
    const assigneeEvents = events.filter((event) => event.event_type === "assignee_added" ||
        event.event_type === "assignee_removed");
    const historyByTask = new Map();
    for (const event of assigneeEvents) {
        if (!event.task_id || !event.created_at)
            continue;
        const list = historyByTask.get(event.task_id) ?? [];
        list.push(event);
        historyByTask.set(event.task_id, list);
    }
    const handoffs = [];
    for (const [taskId, rows] of historyByTask) {
        const sorted = [...rows].sort((a, b) => new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime());
        // Track the users currently assigned to the task.
        const activeAssignees = new Set();
        // When the task becomes completely unassigned, remember when
        // that ownership gap started.
        let unassignedSince = null;
        for (const event of sorted) {
            const userId = event.user_id;
            if (!userId)
                continue;
            if (event.event_type === "assignee_added") {
                // If the task was completely unassigned before this addition,
                // this addition closes a genuine handoff gap.
                if (activeAssignees.size === 0 && unassignedSince) {
                    const gapHours = hoursBetween(unassignedSince, event.created_at);
                    handoffs.push({
                        taskId,
                        eventType: "assignee_added",
                        fromUserId: null,
                        toUserId: userId,
                        changedAt: event.created_at,
                        gapHours,
                    });
                }
                activeAssignees.add(userId);
                // The task is now assigned again.
                unassignedSince = null;
                continue;
            }
            if (event.event_type === "assignee_removed") {
                activeAssignees.delete(userId);
                // Only start a handoff gap when the LAST assignee
                // has been removed.
                if (activeAssignees.size === 0) {
                    unassignedSince = event.created_at;
                }
            }
        }
    }
    return handoffs;
}
//How often a user moved tasks to in_progress — for context switching
async function getUserProgressMetrics(userId, projectId) {
    const history = await getProjectHistory(projectId);
    const switches = history.filter((row) => {
        const snap = row.task_snapshot;
        return (row.user_id === userId &&
            snap?.status === "in_progress" &&
            row.event_type === "updated");
    });
    const uniqueTaskSwitches = new Set(switches.map((s) => s.task_id).filter(Boolean));
    const { data: inProgressTasks, error: ipError } = await supabaseClient_1.supabase
        .from("task")
        .select("id, task_assignees!inner(user_id)")
        .eq("project_id", projectId)
        .eq("status", "in_progress")
        .eq("is_deleted", false)
        .eq("task_assignees.user_id", userId);
    if (ipError)
        throw new errors_1.AppError(ipError.message, 500);
    return {
        userId,
        concurrentInProgress: inProgressTasks?.length ?? 0,
        tasksStarted: uniqueTaskSwitches.size,
    };
}
async function getTaskAssigneeEvents(taskId) {
    const { data, error } = await supabaseClient_1.supabase
        .from("assignee_event")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return (data ?? []);
}
