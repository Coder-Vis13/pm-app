"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskImpact = getTaskImpact;
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const graph_1 = require("../utils/graph");
const dependencyService_1 = require("./dependencyService");
async function loadProjectTasks(projectId) {
    const { data, error } = await supabaseClient_1.supabase
        .from("task")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_deleted", false);
    if (error)
        throw new errors_1.AppError(error.message, 500);
    const map = new Map();
    for (const task of data ?? []) {
        map.set(task.id, task);
    }
    return map;
}
//Calc how many tasks depend on this task
async function getTaskImpact(taskId) {
    const { data: task, error } = await supabaseClient_1.supabase
        .from("task")
        .select("project_id")
        .eq("id", taskId)
        .single();
    if (error || !task?.project_id)
        throw new errors_1.AppError("Task not found", 404);
    const deps = await (0, dependencyService_1.getProjectDeps)(task.project_id);
    const direct = (0, graph_1.getBlockedTasks)(taskId, deps);
    const all = (0, graph_1.getTransitiveDependents)(taskId, deps);
    const taskMap = await loadProjectTasks(task.project_id);
    let blockedDependents = 0;
    for (const id of all) {
        const t = taskMap.get(id);
        if (t && (t.status === "blocked" || t.status === "waiting")) {
            blockedDependents++;
        }
    }
    return {
        taskId,
        directDependents: direct.length,
        totalDependents: all.size,
        blockedDependents,
    };
}
