import { get, post, patch, del } from "../lib/api-client";
import type {
  CriticalPathResult,
  PriorityLevel,
  StatusType,
  Task,
  TaskAssignee,
  TaskImpact,
  AddTaskAssigneeResponse,
  RemoveTaskAssigneeResponse,
  SectionTaskSummary,
  SectionTask,
  Subtask,
} from "../types/database";

const getTasks = (projectId: string): Promise<Task[]> =>
  get(`/api/tasks/project/${projectId}`);

const createTask = (
  projectId: string,
  task: {
    title: string;
    sectionId: string;
    description?: string;
    priority?: PriorityLevel;
    status?: StatusType;
    startDate?: string;
    dueDate?: string;
    parentTaskId?: string;
  }
): Promise<Task> =>
  post(`/api/tasks/project/${projectId}`, task);

const getSubtasks = (
  taskId: string
): Promise<SectionTask[]> =>
  get(`/api/tasks/${taskId}/subtasks`);


const createSubtask = (
  taskId: string,
  input: {
    title: string;
    description?: string;
    priority?: PriorityLevel;
    startDate?: string;
    dueDate?: string;
  }
): Promise<Subtask> =>
  post(`/api/tasks/${taskId}/subtasks`, input);

const getSectionTasks = (
  projectId: string,
  sectionId: string,
  status?: StatusType
): Promise<SectionTask[]> => {
  const params = status ? { status } : undefined;

  return get(
    `/api/tasks/project/${projectId}/section/${sectionId}`,
    params
  );
};

const getSectionTaskSummary = (
  projectId: string,
  sectionId: string
): Promise<SectionTaskSummary> =>
  get(
    `/api/tasks/project/${projectId}/section/${sectionId}/summary`
  );


const getTask = (taskId: string): Promise<Task> =>
  get(`/api/tasks/${taskId}`);

const updateTask = (
  taskId: string,
  updates: {
    title?: string;
    description?: string;
    priority?: PriorityLevel;
    startDate?: string | null;
    dueDate?: string | null;
    sectionId?: string;
    delayCauseId?: string | null;
    expectedUpdatedAt: string;
  }
): Promise<Task> =>
  patch(`/api/tasks/${taskId}`, updates);

const deleteTask = (
  taskId: string,
  expectedUpdatedAt: string
): Promise<void> =>
  del(`/api/tasks/${taskId}`, {
    expectedUpdatedAt,
  });

const updateTaskStatus = (
  taskId: string,
  status: StatusType,
  expectedUpdatedAt: string
): Promise<Task> =>
  patch(`/api/tasks/${taskId}/status`, {
    status,
    expectedUpdatedAt,
  });

const getTaskDelayDays = (
  taskId: string
): Promise<{
  taskId: string;
  delayDays: number;
  status: StatusType;
}> =>
  get(`/api/tasks/${taskId}/delay-days`);

const getTaskImpact = (
  taskId: string
): Promise<TaskImpact> =>
  get(`/api/tasks/${taskId}/impact`);

const getTaskCriticalPath = (
  taskId: string
): Promise<CriticalPathResult> =>
  get(`/api/tasks/${taskId}/critical-path`);

const getTaskAssignees = (
  taskId: string
): Promise<TaskAssignee[]> =>
  get(`/api/tasks/${taskId}/assignees`);

const addTaskAssignee = (
  taskId: string,
  assigneeId: string,
  expectedUpdatedAt: string
): Promise<AddTaskAssigneeResponse> =>
  post(`/api/tasks/${taskId}/assignees`, {
    assigneeId,
    expectedUpdatedAt,
  });

const removeTaskAssignee = (
  taskId: string,
  assigneeId: string,
  expectedUpdatedAt: string
): Promise<RemoveTaskAssigneeResponse> =>
  del(`/api/tasks/${taskId}/assignees/${assigneeId}`, {
    expectedUpdatedAt,
  });

export {
  getTasks,
  createTask,
  getTask,
  getSectionTasks,
  getSectionTaskSummary,
  updateTask,
  deleteTask,
  updateTaskStatus,
  getTaskDelayDays,
  getTaskImpact,
  getTaskCriticalPath,
  getTaskAssignees,
  addTaskAssignee,
  removeTaskAssignee,
  getSubtasks,
  createSubtask
};