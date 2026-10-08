import { supabase } from "../lib/supabaseClient";
import { AppError } from "../lib/errors";
import { Task, TaskImpact } from "../types/database";
import { getBlockedTasks, getTransitiveDependents } from "../utils/graph";
import { getProjectDeps } from "./dependencyService";


async function loadProjectTasks(projectId: string): Promise<Map<string, Task>> {
  const { data, error } = await supabase
    .from("task")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_deleted", false);

  if (error) throw new AppError(error.message, 500);

  const map = new Map<string, Task>();
  for (const task of data ?? []) {
    map.set(task.id, task as Task);
  }
  return map;
}


//Calc how many tasks depend on this task
export async function getTaskImpact(taskId: string): Promise<TaskImpact> {
  const { data: task, error } = await supabase
    .from("task")
    .select("project_id")
    .eq("id", taskId)
    .single();

  if (error || !task?.project_id) throw new AppError("Task not found", 404);

  const deps = await getProjectDeps(task.project_id);
  const direct = getBlockedTasks(taskId, deps);
  const all = getTransitiveDependents(taskId, deps);

  const taskMap = await loadProjectTasks(task.project_id);

  let blockedDependents = 0;

  for (const id of all) {
    const t = taskMap.get(id);
    if (t && (t.status === "blocked" || t.status === "waiting")) {
      blockedDependents++;
    }
  }

  return {
    taskId,
    directDependents: direct.length,
    totalDependents: all.size,
    blockedDependents,
  };
}

