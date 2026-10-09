"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../utils/auth");
const workflowMetricsService_1 = require("../services/workflowMetricsService");
const router = (0, express_1.Router)();
router.post("/projects/home-overviews", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const projectIds = req.body?.projectIds;
        if (!Array.isArray(projectIds)) {
            return res.status(400).json({ message: "projectIds must be an array" });
        }
        const overviews = await (0, workflowMetricsService_1.getHomeProjectOverviews)(projectIds, userId);
        res.json({ overviews });
    }
    catch (err) {
        next(err);
    }
});
router.get("/projects/:projectId/metrics", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const metrics = await (0, workflowMetricsService_1.getProjectWorkflowMetrics)(req.params.projectId, userId);
        res.json(metrics);
    }
    catch (err) {
        next(err);
    }
});
router.get("/projects/:projectId/overview", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const overview = await (0, workflowMetricsService_1.getProjectOverview)(req.params.projectId, userId);
        res.json(overview);
    }
    catch (err) {
        next(err);
    }
});
router.get("/projects/:projectId/overview-core", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const core = await (0, workflowMetricsService_1.getProjectOverviewCore)(req.params.projectId, userId);
        res.json(core);
    }
    catch (err) {
        next(err);
    }
});
router.get("/projects/:projectId/task-counts", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const counts = await (0, workflowMetricsService_1.getProjectTaskCounts)(req.params.projectId, userId);
        res.json(counts);
    }
    catch (err) {
        next(err);
    }
});
router.get("/projects/:projectId/sections/progress", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const progress = await (0, workflowMetricsService_1.getProjectSectionProgress)(req.params.projectId, userId);
        res.json(progress);
    }
    catch (err) {
        next(err);
    }
});
router.get("/projects/:projectId/users/:targetUserId/focus", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const { requireProjectAccess } = await Promise.resolve().then(() => __importStar(require("../services/accessService")));
        await requireProjectAccess(userId, req.params.projectId, "viewer");
        const signals = await (0, workflowMetricsService_1.getUserFocusSignals)(req.params.targetUserId, req.params.projectId);
        res.json(signals);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
