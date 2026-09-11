import { raw, Router } from "express";
import { getUserId } from "../utils/auth";
import {
  createTask,
  createSubtask,
  deleteTask,
  getDelayDays,
  getSubtasks,
  getTaskById,
  listTasks,
  listSectionTasks,
  getSectionTaskSummary,
  updateTask,
  updateTaskStatus,
  listMyTasks,
} from "../services/taskService";
import { getCriticalPathToTask, getTaskImpact } from "../services/dependencyAnalysisService";
import { addAssignee, listAssignees, removeAssignee } from "../services/assigneeService";
import { StatusType } from "../types/database";

const router = Router();

router.get("/project/:projectId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const tasks = await listTasks(req.params.projectId, userId);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});


/**
 * Get all active tasks assigned to the current user.
 *
 * IMPORTANT:
 * This route must stay above "/:taskId" so "my" is not
 * interpreted as a task ID.
 */
router.get("/my", async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const tasks = await listMyTasks(userId);

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});


router.post("/project/:projectId", async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const validStatuses: StatusType[] = [
      "to_do",
      "in_progress",
      "waiting",
      "blocked",
      "done",
    ];

    const status = req.body.status ?? "to_do";

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid task status",
      });
    }

    const task = await createTask({
      title: req.body.title,
      projectId: req.params.projectId,
      sectionId: req.body.sectionId,
      userId,
      description: req.body.description,
      priority: req.body.priority,
      status,
      startDate: req.body.startDate,
      dueDate: req.body.dueDate,
      parentTaskId: req.body.parentTaskId,
    });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});


router.get(
  "/project/:projectId/section/:sectionId",
  async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const rawStatus = req.query.status;

      let status: StatusType | undefined;

      if (rawStatus !== undefined) {
        if (typeof rawStatus !== "string") {
          return res.status(400).json({
            message: "Status should be a single value",
          });
        }

        const validStatuses: StatusType[] = [
          "to_do",
          "in_progress",
          "waiting",
          "blocked",
          "done",
        ];

        if (!validStatuses.includes(rawStatus as StatusType)) {
          return res.status(400).json({
            message: "Invalid task status",
          });
        }

        status = rawStatus as StatusType;
      }

      const tasks = await listSectionTasks(
        req.params.projectId,
        req.params.sectionId,
        userId,
        status
      );

      res.json(tasks);
    } catch (err) {
      next(err);
    }
  }
);


router.get(
  "/project/:projectId/section/:sectionId/summary",
  async (req, res, next) => {
    try {
      const userId = getUserId(req);

      const summary = await getSectionTaskSummary(
        req.params.projectId,
        req.params.sectionId,
        userId
      );

      res.json(summary);
    } catch (err) {
      next(err);
    }
  }
);

router.post("/:taskId/subtasks", async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const subtask = await createSubtask(
      req.params.taskId,
      userId,
      {
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority,
        startDate: req.body.startDate,
        dueDate: req.body.dueDate,
      }
    );

    res.status(201).json(subtask);
  } catch (err) {
    next(err);
  }
});


router.get("/:taskId/subtasks", async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const subtasks = await getSubtasks(
      req.params.taskId,
      userId
    );

    res.json(subtasks);
  } catch (err) {
    next(err);
  }
});


router.get("/:taskId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const task = await getTaskById(req.params.taskId, userId);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.patch("/:taskId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const task = await updateTask(req.params.taskId, userId, {
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      startDate: req.body.startDate,
      dueDate: req.body.dueDate,
      sectionId: req.body.sectionId,
      delayCauseId: req.body.delayCauseId,
      expectedUpdatedAt: req.body.expectedUpdatedAt,
    });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.delete("/:taskId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await deleteTask(req.params.taskId, userId, req.body.expectedUpdatedAt);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.patch("/:taskId/status", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const status = req.body.status as StatusType;
    const task = await updateTaskStatus(req.params.taskId, userId, status, req.body.expectedUpdatedAt);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.get("/:taskId/delay-days", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const task = await getTaskById(req.params.taskId, userId);
    const delayDays = await getDelayDays(task);
    res.json({ taskId: task.id, delayDays, status: task.status });
  } catch (err) {
    next(err);
  }
});

router.get("/:taskId/impact", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await getTaskById(req.params.taskId, userId);
    const impact = await getTaskImpact(req.params.taskId);
    res.json(impact);
  } catch (err) {
    next(err);
  }
});

router.get("/:taskId/critical-path", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await getTaskById(req.params.taskId, userId);
    const path = await getCriticalPathToTask(req.params.taskId);
    res.json(path);
  } catch (err) {
    next(err);
  }
});

router.get("/:taskId/assignees", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const assignees = await listAssignees(req.params.taskId, userId);
    res.json(assignees);
  } catch (err) {
    next(err);
  }
});

router.post("/:taskId/assignees", async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const row = await addAssignee(
      req.params.taskId,
      userId,
      req.body.assigneeId,
      req.body.expectedUpdatedAt
    );

    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

router.delete("/:taskId/assignees/:assigneeId", async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const result = await removeAssignee(
      req.params.taskId,
      userId,
      req.params.assigneeId,
      req.body.expectedUpdatedAt
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
