/**
 * insightsService
 *
 * Orchestration layer for the workflow analytics pipeline.
 *
 * Pipeline:
 *   metricsExtractorService → anomalyDetectionService → insightNarrativeService → project_insights
 *
 * This module coordinates the stages above and persists results.
 * It performs no feature engineering, ML, statistics, or narrative templating.
 */

import { supabase } from "../lib/supabaseClient";
import { AppError } from "../lib/errors";
import { InsightNarrativeResult, ProjectInsight } from "../types/database";
import {
  AnomalyDetectionConfig,
  detectProjectAnomalies,
} from "./anomalyDetectionService";
import {
  NarrativeContext,
  ProjectInsightNarratives,
  generateProjectNarratives,
} from "./insightNarrativeService";
import { extractProjectMetrics } from "./metricsExtractorService";

type InsightInsertRow = {
  project_id: string;
  insight_type: string;
  entity_type: string;
  entity_id: string;
  score: number;
  metrics: Record<string, unknown>;
  narrative: string;
  computed_at: string;
};

const INSIGHT_CACHE_MINUTES = 15;

function isFresh(computedAt: string): boolean {
  const ageMs = Date.now() - new Date(computedAt).getTime();
  return ageMs < INSIGHT_CACHE_MINUTES * 60 * 1000;
}

/** Load human-readable labels so narratives can reference task titles and user names. */
async function loadNarrativeContext(
  projectId: string
): Promise<NarrativeContext> {
  const [tasksResult, membersResult] = await Promise.all([
    supabase
      .from("task")
      .select("id, title")
      .eq("project_id", projectId)
      .eq("is_deleted", false),
    supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId),
  ]);

  if (tasksResult.error) {
    throw new AppError(tasksResult.error.message, 500);
  }
  if (membersResult.error) {
    throw new AppError(membersResult.error.message, 500);
  }

  const taskTitles: Record<string, string> = {};
  for (const task of tasksResult.data ?? []) {
    if (task.id && task.title) {
      taskTitles[task.id] = task.title;
    }
  }

  const memberUserIds = (membersResult.data ?? [])
    .map((member) => member.user_id)
    .filter((userId): userId is string => Boolean(userId));

  const userNames: Record<string, string> = {};

  if (memberUserIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from("app_user")
      .select("id, name")
      .in("id", memberUserIds);

    if (usersError) {
      throw new AppError(usersError.message, 500);
    }

    for (const user of users ?? []) {
      if (user.id && user.name) {
        userNames[user.id] = user.name;
      }
    }
  }

  return { taskTitles, userNames };
}

/** Replace all existing insights for a project to avoid stale or duplicate rows. */
async function replaceProjectInsights(
  projectId: string,
  rows: InsightInsertRow[]
): Promise<ProjectInsight[]> {
  const { error: deleteError } = await supabase
    .from("project_insights")
    .delete()
    .eq("project_id", projectId);

  if (deleteError) {
    throw new AppError(deleteError.message, 500);
  }

  if (rows.length === 0) {
    return [];
  }

  const { data, error: insertError } = await supabase
    .from("project_insights")
    .insert(rows)
    .select("*");

  if (insertError) {
    throw new AppError(insertError.message, 500);
  }

  return (data ?? []) as ProjectInsight[];
}

function flattenNarratives(
  narratives: ProjectInsightNarratives
): InsightNarrativeResult[] {
  return [
    ...narratives.waiting,
    ...narratives.handoffs,
    ...narratives.focus,
  ];
}

/** Map narrated pipeline output into project_insights insert rows. */
function toInsertRows(
  projectId: string,
  insights: InsightNarrativeResult[],
  computedAt: string
): InsightInsertRow[] {
  return insights.map((insight) => ({
    project_id: projectId,
    insight_type: insight.anomalyType,
    entity_type: insight.entityType,
    entity_id: insight.entityId,
    score: insight.score,
    metrics: {
      ...insight.metrics,
      threshold: insight.threshold,
    },
    narrative: insight.narrative,
    computed_at: computedAt,
  }));
}

/**
 * Run the full analytics pipeline for a project and persist flagged insights.
 *
 * 1. Extract feature vectors
 * 2. Detect anomalies
 * 3. Generate deterministic narratives
 * 4. Replace prior project_insights rows with the new snapshot
 */
export async function computeProjectInsights(
  projectId: string,
  detectionConfig?: AnomalyDetectionConfig
): Promise<ProjectInsight[]> {
  const computedAt = new Date().toISOString();

  const metrics = await extractProjectMetrics(projectId);

  const narrativeContext = await loadNarrativeContext(projectId);

  const anomalies = detectProjectAnomalies(metrics, detectionConfig);
  const narratives = generateProjectNarratives(anomalies, narrativeContext);
  const flaggedInsights = flattenNarratives(narratives);
  const rows = toInsertRows(projectId, flaggedInsights, computedAt);

  const result = await replaceProjectInsights(projectId, rows);

  return result;
}


/** Read the latest persisted insights for a project. */
export async function getProjectInsights(
  projectId: string
): Promise<ProjectInsight[]> {
  const { data, error } = await supabase
    .from("project_insights")
    .select("*")
    .eq("project_id", projectId)
    .order("computed_at", { ascending: false });

  if (error) {
    throw new AppError(error.message, 500);
  }

  return (data ?? []) as ProjectInsight[];
}
