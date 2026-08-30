"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../utils/auth");
const workspaceService_1 = require("../services/workspaceService");
const router = (0, express_1.Router)();
router.get("/", async (req, res, next) => {
    try {
        const workspaces = await (0, workspaceService_1.listWorkspaces)((0, auth_1.getUserId)(req));
        res.json(workspaces);
    }
    catch (err) {
        next(err);
    }
});
router.post("/", async (req, res, next) => {
    try {
        const workspace = await (0, workspaceService_1.createWorkspace)((0, auth_1.getUserId)(req), req.body.name);
        res.status(201).json(workspace);
    }
    catch (err) {
        next(err);
    }
});
router.get("/:workspaceId", async (req, res, next) => {
    try {
        const workspace = await (0, workspaceService_1.getWorkspaceById)(req.params.workspaceId, (0, auth_1.getUserId)(req));
        res.json(workspace);
    }
    catch (err) {
        next(err);
    }
});
router.patch("/:workspaceId", async (req, res, next) => {
    try {
        const workspace = await (0, workspaceService_1.updateWorkspace)(req.params.workspaceId, (0, auth_1.getUserId)(req), req.body.name);
        res.json(workspace);
    }
    catch (err) {
        next(err);
    }
});
router.delete("/:workspaceId", async (req, res, next) => {
    try {
        await (0, workspaceService_1.deleteWorkspace)(req.params.workspaceId, (0, auth_1.getUserId)(req));
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
