"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../utils/auth");
const sectionService_1 = require("../services/sectionService");
const router = (0, express_1.Router)({ mergeParams: true });
router.get("/", async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const sections = await (0, sectionService_1.listSections)(projectId, (0, auth_1.getUserId)(req));
        res.json(sections);
    }
    catch (err) {
        next(err);
    }
});
router.post("/", async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const section = await (0, sectionService_1.createSection)(projectId, (0, auth_1.getUserId)(req), req.body.name);
        res.status(201).json(section);
    }
    catch (err) {
        next(err);
    }
});
router.patch("/:sectionId", async (req, res, next) => {
    try {
        const { projectId, sectionId } = req.params;
        const section = await (0, sectionService_1.updateSection)(sectionId, projectId, (0, auth_1.getUserId)(req), {
            name: req.body.name,
            description: req.body.description,
            position: req.body.position,
        });
        res.json(section);
    }
    catch (err) {
        next(err);
    }
});
router.delete("/:sectionId", async (req, res, next) => {
    try {
        const { projectId, sectionId } = req.params;
        await (0, sectionService_1.deleteSection)(sectionId, projectId, (0, auth_1.getUserId)(req));
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
