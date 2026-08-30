import { supabase } from "../lib/supabaseClient";
import { AppError } from "../lib/errors";
import { requireProjectAccess, validateTaskAccess } from "./accessService";


// Viewer check, fetch task assignees and their user info
export async function listAssignees(taskId: string, userId: string) {
  await validateTaskAccess(userId, taskId);

  const { data, error } = await supabase
    .from("task_assignees")
    .select("id, user_id, app_user(id, name, email, job_role_id)")
    .eq("task_id", taskId);

  if (error) throw new AppError(error.message, 500);
  return data ?? [];
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



export async function addAssignee(
  taskId: string,
  userId: string,
  assigneeId: string,
  expectedUpdatedAt: string
) {
  const task = await validateTaskAccess(userId, taskId);
  await requireProjectAccess(userId, task.project_id!, "editor");

  // Make sure nobody changed the task since the client last read it.
  if (task.updated_at !== expectedUpdatedAt) {
    throw new AppError(
      "Task was modified by another user. Please refresh and try again.",
      409
    );
  }

  const now = new Date().toISOString();

  const { data: updatedTask, error: taskError } = await supabase
    .from("task")
    .update({
      updated_at: now,
    })
    .eq("id", taskId)
    .eq("updated_at", expectedUpdatedAt)
    .select("id, updated_at")
    .maybeSingle();

  if (taskError) throw new AppError(taskError.message, 500);

  // Zero rows means another request won the race.
  if (!updatedTask) {
    throw new AppError(
      "Task was modified by another user. Please refresh and try again.",
      409
    );
  }

  const { data, error } = await supabase
    .from("task_assignees")
    .insert({
      task_id: taskId,
      user_id: assigneeId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new AppError("User is already assigned to this task", 400);
    }
    throw new AppError(error.message, 500);
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



export async function removeAssignee(
  taskId: string,
  userId: string,
  assigneeId: string,
  expectedUpdatedAt: string
) {
  const task = await validateTaskAccess(userId, taskId);
  await requireProjectAccess(userId, task.project_id!, "editor");

  if (task.updated_at !== expectedUpdatedAt) {
    throw new AppError(
      "Task was modified by another user. Please refresh and try again.",
      409
    );
  }

  const now = new Date().toISOString();

  // Claim the update first. Only one concurrent request can succeed.
  const { data: updatedTask, error: taskError } = await supabase
    .from("task")
    .update({
      updated_at: now,
    })
    .eq("id", taskId)
    .eq("updated_at", expectedUpdatedAt)
    .select("id, updated_at")
    .maybeSingle();

  if (taskError) throw new AppError(taskError.message, 500);

  if (!updatedTask) {
    throw new AppError(
      "Task was modified by another user. Please refresh and try again.",
      409
    );
  }

  const { error } = await supabase
    .from("task_assignees")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", assigneeId);

  if (error) throw new AppError(error.message, 500);

  return {
    taskId,
    updatedAt: updatedTask.updated_at,
  };
}
