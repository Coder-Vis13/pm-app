import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Flag,
  GitBranch,
  Loader2,
  ListTree,
  Save,
  Target,
  User,
  X,
  Trash2,
  History,
} from "lucide-react";

import {
  getSubtasks,
  getTask,
  getTaskAssignees,
  updateTask,
  updateTaskStatus,
  removeTaskAssignee,
  addTaskAssignee,
  deleteTask,
} from "../api/task";

import {
  getTaskAssigneeEvents,
  getTaskHistory,
} from "../api/history";

import { getProjectMembers } from "../api/user";

import { getTaskDependencyDetails } from "@/api/dependency";
import { getTaskImpact, getTaskCriticalPath } from "@/api/task";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  AssigneeEvent,
  CriticalPathResult,
  PriorityLevel,
  SectionTask,
  StatusType,
  Task,
  TaskAssignee,
  TaskHistory,
  TaskImpact,
  ProjectMemberWithUser,
} from "@/types/database";

import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  getInitials,
  statusBadgeVariant,
} from "./section-task-ui";

interface DependencyDetails {
  id: string;
  blocking_task_id: string | null;
  blocked_task_id: string | null;
  created_at: string | null;
  blocking_task_title: string | null;
  blocked_task_title: string | null;
}

interface TaskDetailDialogProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  onAddSubtask?: (parentTaskId: string) => void;
}

interface ActivityEntry {
  id: string;
  label: string;
  detail?: string;
  createdAt: string;
}

