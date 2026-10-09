"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectDeps = getProjectDeps;
exports.getDependenciesForTaskIds = getDependenciesForTaskIds;
exports.createDep = createDep;
exports.deleteDep = deleteDep;
exports.listTaskDependenciesForTask = listTaskDependenciesForTask;
exports.listTaskDependencies = listTaskDependencies;
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const accessService_1 = require("./accessService");
//All deps where blocked task is in project
async function getProjectDeps(projectId) {
    const { data: tasks, error: taskError } = await supabaseClient_1.supabase
        .from("task")
        .select("id")
        .eq("project_id", projectId)
        .eq("is_deleted", false);
    if (taskError)
        throw new errors_1.AppError(taskError.message, 500);
    const taskIds = (tasks ?? []).map((t) => t.id);
    return getDependenciesForTaskIds(taskIds);
}
// Load dependencies for a known set of active task IDs.
async function getDependenciesForTaskIds(taskIds) {
    if (taskIds.length === 0)
        return [];
    const { data, error } = await supabaseClient_1.supabase
        .from("task_dependencies")
        .select("id, blocking_task_id, blocked_task_id, created_at")
        .in("blocked_task_id", taskIds)
        .in("blocking_task_id", taskIds);
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return (data ?? []);
}
async function createDep(blockingTaskId, blockedTaskId, userId) {
    // Access is still checked in the application layer.
    const blockedTask = await (0, accessService_1.validateTaskAccess)(userId, blockedTaskId);
    await (0, accessService_1.requireProjectAccess)(userId, blockedTask.project_id, "editor");
    const { data, error } = await supabaseClient_1.supabase.rpc("create_task_dependency", {
        p_blocking_task_id: blockingTaskId,
        p_blocked_task_id: blockedTaskId,
        p_user_id: userId,
    });
    if (error) {
        if (error.message.includes("cannot depend on itself")) {
            throw new errors_1.AppError(error.message, 400);
        }
        if (error.message.includes("same project")) {
            throw new errors_1.AppError(error.message, 400);
        }
        if (error.message.includes("circular loop")) {
            throw new errors_1.AppError(error.message, 400);
        }
        if (error.message.includes("already exists")) {
            throw new errors_1.AppError(error.message, 400);
        }
        if (error.message.includes("Task not found")) {
            throw new errors_1.AppError(error.message, 404);
        }
        throw new errors_1.AppError(error.message, 500);
    }
    return data;
}
//Load dep → find project → editor check → delete
async function deleteDep(depId, userId) {
    const { data: dep, error: depError } = await supabaseClient_1.supabase
        .from("task_dependencies")
        .select("blocked_task_id")
        .eq("id", depId)
        .maybeSingle();
    if (depError)
        throw new errors_1.AppError(depError.message, 500);
    if (!dep?.blocked_task_id)
        throw new errors_1.AppError("Dependency not found", 404);
    const { data: task, error: taskError } = await supabaseClient_1.supabase
        .from("task")
        .select("project_id")
        .eq("id", dep.blocked_task_id)
        .single();
    if (taskError)
        throw new errors_1.AppError(taskError.message, 500);
    await (0, accessService_1.requireProjectAccess)(userId, task.project_id, "editor");
    // const { error } = await supabase
    //   .from("task_dependencies")
    //   .delete()
    //   .eq("id", depId);
    // if (error) throw new AppError(error.message, 500);
    const { data, error } = await supabaseClient_1.supabase
        .from("task_dependencies")
        .delete()
        .eq("id", depId)
        .select("id")
        .maybeSingle();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    if (!data) {
        throw new errors_1.AppError("Dependency was already deleted or no longer exists.", 409);
    }
}
async function listTaskDependenciesForTask(taskId, currentTask) {
    const { data: deps, error: depError } = await supabaseClient_1.supabase
        .from("task_dependencies")
        .select("*")
        .or(`blocking_task_id.eq.${taskId},blocked_task_id.eq.${taskId}`);
    if (depError) {
        throw new errors_1.AppError(depError.message, 500);
    }
    if (!deps || deps.length === 0) {
        return [];
    }
    const taskIds = [
        ...new Set(deps.flatMap((dep) => [
            dep.blocking_task_id,
            dep.blocked_task_id,
        ]).filter(Boolean)),
    ];
    const { data: tasks, error: taskError } = await supabaseClient_1.supabase
        .from("task")
        .select("id, title, status, start_date, due_date, is_deleted")
        .in("id", taskIds);
    if (taskError) {
        throw new errors_1.AppError(taskError.message, 500);
    }
    const taskById = new Map((tasks ?? []).map((task) => [task.id, task]));
    const currentTaskData = taskById.get(currentTask.id) ?? currentTask;
    return deps.map((dep) => {
        const blockingTask = dep.blocking_task_id
            ? taskById.get(dep.blocking_task_id)
            : undefined;
        const blockedTask = dep.blocked_task_id
            ? taskById.get(dep.blocked_task_id)
            : undefined;
        const blockingDueDate = blockingTask?.due_date
            ? new Date(blockingTask.due_date).getTime()
            : null;
        const blockedStartDate = blockedTask?.start_date
            ? new Date(blockedTask.start_date).getTime()
            : null;
        const blockedDueDate = blockedTask?.due_date
            ? new Date(blockedTask.due_date).getTime()
            : null;
        const dateConflict = blockingTask?.is_deleted === false &&
            blockedTask?.is_deleted === false &&
            blockingTask.status !== "done" &&
            blockingDueDate !== null &&
            ((blockedStartDate !== null &&
                blockedStartDate < blockingDueDate) ||
                (blockedDueDate !== null &&
                    blockedDueDate < blockingDueDate));
        return {
            ...dep,
            blocking_task_title: blockingTask?.title ?? "Unknown task",
            blocking_task_status: blockingTask?.status ?? null,
            blocking_task_start_date: blockingTask?.start_date ?? null,
            blocking_task_due_date: blockingTask?.due_date ?? null,
            blocking_task_is_deleted: blockingTask?.is_deleted ?? null,
            blocked_task_title: blockedTask?.title ?? "Unknown task",
            blocked_task_status: blockedTask?.status ?? currentTaskData.status ?? null,
            blocked_task_start_date: blockedTask?.start_date ?? currentTaskData.start_date ?? null,
            blocked_task_due_date: blockedTask?.due_date ?? currentTaskData.due_date ?? null,
            blocked_task_is_deleted: blockedTask?.is_deleted ?? currentTaskData.is_deleted ?? null,
            date_conflict: dateConflict,
        };
    });
}
async function listTaskDependencies(taskId, userId) {
    const currentTask = await (0, accessService_1.validateTaskAccess)(userId, taskId);
    return listTaskDependenciesForTask(taskId, currentTask);
}
