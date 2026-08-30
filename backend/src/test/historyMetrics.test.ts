// import "dotenv/config";


// import {
//   buildStatusTimeline,
//   extractStatusChange,
//   extractAssigneeHandoffs,
// } from "../services/historyService";

// import {
//   TaskHistory,
//   AssigneeEvent,
//   Task,
// } from "../types/database";

// console.log("\n=== History Metrics Tests ===\n");

// // ---------------------------------------------------------
// // 1. STATUS TIMELINE
// // ---------------------------------------------------------

// const taskId = "test-task-1";

// const history: TaskHistory[] = [
//   {
//     id: "history-1",
//     task_id: taskId,
//     task_snapshot: {
//       status: "to_do",
//     },
//     user_id: "user-1",
//     event_type: "created",
//     created_at: "2026-07-24T16:00:00Z",
//   },
//   {
//     id: "history-2",
//     task_id: taskId,
//     task_snapshot: {
//       status: "waiting",
//     },
//     user_id: "user-1",
//     event_type: "updated",
//     created_at: "2026-07-27T10:00:00Z",
//   },
// ];

// const task = {
//   id: taskId,
//   title: "Test task",
//   description: null,
//   project_id: "project-1",
//   section_id: null,
//   delay_cause_id: null,
//   parent_task_id: null,
//   priority: "medium",
//   risk_score: 0,
//   start_date: null,
//   due_date: null,
//   position: null,
//   created_by: "user-1",
//   created_at: "2026-07-24T16:00:00Z",
//   updated_at: null,
//   deleted_at: null,
//   is_deleted: false,
//   status: "waiting",
// } satisfies Task;

// const timeline = buildStatusTimeline(
//   taskId,
//   history,
//   task
// );

// console.log("Status timeline:");
// console.table(timeline);

// const firstSegment = timeline[0];

// if (firstSegment.durationHours !== 2) {
//   throw new Error(
//     `Status timeline test failed: expected 2 working hours, got ${firstSegment.durationHours}`
//   );
// }

// console.log("✓ Weekend was excluded from status duration");


// // ---------------------------------------------------------
// // 2. STATUS TRANSITION DELAY
// // ---------------------------------------------------------

// const transitionHistory: TaskHistory[] = [
//   {
//     id: "transition-1",
//     task_id: taskId,
//     task_snapshot: {
//       status: "to_do",
//     },
//     user_id: "user-1",
//     event_type: "created",
//     created_at: "2026-07-24T16:00:00Z",
//   },
//   {
//     id: "transition-2",
//     task_id: taskId,
//     task_snapshot: {
//       status: "in_progress",
//     },
//     user_id: "user-1",
//     event_type: "updated",
//     created_at: "2026-07-27T10:00:00Z",
//   },
// ];

// const transitions = extractStatusChange(
//   transitionHistory
// );

// console.log("\nStatus transitions:");
// console.table(transitions);

// if (transitions.length !== 1) {
//   throw new Error(
//     `Expected 1 transition, got ${transitions.length}`
//   );
// }

// if (transitions[0].durationHours !== 2) {
//   throw new Error(
//     `Transition test failed: expected 2 working hours, got ${transitions[0].durationHours}`
//   );
// }

// console.log("✓ Status transition delay uses working hours");


// // ---------------------------------------------------------
// // 3. ASSIGNEE HANDOFF
// // ---------------------------------------------------------

// const events: AssigneeEvent[] = [
//   {
//     id: "event-1",
//     task_id: taskId,
//     project_id: "project-1",
//     user_id: "user-1",
//     event_type: "assignee_added",
//     from_value: null,
//     to_value: "user-1",
//     created_at: "2026-07-24T16:00:00Z",
//   },
//   {
//     id: "event-2",
//     task_id: taskId,
//     project_id: "project-1",
//     user_id: "user-2",
//     event_type: "assignee_added",
//     from_value: null,
//     to_value: "user-2",
//     created_at: "2026-07-27T10:00:00Z",
//   },
// ];

// const handoffs = extractAssigneeHandoffs(events);

// console.log("\nAssignee handoffs:");
// console.table(handoffs);

// if (handoffs.length !== 2) {
//   throw new Error(
//     `Expected 2 assignee events, got ${handoffs.length}`
//   );
// }

// if (handoffs[1].gapHours !== 2) {
//   throw new Error(
//     `Handoff test failed: expected 2 working hours, got ${handoffs[1].gapHours}`
//   );
// }

// console.log("✓ Assignee handoff gap uses working hours");

// console.log("\nAll history metric tests passed.\n");