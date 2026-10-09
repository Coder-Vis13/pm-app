import { randomUUID } from "crypto";
import { performance } from "node:perf_hooks";
import { supabase } from "../lib/supabaseClient";
import { AppError } from "../lib/errors";
import { requireProjectAccess, requireWorkspaceAccess } from "./accessService";

interface CreateProjectInput {
  name: string;
  workspaceId: string;
  userId: string;
  description?: string;
}

//Workspace check → insert project → add creator as editor member
export async function createProject(input: CreateProjectInput) {
  const { name, workspaceId, userId, description } = input;

  await requireWorkspaceAccess(userId, workspaceId);

  const { data: project, error } = await supabase
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

  if (error) throw new AppError(error.message, 500);

  const { error: memberError } = await supabase.from("project_members").insert({
    id: randomUUID(),
    project_id: project.id,
    user_id: userId,
    role: "editor",
  });

  if (memberError) throw new AppError(memberError.message, 500);

  return project;
}

//Workspace check → list non-deleted projects in workspace
export async function listProjects(workspaceId: string, userId: string) {
  const totalStartedAt = performance.now();

  try {
    const accessStartedAt = performance.now();
    try {
      await requireWorkspaceAccess(userId, workspaceId);
    } finally {
      console.log(
        `[PERF] projects.requireWorkspaceAccess: ${(performance.now() - accessStartedAt).toFixed(2)} ms`
      );
    }

    const queryStartedAt = performance.now();
    const { data, error } = await supabase
      .from("project")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    console.log(
      `[PERF] projects.databaseQuery: ${(performance.now() - queryStartedAt).toFixed(2)} ms`
    );

    if (error) throw new AppError(error.message, 500);
    return data ?? [];
  } finally {
    console.log(
      `[PERF] projects.total: ${(performance.now() - totalStartedAt).toFixed(2)} ms`
    );
  }
}

//Project viewer check → fetch 
export async function getProjectById(projectId: string, userId: string) {
  await requireProjectAccess(userId, projectId, "viewer");

  const { data, error } = await supabase
    .from("project")
    .select("*")
    .eq("id", projectId)
    .eq("is_deleted", false)
    .single();

  if (error) throw new AppError(error.message, 500);
  return data;
}

interface UpdateProjectInput {
  name?: string;
  description?: string | null;
}

//Editor check → update non-deleted project
export async function updateProject(
  projectId: string,
  userId: string,
  updates: UpdateProjectInput
) {
  await requireProjectAccess(userId, projectId, "editor");

  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;

  const { data, error } = await supabase
    .from("project")
    .update(payload)
    .eq("id", projectId)
    .eq("is_deleted", false)
    .select()
    .single();

  if (error) throw new AppError(error.message, 500);
  return data;
}

//Admin check → soft delete (cascades to sections and tasks via DB trigger)
export async function deleteProject(projectId: string, userId: string) {
  await requireProjectAccess(userId, projectId, "admin");

  const { error } = await supabase
    .from("project")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("is_deleted", false);

  if (error) throw new AppError(error.message, 500);
}
