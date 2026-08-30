"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = createProject;
exports.listProjects = listProjects;
exports.getProjectById = getProjectById;
exports.updateProject = updateProject;
exports.deleteProject = deleteProject;
const crypto_1 = require("crypto");
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const accessService_1 = require("./accessService");
//Workspace check → insert project → add creator as editor member
async function createProject(input) {
    const { name, workspaceId, userId, description } = input;
    await (0, accessService_1.requireWorkspaceAccess)(userId, workspaceId);
    const { data: project, error } = await supabaseClient_1.supabase
        .from("project")
        .insert({
        name,
        description: description ?? null,
        workspace_id: workspaceId,
        created_by: userId,
        created_at: new Date().toISOString(),
    })
        .select()
        .single();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    const { error: memberError } = await supabaseClient_1.supabase.from("project_members").insert({
        id: (0, crypto_1.randomUUID)(),
        project_id: project.id,
        user_id: userId,
        role: "editor",
    });
    if (memberError)
        throw new errors_1.AppError(memberError.message, 500);
    return project;
}
//Workspace check → list non-deleted projects in workspace
async function listProjects(workspaceId, userId) {
    await (0, accessService_1.requireWorkspaceAccess)(userId, workspaceId);
    const { data, error } = await supabaseClient_1.supabase
        .from("project")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data ?? [];
}
//Project viewer check → fetch 
async function getProjectById(projectId, userId) {
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "viewer");
    const { data, error } = await supabaseClient_1.supabase
        .from("project")
        .select("*")
        .eq("id", projectId)
        .eq("is_deleted", false)
        .single();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data;
}
//Editor check → update non-deleted project
async function updateProject(projectId, userId, updates) {
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "editor");
    const payload = {};
    if (updates.name !== undefined)
        payload.name = updates.name;
    if (updates.description !== undefined)
        payload.description = updates.description;
    const { data, error } = await supabaseClient_1.supabase
        .from("project")
        .update(payload)
        .eq("id", projectId)
        .eq("is_deleted", false)
        .select()
        .single();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data;
}
//Admin check → soft delete (cascades to sections and tasks via DB trigger)
async function deleteProject(projectId, userId) {
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "admin");
    const { error } = await supabaseClient_1.supabase
        .from("project")
        .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
    })
        .eq("id", projectId)
        .eq("is_deleted", false);
    if (error)
        throw new errors_1.AppError(error.message, 500);
}
