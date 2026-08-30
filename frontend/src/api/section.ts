import { get, post, patch, del } from "../lib/api-client";
import type { Section } from "../types/database";

const getSections = (projectId: string): Promise<Section[]> =>
  get(`/api/projects/${projectId}/sections`);

const createSection = (
  projectId: string,
  name: string
): Promise<Section> =>
  post(`/api/projects/${projectId}/sections`, {
    name,
  });

const updateSection = (
  projectId: string,
  sectionId: string,
  updates: {
    name?: string;
    description?: string | null;
    position?: number;
  }
): Promise<Section> =>
  patch(
    `/api/projects/${projectId}/sections/${sectionId}`,
    updates
  );

const deleteSection = (
  projectId: string,
  sectionId: string
) =>
  del(
    `/api/projects/${projectId}/sections/${sectionId}`
  );

export {
  getSections,
  createSection,
  updateSection,
  deleteSection,
};