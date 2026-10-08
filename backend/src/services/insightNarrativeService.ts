/**
 * insightNarrativeService
 *
 * Converts structured anomaly results into deterministic, human-readable text.
 *
 * Template-only: no ML, statistics, database access, or LLM calls.
 * Every number in a narrative comes from the anomaly result or its metrics payload.
 */

import {
  AnomalyDetectionResult,
  FocusMetrics,
  HandoffMetrics,
  InsightNarrativeResult,
  WaitingMetrics,
} from "../types/database";
import {
  ProjectAnomalyResults,
} from "./anomalyDetectionService";

/** Optional display labels supplied by insightsService (which has DB access). */
export interface NarrativeContext {
  taskTitles?: Record<string, string>;
  userNames?: Record<string, string>;
}

/** Narrated insights grouped the same way as ProjectAnomalyResults. */
export interface ProjectInsightNarratives {
  waiting: InsightNarrativeResult[];
  handoffs: InsightNarrativeResult[];
  focus: InsightNarrativeResult[];
}

/** Hours are workflow durations; one decimal keeps narratives readable. */
function formatHours(hours: number): string {
  return hours.toFixed(1);
}

/** Anomaly scores are shown with two decimals for consistent comparison. */
function formatScore(score: number): string {
  return score.toFixed(2);  
}

/** Whole counts (segments, assignee changes, task switches) stay unformatted. */
function formatCount(count: number): string {
  return String(count);
}

function taskLabel(taskId: string, context?: NarrativeContext): string {
  const title = context?.taskTitles?.[taskId];
  return title ? `'${title}'` : taskId;
}

function userLabel(userId: string, context?: NarrativeContext): string {
  return context?.userNames?.[userId] ?? userId;
}

function isWaitingResult(
  result: AnomalyDetectionResult
): result is AnomalyDetectionResult & { metrics: WaitingMetrics } {
  return result.anomalyType === "waiting";
}

function isHandoffResult(
  result: AnomalyDetectionResult
): result is AnomalyDetectionResult & { metrics: HandoffMetrics } {
  return result.anomalyType === "handoff";
}

function isFocusResult(
  result: AnomalyDetectionResult
): result is AnomalyDetectionResult & { metrics: FocusMetrics } {
  return result.anomalyType === "focus";
}

/**
 * Waiting bottleneck narrative.
 * Highlights total idle time, how fragmented the waiting was, and any active stall.
 */
export function generateWaitingNarrative(
  result: AnomalyDetectionResult,
  context?: NarrativeContext
): string | null {
  if (!result.isAnomaly || !isWaitingResult(result)) return null;

  const metrics = result.metrics;
  const label = taskLabel(result.entityId, context);
  const idleHours = formatHours(metrics.idleHours);
  const segments = formatCount(metrics.idleSegmentCount);
  const score = formatScore(result.score);

  const segmentPhrase =
    metrics.idleSegmentCount === 1
      ? "1 idle period"
      : `${segments} idle periods`;

  let narrative = `Task ${label} spent ${idleHours} hours waiting across ${segmentPhrase}.`;

  // currentIdleHours is 0 when the task is active or completed — only mention when non-zero.
  if (metrics.currentIdleHours > 0) {
    narrative += ` Currently idle for ${formatHours(metrics.currentIdleHours)} hours.`;
  }

  narrative += ` Anomaly score: ${score}.`;
  return narrative;
}

/**
 * Handoff bottleneck narrative.
 * Emphasizes the largest ownership gap and supporting assignee-change context.
 */
