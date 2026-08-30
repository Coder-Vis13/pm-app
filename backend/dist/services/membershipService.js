"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeUserFromProject = removeUserFromProject;
exports.addProjectMember = addProjectMember;
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const accessService_1 = require("./accessService");
//Deletes member row + cleans task_assignees for all project tasks
async function removeUserFromProject(userId, projectId) {
    const { error: memberError } = await supabaseClient_1.supabase
        .from("project_members")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId);
    if (memberError)
        throw new errors_1.AppError(memberError.message, 500);
    // Remove assignee from all tasks in this project
    const { data: tasks, error: taskError } = await supabaseClient_1.supabase
        .from("task")
        .select("id")
        .eq("project_id", projectId)
        .eq("is_deleted", false);
    if (taskError)
        throw new errors_1.AppError(taskError.message, 500);
    const taskIds = (tasks ?? []).map((t) => t.id);
    if (taskIds.length === 0)
        return;
    const { error: assigneeError } = await supabaseClient_1.supabase
        .from("task_assignees")
        .delete()
        .eq("user_id", userId)
        .in("task_id", taskIds);
    if (assigneeError)
        throw new errors_1.AppError(assigneeError.message, 500);
}
//Admin-only. upserts project_members with role
async function addProjectMember(projectId, actorId, newUserId, role) {
    await (0, accessService_1.requireProjectAccess)(actorId, projectId, "admin");
    const { data, error } = await supabaseClient_1.supabase
        .from("project_members")
        .upsert({
        project_id: projectId,
        user_id: newUserId,
        role,
    }, { onConflict: "project_id,user_id" })
        .select()
        .single();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data;
}
