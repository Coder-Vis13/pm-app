"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProject = getProject;
exports.getTask = getTask;
exports.hasWorkspaceAccess = hasWorkspaceAccess;
exports.requireWorkspaceAccess = requireWorkspaceAccess;
exports.getProjectRole = getProjectRole;
exports.hasProjectAccess = hasProjectAccess;
exports.requireProjectAccess = requireProjectAccess;
exports.validateTaskAccess = validateTaskAccess;
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
// Used to compare permission levels
// Higher number = higher permission
const ROLE_RANK = {
    viewer: 1,
    editor: 2,
    admin: 3,
};
//returns the project if it exists and isn't deleted
async function getProject(projectId) {
    const { data, error } = await supabaseClient_1.supabase
        .from("project")
        .select("*")
        .eq("id", projectId)
        .eq("is_deleted", false)
        .maybeSingle();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data;
}
//returns the task if it exists and isn't deleted
async function getTask(taskId) {
    const { data, error } = await supabaseClient_1.supabase
        .from("task")
        .select("*")
        .eq("id", taskId)
        .eq("is_deleted", false)
        .maybeSingle();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data;
}
/**
 * a user has workspace access if they:
 * 1. Own the workspace, OR
 * 2. Are listed in workspace_members.
 */
async function hasWorkspaceAccess(userId, workspaceId) {
    const { data: workspace, error: wsError } = await supabaseClient_1.supabase
        .from("workspace")
        .select("owner_user_id")
        .eq("id", workspaceId)
        .maybeSingle();
    if (wsError)
        throw new errors_1.AppError(wsError.message, 500);
    if (!workspace)
        return false;
    // Workspace owner always has access
    if (workspace.owner_user_id === userId) {
        return true;
    }
    //otherwise, check if the user was added as a workspace member
    const { data: membership, error: memberError } = await supabaseClient_1.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle();
    if (memberError)
        throw new errors_1.AppError(memberError.message, 500);
    return Boolean(membership);
}
async function requireWorkspaceAccess(userId, workspaceId) {
    const allowed = await hasWorkspaceAccess(userId, workspaceId);
    if (!allowed) {
        throw new errors_1.AppError("You do not have access to this workspace", 403);
    }
}
/**
returns the user's explicit role in this project
returns null if they are not a project member
 */
async function getProjectRole(userId, projectId) {
    const { data, error } = await supabaseClient_1.supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data?.role ?? null;
}
/**
 checks whether the user can access the project
 Access is granted if the user:
 - has an explicit project role, OR
 - has workspace access (viewer by default)
 */
async function hasProjectAccess(userId, projectId) {
    const project = await getProject(projectId);
    if (!project)
        return false;
    const role = await getProjectRole(userId, projectId);
    if (role)
        return true;
    if (project.workspace_id) {
        return hasWorkspaceAccess(userId, project.workspace_id);
    }
    return false;
}
async function requireProjectAccess(userId, projectId, minRole = "viewer") {
    const project = (0, errors_1.assertFound)(await getProject(projectId), "Project");
    //check whether the user has an explicit role in this project
    let role = await getProjectRole(userId, projectId);
    // If they aren't a project member but belong to the workspace, they automatically get viewer access
    if (!role && project.workspace_id) {
        const inWorkspace = await hasWorkspaceAccess(userId, project.workspace_id);
        if (inWorkspace)
            role = "viewer";
    }
    // reject the request if:
    // 1. the user has no project access, OR
    // 2. their role is lower than the minimum required.
    if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
        throw new errors_1.AppError("You do not have access to this project", 403);
    }
}
//Makes sure the user can access the task by checking permission on the task's project
async function validateTaskAccess(userId, taskId) {
    const task = (0, errors_1.assertFound)(await getTask(taskId), "Task");
    if (!task.project_id) {
        throw new errors_1.AppError("Task has no project", 400);
    }
    // a user can access a task only if they can access its project
    await requireProjectAccess(userId, task.project_id, "viewer");
    return task;
}
