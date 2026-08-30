// const getCurrentUserId = (): string => {
//   const userId = import.meta.env.VITE_USER_ID;

//   if (!userId) {
//     throw new Error("VITE_USER_ID is not configured.");
//   }

//   return userId;
// };

// export { getCurrentUserId };


import { get } from "@/lib/api-client";
import type {
  ProjectMemberWithUser,
} from "@/types/database";



const getProjectMembers = (
  projectId: string
): Promise<ProjectMemberWithUser[]> =>
  get(`/api/projects/${projectId}/members`);

export {
  getProjectMembers,
};