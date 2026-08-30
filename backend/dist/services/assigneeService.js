"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAssignees = listAssignees;
exports.addAssignee = addAssignee;
exports.removeAssignee = removeAssignee;
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const accessService_1 = require("./accessService");
// Viewer check, fetch task assignees and their user info
async function listAssignees(taskId, userId) {
    await (0, accessService_1.validateTaskAccess)(userId, taskId);
    const { data, error } = await supabaseClient_1.supabase
        .from("task_assignees")
        .select("id, user_id, app_user(id, name, email, job_role_id)")
        .eq("task_id", taskId);
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data ?? [];
}
//Editor check, insert assignee for a task
async function addAssignee(taskId, userId, assigneeId) {
    const task = await (0, accessService_1.validateTaskAccess)(userId, taskId);
    await (0, accessService_1.requireProjectAccess)(userId, task.project_id, "editor");
    const { data, error } = await supabaseClient_1.supabase
        .from("task_assignees")
        .insert({ task_id: taskId, user_id: assigneeId })
        .select()
        .single();
    if (error) {
        if (error.code === "23505") {
            throw new errors_1.AppError("User is already assigned to this task", 400);
        }
        throw new errors_1.AppError(error.message, 500);
    }
    return data;
}
//Editor check, remove assignee for a task
async function removeAssignee(taskId, userId, assigneeId) {
    const task = await (0, accessService_1.validateTaskAccess)(userId, taskId);
    await (0, accessService_1.requireProjectAccess)(userId, task.project_id, "editor");
    const { error } = await supabaseClient_1.supabase
        .from("task_assignees")
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", assigneeId);
    if (error)
        throw new errors_1.AppError(error.message, 500);
}
