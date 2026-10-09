import type {
  Dispatch,
  SetStateAction,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  GitBranch,
  History,
  ListTree,
  Target,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  SectionTask,
  Task,
  TaskImpact,
} from "@/types/database";

import {
  ActivityItem,
  EmptySectionText,
  ImpactItem,
  TaskSection,
} from "./task-detail-dialog-ui";
import {
  type ActivityEntry,
  type DependencyDetails,
} from "./task-detail-dialog-utils";

import {
  STATUS_LABELS,
  statusBadgeVariant,
} from "@/pages/section-task-ui";

interface TaskDetailDialogSectionsProps {
  task: Task;
  subtasks: SectionTask[];
  setParentTaskId: Dispatch<SetStateAction<string | null>>;
  setCurrentTaskId: Dispatch<SetStateAction<string | null>>;
  parentTaskId: string | null;
  onAddSubtask?: (parentTaskId: string) => void;
  removeSubtask: (subtask: SectionTask) => void;
  saving: boolean;
  subtasksOpen: boolean;
  setSubtasksOpen: Dispatch<SetStateAction<boolean>>;
  dependencies: DependencyDetails[];
  dependenciesOpen: boolean;
  setDependenciesOpen: Dispatch<SetStateAction<boolean>>;
  activeBlockedByCount: number;
  dateConflictMessages: string[];
  dependencyType: "blocked_by" | "blocking";
  setDependencyType: Dispatch<SetStateAction<"blocked_by" | "blocking">>;
  dependencyTaskId: string;
  setDependencyTaskId: Dispatch<SetStateAction<string>>;
  dependencySaving: boolean;
  dependencyOptions: Task[];
  availableTasksLoading: boolean;
  loadAvailableTasks: () => Promise<void>;
  addTaskDependency: () => void;
  removeTaskDependency: (dependencyId: string) => void;
  impact: TaskImpact | null;
  impactLoading: boolean;
  impactOpen: boolean;
  setImpactOpen: Dispatch<SetStateAction<boolean>>;
  activity: ActivityEntry[];
  activityLoading: boolean;
  activityOpen: boolean;
  setActivityOpen: Dispatch<SetStateAction<boolean>>;
}

