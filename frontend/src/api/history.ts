import { get } from "../lib/api-client";
import type {
  StatusTimeline,
  TaskHistory,
} from "../types/database";

const getTaskHistory = (
  taskId: string
): Promise<TaskHistory[]> =>
  get(`/api/history/tasks/${taskId}`);

const getTaskStatusSegments = (
  taskId: string
): Promise<StatusTimeline[]> =>
  get(`/api/history/tasks/${taskId}/segments`);

const getProjectHistory = (
  projectId: string
): Promise<TaskHistory[]> =>
  get(`/api/history/projects/${projectId}`);

const verifyAuditChain = () =>
  get("/api/history/audit");

const getAuditEntries = () =>
  get("/api/history/audit/entries");

export {
  getTaskHistory,
  getTaskStatusSegments,
  getProjectHistory,
  verifyAuditChain,
  getAuditEntries,
};