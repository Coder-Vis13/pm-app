import { Router } from "express";
import { getUserId } from "../utils/auth";
import {
  getProjectHistory,
  getTaskAssigneeEvents,
  getTaskHistory,
  getTaskStatusDuration,
} from "../services/historyService";
import { listAuditLog, verifyAuditChain } from "../services/auditService";
import { requireProjectAccess, validateTaskAccess } from "../services/accessService";

const router = Router();

router.get("/tasks/:taskId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await validateTaskAccess(userId, req.params.taskId);
    const history = await getTaskHistory(req.params.taskId);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// DEL LATER 
router.get("/tasks/:taskId/segments", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await validateTaskAccess(userId, req.params.taskId);
    const segments = await getTaskStatusDuration(req.params.taskId);
    res.json(segments);
  } catch (err) {
    next(err);
  }
});

// DEL LATER 
router.get("/projects/:projectId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await requireProjectAccess(userId, req.params.projectId, "viewer");
    const history = await getProjectHistory(req.params.projectId);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// DEL LATER 
router.get("/audit", async (_req, res, next) => {
  try {
    const result = await verifyAuditChain();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// DEL LATER 
router.get("/audit/entries", async (_req, res, next) => {
  try {
    const entries = await listAuditLog();
    res.json(entries);
  } catch (err) {
    next(err);
  }
});


router.get("/tasks/:taskId/assignee-events", async (req, res, next) => {
  try {
    const userId = getUserId(req);

    await validateTaskAccess(userId, req.params.taskId);

    const events = await getTaskAssigneeEvents(req.params.taskId);

    res.json(events);
  } catch (err) {
    next(err);
  }
});


export default router;
