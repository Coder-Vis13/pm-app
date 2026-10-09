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
const projectService_1 = require("../services/projectService");
const membershipService_1 = require("../services/membershipService");
const router = (0, express_1.Router)();
router.post("/", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const { name, workspaceId, description } = req.body;
        const project = await (0, projectService_1.createProject)({ name, workspaceId, userId, description });
        res.status(201).json(project);
    }
    catch (err) {
        next(err);
    }
});
router.get("/workspace/:workspaceId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const projects = await (0, projectService_1.listProjects)(req.params.workspaceId, userId);
        res.json(projects);
    }
    catch (err) {
        next(err);
    }
});
router.get("/:projectId/members", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const members = await (0, membershipService_1.listProjectMembers)(req.params.projectId, userId);
        res.json(members);
    }
    catch (err) {
        next(err);
    }
});
router.get("/:projectId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const project = await (0, projectService_1.getProjectById)(req.params.projectId, userId);
        res.json(project);
    }
    catch (err) {
        next(err);
    }
});
router.patch("/:projectId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const project = await (0, projectService_1.updateProject)(req.params.projectId, userId, {
            name: req.body.name,
            description: req.body.description,
        });
        res.json(project);
    }
    catch (err) {
        next(err);
    }
});
router.delete("/:projectId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        await (0, projectService_1.deleteProject)(req.params.projectId, userId);
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
router.post("/:projectId/members", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const { memberUserId, role } = req.body;
        const member = await (0, membershipService_1.addProjectMember)(req.params.projectId, userId, memberUserId, role ?? "viewer");
        res.status(201).json(member);
    }
    catch (err) {
        next(err);
    }
});
router.delete("/:projectId/members/:memberUserId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const { requireProjectAccess } = await Promise.resolve().then(() => __importStar(require("../services/accessService")));
        await requireProjectAccess(userId, req.params.projectId, "admin");
        await (0, membershipService_1.removeUserFromProject)(req.params.memberUserId, req.params.projectId);
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
