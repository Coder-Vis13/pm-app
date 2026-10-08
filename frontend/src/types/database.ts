export type PriorityLevel = "low" | "medium" | "high" | "critical";

export type StatusType =
  | "to_do"
  | "in_progress"
  | "waiting"
  | "blocked"
  | "done";

export type RoleType = "admin" | "editor" | "viewer";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  job_role_id: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  role: RoleType;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  workspace_id: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
}

export interface ProjectMember {
  id: string;
  project_id: string | null;
  user_id: string | null;
  role: RoleType;
}

export interface ProjectMemberWithUser extends ProjectMember {
  app_user?: AppUser | null;
}

export interface Section {
  id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  position: number;
  created_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  section_id: string | null;
  delay_cause_id: string | null;
  parent_task_id: string | null;
  priority: PriorityLevel;
  risk_score: number;
  start_date: string | null;
  due_date: string | null;
  position: number | null;
  created_by: string | null;
  updated_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  status: StatusType;
  version: number;
}


export interface MyTask extends SectionTask {
  project: Pick<Project, "id" | "name"> | null;
  section: Pick<Section, "id" | "name"> | null;
}

export interface Subtask extends Task {}


export interface TaskDep {
  id: string;
  blocking_task_id: string | null;
  blocked_task_id: string | null;
  created_at: string | null;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  task_snapshot: Partial<Task> | null;
  user_id: string;
  event_type: string;
  created_at: string;
  actor_id: string;
}

export type AssigneeEventType =
  | "assignee_added"
  | "assignee_removed";

export interface AssigneeEvent {
  id: string;
  task_id: string | null;
  project_id: string | null;
  user_id: string | null;
  event_type: AssigneeEventType;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
  actor_id: string;
}

export interface ProjectInsight {
  id: string;
  project_id: string | null;
  insight_type: string;
  entity_type: string | null;
  entity_id: string | null;
  score: number | null;
  metrics: Record<string, unknown> | null;
  narrative: string | null;
  computed_at: string;
}

export interface TaskAssignee {
  id: string;
  task_id: string | null;
  user_id: string | null;
  app_user?: AppUser | null;
}

export interface StatusTimeline {
  taskId: string;
  status: StatusType;
  enteredAt: string;
  exitedAt: string | null;
  durationHours: number | null;
}

export interface AssigneeHandoff {
  taskId: string;
  eventType: "assignee_added" | "assignee_removed";
  fromUserId: string | null;
  toUserId: string | null;
  changedAt: string;
  gapHours: number | null;
}

export interface TaskImpact {
  taskId: string;
  directDependents: number;
  totalDependents: number;
  blockedDependents: number;
}

export interface WaitingMetrics {
  taskId: string;
  idleHours: number;
  idleSegmentCount: number;
  currentIdleHours: number;
}

export interface HandoffMetrics {
  taskId: string;
  handoffCount: number;
  averageGapHours: number;
  maxGapHours: number;
  statusTransitionDelayHours: number;
}

export interface FocusMetrics {
  userId: string;
  concurrentInProgress: number;
  tasksStarted: number;
}

export interface ProjectMetrics {
  waiting: WaitingMetrics[];
  handoffs: HandoffMetrics[];
  focus: FocusMetrics[];
}

export type AnomalyType = "waiting" | "handoff" | "focus";

export interface AnomalyDetectionResult {
  entityId: string;
  anomalyType: AnomalyType;
  score: number;
  isAnomaly: boolean;
  threshold: number;
  metrics: WaitingMetrics | HandoffMetrics | FocusMetrics;
  dominantFeature: string | null;
}

export interface ProjectAnomalyResults {
  waiting: AnomalyDetectionResult[];
  handoffs: AnomalyDetectionResult[];
  focus: AnomalyDetectionResult[];
}

export interface NarrativeContext {
  taskTitles?: Record<string, string>;
  userNames?: Record<string, string>;
}

export interface InsightNarrativeResult {
  entityId: string;
  entityType: "task" | "user";
  anomalyType: AnomalyType;
  score: number;
  threshold: number;
  metrics: WaitingMetrics | HandoffMetrics | FocusMetrics;
  narrative: string;
  dominantFeature: string | null;
}

export interface ProjectInsightNarratives {
  waiting: InsightNarrativeResult[];
  handoffs: InsightNarrativeResult[];
  focus: InsightNarrativeResult[];
}

export interface AddTaskAssigneeResponse {
  assignee: TaskAssignee;
  updatedAt: string;
}

export interface RemoveTaskAssigneeResponse {
  taskId: string;
  updatedAt: string;
}



export type HealthStatus = "healthy" | "at_risk" | "critical";

export type HealthImpact = "positive" | "neutral" | "negative";

export interface ProjectTaskCounts {
  projectId: string;
  total: number;
  completed: number;
  remaining: number;
  byStatus: Record<StatusType, number>;
}

export interface ProjectHealthFactor {
  key: string;
  label: string;
  value: number;
  unit: "count" | "percent" | "hours";
  impact: HealthImpact;
}

export interface ProjectHealth {
  status: HealthStatus;
  score: number;
  summary: string;
  factors: ProjectHealthFactor[];
  supportingMetrics: {
    overdueCount: number;
    dependencyBlockedCount: number;
    stalledCount: number;
    totalIdleHours: number;
    depCount: number;
    completionRate: number;
    activeSectionCount: number;
    unsectionedTaskCount: number;
  };
}

export interface ProjectOverview {
  projectId: string;
  tasks: ProjectTaskCounts;
  health: ProjectHealth;
}

export interface SectionProgressItem {
  sectionId: string;
  name: string;
  description: string | null;
  position: number;
  taskCount: number;
  completedTaskCount: number;
  progressPercent: number;
}

export interface SectionTask extends Task {
  assignees: TaskAssignee[];
  dependencyCount: number;
  subtaskCount: number;
}

export interface SectionTaskSummary {
  sectionId: string;
  total: number;
  completed: number;
  remaining: number;
  byStatus: Record<StatusType, number>;
  progressPercent: number;
}

export interface ProjectSectionProgress {
  projectId: string;
  sections: SectionProgressItem[];
  unsectioned: {
    taskCount: number;
    completedTaskCount: number;
    progressPercent: number;
  };
}