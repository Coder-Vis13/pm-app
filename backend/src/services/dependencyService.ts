import { supabase } from "../lib/supabaseClient";
import { AppError } from "../lib/errors";
import { TaskDep } from "../types/database";
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
  const currentTask = await validateTaskAccess(userId, taskId);

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
    .select(
      "id, title, status, start_date, due_date, is_deleted"
    )
    .in("id", taskIds);

  if (taskError) {
    throw new AppError(taskError.message, 500);
  }

  const taskById = new Map(
    (tasks ?? []).map((task) => [task.id, task])
  );

  const currentTaskData = taskById.get(currentTask.id) ?? currentTask;

  return deps.map((dep) => {
    const blockingTask = dep.blocking_task_id
      ? taskById.get(dep.blocking_task_id)
      : undefined;
    const blockedTask = dep.blocked_task_id
      ? taskById.get(dep.blocked_task_id)
      : undefined;

    const blockingDueDate = blockingTask?.due_date
      ? new Date(blockingTask.due_date).getTime()
      : null;
    const blockedStartDate = blockedTask?.start_date
      ? new Date(blockedTask.start_date).getTime()
      : null;
    const blockedDueDate = blockedTask?.due_date
      ? new Date(blockedTask.due_date).getTime()
      : null;

    const dateConflict =
      blockingTask?.is_deleted === false &&
      blockedTask?.is_deleted === false &&
      blockingTask.status !== "done" &&
      blockingDueDate !== null &&
      ((blockedStartDate !== null &&
        blockedStartDate < blockingDueDate) ||
        (blockedDueDate !== null &&
          blockedDueDate < blockingDueDate));

    return {
      ...dep,
      blocking_task_title: blockingTask?.title ?? "Unknown task",
      blocking_task_status: blockingTask?.status ?? null,
      blocking_task_start_date: blockingTask?.start_date ?? null,
      blocking_task_due_date: blockingTask?.due_date ?? null,
      blocking_task_is_deleted: blockingTask?.is_deleted ?? null,
      blocked_task_title: blockedTask?.title ?? "Unknown task",
      blocked_task_status:
        blockedTask?.status ?? currentTaskData.status ?? null,
      blocked_task_start_date:
        blockedTask?.start_date ?? currentTaskData.start_date ?? null,
      blocked_task_due_date:
        blockedTask?.due_date ?? currentTaskData.due_date ?? null,
      blocked_task_is_deleted:
        blockedTask?.is_deleted ?? currentTaskData.is_deleted ?? null,
      date_conflict: dateConflict,
    };
  });
}
