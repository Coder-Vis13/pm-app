import { Router } from "express";
import { getUserId } from "../utils/auth";
import {
  getProjectWorkflowMetrics,
  getProjectOverview,
  getProjectOverviewCore,
  getProjectSectionProgress,
  getProjectTaskCounts,
  getHomeProjectOverviews,
  getUserFocusSignals,
  // calcProjectRiskScores,
} from "../services/workflowMetricsService";

const router = Router();

router.post("/projects/home-overviews", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const projectIds = req.body?.projectIds;

    if (!Array.isArray(projectIds)) {
      return res.status(400).json({ message: "projectIds must be an array" });
    }

    const overviews = await getHomeProjectOverviews(projectIds, userId);
    res.json({ overviews });
  } catch (err) {
    next(err);
  }
});

router.get("/projects/:projectId/metrics", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const metrics = await getProjectWorkflowMetrics(req.params.projectId, userId);
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

router.get("/projects/:projectId/overview", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const overview = await getProjectOverview(req.params.projectId, userId);
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

router.get("/projects/:projectId/overview-core", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const core = await getProjectOverviewCore(req.params.projectId, userId);
    res.json(core);
  } catch (err) {
    next(err);
  }
});

router.get("/projects/:projectId/task-counts", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const counts = await getProjectTaskCounts(req.params.projectId, userId);
    res.json(counts);
  } catch (err) {
    next(err);
  }
});

router.get("/projects/:projectId/sections/progress", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const progress = await getProjectSectionProgress(
      req.params.projectId,
      userId
    );
    res.json(progress);
  } catch (err) {
    next(err);
  }
});

router.get("/projects/:projectId/users/:targetUserId/focus", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { requireProjectAccess } = await import("../services/accessService");
    await requireProjectAccess(userId, req.params.projectId, "viewer");
    const signals = await getUserFocusSignals(
      req.params.targetUserId,
      req.params.projectId
    );
    res.json(signals);
  } catch (err) {
    next(err);
  }
});

export default router;
