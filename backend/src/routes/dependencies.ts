import { Router } from "express";
import { getUserId } from "../utils/auth";
import {
  createDep,
  deleteDep,
  listDeps,
  listTaskDependencies
} from "../services/dependencyService";

const router = Router();

router.get("/task/:taskId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const deps = await listDeps(req.params.taskId, userId);
    res.json(deps);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { blockingTaskId, blockedTaskId } = req.body;
    const dep = await createDep(blockingTaskId, blockedTaskId, userId);
    res.status(201).json(dep);
  } catch (err) {
    next(err);
  }
});

router.get("/task/:taskId/details", async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const dependencies = await listTaskDependencies(
      req.params.taskId,
      userId
    );

    res.json(dependencies);
  } catch (err) {
    next(err);
  }
});

router.delete("/:depId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await deleteDep(req.params.depId, userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
