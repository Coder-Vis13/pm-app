"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSections = listSections;
exports.createSection = createSection;
exports.checkSectionInProject = checkSectionInProject;
exports.updateSection = updateSection;
exports.deleteSection = deleteSection;
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const accessService_1 = require("./accessService");
//Viewer access. non-deleted sections ordered by position
async function listSections(projectId, userId) {
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "viewer");
    const { data, error } = await supabaseClient_1.supabase
        .from("section")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_deleted", false)
        .order("position", { ascending: true });
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data ?? [];
}
//Editor access. computes next position -> insert
async function createSection(projectId, userId, name) {
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "editor");
    const { data: existing, error: posError } = await supabaseClient_1.supabase
        .from("section")
        .select("position")
        .eq("project_id", projectId)
        .eq("is_deleted", false)
        .order("position", { ascending: false })
        .limit(1);
    if (posError)
        throw new errors_1.AppError(posError.message, 500);
    const nextPosition = existing?.length ? (existing[0].position ?? 0) + 1 : 1;
    const { data, error } = await supabaseClient_1.supabase
        .from("section")
        .insert({
        project_id: projectId, name,
        position: nextPosition,
    })
        .select()
        .single();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data;
}
//Ensures section exists, not deleted, matches project — prevents cross-project task placement
async function checkSectionInProject(sectionId, projectId) {
    const { data, error } = await supabaseClient_1.supabase
        .from("section")
        .select("id, project_id")
        .eq("id", sectionId)
        .eq("is_deleted", false)
        .maybeSingle();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    if (!data || data.project_id !== projectId) {
        throw new errors_1.AppError("Section does not belong to this project", 400);
    }
}
//Editor check → update non-deleted section
async function updateSection(sectionId, projectId, userId, updates) {
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "editor");
    await checkSectionInProject(sectionId, projectId);
    const payload = {};
    if (updates.name !== undefined)
        payload.name = updates.name;
    if (updates.description !== undefined)
        payload.description = updates.description;
    if (updates.position !== undefined)
        payload.position = updates.position;
    const { data, error } = await supabaseClient_1.supabase
        .from("section")
        .update(payload)
        .eq("id", sectionId)
        .eq("is_deleted", false)
        .select()
        .single();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data;
}
//Editor check → soft delete (detaches tasks and compacts positions via DB triggers)
async function deleteSection(sectionId, projectId, userId) {
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "editor");
    await checkSectionInProject(sectionId, projectId);
    const { error } = await supabaseClient_1.supabase
        .from("section")
        .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
    })
        .eq("id", sectionId)
        .eq("is_deleted", false);
    if (error)
        throw new errors_1.AppError(error.message, 500);
}
