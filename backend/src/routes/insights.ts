import { Router } from "express";
import { getUserId } from "../utils/auth";
import { requireProjectAccess } from "../services/accessService";
import {
  computeProjectInsights,
  getProjectInsights,
} from "../services/insightsService";

const router = Router();

/**
 * Compute a fresh snapshot of AI insights.
 */
router.post(
  "/projects/:projectId/compute",
  async (req, res, next) => {
    try {
      const userId = getUserId(req);

      await requireProjectAccess(
        userId,
        req.params.projectId,
        "viewer"
      );

      const insights = await computeProjectInsights(req.params.projectId);

      res.json(insights);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Get latest persisted insights.
 */
router.get(
  "/projects/:projectId",
  async (req, res, next) => {
    try {
      const userId = getUserId(req);

      await requireProjectAccess(
        userId,
        req.params.projectId,
        "viewer"
      );

      const insights = await getProjectInsights(req.params.projectId);

      res.json(insights);
    } catch (err) {
      next(err);
    }
  }
);

export default router;