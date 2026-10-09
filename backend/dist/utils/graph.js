"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockedTasks = getBlockedTasks;
exports.getTransitiveDependents = getTransitiveDependents;
// Tasks waiting on this task to finish
function getBlockedTasks(taskId, deps) {
    return deps
        .filter((d) => d.blocking_task_id === taskId && d.blocked_task_id)
        .map((d) => d.blocked_task_id);
}
// All tasks transitively waiting on this task
//bfs using queue
function getTransitiveDependents(taskId, deps) {
    const result = new Set();
    const queue = getBlockedTasks(taskId, deps);
    while (queue.length > 0) {
        const current = queue.shift();
        if (result.has(current))
            continue;
        result.add(current);
        queue.push(...getBlockedTasks(current, deps));
    }
    return result;
}
