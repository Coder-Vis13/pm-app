import { TaskDep } from "../types/database";


// Tasks waiting on this task to finish
export function getBlockedTasks(
  taskId: string,
  deps: TaskDep[]
): string[] {
  return deps
    .filter((d) => d.blocking_task_id === taskId && d.blocked_task_id)
    .map((d) => d.blocked_task_id as string);
}


// All tasks transitively waiting on this task
//bfs using queue
export function getTransitiveDependents(
  taskId: string,
  deps: TaskDep[]
): Set<string> {
  const result = new Set<string>();
  const queue = getBlockedTasks(taskId, deps);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (result.has(current)) continue;
    result.add(current);
    queue.push(...getBlockedTasks(current, deps));
  }

  return result;
}
