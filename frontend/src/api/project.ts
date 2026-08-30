import { get, post, patch, del } from "../lib/api-client";
import type {
  Project,
  ProjectMember,
  RoleType,
} from "../types/database";

const createProject = (
  name: string,
  workspaceId: string,
  description?: string
): Promise<Project> =>
  post("/api/projects", {
    name,
    workspaceId,
    description,
  });

const getProjects = (workspaceId: string): Promise<Project[]> =>
  get(`/api/projects/workspace/${workspaceId}`);

const getProject = (projectId: string): Promise<Project> =>
  get(`/api/projects/${projectId}`);

const updateProject = (
  projectId: string,
  updates: {
    name?: string;
    description?: string | null;
  }
): Promise<Project> =>
  patch(`/api/projects/${projectId}`, updates);

const deleteProject = (projectId: string) =>
  del(`/api/projects/${projectId}`);

const addProjectMember = (
  projectId: string,
  memberUserId: string,
  role: RoleType = "viewer"
): Promise<ProjectMember> =>
  post(`/api/projects/${projectId}/members`, {
    memberUserId,
    role,
  });

const removeProjectMember = (
  projectId: string,
  memberUserId: string
) =>
  del(`/api/projects/${projectId}/members/${memberUserId}`);

export {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
};