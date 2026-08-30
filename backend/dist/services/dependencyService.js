"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectDeps = getProjectDeps;
exports.validateDep = validateDep;
exports.createDep = createDep;
exports.listDeps = listDeps;
exports.deleteDep = deleteDep;
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const graph_1 = require("../utils/graph");
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
    if (taskIds.length === 0)
        return [];
    const { data, error } = await supabaseClient_1.supabase
        .from("task_dependencies")
        .select("*")
        .in("blocked_task_id", taskIds);
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data ?? [];
}
//check for self-loops and if tasks are in the same project
async function validateDep(blockingTaskId, blockedTaskId) {
    if (blockingTaskId === blockedTaskId) {
        throw new errors_1.AppError("A task cannot depend on itself", 400);
    }
    const { data: blocking, error: bErr } = await supabaseClient_1.supabase
        .from("task")
        .select("id, project_id")
        .eq("id", blockingTaskId)
        .eq("is_deleted", false)
        .maybeSingle();
    const { data: blocked, error: blErr } = await supabaseClient_1.supabase
        .from("task")
        .select("id, project_id")
        .eq("id", blockedTaskId)
        .eq("is_deleted", false)
        .maybeSingle();
    if (bErr || blErr)
        throw new errors_1.AppError("Failed to load tasks", 500);
    if (!blocking || !blocked)
        throw new errors_1.AppError("Task not found", 404);
    if (blocking.project_id !== blocked.project_id) {
        throw new errors_1.AppError("Tasks must belong to the same project", 400);
    }
    const deps = await getProjectDeps(blocking.project_id);
    if ((0, graph_1.possibleCycle)(blockingTaskId, blockedTaskId, deps)) {
        throw new errors_1.AppError("This dependency would create a circular loop", 400);
    }
}
//Validate dep → editor check → insert
async function createDep(blockingTaskId, blockedTaskId, userId) {
    await validateDep(blockingTaskId, blockedTaskId);
    const { data: blocked, error: taskError } = await supabaseClient_1.supabase
        .from("task")
        .select("project_id")
        .eq("id", blockedTaskId)
        .single();
    if (taskError)
        throw new errors_1.AppError(taskError.message, 500);
    await (0, accessService_1.requireProjectAccess)(userId, blocked.project_id, "editor");
    const { data, error } = await supabaseClient_1.supabase
        .from("task_dependencies")
        .insert({
        blocking_task_id: blockingTaskId,
        blocked_task_id: blockedTaskId,
        created_at: new Date().toISOString(),
    })
        .select()
        .single();
    if (error) {
        if (error.code === "23505") {
            throw new errors_1.AppError("Dependency already exists", 400);
        }
        throw new errors_1.AppError(error.message, 500);
    }
    return data;
}
//Deps in both directions for a task
async function listDeps(taskId, userId) {
    await (0, accessService_1.validateTaskAccess)(userId, taskId);
    const { data, error } = await supabaseClient_1.supabase
        .from("task_dependencies")
        .select("*")
        .or(`blocking_task_id.eq.${taskId},blocked_task_id.eq.${taskId}`);
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data ?? [];
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
    const { error } = await supabaseClient_1.supabase
        .from("task_dependencies")
        .delete()
        .eq("id", depId);
    if (error)
        throw new errors_1.AppError(error.message, 500);
}
