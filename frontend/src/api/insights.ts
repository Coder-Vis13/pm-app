import { get, post } from "../lib/api-client";
import type { ProjectInsight } from "../types/database";

const computeProjectInsights = (
  projectId: string
): Promise<ProjectInsight[]> =>
  post(`/api/insights/projects/${projectId}/compute`);

const getProjectInsights = (
  projectId: string
): Promise<ProjectInsight[]> =>
  get(`/api/insights/projects/${projectId}`);

export {
  computeProjectInsights,
  getProjectInsights,
};