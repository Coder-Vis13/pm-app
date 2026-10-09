import { supabase } from "../lib/supabaseClient";
import { AppError, assertFound } from "../lib/errors";
import { RoleType } from "../types/database";


// Used to compare permission levels
// Higher number = higher permission
const ROLE_RANK: Record<RoleType, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};


//returns the project if it exists and isn't deleted
export async function getProject(projectId: string) {
  const { data, error } = await supabase
    .from("project")
    .select("*")
    .eq("id", projectId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) throw new AppError(error.message, 500);
  return data;
}

//returns the task if it exists and isn't deleted
export async function getTask(taskId: string) {
  const { data, error } = await supabase
    .from("task")
    .select("*")
    .eq("id", taskId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) throw new AppError(error.message, 500);
  return data;
}

/**
 * a user has workspace access if they:
 * 1. Own the workspace, OR
 * 2. Are listed in workspace_members.
 */
export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const [workspaceResult, membershipResult] = await Promise.all([
    supabase
      .from("workspace")
      .select("owner_user_id")
      .eq("id", workspaceId)
      .maybeSingle(),
    supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const { data: workspace, error: wsError } = workspaceResult;
  const { data: membership, error: memberError } = membershipResult;

  if (wsError) throw new AppError(wsError.message, 500);
  if (!workspace) return false;

  // Workspace owner always has access
  if (workspace.owner_user_id === userId) {
    return true;
  }

  if (memberError) throw new AppError(memberError.message, 500);

  return Boolean(membership);
}

export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string
) {
  const allowed = await hasWorkspaceAccess(userId, workspaceId);
  if (!allowed) {
    throw new AppError("You do not have access to this workspace", 403);
  }
}

/**
returns the user's explicit role in this project
returns null if they are not a project member
 */
export async function getProjectRole(
  userId: string,
  projectId: string
): Promise<RoleType | null> {
  const { data, error } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new AppError(error.message, 500);
  return (data?.role as RoleType) ?? null;
}


/**
 checks whether the user can access the project
 Access is granted if the user:
 - has an explicit project role, OR
 - has workspace access (viewer by default)
 */
export async function hasProjectAccess(
  userId: string,
  projectId: string
): Promise<boolean> {
  const [project, role] = await Promise.all([
    getProject(projectId),
    getProjectRole(userId, projectId),
  ]);

  if (!project) return false;

  if (role) return true;

  if (project.workspace_id) {
    return hasWorkspaceAccess(userId, project.workspace_id);
  }

  return false;
}

export async function requireProjectAccess(
  userId: string,
  projectId: string,
  minRole: RoleType = "viewer"
) {
  const [projectData, projectRole] = await Promise.all([
    getProject(projectId),
    getProjectRole(userId, projectId),
  ]);
  const project = assertFound(projectData, "Project");

  //check whether the user has an explicit role in this project
  let role = projectRole;

  // If they aren't a project member but belong to the workspace, they automatically get viewer access
  if (!role && project.workspace_id) {
    const inWorkspace = await hasWorkspaceAccess(userId, project.workspace_id);
    if (inWorkspace) role = "viewer"; 
  }

  // reject the request if:
  // 1. the user has no project access, OR
  // 2. their role is lower than the minimum required.
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new AppError("You do not have access to this project", 403);
  }
}

 //Makes sure the user can access the task by checking permission on the task's project
export async function validateTaskAccess(userId: string, taskId: string) {
  const task = assertFound(await getTask(taskId), "Task");
  if (!task.project_id) {
    throw new AppError("Task has no project", 400);
  }
  // a user can access a task only if they can access its project
  await requireProjectAccess(userId, task.project_id, "viewer");
  return task;
}
