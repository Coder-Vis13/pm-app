"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../utils/auth");
const dependencyService_1 = require("../services/dependencyService");
const router = (0, express_1.Router)();
router.post("/", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const { blockingTaskId, blockedTaskId } = req.body;
        const dep = await (0, dependencyService_1.createDep)(blockingTaskId, blockedTaskId, userId);
        res.status(201).json(dep);
    }
    catch (err) {
        next(err);
    }
});
router.get("/task/:taskId/details", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        const dependencies = await (0, dependencyService_1.listTaskDependencies)(req.params.taskId, userId);
        res.json(dependencies);
    }
    catch (err) {
        next(err);
    }
});
router.delete("/:depId", async (req, res, next) => {
    try {
        const userId = (0, auth_1.getUserId)(req);
        await (0, dependencyService_1.deleteDep)(req.params.depId, userId);
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
