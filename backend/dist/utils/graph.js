"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockingTasks = getBlockingTasks;
exports.getBlockedTasks = getBlockedTasks;
exports.possibleCycle = possibleCycle;
exports.getTransitiveDependents = getTransitiveDependents;
//to know what tasks must finish before this task can start
function getBlockingTasks(taskId, deps) {
    return deps
        .filter((d) => d.blocked_task_id === taskId && d.blocking_task_id)
        .map((d) => d.blocking_task_id);
}
// Tasks waiting on this task to finish
function getBlockedTasks(taskId, deps) {
    return deps
        .filter((d) => d.blocking_task_id === taskId && d.blocked_task_id)
        .map((d) => d.blocked_task_id);
}
/* True if adding a dep would create a cycle
 dfs using stack
 */
function possibleCycle(blockingId, blockedId, deps) {
    const visited = new Set();
    const stack = [blockingId];
    while (stack.length > 0) {
        const current = stack.pop();
        if (current === blockedId)
            return true;
        if (visited.has(current))
            continue;
        visited.add(current);
        for (const prereq of getBlockingTasks(current, deps)) {
            stack.push(prereq);
        }
    }
    return false;
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
