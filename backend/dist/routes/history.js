"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../utils/auth");
const historyService_1 = require("../services/historyService");
const auditService_1 = require("../services/auditService");
const accessService_1 = require("../services/accessService");
const router = (0, express_1.Router)();
router.get("/tasks/:taskId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        await (0, accessService_1.validateTaskAccess)(userId, req.params.taskId);
        const history = await (0, historyService_1.getTaskHistory)(req.params.taskId);
        res.json(history);
    }
    catch (err) {
        next(err);
    }
});
// DEL LATER 
router.get("/tasks/:taskId/segments", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        await (0, accessService_1.validateTaskAccess)(userId, req.params.taskId);
        const segments = await (0, historyService_1.getTaskStatusDuration)(req.params.taskId);
        res.json(segments);
    }
    catch (err) {
        next(err);
    }
});
// DEL LATER 
router.get("/projects/:projectId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        await (0, accessService_1.requireProjectAccess)(userId, req.params.projectId, "viewer");
        const history = await (0, historyService_1.getProjectHistory)(req.params.projectId);
        res.json(history);
    }
    catch (err) {
        next(err);
    }
});
// DEL LATER 
router.get("/audit", async (_req, res, next) => {
    try {
        const result = await (0, auditService_1.verifyAuditChain)();
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// DEL LATER 
router.get("/audit/entries", async (_req, res, next) => {
    try {
        const entries = await (0, auditService_1.listAuditLog)();
        res.json(entries);
    }
    catch (err) {
        next(err);
    }
});
router.get("/tasks/:taskId/assignee-events", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        await (0, accessService_1.validateTaskAccess)(userId, req.params.taskId);
        const events = await (0, historyService_1.getTaskAssigneeEvents)(req.params.taskId);
        res.json(events);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
