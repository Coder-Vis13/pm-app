import { get, post, del } from "../lib/api-client";
import type { TaskDep } from "../types/database";


export interface TaskDependencyDetails {
  id: string;
  blocking_task_id: string | null;
  blocked_task_id: string | null;
  created_at: string | null;
  blocking_task_title: string | null;
  blocked_task_title: string | null;
}


const getTaskDependencies = (
  taskId: string
): Promise<TaskDep[]> =>
  get(`/api/dependencies/task/${taskId}`);

const createDependency = (
  blockingTaskId: string,
  blockedTaskId: string
): Promise<TaskDep> =>
  post("/api/dependencies", {
    blockingTaskId,
    blockedTaskId,
  });

const deleteDependency = (depId: string) =>
  del(`/api/dependencies/${depId}`);

const getTaskDependencyDetails = (
  taskId: string
): Promise<TaskDependencyDetails[]> =>
  get(`/api/dependencies/task/${taskId}/details`);

export {
  getTaskDependencies,
  createDependency,
  deleteDependency,
  getTaskDependencyDetails,
};