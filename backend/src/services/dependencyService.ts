import { supabase } from "../lib/supabaseClient";
import { AppError } from "../lib/errors";
import { TaskDep } from "../types/database";
import { possibleCycle } from "../utils/graph";
import { requireProjectAccess, validateTaskAccess } from "./accessService";

//All deps where blocked task is in project
export async function getProjectDeps(
  projectId: string
): Promise<TaskDep[]> {
  const { data: tasks, error: taskError } = await supabase
    .from("task")
    .select("id")
    .eq("project_id", projectId)
    .eq("is_deleted", false);

  if (taskError) throw new AppError(taskError.message, 500);

  const taskIds = (tasks ?? []).map((t) => t.id);
  if (taskIds.length === 0) return [];

  const { data, error } = await supabase
    .from("task_dependencies")
    .select("*")
    .in("blocked_task_id", taskIds)
    .in("blocking_task_id", taskIds);

  if (error) throw new AppError(error.message, 500);
  return (data ?? []) as TaskDep[];
}

//check for self-loops and if tasks are in the same project
export async function validateDep(
  blockingTaskId: string,
  blockedTaskId: string
) {
  if (blockingTaskId === blockedTaskId) {
    throw new AppError("A task cannot depend on itself", 400);
  }

  const { data: blocking, error: bErr } = await supabase
    .from("task")
    .select("id, project_id")
    .eq("id", blockingTaskId)
    .eq("is_deleted", false)
    .maybeSingle();

  const { data: blocked, error: blErr } = await supabase
    .from("task")
    .select("id, project_id")
    .eq("id", blockedTaskId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (bErr || blErr) throw new AppError("Failed to load tasks", 500);
  if (!blocking || !blocked) throw new AppError("Task not found", 404);
  if (blocking.project_id !== blocked.project_id) {
    throw new AppError("Tasks must belong to the same project", 400);
  }

  const deps = await getProjectDeps(blocking.project_id!);
  if (possibleCycle(blockingTaskId, blockedTaskId, deps)) {
    throw new AppError("This dependency would create a circular loop", 400);
  }
}

//Validate dep → editor check → insert
// export async function createDep(
//   blockingTaskId: string,
//   blockedTaskId: string,
//   userId: string
// ) {
//   await validateDep(blockingTaskId, blockedTaskId);

//   const { data: blocked, error: taskError } = await supabase
//     .from("task")
//     .select("project_id")
//     .eq("id", blockedTaskId)
//     .single();

//   if (taskError) throw new AppError(taskError.message, 500);

//   await requireProjectAccess(userId, blocked.project_id!, "editor");

//   const { data, error } = await supabase
//     .from("task_dependencies")
//     .insert({
//       blocking_task_id: blockingTaskId,
//       blocked_task_id: blockedTaskId,
//       created_at: new Date().toISOString(),
//     })
//     .select()
//     .single();

//   if (error) {
//     if (error.code === "23505") {
//       throw new AppError("Dependency already exists", 400);
//     }
//     throw new AppError(error.message, 500);
//   }

//   return data;
// }



export async function createDep(
  blockingTaskId: string,
  blockedTaskId: string,
  userId: string
) {
  // Access is still checked in the application layer.
  const blockedTask = await validateTaskAccess(userId, blockedTaskId);

  await requireProjectAccess(
    userId,
    blockedTask.project_id!,
    "editor"
  );

  const { data, error } = await supabase.rpc(
    "create_task_dependency",
    {
      p_blocking_task_id: blockingTaskId,
      p_blocked_task_id: blockedTaskId,
      p_user_id: userId,
    }
  );

  if (error) {
    if (error.message.includes("cannot depend on itself")) {
      throw new AppError(error.message, 400);
    }

    if (error.message.includes("same project")) {
      throw new AppError(error.message, 400);
    }

    if (error.message.includes("circular loop")) {
      throw new AppError(error.message, 400);
    }

    if (error.message.includes("already exists")) {
      throw new AppError(error.message, 400);
    }

    if (error.message.includes("Task not found")) {
      throw new AppError(error.message, 404);
    }

    throw new AppError(error.message, 500);
  }

  return data;
}


//Deps in both directions for a task
export async function listDeps(taskId: string, userId: string) {
  await validateTaskAccess(userId, taskId);

  const { data, error } = await supabase
    .from("task_dependencies")
    .select("*")
    .or(`blocking_task_id.eq.${taskId},blocked_task_id.eq.${taskId}`);

  if (error) throw new AppError(error.message, 500);
  return data ?? [];
}
//Load dep → find project → editor check → delete
export async function deleteDep(depId: string, userId: string) {
  const { data: dep, error: depError } = await supabase
    .from("task_dependencies")
    .select("blocked_task_id")
    .eq("id", depId)
    .maybeSingle();

  if (depError) throw new AppError(depError.message, 500);
  if (!dep?.blocked_task_id) throw new AppError("Dependency not found", 404);

  const { data: task, error: taskError } = await supabase
    .from("task")
    .select("project_id")
    .eq("id", dep.blocked_task_id)
    .single();

  if (taskError) throw new AppError(taskError.message, 500);
  await requireProjectAccess(userId, task.project_id!, "editor");

  // const { error } = await supabase
  //   .from("task_dependencies")
  //   .delete()
  //   .eq("id", depId);

  // if (error) throw new AppError(error.message, 500);

  const { data, error } = await supabase
  .from("task_dependencies")
  .delete()
  .eq("id", depId)
  .select("id")
  .maybeSingle();

if (error) throw new AppError(error.message, 500);

if (!data) {
  throw new AppError(
    "Dependency was already deleted or no longer exists.",
    409
  );
}
}


export async function listTaskDependencies(
  taskId: string,
  userId: string
) {
  await validateTaskAccess(userId, taskId);

  const { data: deps, error: depError } = await supabase
    .from("task_dependencies")
    .select("*")
    .or(`blocking_task_id.eq.${taskId},blocked_task_id.eq.${taskId}`);

  if (depError) {
    throw new AppError(depError.message, 500);
  }

  if (!deps || deps.length === 0) {
    return [];
  }

  const taskIds = [
    ...new Set(
      deps.flatMap((dep) => [
        dep.blocking_task_id,
        dep.blocked_task_id,
      ]).filter(Boolean)
    ),
  ];

  const { data: tasks, error: taskError } = await supabase
    .from("task")
    .select("id, title")
    .in("id", taskIds);

  if (taskError) {
    throw new AppError(taskError.message, 500);
  }

  const titleById = new Map(
    (tasks ?? []).map((task) => [task.id, task.title])
  );

  return deps.map((dep) => ({
    ...dep,
    blocking_task_title: dep.blocking_task_id
      ? titleById.get(dep.blocking_task_id) ?? "Unknown task"
      : null,
    blocked_task_title: dep.blocked_task_id
      ? titleById.get(dep.blocked_task_id) ?? "Unknown task"
      : null,
  }));
}