// Renders the task relationship and activity sections.
export function TaskDetailDialogSections({
  task,
  subtasks,
  setParentTaskId,
  setCurrentTaskId,
  parentTaskId,
  onAddSubtask,
  removeSubtask,
  saving,
  subtasksOpen,
  setSubtasksOpen,
  dependencies,
  dependenciesOpen,
  setDependenciesOpen,
  activeBlockedByCount,
  dateConflictMessages,
  dependencyType,
  setDependencyType,
  dependencyTaskId,
  setDependencyTaskId,
  dependencySaving,
  dependencyOptions,
  availableTasksLoading,
  loadAvailableTasks,
  addTaskDependency,
  removeTaskDependency,
  impact,
  impactLoading,
  impactOpen,
  setImpactOpen,
  activity,
  activityLoading,
  activityOpen,
  setActivityOpen,
}: TaskDetailDialogSectionsProps) {
  return (
    <>
    {/* Subtasks */}
    <TaskSection
      title="Subtasks"
      icon={<ListTree className="size-4" />}
      count={subtasks.length}
      open={subtasksOpen}
      onToggle={() =>
        setSubtasksOpen((value) => !value)
      }
      action={
        !parentTaskId && onAddSubtask ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAddSubtask(task.id)}
            className="h-7 border border-neutral-200 bg-background px-2.5 text-xs text-muted-foreground hover:bg-neutral-50 hover:text-foreground"
          >
            <ListTree className="mr-1 size-3.5" />
            Add subtask
          </Button>
        ) : null
      }
    >
      {subtasks.length === 0 ? (
        <EmptySectionText>
          No subtasks yet.
        </EmptySectionText>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-4 border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50/60"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {subtask.status === "done" ? (
                  <CheckCircle2
                    className="size-4 shrink-0 text-emerald-600"
                    strokeWidth={1.8}
                  />
                ) : (
                  <Circle
                    className="size-4 shrink-0 text-muted-foreground"
                    strokeWidth={1.6}
                  />
                )}

                <button
                  type="button"
                  onClick={() => {
                    setParentTaskId(task.id);
                    setCurrentTaskId(subtask.id);
                  }}
                  className="truncate text-left text-sm font-medium hover:text-neutral-600"
                >
                  {subtask.title}
                </button>

                <button
                  type="button"
                  onClick={() => removeSubtask(subtask)}
                  disabled={saving}
                  className="text-muted-foreground transition-colors hover:text-red-600"
                  aria-label={`Delete ${subtask.title}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <Badge
                variant={statusBadgeVariant(
                  subtask.status
                )}
                className="font-normal"
              >
                {STATUS_LABELS[subtask.status]}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </TaskSection>

    {/* Dependencies */}
    <TaskSection
      title="Dependencies"
      icon={<GitBranch className="size-4" />}
      count={dependencies.length}
      open={dependenciesOpen}
      onToggle={() =>
        setDependenciesOpen((value) => !value)
      }
    >
      {activeBlockedByCount > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={1.75}
          />
          <span>
            Blocked by {activeBlockedByCount} incomplete{" "}
            {activeBlockedByCount === 1
              ? "task"
              : "tasks"}.
          </span>
        </div>
      )}

      {dateConflictMessages.length > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={1.75}
          />
          <div className="space-y-1">
            <p className="font-medium">
              Schedule conflict
            </p>
            {dateConflictMessages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 sm:flex-row sm:items-center">
        <Select
          value={dependencyType}
          onValueChange={(value) => {
            if (
              value === "blocked_by" ||
              value === "blocking"
            ) {
              setDependencyType(value);
            }
          }}
          disabled={dependencySaving}
        >
          <SelectTrigger className="h-9 w-full text-xs sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="blocked_by">
              Blocked by
            </SelectItem>
            <SelectItem value="blocking">
              Blocks
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={dependencyTaskId}
          items={dependencyOptions.map((availableTask) => ({
            value: availableTask.id,
            label: availableTask.title,
          }))}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              void loadAvailableTasks();
            }
          }}
          onValueChange={(value) =>
            setDependencyTaskId(value ?? "")
          }
          disabled={dependencySaving}
        >
          <SelectTrigger className="h-9 min-w-0 flex-1 text-xs">
            <SelectValue placeholder="Select a task" />
          </SelectTrigger>
          <SelectContent>
            {availableTasksLoading ? (
              <SelectItem value="__loading" disabled>
                Loading tasks...
              </SelectItem>
            ) : dependencyOptions.length === 0 ? (
              <SelectItem value="__empty" disabled>
                No available tasks
              </SelectItem>
            ) : (
              dependencyOptions.map((availableTask) => (
                <SelectItem
                  key={availableTask.id}
                  value={availableTask.id}
                >
                  {availableTask.title}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTaskDependency}
          disabled={
            dependencySaving ||
            availableTasksLoading ||
            !dependencyTaskId
          }
          className="h-9 text-xs"
        >
          Add
        </Button>
      </div>

      {dependencies.length === 0 ? (
        <EmptySectionText>
          No dependencies.
        </EmptySectionText>
      ) : (
        <div className="space-y-1">
          {dependencies.map((dependency) => {
            const isBlockedBy =
              dependency.blocked_task_id === task.id;
            const relatedStatus = isBlockedBy
              ? dependency.blocking_task_status
              : dependency.blocked_task_status;
            const relatedTaskIsDeleted = isBlockedBy
              ? dependency.blocking_task_is_deleted
              : dependency.blocked_task_is_deleted;

            return (
              <div
                key={dependency.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-neutral-50"
              >
                <span className="text-xs text-muted-foreground">
                  {isBlockedBy
                    ? "Blocked by"
                    : "Blocks"}
                </span>

                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {isBlockedBy
                    ? dependency.blocking_task_title ??
                      "Unknown task"
                    : dependency.blocked_task_title ??
                      "Unknown task"}
                </span>

                {relatedTaskIsDeleted ? (
                  <Badge
                    variant="secondary"
                    className="shrink-0 font-normal"
                  >
                    Deleted
                  </Badge>
                ) : relatedStatus ? (
                  <Badge
                    variant={statusBadgeVariant(
                      relatedStatus
                    )}
                    className="shrink-0 font-normal"
                  >
                    {STATUS_LABELS[relatedStatus]}
                  </Badge>
                ) : null}

                {dependency.date_conflict && (
                  <AlertTriangle
                    className="size-4 shrink-0 text-red-600"
                    strokeWidth={1.75}
                    aria-label="Dependency date conflict"
                  />
                )}

                <button
                  type="button"
                  onClick={() =>
                    removeTaskDependency(dependency.id)
                  }
                  disabled={dependencySaving}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-red-600"
                  aria-label="Remove dependency"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </TaskSection>

    {/* Impact */}
    <TaskSection
      title="Task impact"
      icon={<Target className="size-4" />}
      open={impactOpen}
      onToggle={() =>
        setImpactOpen((value) => !value)
      }
    >
      {impactLoading ? (
        <EmptySectionText>
          Loading impact data...
        </EmptySectionText>
      ) : impact ? (
        <div className="grid overflow-hidden rounded-lg border border-neutral-200 sm:grid-cols-3">
          <ImpactItem
            label="Direct dependents"
            value={impact.directDependents}
          />
          <ImpactItem
            label="Total dependents"
            value={impact.totalDependents}
          />
          <ImpactItem
            label="Blocked dependents"
            value={impact.blockedDependents}
          />
        </div>
      ) : (
        <EmptySectionText>
          No impact data available.
        </EmptySectionText>
      )}
    </TaskSection>

    {/* Activity */}
    <TaskSection
      title="Activity"
      icon={<History className="size-4" />}
      open={activityOpen}
      onToggle={() =>
        setActivityOpen((value) => !value)
      }
    >
      {activityLoading ? (
        <EmptySectionText>
          Loading activity...
        </EmptySectionText>
      ) : activity.length === 0 ? (
        <EmptySectionText>
          No activity recorded.
        </EmptySectionText>
      ) : (
        <div className="space-y-0">
          {activity.map((entry, index) => (
            <ActivityItem
              key={entry.id}
              entry={entry}
              isLast={index === activity.length - 1}
            />
          ))}
        </div>
      )}
    </TaskSection>
    </>
  );
}
