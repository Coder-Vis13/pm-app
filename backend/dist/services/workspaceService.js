"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWorkspaces = listWorkspaces;
exports.getWorkspaceById = getWorkspaceById;
exports.createWorkspace = createWorkspace;
exports.updateWorkspace = updateWorkspace;
exports.deleteWorkspace = deleteWorkspace;
const crypto_1 = require("crypto");
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const accessService_1 = require("./accessService");
async function requireWorkspaceOwner(userId, workspaceId) {
    await (0, accessService_1.requireWorkspaceAccess)(userId, workspaceId);
    const { data, error } = await supabaseClient_1.supabase
        .from("workspace")
        .select("owner_user_id")
        .eq("id", workspaceId)
        .maybeSingle();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    const workspace = (0, errors_1.assertFound)(data, "Workspace");
    if (workspace.owner_user_id !== userId) {
        throw new errors_1.AppError("Only the workspace owner can perform this action", 403);
    }
}
async function listWorkspaces(userId) {
    const { data: owned, error: ownedError } = await supabaseClient_1.supabase
        .from("workspace")
        .select("*")
        .eq("owner_user_id", userId);
    if (ownedError)
        throw new errors_1.AppError(ownedError.message, 500);
    const { data: memberships, error: memberError } = await supabaseClient_1.supabase
        .from("workspace_members")
        .select("workspace:workspace_id(*)")
        .eq("user_id", userId);
    if (memberError)
        throw new errors_1.AppError(memberError.message, 500);
    const byId = new Map();
    for (const workspace of owned ?? []) {
        byId.set(workspace.id, workspace);
    }
    for (const row of memberships ?? []) {
        const workspace = row.workspace;
        if (workspace)
            byId.set(workspace.id, workspace);
    }
    return Array.from(byId.values()).sort((a, b) => a.created_at.localeCompare(b.created_at));
}
async function getWorkspaceById(workspaceId, userId) {
    await (0, accessService_1.requireWorkspaceAccess)(userId, workspaceId);
    const { data, error } = await supabaseClient_1.supabase
        .from("workspace")
        .select("*")
        .eq("id", workspaceId)
        .single();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data;
}
async function createWorkspace(userId, name) {
    const { data: workspace, error } = await supabaseClient_1.supabase
        .from("workspace")
        .insert({ name, owner_user_id: userId })
        .select()
        .single();
    if (error) {
        if (error.code === "23505") {
            throw new errors_1.AppError("You already own a workspace", 400);
        }
        throw new errors_1.AppError(error.message, 500);
    }
    const { error: memberError } = await supabaseClient_1.supabase.from("workspace_members").insert({
        id: (0, crypto_1.randomUUID)(),
        workspace_id: workspace.id,
        user_id: userId,
        role: "admin",
    });
    if (memberError)
        throw new errors_1.AppError(memberError.message, 500);
    return workspace;
}
async function updateWorkspace(workspaceId, userId, name) {
    await requireWorkspaceOwner(userId, workspaceId);
    const { data, error } = await supabaseClient_1.supabase
        .from("workspace")
        .update({ name })
        .eq("id", workspaceId)
        .select()
        .single();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data;
}
async function deleteWorkspace(workspaceId, userId) {
    await requireWorkspaceOwner(userId, workspaceId);
    const { count, error: countError } = await supabaseClient_1.supabase
        .from("project")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("is_deleted", false);
    if (countError)
        throw new errors_1.AppError(countError.message, 500);
    if (count && count > 0) {
        throw new errors_1.AppError("Cannot delete workspace with active projects", 400);
    }
    const { error } = await supabaseClient_1.supabase
        .from("workspace")
        .delete()
        .eq("id", workspaceId);
    if (error)
        throw new errors_1.AppError(error.message, 500);
}
