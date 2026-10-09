"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAssigneesForTask = listAssigneesForTask;
exports.listAssignees = listAssignees;
exports.addAssignee = addAssignee;
exports.removeAssignee = removeAssignee;
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const accessService_1 = require("./accessService");
// Fetch assignees for a task (caller must verify access).
async function listAssigneesForTask(taskId) {
    const { data, error } = await supabaseClient_1.supabase
        .from("task_assignees")
        .select("id, user_id, app_user(id, name, email, job_role_id)")
        .eq("task_id", taskId);
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data ?? [];
}
// Viewer check, fetch task assignees and their user info
async function listAssignees(taskId, userId) {
    await (0, accessService_1.validateTaskAccess)(userId, taskId);
    return listAssigneesForTask(taskId);
}
//Editor check, insert assignee for a task
// export async function addAssignee(
//   taskId: string,
//   userId: string,
//   assigneeId: string
// ) {
//   const task = await validateTaskAccess(userId, taskId);
//   await requireProjectAccess(userId, task.project_id!, "editor");
//   const { data, error } = await supabase
//     .from("task_assignees")
//     .insert({ task_id: taskId, user_id: assigneeId })
//     .select()
//     .single();
//   if (error) {
//     if (error.code === "23505") {
//       throw new AppError("User is already assigned to this task", 400);
//     }
//     throw new AppError(error.message, 500);
//   }
//   return data;
// }
async function addAssignee(taskId, userId, assigneeId, expectedUpdatedAt) {
    const task = await (0, accessService_1.validateTaskAccess)(userId, taskId);
    await (0, accessService_1.requireProjectAccess)(userId, task.project_id, "editor");
    // Make sure nobody changed the task since the client last read it.
    if (task.updated_at !== expectedUpdatedAt) {
        throw new errors_1.AppError("Task was modified by another user. Please refresh and try again.", 409);
    }
    const now = new Date().toISOString();
    const { data: updatedTask, error: taskError } = await supabaseClient_1.supabase
        .from("task")
        .update({
        updated_at: now,
        updated_by: userId,
    })
        .eq("id", taskId)
        .eq("updated_at", expectedUpdatedAt)
        .select("id, updated_at")
        .maybeSingle();
    if (taskError)
        throw new errors_1.AppError(taskError.message, 500);
    // Zero rows means another request won the race.
    if (!updatedTask) {
        throw new errors_1.AppError("Task was modified by another user. Please refresh and try again.", 409);
    }
    const { data, error } = await supabaseClient_1.supabase
        .from("task_assignees")
        .insert({
        task_id: taskId,
        user_id: assigneeId,
    })
        .select()
        .single();
    if (error) {
        if (error.code === "23505") {
            throw new errors_1.AppError("User is already assigned to this task", 400);
        }
        throw new errors_1.AppError(error.message, 500);
    }
    return {
        assignee: data,
        updatedAt: updatedTask.updated_at,
    };
}
//Editor check, remove assignee for a task
// export async function removeAssignee(
//   taskId: string,
//   userId: string,
//   assigneeId: string
// ) {
//   const task = await validateTaskAccess(userId, taskId);
//   await requireProjectAccess(userId, task.project_id!, "editor");
//   const { error } = await supabase
//     .from("task_assignees")
//     .delete()
//     .eq("task_id", taskId)
//     .eq("user_id", assigneeId);
//   if (error) throw new AppError(error.message, 500);
// }
async function removeAssignee(taskId, userId, assigneeId, expectedUpdatedAt) {
    const task = await (0, accessService_1.validateTaskAccess)(userId, taskId);
    await (0, accessService_1.requireProjectAccess)(userId, task.project_id, "editor");
    if (task.updated_at !== expectedUpdatedAt) {
        throw new errors_1.AppError("Task was modified by another user. Please refresh and try again.", 409);
    }
    const now = new Date().toISOString();
    // Claim the update first. Only one concurrent request can succeed.
    const { data: updatedTask, error: taskError } = await supabaseClient_1.supabase
        .from("task")
        .update({
        updated_at: now,
        updated_by: userId,
    })
        .eq("id", taskId)
        .eq("updated_at", expectedUpdatedAt)
        .select("id, updated_at")
        .maybeSingle();
    if (taskError)
        throw new errors_1.AppError(taskError.message, 500);
    if (!updatedTask) {
        throw new errors_1.AppError("Task was modified by another user. Please refresh and try again.", 409);
    }
    const { error } = await supabaseClient_1.supabase
        .from("task_assignees")
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", assigneeId);
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return {
        taskId,
        updatedAt: updatedTask.updated_at,
    };
}
