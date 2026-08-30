import { supabase } from "../lib/supabaseClient";
import { AppError } from "../lib/errors";
import { PriorityLevel, StatusType, Task, SectionTask, SectionTaskSummary, } from "../types/database";
import {
  requireProjectAccess,
  validateTaskAccess,
} from "./accessService";
import { checkSectionInProject } from "./sectionService";
import { taskHistoryEntry } from "./auditService";
import { getProjectDeps } from "./dependencyService";

interface CreateTaskInput {
  title: string;
  projectId: string;
  sectionId: string;
  userId: string;
  description?: string;
  priority?: PriorityLevel;
  startDate?: string;
  dueDate?: string;
  parentTaskId?: string;
  status?: StatusType;
}

interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: PriorityLevel;
  startDate?: string | null;
  dueDate?: string | null;
  sectionId?: string;
  delayCauseId?: string | null;
  // Timestamp of the task version the client last read.
  // Used to detect concurrent edits.
  expectedUpdatedAt: string;
}


async function checkParentTask(
  parentTaskId: string,
  projectId: string,
  sectionId: string
) {
  const { data: parent, error } = await supabase
    .from("task")
    .select("id, project_id, section_id, parent_task_id")
    .eq("id", parentTaskId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) {
    throw new AppError(error.message, 500);
  }

  if (!parent) {
    throw new AppError("Parent task not found", 404);
  }

  if (parent.project_id !== projectId) {
    throw new AppError(
      "Parent task must belong to the same project",
      400
    );
  }

  if (parent.section_id !== sectionId) {
    throw new AppError(
      "Subtask must belong to the same section as its parent task",
      400
    );
  }

  if (parent.parent_task_id) {
    throw new AppError(
      "Subtasks cannot have their own subtasks",
      400
    );
  }
}

//Editor check, section validation, assign position, insert with status: "to_do", seal audit
export async function createTask(input: CreateTaskInput) {
  const {
    title,
    projectId,
    sectionId,
    userId,
    description,
    priority = "medium",
    status = "to_do",
    startDate,
    dueDate,
    parentTaskId,
  } = input;

  await requireProjectAccess(userId, projectId, "editor");
  await checkSectionInProject(sectionId, projectId);

  if (parentTaskId) {
  await checkParentTask(
    parentTaskId,
    projectId,
    sectionId
  );
}

  const { data: existing, error: posError } = await supabase
    .from("task")
    .select("position")
    .eq("section_id", sectionId)
    .eq("is_deleted", false)
    .order("position", { ascending: false })
    .limit(1);

  if (posError) throw new AppError(posError.message, 500);
  const nextPosition = existing?.length ? (existing[0].position ?? 0) + 1 : 1;

  const { data, error } = await supabase
    .from("task")
    .insert({
      title,
      description: description ?? null,
      project_id: projectId,
      section_id: sectionId,
      parent_task_id: parentTaskId ?? null,
      priority,
      position: nextPosition,
      created_by: userId,
      start_date: startDate ?? null,
      due_date: dueDate ?? null,
      status,
    })
    .select()
    .single();

  if (error) throw new AppError(error.message, 500);

  await taskHistoryEntry(data.id);
  return data;
}
export async function createSubtask(
  parentTaskId: string,
  userId: string,
  input: {
    title: string;
    description?: string;
    priority?: PriorityLevel;
    startDate?: string;
    dueDate?: string;
  }
) {
  const parent = await validateTaskAccess(
    userId,
    parentTaskId
  );

  if (!parent.project_id || !parent.section_id) {
    throw new AppError(
      "Parent task is missing project or section information",
      400
    );
  }

  const { data: parentAssignees, error: assigneeError } =
    await supabase
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", parentTaskId);

  if (assigneeError) {
    throw new AppError(assigneeError.message, 500);
  }

  const subtask = await createTask({
    ...input,
    projectId: parent.project_id,
    sectionId: parent.section_id,
    userId,
    parentTaskId,
  });

  if (parentAssignees?.length) {
    const { error } = await supabase
      .from("task_assignees")
      .insert({
        task_id: subtask.id,
        user_id: parentAssignees[0].user_id,
      });

    if (error) {
      throw new AppError(error.message, 500);
    }
  }

  return subtask;
}


