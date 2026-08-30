import { get, post, patch, del } from "../lib/api-client";
import type { Workspace } from "../types/database";

const getWorkspaces = (): Promise<Workspace[]> =>
  get("/api/workspaces");

const createWorkspace = (name: string): Promise<Workspace> =>
  post("/api/workspaces", { name });

const getWorkspace = (workspaceId: string): Promise<Workspace> =>
  get(`/api/workspaces/${workspaceId}`);

const updateWorkspace = (
  workspaceId: string,
  name: string
): Promise<Workspace> =>
  patch(`/api/workspaces/${workspaceId}`, { name });

const deleteWorkspace = (workspaceId: string) =>
  del(`/api/workspaces/${workspaceId}`);

export {
  getWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
};