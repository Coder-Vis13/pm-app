// // Transparent formula — store result in task.risk_score
// function computeDelayRisk(task, metrics, dependencyGraph): number {
//   const blockedDependents = countDownstreamBlocked(task.id, dependencyGraph);
//   const daysInBlocked = metrics.blockedHours / 24;
//   const priorityWeight = { low: 1, medium: 2, high: 3, critical: 5 }[task.priority];
//   return Math.min(100, Math.round(
//     10 * blockedDependents +
//     8 * daysInBlocked +
//     5 * priorityWeight
//   ));
// }