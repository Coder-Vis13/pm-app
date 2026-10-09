"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTask = createTask;
exports.createSubtask = createSubtask;
exports.listTasks = listTasks;
exports.listSectionTasks = listSectionTasks;
exports.getSectionTaskSummary = getSectionTaskSummary;
exports.getTaskById = getTaskById;
exports.getSubtasks = getSubtasks;
exports.getTaskDetailBundle = getTaskDetailBundle;
exports.updateTask = updateTask;
exports.updateTaskStatus = updateTaskStatus;
exports.deleteTask = deleteTask;
exports.listMyTasks = listMyTasks;
exports.getDelayDays = getDelayDays;
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const accessService_1 = require("./accessService");
const sectionService_1 = require("./sectionService");
const auditService_1 = require("./auditService");
const assigneeService_1 = require("./assigneeService");
const dependencyService_1 = require("./dependencyService");
async function getDependenciesForTasks(taskIds) {
    if (taskIds.length === 0) {
        return [];
    }
    const idList = taskIds.join(",");
    const { data, error } = await supabaseClient_1.supabase
        .from("task_dependencies")
        .select("blocking_task_id, blocked_task_id")
        .or(`blocking_task_id.in.(${idList}),blocked_task_id.in.(${idList})`);
    if (error) {
        throw new errors_1.AppError(error.message, 500);
    }
    return data ?? [];
}
async function checkParentTask(parentTaskId, projectId, sectionId) {
    const { data: parent, error } = await supabaseClient_1.supabase
        .from("task")
        .select("id, project_id, section_id, parent_task_id")
        .eq("id", parentTaskId)
        .eq("is_deleted", false)
        .maybeSingle();
    if (error) {
        throw new errors_1.AppError(error.message, 500);
    }
    if (!parent) {
        throw new errors_1.AppError("Parent task not found", 404);
    }
    if (parent.project_id !== projectId) {
        throw new errors_1.AppError("Parent task must belong to the same project", 400);
    }
    if (parent.section_id !== sectionId) {
        throw new errors_1.AppError("Subtask must belong to the same section as its parent task", 400);
    }
    if (parent.parent_task_id) {
        throw new errors_1.AppError("Subtasks cannot have their own subtasks", 400);
    }
}
//Editor check, section validation, assign position, insert with status: "to_do", seal audit
async function createTask(input) {
    const { title, projectId, sectionId, userId, description, priority = "medium", status = "to_do", startDate, dueDate, parentTaskId, } = input;
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "editor");
    await (0, sectionService_1.checkSectionInProject)(sectionId, projectId);
    if (parentTaskId) {
        await checkParentTask(parentTaskId, projectId, sectionId);
    }
    const { data: existing, error: posError } = await supabaseClient_1.supabase
        .from("task")
        .select("position")
        .eq("section_id", sectionId)
        .eq("is_deleted", false)
        .order("position", { ascending: false })
        .limit(1);
    if (posError)
        throw new errors_1.AppError(posError.message, 500);
    const nextPosition = existing?.length ? (existing[0].position ?? 0) + 1 : 1;
    const { data, error } = await supabaseClient_1.supabase
        .from("task")
        .insert({
        title,
        description: description ?? null,
        project_id: projectId,
        section_id: sectionId,
        parent_task_id: parentTaskId ?? null,
        priority,
        position: nextPosition,
        created_by: userId,
        updated_by: userId,
        start_date: startDate ?? null,
        due_date: dueDate ?? null,
        status,
    })
        .select()
        .single();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    await (0, auditService_1.taskHistoryEntry)(data.id);
    return data;
}
async function createSubtask(parentTaskId, userId, input) {
    const parent = await (0, accessService_1.validateTaskAccess)(userId, parentTaskId);
    if (!parent.project_id || !parent.section_id) {
        throw new errors_1.AppError("Parent task is missing project or section information", 400);
    }
    const { data: parentAssignees, error: assigneeError } = await supabaseClient_1.supabase
        .from("task_assignees")
        .select("user_id")
        .eq("task_id", parentTaskId);
    if (assigneeError) {
        throw new errors_1.AppError(assigneeError.message, 500);
    }
    const subtask = await createTask({
        ...input,
        projectId: parent.project_id,
        sectionId: parent.section_id,
        userId,
        parentTaskId,
    });
    if (parentAssignees?.length) {
        const { error } = await supabaseClient_1.supabase
            .from("task_assignees")
            .insert({
            task_id: subtask.id,
            user_id: parentAssignees[0].user_id,
        });
        if (error) {
            throw new errors_1.AppError(error.message, 500);
        }
    }
    return subtask;
}
//get tasks with access checks
async function listTasks(projectId, userId) {
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "viewer");
    const { data, error } = await supabaseClient_1.supabase
        .from("task")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_deleted", false)
        .order("position", { ascending: true });
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data ?? [];
}
async function listSectionTasks(projectId, sectionId, userId, status) {
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "viewer");
    await (0, sectionService_1.checkSectionInProject)(sectionId, projectId);
    let query = supabaseClient_1.supabase
        .from("task")
        .select("*")
        .eq("project_id", projectId)
        .eq("section_id", sectionId)
        .eq("is_deleted", false)
        .is("parent_task_id", null)
        .order("position", { ascending: true });
    if (status !== undefined) {
        query = query.eq("status", status);
    }
    const { data: tasks, error } = await query;
    if (error)
        throw new errors_1.AppError(error.message, 500);
    if (!tasks || tasks.length === 0) {
        return [];
    }
    const taskIds = tasks.map((task) => task.id);
    const { data: assignees, error: assigneeError } = await supabaseClient_1.supabase
        .from("task_assignees")
        .select("id, task_id, user_id, app_user(id, name, email, job_role_id)")
        .in("task_id", taskIds);
    if (assigneeError) {
        throw new errors_1.AppError(assigneeError.message, 500);
    }
    const { data: subtasks, error: subtaskError } = await supabaseClient_1.supabase
        .from("task")
        .select("id, parent_task_id")
        .in("parent_task_id", taskIds)
        .eq("is_deleted", false);
    if (subtaskError) {
        throw new errors_1.AppError(subtaskError.message, 500);
    }
    //const deps = await getProjectDeps(projectId);
    const deps = await getDependenciesForTasks(taskIds);
    const assigneesByTask = new Map();
    for (const assignee of assignees ?? []) {
        if (!assignee.task_id)
            continue;
        const list = assigneesByTask.get(assignee.task_id) ?? [];
        list.push(assignee);
        assigneesByTask.set(assignee.task_id, list);
    }
    const subtaskCountByTask = new Map();
    for (const subtask of subtasks ?? []) {
        if (!subtask.parent_task_id)
            continue;
        subtaskCountByTask.set(subtask.parent_task_id, (subtaskCountByTask.get(subtask.parent_task_id) ?? 0) + 1);
    }
    const dependencyCountByTask = new Map();
    for (const dep of deps) {
        if (dep.blocking_task_id) {
            dependencyCountByTask.set(dep.blocking_task_id, (dependencyCountByTask.get(dep.blocking_task_id) ?? 0) + 1);
        }
        if (dep.blocked_task_id) {
            dependencyCountByTask.set(dep.blocked_task_id, (dependencyCountByTask.get(dep.blocked_task_id) ?? 0) + 1);
        }
    }
    return tasks.map((task) => ({
        ...task,
        assignees: (assigneesByTask.get(task.id) ??
            []),
        dependencyCount: dependencyCountByTask.get(task.id) ?? 0,
        subtaskCount: subtaskCountByTask.get(task.id) ?? 0,
    }));
}
async function getSectionTaskSummary(projectId, sectionId, userId) {
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "viewer");
    await (0, sectionService_1.checkSectionInProject)(sectionId, projectId);
    const { data, error } = await supabaseClient_1.supabase
        .from("task")
        .select("status")
        .eq("project_id", projectId)
        .eq("section_id", sectionId)
        .eq("is_deleted", false);
    if (error)
        throw new errors_1.AppError(error.message, 500);
    const byStatus = {
        to_do: 0,
        in_progress: 0,
        waiting: 0,
        blocked: 0,
        done: 0,
    };
    for (const task of data ?? []) {
        byStatus[task.status]++;
    }
    const total = data?.length ?? 0;
    const completed = byStatus.done;
    return {
        sectionId,
        total,
        completed,
        remaining: total - completed,
        byStatus,
        progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
}
//get single task with access checks
async function getTaskById(taskId, userId) {
    return (0, accessService_1.validateTaskAccess)(userId, taskId);
}
async function listSubtasksForParent(parentTask) {
    const { data: tasks, error } = await supabaseClient_1.supabase
        .from("task")
        .select("*")
        .eq("parent_task_id", parentTask.id)
        .eq("project_id", parentTask.project_id)
        .eq("is_deleted", false)
        .order("position", { ascending: true });
    if (error) {
        throw new errors_1.AppError(error.message, 500);
    }
    if (!tasks || tasks.length === 0) {
        return [];
    }
    const taskIds = tasks.map((task) => task.id);
    const { data: assignees, error: assigneeError } = await supabaseClient_1.supabase
        .from("task_assignees")
        .select("id, task_id, user_id, app_user(id, name, email, job_role_id)")
        .in("task_id", taskIds);
    if (assigneeError) {
        throw new errors_1.AppError(assigneeError.message, 500);
    }
    const deps = await getDependenciesForTasks(taskIds);
    const assigneesByTask = new Map();
    for (const assignee of assignees ?? []) {
        if (!assignee.task_id)
            continue;
        const list = assigneesByTask.get(assignee.task_id) ?? [];
        list.push(assignee);
        assigneesByTask.set(assignee.task_id, list);
    }
    const dependencyCountByTask = new Map();
    for (const dep of deps) {
        if (dep.blocking_task_id) {
            dependencyCountByTask.set(dep.blocking_task_id, (dependencyCountByTask.get(dep.blocking_task_id) ?? 0) + 1);
        }
        if (dep.blocked_task_id) {
            dependencyCountByTask.set(dep.blocked_task_id, (dependencyCountByTask.get(dep.blocked_task_id) ?? 0) + 1);
        }
    }
    return tasks.map((task) => ({
        ...task,
        assignees: (assigneesByTask.get(task.id) ??
            []),
        dependencyCount: dependencyCountByTask.get(task.id) ?? 0,
        subtaskCount: 0,
    }));
}
async function getSubtasks(taskId, userId) {
    const parentTask = await (0, accessService_1.validateTaskAccess)(userId, taskId);
    return listSubtasksForParent(parentTask);
}
async function getTaskDetailBundle(taskId, userId) {
    const task = await (0, accessService_1.validateTaskAccess)(userId, taskId);
    const [subtasks, assignees, dependencyDetails] = await Promise.all([
        listSubtasksForParent(task),
        (0, assigneeService_1.listAssigneesForTask)(taskId),
        (0, dependencyService_1.listTaskDependenciesForTask)(taskId, task),
    ]);
    return {
        task,
        subtasks,
        assignees,
        dependencyDetails,
    };
}
// Update task fields using optimistic concurrency control.
// The update only succeeds if the task has not changed since the client last read it.
async function updateTask(taskId, userId, updates) {
    const task = await (0, accessService_1.validateTaskAccess)(userId, taskId);
    await (0, accessService_1.requireProjectAccess)(userId, task.project_id, "editor");
    if (updates.sectionId) {
        await (0, sectionService_1.checkSectionInProject)(updates.sectionId, task.project_id);
    }
    const payload = {
        updated_at: new Date().toISOString(),
        updated_by: userId,
    };
    if (updates.title !== undefined) {
        payload.title = updates.title;
    }
    if (updates.description !== undefined) {
        payload.description = updates.description;
    }
    if (updates.priority !== undefined) {
        payload.priority = updates.priority;
    }
    if (updates.startDate !== undefined) {
        payload.start_date = updates.startDate;
    }
    if (updates.dueDate !== undefined) {
        payload.due_date = updates.dueDate;
    }
    if (updates.sectionId !== undefined) {
        payload.section_id = updates.sectionId;
    }
    if (updates.delayCauseId !== undefined) {
        payload.delay_cause_id = updates.delayCauseId;
    }
    // Only update if the task is still at the version the client read.
    const { data, error } = await supabaseClient_1.supabase
        .from("task")
        .update(payload)
        .eq("id", taskId)
        .eq("updated_at", updates.expectedUpdatedAt)
        .select()
        .maybeSingle();
    if (error) {
        throw new errors_1.AppError(error.message, 500);
    }
    // No row means somebody changed the task after the client read it.
    if (!data) {
        throw new errors_1.AppError("Task was changed by another user. Refresh the task and try again.", 409);
    }
    await (0, auditService_1.taskHistoryEntry)(taskId);
    return data;
}
// Update task status using optimistic concurrency control.
// Prevents an older client from overwriting a newer status change.
async function updateTaskStatus(taskId, userId, status, expectedUpdatedAt) {
    const task = await (0, accessService_1.validateTaskAccess)(userId, taskId);
    await (0, accessService_1.requireProjectAccess)(userId, task.project_id, "editor");
    const { data, error } = await supabaseClient_1.supabase
        .from("task")
        .update({
        status,
        updated_at: new Date().toISOString(),
        updated_by: userId,
    })
        .eq("id", taskId)
        .eq("updated_at", expectedUpdatedAt)
        .select()
        .maybeSingle();
    if (error) {
        throw new errors_1.AppError(error.message, 500);
    }
    if (!data) {
        throw new errors_1.AppError("Task was changed by another user. Refresh the task and try again.", 409);
    }
    try {
        await (0, auditService_1.taskHistoryEntry)(taskId);
    }
    catch (error) {
        console.error("STATUS UPDATE - history entry failed:", error);
        throw error;
    }
    return data;
}
async function deleteTask(taskId, userId, expectedUpdatedAt) {
    const task = await (0, accessService_1.validateTaskAccess)(userId, taskId);
    await (0, accessService_1.requireProjectAccess)(userId, task.project_id, "editor");
    const now = new Date().toISOString();
    const { data, error } = await supabaseClient_1.supabase
        .from("task")
        .update({
        is_deleted: true,
        deleted_at: now,
        updated_at: now,
        updated_by: userId,
    })
        .eq("id", taskId)
        .eq("updated_at", expectedUpdatedAt)
        .select()
        .maybeSingle();
    if (error) {
        console.error("DELETE TASK - Supabase update failed:", error);
        throw new errors_1.AppError(error.message, 500);
    }
    if (!data) {
        throw new errors_1.AppError("Task was changed by another user. Refresh the task before deleting it.", 409);
    }
    try {
        await (0, auditService_1.taskHistoryEntry)(taskId);
    }
    catch (error) {
        console.error("DELETE TASK - history entry failed:", error);
        throw new errors_1.AppError("Task was deleted, but the history entry could not be recorded.", 500);
    }
}
async function listMyTasks(userId) {
    const { data: assignments, error: assignmentError } = await supabaseClient_1.supabase
        .from("task_assignees")
        .select("task_id")
        .eq("user_id", userId);
    if (assignmentError) {
        throw new errors_1.AppError(assignmentError.message, 500);
    }
    const taskIds = [
        ...new Set((assignments ?? [])
            .map((assignment) => assignment.task_id)
            .filter((taskId) => Boolean(taskId))),
    ];
    if (taskIds.length === 0) {
        return [];
    }
    const { data: tasks, error: taskError } = await supabaseClient_1.supabase
        .from("task")
        .select("*")
        .in("id", taskIds)
        .eq("is_deleted", false)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("position", { ascending: true });
    if (taskError) {
        throw new errors_1.AppError(taskError.message, 500);
    }
    if (!tasks || tasks.length === 0) {
        return [];
    }
    const projectIds = [
        ...new Set(tasks
            .map((task) => task.project_id)
            .filter((projectId) => Boolean(projectId))),
    ];
    const sectionIds = [
        ...new Set(tasks
            .map((task) => task.section_id)
            .filter((sectionId) => Boolean(sectionId))),
    ];
    const [assigneesResult, subtasksResult, projectsResult, sectionsResult,] = await Promise.all([
        supabaseClient_1.supabase
            .from("task_assignees")
            .select("id, task_id, user_id, app_user(id, name, email, job_role_id)")
            .in("task_id", taskIds),
        supabaseClient_1.supabase
            .from("task")
            .select("id, parent_task_id")
            .in("parent_task_id", taskIds)
            .eq("is_deleted", false),
        supabaseClient_1.supabase
            .from("project")
            .select("id, name")
            .in("id", projectIds)
            .eq("is_deleted", false),
        supabaseClient_1.supabase
            .from("section")
            .select("id, name")
            .in("id", sectionIds)
            .eq("is_deleted", false),
    ]);
    if (assigneesResult.error) {
        throw new errors_1.AppError(assigneesResult.error.message, 500);
    }
    if (subtasksResult.error) {
        throw new errors_1.AppError(subtasksResult.error.message, 500);
    }
    if (projectsResult.error) {
        throw new errors_1.AppError(projectsResult.error.message, 500);
    }
    if (sectionsResult.error) {
        throw new errors_1.AppError(sectionsResult.error.message, 500);
    }
    // const dependencyResults = await Promise.all(
    //   projectIds.map((projectId) => getProjectDeps(projectId))
    // );
    // const dependencies = dependencyResults.flat();
    const dependencies = await getDependenciesForTasks(taskIds);
    const assigneesByTask = new Map();
    for (const assignee of assigneesResult.data ?? []) {
        if (!assignee.task_id)
            continue;
        const taskAssignees = assigneesByTask.get(assignee.task_id) ?? [];
        taskAssignees.push(assignee);
        assigneesByTask.set(assignee.task_id, taskAssignees);
    }
    const subtaskCountByTask = new Map();
    for (const subtask of subtasksResult.data ?? []) {
        if (!subtask.parent_task_id)
            continue;
        subtaskCountByTask.set(subtask.parent_task_id, (subtaskCountByTask.get(subtask.parent_task_id) ?? 0) + 1);
    }
    const dependencyCountByTask = new Map();
    for (const dependency of dependencies) {
        if (dependency.blocking_task_id) {
            dependencyCountByTask.set(dependency.blocking_task_id, (dependencyCountByTask.get(dependency.blocking_task_id) ?? 0) + 1);
        }
        if (dependency.blocked_task_id) {
            dependencyCountByTask.set(dependency.blocked_task_id, (dependencyCountByTask.get(dependency.blocked_task_id) ?? 0) + 1);
        }
    }
    const projectById = new Map((projectsResult.data ?? []).map((project) => [
        project.id,
        project,
    ]));
    const sectionById = new Map((sectionsResult.data ?? []).map((section) => [
        section.id,
        section,
    ]));
    return tasks.map((task) => ({
        ...task,
        assignees: (assigneesByTask.get(task.id) ?? []),
        dependencyCount: dependencyCountByTask.get(task.id) ?? 0,
        subtaskCount: subtaskCountByTask.get(task.id) ?? 0,
        project: task.project_id
            ? projectById.get(task.project_id) ?? null
            : null,
        section: task.section_id
            ? sectionById.get(task.section_id) ?? null
            : null,
    }));
}
// Days a task has spent in blocked or waiting status (from history)
async function getDelayDays(task) {
    const { getTaskStatusDuration: getTaskStatusSegments, sumIdleHours } = await Promise.resolve().then(() => __importStar(require("./historyService")));
    const segments = await getTaskStatusSegments(task.id);
    return Math.floor(sumIdleHours(segments) / 24);
}
