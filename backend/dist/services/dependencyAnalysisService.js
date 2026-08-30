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
exports.getCriticalPathToTask = getCriticalPathToTask;
exports.getTaskImpact = getTaskImpact;
exports.calcRiskScore = calcRiskScore;
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const graph_1 = require("../utils/graph");
const dependencyService_1 = require("./dependencyService");
function taskDurationDays(task) {
    if (task.start_date && task.due_date) {
        const ms = new Date(task.due_date).getTime() - new Date(task.start_date).getTime();
        return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }
    return 1;
}
function buildLongestChain(targetTaskId, deps, taskMap) {
    const memo = new Map();
    function dfs(taskId) {
        if (memo.has(taskId))
            return memo.get(taskId);
        const task = taskMap.get(taskId);
        if (!task)
            return [];
        const prereqs = (0, graph_1.getBlockingTasks)(taskId, deps);
        if (prereqs.length === 0) {
            const chain = [task];
            memo.set(taskId, chain);
            return chain;
        }
        let longest = [];
        for (const prereqId of prereqs) {
            const chain = dfs(prereqId);
            if (chain.length > longest.length)
                longest = chain;
        }
        const result = [...longest, task];
        memo.set(taskId, result);
        return result;
    }
    return dfs(targetTaskId);
}
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
//simplified critical path method
//DFS with memoization to find longest chain ending at target task
async function getCriticalPathToTask(targetTaskId) {
    const { data: target, error } = await supabaseClient_1.supabase
        .from("task")
        .select("*")
        .eq("id", targetTaskId)
        .eq("is_deleted", false)
        .single();
    if (error || !target)
        throw new errors_1.AppError("Task not found", 404);
    const deps = await (0, dependencyService_1.getProjectDeps)(target.project_id);
    const taskMap = await loadProjectTasks(target.project_id);
    const chain = buildLongestChain(targetTaskId, deps, taskMap);
    const totalDurationDays = chain.reduce((sum, t) => sum + taskDurationDays(t), 0);
    const estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + totalDurationDays);
    return {
        targetTaskId,
        chain,
        totalDurationDays,
        estimatedCompletionDate: estimatedCompletionDate.toISOString(),
    };
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
// Simple risk score (0-100) for a task — AI layer will refine later; stored on task.risk_score
async function calcRiskScore(taskId) {
    const { data: task, error } = await supabaseClient_1.supabase
        .from("task")
        .select("*")
        .eq("id", taskId)
        .single();
    if (error || !task)
        throw new errors_1.AppError("Task not found", 404);
    const impact = await getTaskImpact(taskId);
    const { getTaskStatusDuration: getTaskStatusSegments, sumIdleHours } = await Promise.resolve().then(() => __importStar(require("./historyService")));
    const segments = await getTaskStatusSegments(taskId);
    const idleDays = sumIdleHours(segments) / 24;
    const priorityWeight = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 5,
    };
    const score = Math.min(100, Math.round(impact.totalDependents * 10 +
        impact.blockedDependents * 15 +
        idleDays * 8 +
        (priorityWeight[task.priority] ?? 2) * 5));
    const { error: updateError } = await supabaseClient_1.supabase
        .from("task")
        .update({ risk_score: score })
        .eq("id", taskId);
    if (updateError)
        throw new errors_1.AppError(updateError.message, 500);
    return score;
}
