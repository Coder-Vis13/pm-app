"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../utils/auth");
const taskService_1 = require("../services/taskService");
const dependencyAnalysisService_1 = require("../services/dependencyAnalysisService");
const assigneeService_1 = require("../services/assigneeService");
const router = (0, express_1.Router)();
router.get("/project/:projectId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const tasks = await (0, taskService_1.listTasks)(req.params.projectId, userId);
        res.json(tasks);
    }
    catch (err) {
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
        const userId = (0, auth_1.getUserId)(req);
        const tasks = await (0, taskService_1.listMyTasks)(userId);
        res.json(tasks);
    }
    catch (err) {
        next(err);
    }
});
router.post("/project/:projectId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const validStatuses = [
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
        const task = await (0, taskService_1.createTask)({
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
    }
    catch (err) {
        next(err);
    }
});
router.get("/project/:projectId/section/:sectionId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const rawStatus = req.query.status;
        let status;
        if (rawStatus !== undefined) {
            if (typeof rawStatus !== "string") {
                return res.status(400).json({
                    message: "Status should be a single value",
                });
            }
            const validStatuses = [
                "to_do",
                "in_progress",
                "waiting",
                "blocked",
                "done",
            ];
            if (!validStatuses.includes(rawStatus)) {
                return res.status(400).json({
                    message: "Invalid task status",
                });
            }
            status = rawStatus;
        }
        const tasks = await (0, taskService_1.listSectionTasks)(req.params.projectId, req.params.sectionId, userId, status);
        res.json(tasks);
    }
    catch (err) {
        next(err);
    }
});
router.get("/project/:projectId/section/:sectionId/summary", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const summary = await (0, taskService_1.getSectionTaskSummary)(req.params.projectId, req.params.sectionId, userId);
        res.json(summary);
    }
    catch (err) {
        next(err);
    }
});
router.post("/:taskId/subtasks", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const subtask = await (0, taskService_1.createSubtask)(req.params.taskId, userId, {
            title: req.body.title,
            description: req.body.description,
            priority: req.body.priority,
            startDate: req.body.startDate,
            dueDate: req.body.dueDate,
        });
        res.status(201).json(subtask);
    }
    catch (err) {
        next(err);
    }
});
router.get("/:taskId/subtasks", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const subtasks = await (0, taskService_1.getSubtasks)(req.params.taskId, userId);
        res.json(subtasks);
    }
    catch (err) {
        next(err);
    }
});
router.get("/:taskId/detail", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const bundle = await (0, taskService_1.getTaskDetailBundle)(req.params.taskId, userId);
        res.json(bundle);
    }
    catch (err) {
        next(err);
    }
});
router.get("/:taskId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const task = await (0, taskService_1.getTaskById)(req.params.taskId, userId);
        res.json(task);
    }
    catch (err) {
        next(err);
    }
});
router.patch("/:taskId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const task = await (0, taskService_1.updateTask)(req.params.taskId, userId, {
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
    }
    catch (err) {
        next(err);
    }
});
router.delete("/:taskId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        await (0, taskService_1.deleteTask)(req.params.taskId, userId, req.body.expectedUpdatedAt);
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
router.patch("/:taskId/status", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const status = req.body.status;
        const task = await (0, taskService_1.updateTaskStatus)(req.params.taskId, userId, status, req.body.expectedUpdatedAt);
        res.json(task);
    }
    catch (err) {
        next(err);
    }
});
router.get("/:taskId/delay-days", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const task = await (0, taskService_1.getTaskById)(req.params.taskId, userId);
        const delayDays = await (0, taskService_1.getDelayDays)(task);
        res.json({ taskId: task.id, delayDays, status: task.status });
    }
    catch (err) {
        next(err);
    }
});
router.get("/:taskId/impact", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        await (0, taskService_1.getTaskById)(req.params.taskId, userId);
        const impact = await (0, dependencyAnalysisService_1.getTaskImpact)(req.params.taskId);
        res.json(impact);
    }
    catch (err) {
        next(err);
    }
});
router.get("/:taskId/assignees", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const assignees = await (0, assigneeService_1.listAssignees)(req.params.taskId, userId);
        res.json(assignees);
    }
    catch (err) {
        next(err);
    }
});
router.post("/:taskId/assignees", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const row = await (0, assigneeService_1.addAssignee)(req.params.taskId, userId, req.body.assigneeId, req.body.expectedUpdatedAt);
        res.status(201).json(row);
    }
    catch (err) {
        next(err);
    }
});
router.delete("/:taskId/assignees/:assigneeId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const result = await (0, assigneeService_1.removeAssignee)(req.params.taskId, userId, req.params.assigneeId, req.body.expectedUpdatedAt);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