//get tasks with access checks
export async function listTasks(projectId: string, userId: string) {
  await requireProjectAccess(userId, projectId, "viewer");

  const { data, error } = await supabase
    .from("task")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_deleted", false)
    .order("position", { ascending: true });

  if (error) throw new AppError(error.message, 500);
  return data ?? [];
}


export async function listSectionTasks(projectId: string, sectionId: string, userId: string, status?: StatusType) {
  await requireProjectAccess(userId, projectId, "viewer");
  await checkSectionInProject(sectionId, projectId);

  let query = supabase
  .from("task")
  .select("*")
  .eq("project_id", projectId)
  .eq("section_id", sectionId)
  .eq("is_deleted", false)
  .is("parent_task_id", null)
  .order("position", { ascending: true });

  if (status !== undefined) {
    query = query.eq("status", status);
  }
  const {data: tasks , error} = await query;

  if (error) throw new AppError(error.message, 500);

  if (!tasks || tasks.length === 0) {
    return [];
  }

  const taskIds = tasks.map((task) => task.id); 

  const {data: assignees, error: assigneeError} = await supabase
  .from("task_assignees")
  .select("id, task_id, user_id, app_user(id, name, email, job_role_id)")
  .in("task_id", taskIds);

  if (assigneeError) {
    throw new AppError(assigneeError.message, 500);
  }

  const { data: subtasks, error: subtaskError } = await supabase
  .from("task")
  .select("id, parent_task_id")
  .in("parent_task_id", taskIds)
  .eq("is_deleted", false);

if (subtaskError) {
  throw new AppError(subtaskError.message, 500);
}

  const deps = await getProjectDeps(projectId);

  const assigneesByTask = new Map<string, typeof assignees>();

  for (const assignee of assignees ?? []) {
    if (!assignee.task_id) continue;
    const list = assigneesByTask.get(assignee.task_id) ?? [];
    list.push(assignee);
    assigneesByTask.set(assignee.task_id, list);
  }

  const subtaskCountByTask = new Map<string, number>();

for (const subtask of subtasks ?? []) {
  if (!subtask.parent_task_id) continue;

  subtaskCountByTask.set(
    subtask.parent_task_id,
    (subtaskCountByTask.get(subtask.parent_task_id) ?? 0) + 1
  );
}

  const dependencyCountByTask = new Map<string, number>();

  for (const dep of deps) {
    if (dep.blocking_task_id) {
      dependencyCountByTask.set(dep.blocking_task_id, (dependencyCountByTask.get(dep.blocking_task_id) ?? 0) + 1);
    }
    if (dep.blocked_task_id) {
      dependencyCountByTask.set(
        dep.blocked_task_id,
        (dependencyCountByTask.get(dep.blocked_task_id) ?? 0) + 1
      );
    }
  }

  return tasks.map(
  (task): SectionTask => ({
    ...task,
    assignees:
      (assigneesByTask.get(task.id) ??
        []) as SectionTask["assignees"],
    dependencyCount:
      dependencyCountByTask.get(task.id) ?? 0,
    subtaskCount:
      subtaskCountByTask.get(task.id) ?? 0,
  })
);
}