export function TaskDetailDialog({
  taskId,
  open,
  onClose,
  onUpdated,
  onAddSubtask,
}: TaskDetailDialogProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [subtasks, setSubtasks] = useState<SectionTask[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(taskId);

  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const [dependencies, setDependencies] = useState<DependencyDetails[]>([]);
  const [impact, setImpact] = useState<TaskImpact | null>(null);
  const [criticalPath, setCriticalPath] =
    useState<CriticalPathResult | null>(null);

  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [assigneeEvents, setAssigneeEvents] = useState<AssigneeEvent[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] =
    useState<PriorityLevel>("medium");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [subtasksOpen, setSubtasksOpen] = useState(true);
  const [dependenciesOpen, setDependenciesOpen] = useState(true);
  const [impactOpen, setImpactOpen] = useState(true);
  const [criticalPathOpen, setCriticalPathOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(false);

  const [members, setMembers] = useState<ProjectMemberWithUser[]>([]);
  const [assigneeLoading, setAssigneeLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentTaskId(taskId);
      setParentTaskId(null);
      setActivityOpen(false);
    }
  }, [open, taskId]);

  useEffect(() => {
    if (!open || !currentTaskId) {
      return;
    }

    let cancelled = false;

    async function loadTask() {
      try {
        setLoading(true);
        setError(null);
        setSaveError(null);
        setSaved(false);

        if (!currentTaskId) return;
        
        const [
          taskData,
          subtaskData,
          dependencyData,
          impactData,
          criticalPathData,
          assigneeData,
          historyData,
          assigneeEventData,
        ] = await Promise.all([
          getTask(currentTaskId),
          getSubtasks(currentTaskId),
          getTaskDependencyDetails(currentTaskId),
          getTaskImpact(currentTaskId),
          getTaskCriticalPath(currentTaskId),
          getTaskAssignees(currentTaskId),
          getTaskHistory(currentTaskId),
          getTaskAssigneeEvents(currentTaskId),
        ]);

        if (cancelled) return;

        const memberData = taskData.project_id
          ? await getProjectMembers(taskData.project_id)
          : [];

        if (cancelled) return;

        setTask(taskData);
        setMembers(memberData);
        setSubtasks(subtaskData);
        setDependencies(dependencyData);
        setImpact(impactData);
        setCriticalPath(criticalPathData);
        setAssignees(assigneeData);
        setHistory(historyData);
        setAssigneeEvents(assigneeEventData);

        setTitle(taskData.title);
        setDescription(taskData.description ?? "");
        setPriority(taskData.priority);
        setStartDate(toInputDate(taskData.start_date));
        setDueDate(toInputDate(taskData.due_date));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load task."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTask();

    return () => {
      cancelled = true;
    };
  }, [open, currentTaskId]);

  async function deleteCurrentTask() {
    if (!task) return;

    if (!parentTaskId && subtasks.length > 0) {
      setSaveError(
        "Delete the subtasks before deleting this task."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete "${task.title}"?`
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setSaveError(null);

      await deleteTask(
        task.id,
        task.updated_at
      );

      if (parentTaskId) {
        const updatedSubtasks = await getSubtasks(parentTaskId);

        setCurrentTaskId(parentTaskId);
        setParentTaskId(null);
        setSubtasks(updatedSubtasks);
      } else {
        onUpdated?.();
        onClose();
      }
    } catch (err) {
      console.error("Delete task failed:", err);

      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to delete task."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveChanges() {
    if (!task) return;

    try {
      setSaving(true);
      setSaveError(null);
      setSaved(false);

      const updated = await updateTask(task.id, {
        title: title.trim(),
        description,
        priority,
        startDate: startDate
          ? new Date(startDate).toISOString()
          : null,
        dueDate: dueDate
          ? new Date(dueDate).toISOString()
          : null,
        expectedUpdatedAt: task.updated_at,
      });

      setTask(updated);

      if (parentTaskId) {
        const updatedSubtasks = await getSubtasks(parentTaskId);
        setSubtasks(updatedSubtasks);
      }

      setTitle(updated.title);
      setDescription(updated.description ?? "");
      setPriority(updated.priority);
      setStartDate(toInputDate(updated.start_date));
      setDueDate(toInputDate(updated.due_date));

      setSaved(true);
      onUpdated?.();

      await refreshActivity(updated.id);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to save task."
      );
    } finally {
      setSaving(false);
    }
  }

  async function refreshActivity(taskId: string) {
    try {
      const [historyData, assigneeEventData] = await Promise.all([
        getTaskHistory(taskId),
        getTaskAssigneeEvents(taskId),
      ]);

      setHistory(historyData);
      setAssigneeEvents(assigneeEventData);
    } catch (err) {
      console.error("Failed to refresh task activity:", err);
    }
  }

  async function changeStatus(status: StatusType) {
    if (!task || status === task.status) return;

    try {
      setSaveError(null);
      setSaved(false);

      const updated = await updateTaskStatus(
        task.id,
        status,
        task.updated_at
      );

      setTask(updated);
      onUpdated?.();

      await refreshActivity(updated.id);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to update status."
      );
    }
  }

  async function removeAssignee(assignee: TaskAssignee) {
    if (!task || !assignee.user_id) return;

    try {
      setAssigneeLoading(true);
      setSaveError(null);

      const result = await removeTaskAssignee(
        task.id,
        assignee.user_id,
        task.updated_at
      );

      const updatedAssignees = await getTaskAssignees(task.id);

      setAssignees(updatedAssignees);

      setTask((prev) =>
        prev
          ? {
              ...prev,
              updated_at: result.updatedAt,
            }
          : prev
      );

      onUpdated?.();
      await refreshActivity(task.id);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to remove assignee."
      );
    } finally {
      setAssigneeLoading(false);
    }
  }

  async function addAssignee(userId: string) {
    if (!task) return;

    try {
      setAssigneeLoading(true);
      setSaveError(null);

      const result = await addTaskAssignee(
        task.id,
        userId,
        task.updated_at
      );

      const updatedAssignees = await getTaskAssignees(task.id);

      setAssignees(updatedAssignees);

      setTask((prev) =>
        prev
          ? {
              ...prev,
              updated_at: result.updatedAt,
            }
          : prev
      );

      onUpdated?.();
      await refreshActivity(task.id);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to add assignee."
      );
    } finally {
      setAssigneeLoading(false);
    }
  }

  async function removeSubtask(subtask: SectionTask) {
    const confirmed = window.confirm(
      `Delete "${subtask.title}"?`
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setSaveError(null);

      await deleteTask(
        subtask.id,
        subtask.updated_at
      );

      const updatedSubtasks = await getSubtasks(task!.id);

      setSubtasks(updatedSubtasks);
      onUpdated?.();
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to delete subtask."
      );
    } finally {
      setSaving(false);
    }
  }

  const activity = useMemo(
    () => buildActivity(history, assigneeEvents, members),
    [history, assigneeEvents, members]
  );

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-3 backdrop-blur-[2px] sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-background shadow-[0_24px_80px_rgba(0,0,0,0.16)]">

        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
          <div className="flex items-center gap-2">
            {parentTaskId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentTaskId(parentTaskId);
                  setParentTaskId(null);
                }}
                className="h-7 px-2 text-xs text-muted-foreground"
              >
                <ChevronRight className="mr-1 size-3.5 rotate-180" />
                Parent task
              </Button>
            )}

            <span className="text-xs text-muted-foreground">
              {parentTaskId ? "Subtask" : "Task"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={deleteCurrentTask}
              disabled={saving}
              className="size-8 rounded-lg text-muted-foreground hover:text-red-600"
              aria-label="Delete task"
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close task"
              className="size-8 rounded-lg"
            >
              <X className="size-4" strokeWidth={1.75} />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto">
          {loading ? (
            <div className="flex min-h-130 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading task...
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-sm text-destructive">
              {error}
            </div>
          ) : task ? (
            <div className="px-6 py-7 sm:px-8 sm:py-8">

              {/* Title */}
              <section>
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0 text-muted-foreground">
                    {task.status === "done" ? (
                      <CheckCircle2
                        className="size-5 text-emerald-600"
                        strokeWidth={1.8}
                      />
                    ) : (
                      <Circle
                        className="size-5"
                        strokeWidth={1.6}
                      />
                    )}
                  </div>

                  <input
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    className="w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground sm:text-3xl"
                    placeholder="Task title"
                  />
                </div>
              </section>

              {/* Fields */}
              <section className="mt-7">
                <div className="grid gap-x-12 gap-y-5 sm:grid-cols-2">
                  <TaskField
                    icon={
                      <CheckCircle2
                        className="size-4"
                        strokeWidth={1.75}
                      />
                    }
                    label="Status"
                    value={
                      <StatusMenu
                        status={task.status}
                        onChange={changeStatus}
                      />
                    }
                  />

                  <TaskField
                    icon={
                      <User
                        className="size-4"
                        strokeWidth={1.75}
                      />
                    }
                    label="Assignee"
                    value={
                      <div className="flex flex-wrap items-center gap-2">
                        {assignees.map((assignee) => {
                          const name =
                            assignee.app_user?.name ??
                            "Unknown user";

                          return (
                            <div
                              key={assignee.id}
                              className="inline-flex items-center gap-2 rounded-md bg-neutral-50 px-2 py-1"
                            >
                              <Avatar size="sm">
                                <AvatarFallback className="text-[10px] font-medium">
                                  {getInitials(name)}
                                </AvatarFallback>
                              </Avatar>

                              <span className="text-sm">
                                {name}
                              </span>

                              <button
                                type="button"
                                disabled={assigneeLoading}
                                onClick={() =>
                                  removeAssignee(assignee)
                                }
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}

                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value) {
                              void addAssignee(value);
                            }
                          }}
                          disabled={assigneeLoading}
                        >
                          <SelectTrigger className="h-8 w-auto min-w-32 border-dashed border-neutral-300 px-2.5 text-sm">
                            <SelectValue placeholder="+ Add assignee" />
                          </SelectTrigger>

                          <SelectContent>
                            {members
                              .filter(
                                (member) =>
                                  member.user_id &&
                                  !assignees.some(
                                    (assignee) =>
                                      assignee.user_id ===
                                      member.user_id
                                  )
                              )
                              .map((member) => (
                                <SelectItem
                                  key={member.user_id!}
                                  value={member.user_id!}
                                >
                                  {member.app_user?.name ??
                                    "Unknown user"}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    }
                  />

                  <TaskField
                    icon={
                      <Calendar
                        className="size-4"
                        strokeWidth={1.75}
                      />
                    }
                    label="Start date"
                    value={
                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) =>
                          setStartDate(event.target.value)
                        }
                        className="h-8 rounded-md border border-neutral-200 bg-background px-2 text-sm outline-none focus:border-neutral-400"
                      />
                    }
                  />

                  <TaskField
                    icon={
                      <Calendar
                        className="size-4"
                        strokeWidth={1.75}
                      />
                    }
                    label="Due date"
                    value={
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(event) =>
                          setDueDate(event.target.value)
                        }
                        className="h-8 rounded-md border border-neutral-200 bg-background px-2 text-sm outline-none focus:border-neutral-400"
                      />
                    }
                  />

                  <TaskField
                    icon={
                      <Flag
                        className="size-4"
                        strokeWidth={1.75}
                      />
                    }
                    label="Priority"
                    value={
                      <PriorityMenu
                        priority={priority}
                        onChange={setPriority}
                      />
                    }
                  />

                  <TaskField
                    icon={
                      <Target
                        className="size-4"
                        strokeWidth={1.75}
                      />
                    }
                    label="Risk"
                    value={task.risk_score}
                  />
                </div>
              </section>

              {/* Save bar */}
              <div className="mt-6 flex items-center justify-end gap-3">
                {saveError && (
                  <p className="mr-auto text-sm text-destructive">
                    {saveError}
                  </p>
                )}

                {saved && (
                  <span className="text-sm text-emerald-600">
                    Saved
                  </span>
                )}

                <Button
                  type="button"
                  size="sm"
                  onClick={saveChanges}
                  disabled={saving || !title.trim()}
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save
                      className="size-3.5"
                      strokeWidth={1.75}
                    />
                  )}
                  Save changes
                </Button>
              </div>

              {/* Description */}
              <section className="mt-8">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </p>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  rows={5}
                  placeholder="Add a description..."
                  className="w-full resize-none rounded-lg border border-transparent bg-neutral-50/70 p-3 text-sm leading-7 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-neutral-200 focus:bg-background"
                />
              </section>

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
                {dependencies.length === 0 ? (
                  <EmptySectionText>
                    No dependencies.
                  </EmptySectionText>
                ) : (
                  <div className="space-y-1">
                    {dependencies.map((dependency) => {
                      const isBlockedBy =
                        dependency.blocked_task_id === task.id;

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

                          <span className="text-sm font-medium">
                            {isBlockedBy
                              ? dependency.blocking_task_title ??
                                "Unknown task"
                              : dependency.blocked_task_title ??
                                "Unknown task"}
                          </span>
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
                {impact ? (
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

              {/* Critical path */}
              <TaskSection
                title="Critical path"
                icon={<Target className="size-4" />}
                open={criticalPathOpen}
                onToggle={() =>
                  setCriticalPathOpen((value) => !value)
                }
              >
                {criticalPath ? (
                  <div className="rounded-lg border border-neutral-200 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="font-medium">
                        {criticalPath.totalDurationDays} days
                      </span>

                      {criticalPath.estimatedCompletionDate && (
                        <span className="text-muted-foreground">
                          Estimated completion{" "}
                          {formatDate(
                            criticalPath.estimatedCompletionDate
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <EmptySectionText>
                    No critical path available.
                  </EmptySectionText>
                )}
              </TaskSection>

              {/* Activity */}
              <TaskSection
                title="Activity"
                icon={<History className="size-4" />}
                count={activity.length}
                open={activityOpen}
                onToggle={() =>
                  setActivityOpen((value) => !value)
                }
              >
                {activity.length === 0 ? (
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
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function buildActivity(
  history: TaskHistory[],
  assigneeEvents: AssigneeEvent[],
  members: ProjectMemberWithUser[]
): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  const sortedHistory = [...history].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  );

  for (let i = 0; i < sortedHistory.length; i++) {
    const current = sortedHistory[i];
    const previous = sortedHistory[i - 1];

    if (!current.task_snapshot) {
      continue;
    }

    if (current.event_type === "created" || !previous?.task_snapshot) {
      entries.push({
        id: `history-created-${current.id}`,
        label: "Task created",
        createdAt: current.created_at,
      });

      continue;
    }

    const prev = previous.task_snapshot;
    const next = current.task_snapshot;

    if (prev.status !== next.status) {
      entries.push({
        id: `status-${current.id}`,
        label: "Status changed",
        detail: `${formatStatus(prev.status)} → ${formatStatus(next.status)}`,
        createdAt: current.created_at,
      });
    }

    if (prev.priority !== next.priority) {
      entries.push({
        id: `priority-${current.id}`,
        label: "Priority changed",
        detail: `${formatPriority(prev.priority)} → ${formatPriority(next.priority)}`,
        createdAt: current.created_at,
      });
    }

    if (prev.title !== next.title) {
      entries.push({
        id: `title-${current.id}`,
        label: "Title changed",
        detail: next.title ?? "",
        createdAt: current.created_at,
      });
    }

    if (prev.description !== next.description) {
      entries.push({
        id: `description-${current.id}`,
        label: "Description updated",
        createdAt: current.created_at,
      });
    }

    if (prev.start_date !== next.start_date) {
      entries.push({
        id: `start-date-${current.id}`,
        label: "Start date changed",
        detail:
          next.start_date
            ? formatDate(next.start_date)
            : "Removed",
        createdAt: current.created_at,
      });
    }

    if (prev.due_date !== next.due_date) {
      entries.push({
        id: `due-date-${current.id}`,
        label: "Due date changed",
        detail:
          next.due_date
            ? formatDate(next.due_date)
            : "Removed",
        createdAt: current.created_at,
      });
    }
  }

  for (const event of assigneeEvents) {
    const member = members.find(
      (item) => item.user_id === event.user_id
    );

    const userName =
      member?.app_user?.name ?? "A member";

    entries.push({
      id: `assignee-${event.id}`,
      label:
        event.event_type === "assignee_added"
          ? `${userName} assigned`
          : `${userName} unassigned`,
      createdAt: event.created_at,
    });
  }

  return entries.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );
}

function ActivityItem({
  entry,
  isLast,
}: {
  entry: ActivityEntry;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex w-4 shrink-0 flex-col items-center">
        <span className="mt-1.5 size-1.5 rounded-full bg-neutral-400" />

        {!isLast && (
          <span className="mt-1 h-full w-px bg-neutral-200" />
        )}
      </div>

      <div className="min-w-0 pb-4">
        <p className="text-sm font-medium text-foreground">
          {entry.label}
        </p>

        {entry.detail && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {entry.detail}
          </p>
        )}

        <p className="mt-1 text-xs text-muted-foreground">
          {formatRelativeTime(entry.createdAt)}
        </p>
      </div>
    </div>
  );
}

function formatStatus(
  status: StatusType | null | undefined
) {
  if (!status) return "Unknown";

  return STATUS_LABELS[status];
}

function formatPriority(
  priority: PriorityLevel | null | undefined
) {
  if (!priority) return "Unknown";

  return PRIORITY_LABELS[priority];
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const now = Date.now();
  const diffMs = now - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "Just now";
  }

  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return `${minutes}m ago`;
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours}h ago`;
  }

  if (diffMs < 7 * day) {
    const days = Math.floor(diffMs / day);
    return `${days}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusMenu({
  status,
  onChange,
}: {
  status: StatusType;
  onChange: (status: StatusType) => void;
}) {
  const statuses: StatusType[] = [
    "to_do",
    "in_progress",
    "waiting",
    "blocked",
    "done",
  ];

  return (
    <select
      value={status}
      onChange={(event) =>
        onChange(event.target.value as StatusType)
      }
      className="h-8 rounded-md border border-neutral-200 bg-background px-2 text-sm font-medium outline-none focus:border-neutral-400"
    >
      {statuses.map((value) => (
        <option key={value} value={value}>
          {STATUS_LABELS[value]}
        </option>
      ))}
    </select>
  );
}

function PriorityMenu({
  priority,
  onChange,
}: {
  priority: PriorityLevel;
  onChange: (priority: PriorityLevel) => void;
}) {
  const priorities: PriorityLevel[] = [
    "low",
    "medium",
    "high",
    "critical",
  ];

  return (
    <select
      value={priority}
      onChange={(event) =>
        onChange(event.target.value as PriorityLevel)
      }
      className="h-8 rounded-md border border-neutral-200 bg-background px-2 text-sm font-medium outline-none focus:border-neutral-400"
    >
      {priorities.map((value) => (
        <option key={value} value={value}>
          {PRIORITY_LABELS[value]}
        </option>
      ))}
    </select>
  );
}

function TaskField({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="shrink-0">{icon}</span>
        <span>{label}</span>
      </div>

      <div className="min-w-0 text-sm font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

function TaskSection({
  title,
  icon,
  count,
  open,
  onToggle,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  count?: number;
  open: boolean;
  onToggle: () => void;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 border-t border-neutral-100 pt-7">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 text-left"
        >
          {open ? (
            <ChevronDown
              className="size-4 text-muted-foreground"
              strokeWidth={1.75}
            />
          ) : (
            <ChevronRight
              className="size-4 text-muted-foreground"
              strokeWidth={1.75}
            />
          )}

          <span className="text-muted-foreground">
            {icon}
          </span>

          <span className="text-sm font-semibold text-foreground">
            {title}
          </span>

          {count !== undefined && (
            <span className="text-xs text-muted-foreground">
              {count}
            </span>
          )}
        </button>

        {action}
      </div>

      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

function EmptySectionText({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p className="px-1 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function ImpactItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border-b border-neutral-100 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown";

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toInputDate(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}




// import {
//   useEffect,
//   useState,
//   type ReactNode,
// } from "react";
// import {
//   Calendar,
//   CheckCircle2,
//   ChevronDown,
//   ChevronRight,
//   Circle,
//   Flag,
//   GitBranch,
//   Loader2,
//   ListTree,
//   Save,
//   Target,
//   User,
//   X,
//   Trash2,
// } from "lucide-react";

// import {
//   getSubtasks,
//   getTask,
//   getTaskAssignees,
//   updateTask,
//   updateTaskStatus,
//   removeTaskAssignee,
//   addTaskAssignee,
//   deleteTask
// } from "../api/task";

// import { getProjectMembers } from "../api/user";

// import { getTaskDependencyDetails } from "@/api/dependency";
// import { getTaskImpact, getTaskCriticalPath } from "@/api/task";

// import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";

// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// import type {
//   CriticalPathResult,
//   PriorityLevel,
//   SectionTask,
//   StatusType,
//   Task,
//   TaskAssignee,
//   TaskImpact,
//   ProjectMemberWithUser
// } from "@/types/database";

// import {
//   PRIORITY_LABELS,
//   STATUS_LABELS,
//   getInitials,
//   statusBadgeVariant,
// } from "./section-task-ui";

// interface DependencyDetails {
//   id: string;
//   blocking_task_id: string | null;
//   blocked_task_id: string | null;
//   created_at: string | null;
//   blocking_task_title: string | null;
//   blocked_task_title: string | null;
// }

// interface TaskDetailDialogProps {
//   taskId: string | null;
//   open: boolean;
//   onClose: () => void;
//   onUpdated?: () => void;
//   onAddSubtask?: (parentTaskId: string) => void;
// }

// export function TaskDetailDialog({
//   taskId,
//   open,
//   onClose,
//   onUpdated,
//   onAddSubtask,
// }: TaskDetailDialogProps) {
//   const [task, setTask] = useState<Task | null>(null);
//   const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
//   const [subtasks, setSubtasks] = useState<SectionTask[]>([]);
//   const [currentTaskId, setCurrentTaskId] = useState<string | null>(taskId);

//   const [parentTaskId, setParentTaskId] = useState<string | null>(null);
//   const [dependencies, setDependencies] = useState<DependencyDetails[]>([]);
//   const [impact, setImpact] = useState<TaskImpact | null>(null);
//   const [criticalPath, setCriticalPath] =
//     useState<CriticalPathResult | null>(null);
  

//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [priority, setPriority] =
//     useState<PriorityLevel>("medium");
//   const [startDate, setStartDate] = useState("");
//   const [dueDate, setDueDate] = useState("");

//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [saveError, setSaveError] = useState<string | null>(null);
//   const [saved, setSaved] = useState(false);

//   const [subtasksOpen, setSubtasksOpen] = useState(true);
//   const [dependenciesOpen, setDependenciesOpen] = useState(true);
//   const [impactOpen, setImpactOpen] = useState(true);
//   const [criticalPathOpen, setCriticalPathOpen] = useState(true);

//   const [members, setMembers] = useState<ProjectMemberWithUser[]>([]);
//   const [assigneeLoading, setAssigneeLoading] = useState(false);


//   useEffect(() => {
//   if (open) {
//     setCurrentTaskId(taskId);
//     setParentTaskId(null);
//   }
// }, [open, taskId]);


//   useEffect(() => {
//     if (!open || !currentTaskId) {
//       return;
//     }

//     let cancelled = false;

//     async function loadTask() {
//       try {
//         setLoading(true);
//         setError(null);
//         setSaveError(null);
//         setSaved(false);

//         const [
//           taskData,
//           subtaskData,
//           dependencyData,
//           impactData,
//           criticalPathData,
//           assigneeData,
//         ] = await Promise.all([
//           getTask(currentTaskId!),
//           getSubtasks(currentTaskId!),
//           getTaskDependencyDetails(currentTaskId!),
//           getTaskImpact(currentTaskId!),
//           getTaskCriticalPath(currentTaskId!),
//           getTaskAssignees(currentTaskId!),
//         ]);
// if (cancelled) return;
//         setTask(taskData);

// const memberData = taskData.project_id
//   ? await getProjectMembers(taskData.project_id)
//   : [];

//         if (cancelled) return;

        
//   setMembers(memberData);
//         setSubtasks(subtaskData);
//         setDependencies(dependencyData);
//         setImpact(impactData);
//         setCriticalPath(criticalPathData);
//         setAssignees(assigneeData);

//         setTitle(taskData.title);
//         setDescription(taskData.description ?? "");
//         setPriority(taskData.priority);
//         setStartDate(toInputDate(taskData.start_date));
//         setDueDate(toInputDate(taskData.due_date));
//       } catch (err) {
//         if (!cancelled) {
//           setError(
//             err instanceof Error
//               ? err.message
//               : "Failed to load task."
//           );
//         }
//       } finally {
//         if (!cancelled) {
//           setLoading(false);
//         }
//       }
//     }

//     loadTask();

//     return () => {
//       cancelled = true;
//     };
//   }, [open, currentTaskId]);


// async function deleteCurrentTask() {
//   if (!task) return;

//   if (!parentTaskId && subtasks.length > 0) {
//     setSaveError(
//       "Delete the subtasks before deleting this task."
//     );
//     return;
//   }

//   const confirmed = window.confirm(
//     `Delete "${task.title}"?`
//   );

//   if (!confirmed) return;

//   try {
//     setSaving(true);
//     setSaveError(null);

//     await deleteTask(
//       task.id,
//       task.updated_at
//     );

//     if (parentTaskId) {
//       const updatedSubtasks = await getSubtasks(parentTaskId);

//       setCurrentTaskId(parentTaskId);
//       setParentTaskId(null);
//       setSubtasks(updatedSubtasks);
//     } else {
//       onUpdated?.();
//       onClose();
//     }
//   } catch (err) {
//   console.error("Delete task failed:", err);

//   setSaveError(
//     err instanceof Error
//       ? err.message
//       : "Failed to delete task."
//   );
// } finally {
//     setSaving(false);
//   }
// }


//   async function saveChanges() {
//     if (!task) return;

//     try {
//       setSaving(true);
//       setSaveError(null);
//       setSaved(false);

//       const updated = await updateTask(task.id, {
//         title: title.trim(),
//         description,
//         priority,
//         startDate: startDate
//           ? new Date(startDate).toISOString()
//           : null,
//         dueDate: dueDate
//           ? new Date(dueDate).toISOString()
//           : null,
//         expectedUpdatedAt: task.updated_at,
//       });

//       setTask(updated);

//       if (parentTaskId) {
//   const updatedSubtasks = await getSubtasks(parentTaskId);
//   setSubtasks(updatedSubtasks);
// }

//       setTitle(updated.title);
//       setDescription(updated.description ?? "");
//       setPriority(updated.priority);
//       setStartDate(toInputDate(updated.start_date));
//       setDueDate(toInputDate(updated.due_date));

//       setSaved(true);
//       onUpdated?.();
//     } catch (err) {
//       setSaveError(
//         err instanceof Error
//           ? err.message
//           : "Failed to save task."
//       );
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function changeStatus(status: StatusType) {
//     if (!task || status === task.status) return;

//     try {
      
//       setSaveError(null);
//       setSaved(false);

//       const updated = await updateTaskStatus(
//         task.id,
//         status,
//         task.updated_at
//       );

//       setTask(updated);
//       onUpdated?.();
//     } catch (err) {
//       setSaveError(
//         err instanceof Error
//           ? err.message
//           : "Failed to update status."
//       );
//     }
//   }

//   async function removeAssignee(assignee: TaskAssignee) {
//     if (!task || !assignee.user_id) return;

//     try {
//       setAssigneeLoading(true);
//       setSaveError(null);
//       const result = await removeTaskAssignee(
//   task.id,
//   assignee.user_id,
//   task.updated_at
// );

// const updatedAssignees = await getTaskAssignees(task.id);

// setAssignees(updatedAssignees);

// setTask((prev) =>
//   prev
//     ? {
//         ...prev,
//         updated_at: result.updatedAt,
//       }
//     : prev
// );

// onUpdated?.();
//     } catch (err) {
//       setSaveError(
//         err instanceof Error
//           ? err.message
//           : "Failed to remove assignee."
//       );
//     } finally {
//   setAssigneeLoading(false);
// }
//   }


//   async function addAssignee(userId: string) {
//   if (!task) return;

//   try {
//     setAssigneeLoading(true);
//     setSaveError(null);

//     const result = await addTaskAssignee(
//       task.id,
//       userId,
//       task.updated_at
//     );

//     const updatedAssignees = await getTaskAssignees(task.id);

//     setAssignees(updatedAssignees);

//     setTask((prev) =>
//       prev
//         ? {
//             ...prev,
//             updated_at: result.updatedAt,
//           }
//         : prev
//     );
//     onUpdated?.();
//   } catch (err) {
//     setSaveError(
//       err instanceof Error
//         ? err.message
//         : "Failed to add assignee."
//     );
//   } finally {
//     setAssigneeLoading(false);
//   }
// }


//   if (!open) {
//     return null;
//   }



// async function removeSubtask(subtask: SectionTask) {
//   const confirmed = window.confirm(
//     `Delete "${subtask.title}"?`
//   );

//   if (!confirmed) return;

//   try {
//     setSaving(true);
//     setSaveError(null);

//     await deleteTask(
//       subtask.id,
//       subtask.updated_at
//     );

//     const updatedSubtasks = await getSubtasks(task!.id);

//     setSubtasks(updatedSubtasks);
//     onUpdated?.();
//   } catch (err) {
//     setSaveError(
//       err instanceof Error
//         ? err.message
//         : "Failed to delete subtask."
//     );
//   } finally {
//     setSaving(false);
//   }
// }

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-3 backdrop-blur-[2px] sm:p-6">
//       <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-background shadow-[0_24px_80px_rgba(0,0,0,0.16)]">

//         {/* Top bar */}
//         <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
//   <div className="flex items-center gap-2">
//     {parentTaskId && (
//       <Button
//         type="button"
//         variant="ghost"
//         size="sm"
//         onClick={() => {
//           setCurrentTaskId(parentTaskId);
//           setParentTaskId(null);
//         }}
//         className="h-7 px-2 text-xs text-muted-foreground"
//       >
//         <ChevronRight className="mr-1 size-3.5 rotate-180" />
//         Parent task
//       </Button>
//     )}

//     <span className="text-xs text-muted-foreground">
//       {parentTaskId ? "Subtask" : "Task"}
//     </span>
//   </div>

//   <div className="flex items-center gap-1">
//     <Button
//       type="button"
//       variant="ghost"
//       size="icon"
//       onClick={deleteCurrentTask}
//       disabled={saving}
//       className="size-8 rounded-lg text-muted-foreground hover:text-red-600"
//       aria-label="Delete task"
//     >
//       <Trash2 className="size-4" strokeWidth={1.75} />
//     </Button>

//     <Button
//       type="button"
//       variant="ghost"
//       size="icon"
//       onClick={onClose}
//       aria-label="Close task"
//       className="size-8 rounded-lg"
//     >
//       <X className="size-4" strokeWidth={1.75} />
//     </Button>
//   </div>
// </div>

//         <div className="overflow-y-auto">
//           {loading ? (
//             <div className="flex min-h-130 items-center justify-center text-sm text-muted-foreground">
//               <Loader2 className="mr-2 size-4 animate-spin" />
//               Loading task...
//             </div>
//           ) : error ? (
//             <div className="px-6 py-12 text-sm text-destructive">
//               {error}
//             </div>
//           ) : task ? (
//             <div className="px-6 py-7 sm:px-8 sm:py-8">

//               {/* Title */}
//               <section>
//                 <div className="flex items-start gap-3">
//                   <div className="mt-1 shrink-0 text-muted-foreground">
//                     {task.status === "done" ? (
//                       <CheckCircle2
//                         className="size-5 text-emerald-600"
//                         strokeWidth={1.8}
//                       />
//                     ) : (
//                       <Circle
//                         className="size-5"
//                         strokeWidth={1.6}
//                       />
//                     )}
//                   </div>

//                   <input
//                     value={title}
//                     onChange={(event) =>
//                       setTitle(event.target.value)
//                     }
//                     className="w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground sm:text-3xl"
//                     placeholder="Task title"
//                   />
//                 </div>
//               </section>

 

              

//               {/* Fields */}
//               <section className="mt-7">
//                 <div className="grid gap-x-12 gap-y-5 sm:grid-cols-2">

//                   <TaskField
//                     icon={
//                       <CheckCircle2
//                         className="size-4"
//                         strokeWidth={1.75}
//                       />
//                     }
//                     label="Status"
//                     value={
//                       <StatusMenu
//                         status={task.status}
//                         onChange={changeStatus}
//                       />
//                     }
//                   />

//                   <TaskField
//                     icon={
//                       <User
//                         className="size-4"
//                         strokeWidth={1.75}
//                       />
//                     }
//                     label="Assignee"
//                     value={
//   <div className="flex flex-wrap items-center gap-2">
//     {assignees.map((assignee) => {
//       const name =
//         assignee.app_user?.name ?? "Unknown user";

//       return (
//         <div
//           key={assignee.id}
//           className="inline-flex items-center gap-2 rounded-md bg-neutral-50 px-2 py-1"
//         >
//           <Avatar size="sm">
//             <AvatarFallback className="text-[10px] font-medium">
//               {getInitials(name)}
//             </AvatarFallback>
//           </Avatar>

//           <span className="text-sm">{name}</span>

//           <button
//             type="button"
//             disabled={assigneeLoading}
//             onClick={() => removeAssignee(assignee)}
//             className="text-xs text-muted-foreground hover:text-foreground"
//           >
//             ×
//           </button>
//         </div>
//       );
//     })}

//     <Select
//       value=""
//       onValueChange={(value) => {
//         if (value) {
//           void addAssignee(value);
//         }
//       }}
//       disabled={assigneeLoading}
//     >
//       <SelectTrigger className="h-8 w-auto min-w-32 border-dashed border-neutral-300 px-2.5 text-sm">
//         <SelectValue placeholder="+ Add assignee" />
//       </SelectTrigger>

//       <SelectContent>
//         {members
//           .filter(
//             (member) =>
//               member.user_id &&
//               !assignees.some(
//                 (assignee) =>
//                   assignee.user_id === member.user_id
//               )
//           )
//           .map((member) => (
//             <SelectItem
//               key={member.user_id!}
//               value={member.user_id!}
//             >
//               {member.app_user?.name ?? "Unknown user"}
//             </SelectItem>
//           ))}
//       </SelectContent>
//     </Select>
//   </div>
// }
//                   />

//                   <TaskField
//                     icon={
//                       <Calendar
//                         className="size-4"
//                         strokeWidth={1.75}
//                       />
//                     }
//                     label="Start date"
//                     value={
//                       <input
//                         type="date"
//                         value={startDate}
//                         onChange={(event) =>
//                           setStartDate(event.target.value)
//                         }
//                         className="h-8 rounded-md border border-neutral-200 bg-background px-2 text-sm outline-none focus:border-neutral-400"
//                       />
//                     }
//                   />

//                   <TaskField
//                     icon={
//                       <Calendar
//                         className="size-4"
//                         strokeWidth={1.75}
//                       />
//                     }
//                     label="Due date"
//                     value={
//                       <input
//                         type="date"
//                         value={dueDate}
//                         onChange={(event) =>
//                           setDueDate(event.target.value)
//                         }
//                         className="h-8 rounded-md border border-neutral-200 bg-background px-2 text-sm outline-none focus:border-neutral-400"
//                       />
//                     }
//                   />

//                   <TaskField
//                     icon={
//                       <Flag
//                         className="size-4"
//                         strokeWidth={1.75}
//                       />
//                     }
//                     label="Priority"
//                     value={
//                       <PriorityMenu
//                         priority={priority}
//                         onChange={setPriority}
//                       />
//                     }
//                   />

//                   <TaskField
//                     icon={
//                       <Target
//                         className="size-4"
//                         strokeWidth={1.75}
//                       />
//                     }
//                     label="Risk"
//                     value={task.risk_score}
//                   />
//                 </div>
//               </section>

//               {/* Save bar */}
//               <div className="mt-6 flex items-center justify-end gap-3">
//                 {saveError && (
//                   <p className="mr-auto text-sm text-destructive">
//                     {saveError}
//                   </p>
//                 )}

//                 {saved && (
//                   <span className="text-sm text-emerald-600">
//                     Saved
//                   </span>
//                 )}

//                 <Button
//                   type="button"
//                   size="sm"
//                   onClick={saveChanges}
//                   disabled={saving || !title.trim()}
//                 >
//                   {saving ? (
//                     <Loader2 className="size-3.5 animate-spin" />
//                   ) : (
//                     <Save
//                       className="size-3.5"
//                       strokeWidth={1.75}
//                     />
//                   )}
//                   Save changes
//                 </Button>
//               </div>

//               {/* Description */}
//               <section className="mt-8">
//                 <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
//                   Description
//                 </p>

//                 <textarea
//                   value={description}
//                   onChange={(event) =>
//                     setDescription(event.target.value)
//                   }
//                   rows={5}
//                   placeholder="Add a description..."
//                   className="w-full resize-none rounded-lg border border-transparent bg-neutral-50/70 p-3 text-sm leading-7 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-neutral-200 focus:bg-background"
//                 />
//               </section>

//               {/* Subtasks */}
//               <TaskSection
//   title="Subtasks"
//   icon={<ListTree className="size-4" />}
//   count={subtasks.length}
//   open={subtasksOpen}
//   onToggle={() =>
//     setSubtasksOpen((value) => !value)
//   }
//   action={
//     !parentTaskId && onAddSubtask ? (
//       <Button
//         type="button"
//         variant="ghost"
//         size="sm"
//         onClick={() => onAddSubtask(task!.id)}
//         className="h-7 border border-neutral-200 bg-background px-2.5 text-xs text-muted-foreground hover:bg-neutral-50 hover:text-foreground"
//       >
//         <ListTree className="mr-1 size-3.5" />
//         Add subtask
//       </Button>
//     ) : null
//   }
// >
//                 {subtasks.length === 0 ? (
//                   <EmptySectionText>
//                     No subtasks yet.
//                   </EmptySectionText>
//                 ) : (
//                   <div className="overflow-hidden rounded-lg border border-neutral-200">
//                     {subtasks.map((subtask) => (
                      
//                       <div
//                         key={subtask.id}
//                         className="flex items-center gap-4 border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50/60"
//                       >
//                         <div className="flex min-w-0 flex-1 items-center gap-3">
//                           {subtask.status === "done" ? (
//                             <CheckCircle2
//                               className="size-4 shrink-0 text-emerald-600"
//                               strokeWidth={1.8}
//                             />
//                           ) : (
//                             <Circle
//                               className="size-4 shrink-0 text-muted-foreground"
//                               strokeWidth={1.6}
//                             />
//                           )}

//                           <button
//   type="button"
//   onClick={() => {
//     setParentTaskId(task.id);
//     setCurrentTaskId(subtask.id);
//   }}
//   className="truncate text-left text-sm font-medium hover:text-neutral-600"
// >
//   {subtask.title}
// </button>
// <button
//   type="button"
//   onClick={() => removeSubtask(subtask)}
//   disabled={saving}
//   className="text-muted-foreground transition-colors hover:text-red-600"
//   aria-label={`Delete ${subtask.title}`}
// >
//   <Trash2 className="size-3.5" />
// </button>
//                         </div>

//                         <Badge
//                           variant={statusBadgeVariant(
//                             subtask.status
//                           )}
//                           className="font-normal"
//                         >
//                           {STATUS_LABELS[subtask.status]}
//                         </Badge>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </TaskSection>

//               {/* Dependencies */}
//               <TaskSection
//                 title="Dependencies"
//                 icon={<GitBranch className="size-4" />}
//                 count={dependencies.length}
//                 open={dependenciesOpen}
//                 onToggle={() =>
//                   setDependenciesOpen((value) => !value)
//                 }
//               >
//                 {dependencies.length === 0 ? (
//                   <EmptySectionText>
//                     No dependencies.
//                   </EmptySectionText>
//                 ) : (
//                   <div className="space-y-1">
//                     {dependencies.map((dependency) => {
//                       const isBlockedBy =
//                         dependency.blocked_task_id === task.id;

//                       return (
//                         <div
//                           key={dependency.id}
//                           className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-neutral-50"
//                         >
//                           <span className="text-xs text-muted-foreground">
//                             {isBlockedBy
//                               ? "Blocked by"
//                               : "Blocks"}
//                           </span>

//                           <span className="text-sm font-medium">
//                             {isBlockedBy
//                               ? dependency.blocking_task_title ??
//                                 "Unknown task"
//                               : dependency.blocked_task_title ??
//                                 "Unknown task"}
//                           </span>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 )}
//               </TaskSection>

//               {/* Impact */}
//               <TaskSection
//                 title="Task impact"
//                 icon={<Target className="size-4" />}
//                 open={impactOpen}
//                 onToggle={() =>
//                   setImpactOpen((value) => !value)
//                 }
//               >
//                 {impact ? (
//                   <div className="grid overflow-hidden rounded-lg border border-neutral-200 sm:grid-cols-3">
//                     <ImpactItem
//                       label="Direct dependents"
//                       value={impact.directDependents}
//                     />
//                     <ImpactItem
//                       label="Total dependents"
//                       value={impact.totalDependents}
//                     />
//                     <ImpactItem
//                       label="Blocked dependents"
//                       value={impact.blockedDependents}
//                     />
//                   </div>
//                 ) : (
//                   <EmptySectionText>
//                     No impact data available.
//                   </EmptySectionText>
//                 )}
//               </TaskSection>

//               {/* Critical path */}
//               <TaskSection
//                 title="Critical path"
//                 icon={<Target className="size-4" />}
//                 open={criticalPathOpen}
//                 onToggle={() =>
//                   setCriticalPathOpen((value) => !value)
//                 }
//               >
//                 {criticalPath ? (
//                   <div className="rounded-lg border border-neutral-200 px-4 py-4">
//                     <div className="flex flex-wrap items-center gap-4 text-sm">
//                       <span className="font-medium">
//                         {criticalPath.totalDurationDays} days
//                       </span>

//                       {criticalPath.estimatedCompletionDate && (
//                         <span className="text-muted-foreground">
//                           Estimated completion{" "}
//                           {formatDate(
//                             criticalPath.estimatedCompletionDate
//                           )}
//                         </span>
//                       )}
//                     </div>
//                   </div>
//                 ) : (
//                   <EmptySectionText>
//                     No critical path available.
//                   </EmptySectionText>
//                 )}
//               </TaskSection>
//             </div>
//           ) : null}
//         </div>
//       </div>
//     </div>
//   );
// }

// function StatusMenu({
//   status,
//   onChange,
// }: {
//   status: StatusType;
//   onChange: (status: StatusType) => void;
// }) {
//   const statuses: StatusType[] = [
//     "to_do",
//     "in_progress",
//     "waiting",
//     "blocked",
//     "done",
//   ];

//   return (
//     <select
//       value={status}
//       onChange={(event) =>
//         onChange(event.target.value as StatusType)
//       }
//       className="h-8 rounded-md border border-neutral-200 bg-background px-2 text-sm font-medium outline-none focus:border-neutral-400"
//     >
//       {statuses.map((value) => (
//         <option key={value} value={value}>
//           {STATUS_LABELS[value]}
//         </option>
//       ))}
//     </select>
//   );
// }

// function PriorityMenu({
//   priority,
//   onChange,
// }: {
//   priority: PriorityLevel;
//   onChange: (priority: PriorityLevel) => void;
// }) {
//   const priorities: PriorityLevel[] = [
//     "low",
//     "medium",
//     "high",
//     "critical",
//   ];

//   return (
//     <select
//       value={priority}
//       onChange={(event) =>
//         onChange(event.target.value as PriorityLevel)
//       }
//       className="h-8 rounded-md border border-neutral-200 bg-background px-2 text-sm font-medium outline-none focus:border-neutral-400"
//     >
//       {priorities.map((value) => (
//         <option key={value} value={value}>
//           {PRIORITY_LABELS[value]}
//         </option>
//       ))}
//     </select>
//   );
// }

// function TaskField({
//   icon,
//   label,
//   value,
// }: {
//   icon: ReactNode;
//   label: string;
//   value: ReactNode;
// }) {
//   return (
//     <div className="grid grid-cols-[110px_1fr] items-center gap-3">
//       <div className="flex items-center gap-2 text-sm text-muted-foreground">
//         <span className="shrink-0">{icon}</span>
//         <span>{label}</span>
//       </div>

//       <div className="min-w-0 text-sm font-medium text-foreground">
//         {value}
//       </div>
//     </div>
//   );
// }

// function TaskSection({
//   title,
//   icon,
//   count,
//   open,
//   onToggle,
//   action,
//   children,
// }: {
//   title: string;
//   icon: ReactNode;
//   count?: number;
//   open: boolean;
//   onToggle: () => void;
//   action?: ReactNode;
//   children: ReactNode;
// }) {
//   return (
//     <section className="mt-8 border-t border-neutral-100 pt-7">
//       <div className="flex items-center justify-between gap-3">
//         <button
//           type="button"
//           onClick={onToggle}
//           className="flex items-center gap-2 text-left"
//         >
//           {open ? (
//             <ChevronDown
//               className="size-4 text-muted-foreground"
//               strokeWidth={1.75}
//             />
//           ) : (
//             <ChevronRight
//               className="size-4 text-muted-foreground"
//               strokeWidth={1.75}
//             />
//           )}

//           <span className="text-muted-foreground">
//             {icon}
//           </span>

//           <span className="text-sm font-semibold text-foreground">
//             {title}
//           </span>

//           {count !== undefined && (
//             <span className="text-xs text-muted-foreground">
//               {count}
//             </span>
//           )}
//         </button>

//         {action}
//       </div>

//       {open && <div className="mt-3">{children}</div>}
//     </section>
//   );
// }

// function EmptySectionText({
//   children,
// }: {
//   children: ReactNode;
// }) {
//   return (
//     <p className="px-1 text-sm text-muted-foreground">
//       {children}
//     </p>
//   );
// }

// function ImpactItem({
//   label,
//   value,
// }: {
//   label: string;
//   value: number;
// }) {
//   return (
//     <div className="border-b border-neutral-100 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
//       <p className="text-xs text-muted-foreground">
//         {label}
//       </p>

//       <p className="mt-1 text-xl font-semibold tabular-nums">
//         {value}
//       </p>
//     </div>
//   );
// }

// function formatDate(value: string) {
//   return new Date(value).toLocaleDateString(undefined, {
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// }

// function toInputDate(value: string | null) {
//   if (!value) return "";

//   const date = new Date(value);

//   const year = date.getFullYear();
//   const month = String(date.getMonth() + 1).padStart(2, "0");
//   const day = String(date.getDate()).padStart(2, "0");

//   return `${year}-${month}-${day}`;
// }