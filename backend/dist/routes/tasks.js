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
router.post("/project/:projectId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const task = await (0, taskService_1.createTask)({
            title: req.body.title,
            projectId: req.params.projectId,
            sectionId: req.body.sectionId,
            userId,
            description: req.body.description,
            priority: req.body.priority,
            startDate: req.body.startDate,
            dueDate: req.body.dueDate,
        });
        res.status(201).json(task);
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
        await (0, taskService_1.deleteTask)(req.params.taskId, userId);
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
        const task = await (0, taskService_1.updateTaskStatus)(req.params.taskId, userId, status);
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
router.get("/:taskId/critical-path", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        await (0, taskService_1.getTaskById)(req.params.taskId, userId);
        const path = await (0, dependencyAnalysisService_1.getCriticalPathToTask)(req.params.taskId);
        res.json(path);
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
        const row = await (0, assigneeService_1.addAssignee)(req.params.taskId, userId, req.body.assigneeId);
        res.status(201).json(row);
    }
    catch (err) {
        next(err);
    }
});
router.delete("/:taskId/assignees/:assigneeId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        await (0, assigneeService_1.removeAssignee)(req.params.taskId, userId, req.params.assigneeId);
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