export async function getSectionTaskSummary(
  projectId: string,
  sectionId: string,
  userId: string
): Promise<SectionTaskSummary> {
  await requireProjectAccess(userId, projectId, "viewer");
  await checkSectionInProject(sectionId, projectId);

  const { data, error } = await supabase
    .from("task")
    .select("status")
    .eq("project_id", projectId)
    .eq("section_id", sectionId)
    .eq("is_deleted", false);

  if (error) throw new AppError(error.message, 500);

  const byStatus: Record<StatusType, number> = {
    to_do: 0,
    in_progress: 0,
    waiting: 0,
    blocked: 0,
    done: 0,
  };

  for (const task of data ?? []) {
    byStatus[task.status as StatusType]++;
  }

  const total = data?.length ?? 0;
  const completed = byStatus.done;

  return {
    sectionId,
    total,
    completed,
    remaining: total - completed,
    byStatus,
    progressPercent:
      total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}


//get single task with access checks
export async function getTaskById(taskId: string, userId: string) {
  return validateTaskAccess(userId, taskId);
}
export async function getSubtasks(
  taskId: string,
  userId: string
): Promise<SectionTask[]> {
  const parentTask = await validateTaskAccess(userId, taskId);

  const { data: tasks, error } = await supabase
    .from("task")
    .select("*")
    .eq("parent_task_id", taskId)
    .eq("project_id", parentTask.project_id)
    .eq("is_deleted", false)
    .order("position", { ascending: true });

  if (error) {
    throw new AppError(error.message, 500);
  }

  if (!tasks || tasks.length === 0) {
    return [];
  }

  const taskIds = tasks.map((task) => task.id);

  const { data: assignees, error: assigneeError } = await supabase
    .from("task_assignees")
    .select("id, task_id, user_id, app_user(id, name, email, job_role_id)")
    .in("task_id", taskIds);

  if (assigneeError) {
    throw new AppError(assigneeError.message, 500);
  }

  const deps = await getProjectDeps(parentTask.project_id!);

  const assigneesByTask = new Map<string, typeof assignees>();

  for (const assignee of assignees ?? []) {
    if (!assignee.task_id) continue;

    const list = assigneesByTask.get(assignee.task_id) ?? [];
    list.push(assignee);
    assigneesByTask.set(assignee.task_id, list);
  }

  const dependencyCountByTask = new Map<string, number>();

  for (const dep of deps) {
    if (dep.blocking_task_id) {
      dependencyCountByTask.set(
        dep.blocking_task_id,
        (dependencyCountByTask.get(dep.blocking_task_id) ?? 0) + 1
      );
    }

    if (dep.blocked_task_id) {
      dependencyCountByTask.set(
        dep.blocked_task_id,
        (dependencyCountByTask.get(dep.blocked_task_id) ?? 0) + 1
      );
    }
  }

  return tasks.map(
    (task): SectionTask => ({
      ...task,
      assignees:
        (assigneesByTask.get(task.id) ??
          []) as SectionTask["assignees"],
      dependencyCount:
        dependencyCountByTask.get(task.id) ?? 0,
      subtaskCount: 0,
    })
  );
}


//update task fields
// export async function updateTask(
//   taskId: string,
//   userId: string,
//   updates: UpdateTaskInput
// ) {
//   const task = await validateTaskAccess(userId, taskId);
//   await requireProjectAccess(userId, task.project_id!, "editor");

//   if (updates.sectionId) {
//     await checkSectionInProject(updates.sectionId, task.project_id!);
//   }

//   const payload: Record<string, unknown> = {
//     updated_at: new Date().toISOString(),
//   };

//   if (updates.title !== undefined) payload.title = updates.title;
//   if (updates.description !== undefined) payload.description = updates.description;
//   if (updates.priority !== undefined) payload.priority = updates.priority;
//   if (updates.startDate !== undefined) payload.start_date = updates.startDate;
//   if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
//   if (updates.sectionId !== undefined) payload.section_id = updates.sectionId;
//   if (updates.delayCauseId !== undefined) payload.delay_cause_id = updates.delayCauseId;

//   const { data, error } = await supabase
//     .from("task")
//     .update(payload)
//     .eq("id", taskId)
//     .select()
//     .single();

//   if (error) throw new AppError(error.message, 500);

//   await taskHistoryEntry(taskId);
//   return data;
// }


// Update task fields using optimistic concurrency control.
// The update only succeeds if the task has not changed since the client last read it.
export async function updateTask(
  taskId: string,
  userId: string,
  updates: UpdateTaskInput
) {
  const task = await validateTaskAccess(userId, taskId);
  await requireProjectAccess(userId, task.project_id!, "editor");

  if (updates.sectionId) {
    await checkSectionInProject(updates.sectionId, task.project_id!);
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) {
    payload.title = updates.title;
  }

  if (updates.description !== undefined) {
    payload.description = updates.description;
  }

  if (updates.priority !== undefined) {
    payload.priority = updates.priority;
  }

  if (updates.startDate !== undefined) {
    payload.start_date = updates.startDate;
  }

  if (updates.dueDate !== undefined) {
    payload.due_date = updates.dueDate;
  }

  if (updates.sectionId !== undefined) {
    payload.section_id = updates.sectionId;
  }

  if (updates.delayCauseId !== undefined) {
    payload.delay_cause_id = updates.delayCauseId;
  }

  // Only update if the task is still at the version the client read.
  const { data, error } = await supabase
    .from("task")
    .update(payload)
    .eq("id", taskId)
    .eq("updated_at", updates.expectedUpdatedAt)
    .select()
    .maybeSingle();

  if (error) {
    throw new AppError(error.message, 500);
  }

  // No row means somebody changed the task after the client read it.
  if (!data) {
    throw new AppError(
      "Task was changed by another user. Refresh the task and try again.",
      409
    );
  }

  await taskHistoryEntry(taskId);

  return data;
}

//update status of task
// export async function updateTaskStatus(
//   taskId: string,
//   userId: string,
//   status: StatusType
// ) {
//   const task = await validateTaskAccess(userId, taskId);
//   await requireProjectAccess(userId, task.project_id!, "editor");

//   const { data, error } = await supabase
//     .from("task")
//     .update({
//       status,
//       updated_at: new Date().toISOString(),
//     })
//     .eq("id", taskId)
//     .select()
//     .single();

//   if (error) throw new AppError(error.message, 500);

//   await taskHistoryEntry(taskId);
//   return data;
// }



// Update task status using optimistic concurrency control.
// Prevents an older client from overwriting a newer status change.
export async function updateTaskStatus(
  taskId: string,
  userId: string,
  status: StatusType,
  expectedUpdatedAt: string
) {
  const task = await validateTaskAccess(userId, taskId);
  await requireProjectAccess(userId, task.project_id!, "editor");

  const { data, error } = await supabase
    .from("task")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("updated_at", expectedUpdatedAt)
    .select()
    .maybeSingle();

  if (error) {
    throw new AppError(error.message, 500);
  }

  if (!data) {
    throw new AppError(
      "Task was changed by another user. Refresh the task and try again.",
      409
    );
  }

  await taskHistoryEntry(taskId);

  return data;
}


//Editor check → soft delete (compacts positions and logs history via DB triggers)
// export async function deleteTask(taskId: string, userId: string) {
//   const task = await validateTaskAccess(userId, taskId);
//   await requireProjectAccess(userId, task.project_id!, "editor");

//   const { error } = await supabase
//     .from("task")
//     .update({
//       is_deleted: true,
//       deleted_at: new Date().toISOString(),
//       updated_at: new Date().toISOString(),
//     })
//     .eq("id", taskId);

//   if (error) throw new AppError(error.message, 500);

//   await taskHistoryEntry(taskId);
// }


// // Soft-delete a task only if the client is deleting the version it last read.
// export async function deleteTask(
//   taskId: string,
//   userId: string,
//   expectedUpdatedAt: string
// ) {
//   const task = await validateTaskAccess(userId, taskId);
//   await requireProjectAccess(userId, task.project_id!, "editor");

//   const now = new Date().toISOString();

//   const { data, error } = await supabase
//     .from("task")
//     .update({
//       is_deleted: true,
//       deleted_at: now,
//       updated_at: now,
//     })
//     .eq("id", taskId)
//     .eq("updated_at", expectedUpdatedAt)
//     .select()
//     .maybeSingle();

//   if (error) {
//     throw new AppError(error.message, 500);
//   }

//   if (!data) {
//     throw new AppError(
//       "Task was changed by another user. Refresh the task before deleting it.",
//       409
//     );
//   }

//   await taskHistoryEntry(taskId);
// }


export async function deleteTask(
  taskId: string,
  userId: string,
  expectedUpdatedAt: string
) {
  const task = await validateTaskAccess(userId, taskId);

  await requireProjectAccess(
    userId,
    task.project_id!,
    "editor"
  );

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("task")
    .update({
      is_deleted: true,
      deleted_at: now,
      updated_at: now,
    })
    .eq("id", taskId)
    .eq("updated_at", expectedUpdatedAt)
    .select()
    .maybeSingle();

  if (error) {
    console.error("DELETE TASK - Supabase update failed:", error);

    throw new AppError(
      error.message,
      500
    );
  }

  if (!data) {
    throw new AppError(
      "Task was changed by another user. Refresh the task before deleting it.",
      409
    );
  }

  try {
    await taskHistoryEntry(taskId);
  } catch (error) {
    console.error(
      "DELETE TASK - history entry failed:",
      error
    );

    throw new AppError(
      "Task was deleted, but the history entry could not be recorded.",
      500
    );
  }
}

// Days a task has spent in blocked or waiting status (from history)
export async function getDelayDays(task: Task): Promise<number> {
  const { getTaskStatusDuration: getTaskStatusSegments, sumIdleHours } = await import("./historyService");
  const segments = await getTaskStatusSegments(task.id);
  return Math.floor(sumIdleHours(segments) / 24);
}
