"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskHistory = getTaskHistory;
exports.getProjectHistory = getProjectHistory;
exports.parseStatusDuration = parseStatusDuration;
exports.getTaskStatusDuration = getTaskStatusDuration;
exports.getProjectStatusDuration = getProjectStatusDuration;
exports.sumIdleHours = sumIdleHours;
exports.extractStatusChange = extractStatusChange;
exports.getProjectWorkflowEvents = getProjectWorkflowEvents;
exports.extractAssigneeHandoffs = extractAssigneeHandoffs;
exports.getUserProgressMetrics = getUserProgressMetrics;
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const IDLE_STATUSES = ["waiting", "blocked"];
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
function statusFromSnapshot(snapshot) {
    return snapshot?.status ?? "to_do";
}
/** Turn task_history rows into time-in-status segments. Core input for AI metrics. */
function parseStatusDuration(taskId, history, currentTask) {
    const rows = history.filter((h) => h.task_id === taskId);
    if (rows.length === 0 && currentTask) {
        return [
            {
                taskId,
                status: currentTask.status,
                enteredAt: currentTask.created_at,
                exitedAt: null,
                durationHours: hoursBetween(currentTask.created_at, null),
            },
        ];
    }
    const duration = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const status = statusFromSnapshot(row.task_snapshot);
        const enteredAt = row.created_at;
        const nextRow = rows[i + 1];
        const exitedAt = nextRow?.created_at ?? null;
        // Skip duplicate snapshots with the same status
        const prev = duration[duration.length - 1];
        if (prev && prev.status === status && prev.exitedAt === null) {
            prev.exitedAt = exitedAt;
            prev.durationHours = hoursBetween(prev.enteredAt, exitedAt);
            continue;
        }
        duration.push({
            taskId,
            status,
            enteredAt,
            exitedAt,
            durationHours: hoursBetween(enteredAt, exitedAt),
        });
    }
    // Extend the last segment to now if the task is still in that status
    const last = duration[duration.length - 1];
    if (last && last.exitedAt === null) {
        last.durationHours = hoursBetween(last.enteredAt, null);
    }
    return duration;
}
async function getTaskStatusDuration(taskId) {
    const history = await getTaskHistory(taskId);
    const { data: task, error } = await supabaseClient_1.supabase
        .from("task")
        .select("*")
        .eq("id", taskId)
        .maybeSingle();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return parseStatusDuration(taskId, history, task);
}
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
        all.push(...parseStatusDuration(task.id, history, task));
    }
    return all;
}
// Sums hours in waiting/blocked — used by waiting-time and delay features
function sumIdleHours(segments) {
    return segments
        .filter((s) => IDLE_STATUSES.includes(s.status))
        .reduce((sum, s) => sum + (s.durationHours ?? 0), 0);
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
            const prev = statusFromSnapshot(sorted[i - 1].task_snapshot);
            const next = statusFromSnapshot(sorted[i].task_snapshot);
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
//Reads workflow_event table - for project workflow metrics
async function getProjectWorkflowEvents(projectId) {
    const { data, error } = await supabaseClient_1.supabase
        .from("workflow_event")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return (data ?? []);
}
//Assignee add/remove events from workflow_event table — used for handoff detection
function extractAssigneeHandoffs(events) {
    const assigneeEvents = events.filter((e) => ["assignee_added", "assignee_removed"].includes(e.event_type));
    const byTask = new Map();
    for (const event of assigneeEvents) {
        if (!event.task_id)
            continue;
        const list = byTask.get(event.task_id) ?? [];
        list.push(event);
        byTask.set(event.task_id, list);
    }
    const handoffs = [];
    for (const [taskId, rows] of byTask) {
        const sorted = [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        for (let i = 0; i < sorted.length; i++) {
            const row = sorted[i];
            const prev = sorted[i - 1];
            const durationSincePreviousHours = prev
                ? hoursBetween(prev.created_at, row.created_at)
                : null;
            handoffs.push({
                taskId,
                eventType: row.event_type,
                fromUserId: row.from_value,
                toUserId: row.to_value,
                changedAt: row.created_at,
                durationSincePreviousHours,
            });
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
        switchesToInProgress: uniqueTaskSwitches.size,
    };
}
function hoursBetween(start, end) {
    const startMs = new Date(start).getTime();
    const endMs = end ? new Date(end).getTime() : Date.now();
    return Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
}