export function generateHandoffNarrative(
  result: AnomalyDetectionResult,
  context?: NarrativeContext
): string | null {
  if (!result.isAnomaly || !isHandoffResult(result)) return null;

  const metrics = result.metrics;
  const label = taskLabel(result.entityId, context);
  const maxGap = formatHours(metrics.maxGapHours);
  const averageGap = formatHours(metrics.averageGapHours);
  const changes = formatCount(metrics.handoffCount);
  const statusDelay = formatHours(metrics.statusTransitionDelayHours);
  const score = formatScore(result.score);

  const changePhrase =
    metrics.handoffCount === 1
      ? "1 assignee change"
      : `${changes} assignee changes`;

  if (result.dominantFeature === "statusTransitionDelayHours") {
  return (
    `Task ${label} experienced an unusually long average status-transition delay of ` +
    `${statusDelay} hours, indicating a potential workflow progression bottleneck. ` +
    `Anomaly score: ${score}.`
  );
}

if (result.dominantFeature === "maxGapHours") {
  return (
    `Task ${label} experienced a maximum ownership gap of ${maxGap} hours, ` +
    `indicating a potential delay in reassignment or task ownership. ` +
    `Anomaly score: ${score}.`
  );
}

if (result.dominantFeature === "averageGapHours") {
  return (
    `Task ${label} experienced an average ownership gap of ${averageGap} hours ` +
    `across ${changePhrase}, indicating repeated delays in task ownership. ` +
    `Anomaly score: ${score}.`
  );
}

if (result.dominantFeature === "handoffCount") {
  return (
    `Task ${label} underwent ${changePhrase}, indicating unusually frequent ` +
    `ownership transitions within the workflow. Anomaly score: ${score}.`
  );
}


return (
  `Task ${label} had a maximum ownership gap of ${maxGap} hours ` +
  `(average gap: ${averageGap}h, ${changePhrase}, ` +
  `average status-transition delay: ${statusDelay}h). ` +
  `Anomaly score: ${score}.`
);
}

/**
 * Context-switching narrative.
 * Describes concurrent in-progress load and how often the user started new work.
 */
export function generateFocusNarrative(
  result: AnomalyDetectionResult,
  context?: NarrativeContext
): string | null {
  if (!result.isAnomaly || !isFocusResult(result)) return null;

  const metrics = result.metrics;
  const label = userLabel(result.entityId, context);
  const inProgress = formatCount(metrics.concurrentInProgress);
  const switches = formatCount(metrics.tasksStarted);
  const score = formatScore(result.score);

  const taskPhrase =
    metrics.concurrentInProgress === 1 ? "1 task" : `${inProgress} tasks`;

  const switchPhrase =
    metrics.tasksStarted === 1
      ? "1 distinct task"
      : `${switches} distinct tasks`;

  return (
    `User ${label} currently has ${taskPhrase} in progress and ` +
    `switched to in-progress on ${switchPhrase}. Anomaly score: ${score}.`
  );
}

/** Route a single anomaly result to the correct template generator. */
export function generateNarrative(
  result: AnomalyDetectionResult,
  context?: NarrativeContext
): string | null {
  switch (result.anomalyType) {
    case "waiting":
      return generateWaitingNarrative(result, context);
    case "handoff":
      return generateHandoffNarrative(result, context);
    case "focus":
      return generateFocusNarrative(result, context);
    default:
      return null;
  }
}

function toInsightResult(
  result: AnomalyDetectionResult,
  narrative: string,
  entityType: "task" | "user"
): InsightNarrativeResult {
  return {
    entityId: result.entityId,
    entityType, 
    anomalyType: result.anomalyType,
    score: result.score,
    threshold: result.threshold,
    metrics: result.metrics,
    narrative,
    dominantFeature: result.dominantFeature,
  };
}

function narrateAnomalies(
  results: AnomalyDetectionResult[],
  entityType: "task" | "user",
  context?: NarrativeContext
): InsightNarrativeResult[] {
  const narrated: InsightNarrativeResult[] = [];

  for (const result of results) {
    if (!result.isAnomaly) continue;

    const narrative = generateNarrative(result, context);
    if (!narrative) continue;

    narrated.push(toInsightResult(result, narrative, entityType));
  }

  return narrated;
}

/**
 * Build narratives for every flagged anomaly in a project snapshot.
 * Input comes directly from anomalyDetectionService.
 */
export function generateProjectNarratives(
  anomalies: ProjectAnomalyResults,
  context?: NarrativeContext
): ProjectInsightNarratives {
  return {
    waiting: narrateAnomalies(anomalies.waiting, "task", context),
    handoffs: narrateAnomalies(anomalies.handoffs, "task", context),
    focus: narrateAnomalies(anomalies.focus, "user", context),
  };
}
