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
exports.createTask = createTask;
exports.listTasks = listTasks;
exports.getTaskById = getTaskById;
exports.updateTask = updateTask;
exports.updateTaskStatus = updateTaskStatus;
exports.deleteTask = deleteTask;
exports.getDelayDays = getDelayDays;
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const accessService_1 = require("./accessService");
const sectionService_1 = require("./sectionService");
const auditService_1 = require("./auditService");
//Editor check, section validation, assign position, insert with status: "to_do", seal audit
async function createTask(input) {
    const { title, projectId, sectionId, userId, description, priority = "medium", startDate, dueDate, } = input;
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "editor");
    await (0, sectionService_1.checkSectionInProject)(sectionId, projectId);
    const { data: existing, error: posError } = await supabaseClient_1.supabase
        .from("task")
        .select("position")
        .eq("section_id", sectionId)
        .eq("is_deleted", false)
        .order("position", { ascending: false })
        .limit(1);
    if (posError)
        throw new errors_1.AppError(posError.message, 500);
    const nextPosition = existing?.length ? (existing[0].position ?? 0) + 1 : 1;
    const { data, error } = await supabaseClient_1.supabase
        .from("task")
        .insert({
        title,
        description: description ?? null,
        project_id: projectId,
        section_id: sectionId,
        priority,
        position: nextPosition,
        created_by: userId,
        start_date: startDate ?? null,
        due_date: dueDate ?? null,
        status: "to_do",
    })
        .select()
        .single();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    await (0, auditService_1.taskHistoryEntry)(data.id);
    return data;
}
//get tasks with access checks
async function listTasks(projectId, userId) {
    await (0, accessService_1.requireProjectAccess)(userId, projectId, "viewer");
    const { data, error } = await supabaseClient_1.supabase
        .from("task")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_deleted", false)
        .order("position", { ascending: true });
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data ?? [];
}
//get single task with access checks
async function getTaskById(taskId, userId) {
    return (0, accessService_1.validateTaskAccess)(userId, taskId);
}
//update task fields
async function updateTask(taskId, userId, updates) {
    const task = await (0, accessService_1.validateTaskAccess)(userId, taskId);
    await (0, accessService_1.requireProjectAccess)(userId, task.project_id, "editor");
    if (updates.sectionId) {
        await (0, sectionService_1.checkSectionInProject)(updates.sectionId, task.project_id);
    }
    const payload = {
        updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined)
        payload.title = updates.title;
    if (updates.description !== undefined)
        payload.description = updates.description;
    if (updates.priority !== undefined)
        payload.priority = updates.priority;
    if (updates.startDate !== undefined)
        payload.start_date = updates.startDate;
    if (updates.dueDate !== undefined)
        payload.due_date = updates.dueDate;
    if (updates.sectionId !== undefined)
        payload.section_id = updates.sectionId;
    if (updates.delayCauseId !== undefined)
        payload.delay_cause_id = updates.delayCauseId;
    const { data, error } = await supabaseClient_1.supabase
        .from("task")
        .update(payload)
        .eq("id", taskId)
        .select()
        .single();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    await (0, auditService_1.taskHistoryEntry)(taskId);
    return data;
}
//update status of task
async function updateTaskStatus(taskId, userId, status) {
    const task = await (0, accessService_1.validateTaskAccess)(userId, taskId);
    await (0, accessService_1.requireProjectAccess)(userId, task.project_id, "editor");
    const { data, error } = await supabaseClient_1.supabase
        .from("task")
        .update({
        status,
        updated_at: new Date().toISOString(),
    })
        .eq("id", taskId)
        .select()
        .single();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    await (0, auditService_1.taskHistoryEntry)(taskId);
    return data;
}
//Editor check → soft delete (compacts positions and logs history via DB triggers)
async function deleteTask(taskId, userId) {
    const task = await (0, accessService_1.validateTaskAccess)(userId, taskId);
    await (0, accessService_1.requireProjectAccess)(userId, task.project_id, "editor");
    const { error } = await supabaseClient_1.supabase
        .from("task")
        .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    })
        .eq("id", taskId);
    if (error)
        throw new errors_1.AppError(error.message, 500);
    await (0, auditService_1.taskHistoryEntry)(taskId);
}
// Days a task has spent in blocked or waiting status (from history)
async function getDelayDays(task) {
    const { getTaskStatusDuration: getTaskStatusSegments, sumIdleHours } = await Promise.resolve().then(() => __importStar(require("./historyService")));
    const segments = await getTaskStatusSegments(task.id);
    return Math.floor(sumIdleHours(segments) / 24);
}
