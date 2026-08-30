"use strict";
//aggregator for project metrics for AIML
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
exports.getUserFocusSignals = void 0;
exports.getProjectWorkflowMetrics = getProjectWorkflowMetrics;
exports.calcProjectRiskScores = calcProjectRiskScores;
const accessService_1 = require("./accessService");
const historyService_1 = require("./historyService");
Object.defineProperty(exports, "getUserFocusSignals", { enumerable: true, get: function () { return historyService_1.getUserProgressMetrics; } });
const dependencyService_1 = require("./dependencyService");
const dependencyAnalysisService_1 = require("./dependencyAnalysisService");
async function getProjectWorkflowMetrics(projectId, userId) {
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "viewer");
    const segments = await (0, historyService_1.getProjectStatusDuration)(projectId);
    const history = await (0, historyService_1.getProjectHistory)(projectId);
    const workflowEvents = await (0, historyService_1.getProjectWorkflowEvents)(projectId);
    const transitions = (0, historyService_1.extractStatusChange)(history);
    const assigneeHandoffs = (0, historyService_1.extractAssigneeHandoffs)(workflowEvents);
    const deps = await (0, dependencyService_1.getProjectDeps)(projectId);
    const waitingSegments = segments.filter((s) => s.status === "waiting");
    const blockedSegments = segments.filter((s) => s.status === "blocked");
    const idleByTask = new Map();
    for (const seg of segments) {
        if (seg.status === "waiting" || seg.status === "blocked") {
            idleByTask.set(seg.taskId, (idleByTask.get(seg.taskId) ?? 0) + (seg.durationHours ?? 0));
        }
    }
    const longestWaits = [...idleByTask.entries()]
        .map(([taskId, hours]) => ({ taskId, idleHours: hours }))
        .sort((a, b) => b.idleHours - a.idleHours)
        .slice(0, 10);
    return {
        projectId,
        depCount: deps.length,
        totalStatusSegments: segments.length,
        waitingSegmentCount: waitingSegments.length,
        blockedSegmentCount: blockedSegments.length,
        totalIdleHours: (0, historyService_1.sumIdleHours)(segments),
        statusTransitions: transitions,
        assigneeHandoffs,
        longestWaits,
    };
}
//risk score for all project tasks 
async function calcProjectRiskScores(projectId, userId) {
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "editor");
    const { supabase } = await Promise.resolve().then(() => __importStar(require("../lib/supabaseClient")));
    const { AppError } = await Promise.resolve().then(() => __importStar(require("../lib/errors")));
    const { data: tasks, error } = await supabase
        .from("task")
        .select("id")
        .eq("project_id", projectId)
        .eq("is_deleted", false);
    if (error)
        throw new AppError(error.message, 500);
    const scores = [];
    for (const task of tasks ?? []) {
        const riskScore = await (0, dependencyAnalysisService_1.calcRiskScore)(task.id);
        scores.push({ taskId: task.id, riskScore });
    }
    return scores;
}
