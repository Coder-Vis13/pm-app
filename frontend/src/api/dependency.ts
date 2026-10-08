import { get, post, del } from "../lib/api-client";
import type { StatusType, TaskDep } from "../types/database";


export interface TaskDependencyDetails {
  id: string;
  blocking_task_id: string | null;
  blocked_task_id: string | null;
  created_at: string | null;

  blocking_task_title: string | null;
  blocking_task_status: StatusType | null;
  blocking_task_start_date: string | null;
  blocking_task_due_date: string | null;
  blocking_task_is_deleted: boolean | null;

  blocked_task_title: string | null;
  blocked_task_status: StatusType | null;
  blocked_task_start_date: string | null;
  blocked_task_due_date: string | null;
  blocked_task_is_deleted: boolean | null;

  date_conflict: boolean;
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