"use strict";
/**
 * anomalyDetectionService
 *
 * Pure anomaly detection over pre-computed feature vectors.
 *
 * Hybrid strategy:
 * - sample size < 15  → upper-fence IQR (Q3 + 1.5 × IQR)
 * - sample size >= 15 → in-memory Isolation Forest (fresh model each run)
 *
 * No database access, persistence, feature extraction, or narrative generation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectWaitingAnomalies = detectWaitingAnomalies;
exports.detectHandoffAnomalies = detectHandoffAnomalies;
exports.detectFocusAnomalies = detectFocusAnomalies;
exports.detectProjectAnomalies = detectProjectAnomalies;
const isolation_forest_1 = require("isolation-forest");
const simple_statistics_1 = require("simple-statistics");
const FEATURE_NAMES = {
    waiting: [
        "idleHours",
        "idleSegmentCount",
        "currentIdleHours",
    ],
    handoff: [
        "averageGapHours",
        "maxGapHours",
        "handoffCount",
        "statusTransitionDelayHours",
    ],
    focus: [
        "concurrentInProgress",
        "tasksStarted",
    ],
};
const DEFAULT_CONFIG = {
    iqrSampleLimit: 15,
    isolationForestThreshold: 0.65,
    isolationForestTrees: 100,
};
const IQR_MULTIPLIER = 1.5;
const QUANTILE_Q1 = 0.25;
const QUANTILE_Q3 = 0.75;
function resolveConfig(config) {
    return {
        iqrSampleLimit: config?.iqrSampleLimit ?? DEFAULT_CONFIG.iqrSampleLimit,
        isolationForestThreshold: config?.isolationForestThreshold ??
            DEFAULT_CONFIG.isolationForestThreshold,
        isolationForestTrees: config?.isolationForestTrees ?? DEFAULT_CONFIG.isolationForestTrees,
    };
}
// Reject NaN/Infinity so bad rows never poison quantiles or forest training
function isValidNumber(value) {
    return Number.isFinite(value);
}
function isValidVector(vector) {
    return vector.length > 0 && vector.every(isValidNumber);
}
// A statistical outlier is only meaningful when the workflow event
// actually occurred. Prevents zero-event rows from becoming anomalies.
function hasAnomalyEvidence(anomalyType, metrics) {
    switch (anomalyType) {
        case "handoff": {
            const handoff = metrics;
            return (handoff.handoffCount > 0 ||
                handoff.statusTransitionDelayHours > 0);
        }
        case "waiting": {
            const waiting = metrics;
            return (waiting.idleHours > 0 ||
                waiting.idleSegmentCount > 0 ||
                waiting.currentIdleHours > 0);
        }
        case "focus": {
            const focus = metrics;
            return (focus.concurrentInProgress > 0 ||
                focus.tasksStarted > 0);
        }
        default:
            return false;
    }
}
// Isolation Forest expects keyed objects, not numeric arrays
function vectorToDataObject(vector) {
    const row = {};
    for (let i = 0; i < vector.length; i++) {
        row[`f${i}`] = vector[i];
    }
    return row;
}
// Tukey upper-fence rule: values strictly above Q3 + 1.5 × IQR are treated as potential upper-tail outliers.
function computeUpperFenceThresholds(vectors) {
    const featureCount = vectors[0]?.length ?? 0;
    const thresholds = [];
    for (let featureIdx = 0; featureIdx < featureCount; featureIdx++) {
        const values = vectors
            .map((vector) => vector[featureIdx])
            .filter(isValidNumber)
            .sort((a, b) => a - b);
        if (values.length === 0) {
            thresholds.push(0);
            continue;
        }
        const q1 = (0, simple_statistics_1.quantile)(values, QUANTILE_Q1);
        const q3 = (0, simple_statistics_1.quantile)(values, QUANTILE_Q3);
        const iqr = q3 - q1;
        thresholds.push(q3 + IQR_MULTIPLIER * iqr);
    }
    return thresholds;
}
// Score relative to upper fences; values above any fence produce score > 1
// function scoreAgainstUpperFences(
//   vector: number[],
//   thresholds: number[]
// ): { score: number; threshold: number } {
//   let maxRatio = 0;
//   let dominantThreshold = 0;
//   for (let i = 0; i < vector.length; i++) {
//     const value = vector[i];
//     const fence = thresholds[i] ?? 0;
//     let ratio = 0;
//     if (fence > 0) {
//       ratio = value / fence;
//     } else if (value > 0) {
//       // Zero fence with a positive observation is treated as an upper outlier
//       ratio = Number.POSITIVE_INFINITY;
//     }
//     if (ratio >= maxRatio) {
//       maxRatio = ratio;
//       dominantThreshold = fence;
//     }
//   }
//   return { score: maxRatio, threshold: dominantThreshold };
// }
// function scoreAgainstUpperFences(
//   vector: number[],
//   thresholds: number[]
// ): { score: number; threshold: number } {
//   let maxRatio = 0;
//   let dominantThreshold = 0;
//   for (let i = 0; i < vector.length; i++) {
//     const value = vector[i];
//     const fence = thresholds[i] ?? 0;
//     let ratio = 0;
//     if (fence > 0) {
//       ratio = value / fence;
//     } else if (value > 0) {
//       ratio = Number.POSITIVE_INFINITY;
//     }
//     if (ratio >= maxRatio) {
//       maxRatio = ratio;
//       dominantThreshold = fence;
//     }
//   }
//   // Convert IQR ratio to bounded 0–1 score.
//   // ratio = 1 (upper fence) → 0.5
//   // ratio > 1 → anomaly
//   // ratio → infinity → score approaches 1
//   const score =
//     maxRatio === Number.POSITIVE_INFINITY
//       ? 1
//       : maxRatio / (1 + maxRatio);
//   return { score, threshold: dominantThreshold };
// }
function scoreAgainstUpperFences(vector, thresholds) {
    let maxRatio = 0;
    let dominantThreshold = 0;
    let dominantFeatureIndex = -1;
    for (let i = 0; i < vector.length; i++) {
        const value = vector[i];
        const fence = thresholds[i] ?? 0;
        let ratio = 0;
        if (fence > 0) {
            ratio = value / fence;
        }
        else if (value > 0) {
            ratio = Number.POSITIVE_INFINITY;
        }
        if (ratio > maxRatio) {
            maxRatio = ratio;
            dominantThreshold = fence;
            dominantFeatureIndex = i;
        }
    }
    const score = maxRatio === Number.POSITIVE_INFINITY
        ? 1
        : maxRatio / (1 + maxRatio);
    // Only identify a dominant feature if it actually crossed
    // the IQR upper fence.
    if (maxRatio <= 1) {
        dominantFeatureIndex = -1;
    }
    return {
        score,
        threshold: dominantThreshold,
        dominantFeatureIndex,
    };
}
// Map raw Isolation Forest scores into a stable 0–1 range for this batch
// function normalizeScores(rawScores: number[]): number[] {
//   if (rawScores.length === 0) return [];
//   const min = Math.min(...rawScores);
//   const max = Math.max(...rawScores);
//   // Identical scores carry no separation signal; treat everyone as middling.
//   if (max === min) {
//     return rawScores.map(() => 0.5);
//   }
//   return rawScores.map((score) => (score - min) / (max - min));
// }
function buildRes(entityId, anomalyType, metrics) {
    return {
        entityId,
        anomalyType,
        score: 0,
        isAnomaly: false,
        threshold: 0,
        metrics,
        dominantFeature: null,
    };
}
function detectWithIqr(rows, anomalyType) {
    const results = new Map();
    if (rows.length === 0)
        return results;
    const vectors = rows.map((row) => row.vector);
    const thresholds = computeUpperFenceThresholds(vectors);
    for (const row of rows) {
        const { score, dominantFeatureIndex } = scoreAgainstUpperFences(row.vector, thresholds);
        const dominantFeature = FEATURE_NAMES[anomalyType][dominantFeatureIndex] ?? null;
        results.set(row.index, {
            entityId: row.entityId,
            anomalyType,
            score,
            // score > 0.5 is equivalent to value > upper fence because score = (value / fence) / (1 + value / fence)
            isAnomaly: score > 0.5,
            threshold: 0.5,
            metrics: row.metrics,
            dominantFeature,
        });
    }
    return results;
}
// Uses the library's native Isolation Forest score.
// Unlike the IQR score, this score has algorithm-specific semantics derived from the isolation-tree path lengths.
function detectWithIsolationForest(rows, anomalyType, config) {
    const results = new Map();
    if (rows.length === 0)
        return results;
    const trainingRows = rows.map((row) => vectorToDataObject(row.vector));
    const forest = new isolation_forest_1.IsolationForest(config.isolationForestTrees, Math.min(256, trainingRows.length));
    // Train a fresh, in-memory model for this project snapshot only.
    forest.fit(trainingRows);
    const scores = forest.scores();
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const score = scores[i] ?? 0;
        results.set(row.index, {
            entityId: row.entityId,
            anomalyType,
            score,
            isAnomaly: score >= config.isolationForestThreshold,
            threshold: config.isolationForestThreshold,
            metrics: row.metrics,
            dominantFeature: null,
        });
    }
    return results;
}
function detectGroupAnomalies(items, anomalyType, getEntityId, getVector, config) {
    if (items.length === 0)
        return [];
    const output = items.map((item) => buildRes(getEntityId(item), anomalyType, item));
    const validRows = [];
    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const vector = getVector(item);
        // Do not allow statistically unusual but meaningless zero-event
        // records to enter anomaly detection.
        if (!isValidVector(vector))
            continue;
        if (!hasAnomalyEvidence(anomalyType, item))
            continue;
        validRows.push({
            index,
            entityId: getEntityId(item),
            vector,
            metrics: item,
        });
    }
    if (validRows.length === 0)
        return output;
    // IQR is used for small samples where a tree-based model has limited
    // observations; Isolation Forest is used once enough observations exist for multivariate isolation to provide a more useful signal.
    const detected = validRows.length < config.iqrSampleLimit
        ? detectWithIqr(validRows, anomalyType)
        : detectWithIsolationForest(validRows, anomalyType, config);
    for (const [index, result] of detected) {
        output[index] = result;
    }
    return output;
}
/** Detect waiting-time bottlenecks from idle-status feature vectors. */
function detectWaitingAnomalies(metrics, config) {
    const resolved = resolveConfig(config);
    return detectGroupAnomalies(metrics, "waiting", (item) => item.taskId, (item) => [item.idleHours, item.idleSegmentCount, item.currentIdleHours], resolved);
}
/** Detect ownership-transition bottlenecks from handoff feature vectors. */
function detectHandoffAnomalies(metrics, config) {
    const resolved = resolveConfig(config);
    return detectGroupAnomalies(metrics, "handoff", (item) => item.taskId, (item) => [
        item.averageGapHours,
        item.maxGapHours,
        item.handoffCount,
        item.statusTransitionDelayHours,
    ], resolved);
}
/** Detect context-switching strain from concurrent-work feature vectors. */
function detectFocusAnomalies(metrics, config) {
    const resolved = resolveConfig(config);
    return detectGroupAnomalies(metrics, "focus", (item) => item.userId, (item) => [item.concurrentInProgress, item.tasksStarted], resolved);
}
/**
 * Run anomaly detection across all project feature families.
 * Input comes directly from metricsExtractorService.
 */
function detectProjectAnomalies(metrics, config) {
    return {
        waiting: detectWaitingAnomalies(metrics.waiting, config),
        handoffs: detectHandoffAnomalies(metrics.handoffs, config),
        focus: detectFocusAnomalies(metrics.focus, config),
    };
}
