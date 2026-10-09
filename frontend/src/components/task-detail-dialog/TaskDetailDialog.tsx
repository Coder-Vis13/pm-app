import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getSubtasks,
  getTaskAssignees,
  getTaskDetailBundle,
  updateTask,
  updateTaskStatus,
  removeTaskAssignee,
  addTaskAssignee,
  deleteTask,
  getTasks,
} from "../../api/task";

import {
  getTaskAssigneeEvents,
  getTaskHistory,
} from "../../api/history";

import { getProjectMembers } from "../../api/user";

import {
  createDependency,
  deleteDependency,
  getTaskDependencyDetails,
} from "@/api/dependency";
import { getTaskImpact } from "@/api/task";

import type {
  AssigneeEvent,
  PriorityLevel,
  SectionTask,
  StatusType,
  Task,
  TaskAssignee,
  TaskHistory,
  TaskImpact,
  ProjectMemberWithUser,
} from "@/types/database";

import { TaskDetailDialogView } from "./task-detail-dialog-view";
import { invalidateAfterTaskChange } from "@/lib/invalidate-after-task-change";
import { queryKeys } from "@/lib/query-keys";
import {
  buildActivity,
  getDependencyConflictMessage,
  toInputDate,
  type DependencyDetails,
} from "./task-detail-dialog-utils";
interface TaskDetailDialogProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  onAddSubtask?: (parentTaskId: string) => void;
}
export function TaskDetailDialog({
  taskId,
  open,
  onClose,
  onUpdated,
  onAddSubtask,
}: TaskDetailDialogProps) {
  const queryClient = useQueryClient();
  const [task, setTask] = useState<Task | null>(null);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [subtasks, setSubtasks] = useState<SectionTask[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(taskId);

  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const [dependencies, setDependencies] = useState<DependencyDetails[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [dependencyType, setDependencyType] = useState<
    "blocked_by" | "blocking"
  >("blocked_by");
  const [dependencyTaskId, setDependencyTaskId] = useState("");
  const [dependencySaving, setDependencySaving] = useState(false);
  const [impact, setImpact] = useState<TaskImpact | null>(null);

  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [assigneeEvents, setAssigneeEvents] = useState<AssigneeEvent[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] =
    useState<PriorityLevel>("medium");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [subtasksOpen, setSubtasksOpen] = useState(true);
  const [dependenciesOpen, setDependenciesOpen] = useState(true);
  const [impactOpen, setImpactOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(false);

  const [members, setMembers] = useState<ProjectMemberWithUser[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersLoadedForTaskId, setMembersLoadedForTaskId] =
    useState<string | null>(null);
  const [availableTasksLoading, setAvailableTasksLoading] =
    useState(false);
  const [availableTasksLoadedForTaskId, setAvailableTasksLoadedForTaskId] =
    useState<string | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLoadedForTaskId, setActivityLoadedForTaskId] =
    useState<string | null>(null);
  const [assigneeLoading, setAssigneeLoading] = useState(false);
  const currentTaskIdRef = useRef<string | null>(currentTaskId);

  function notifyTaskUpdated(updatedTask?: Task | null) {
    const source = updatedTask ?? task;
    invalidateAfterTaskChange(queryClient, {
      projectId: source?.project_id ?? undefined,
      taskId: source?.id,
    });
    onUpdated?.();
  }

  useEffect(() => {
    if (open) {
      setCurrentTaskId(taskId);
      setParentTaskId(null);
      setActivityOpen(false);
      setDependencyTaskId("");
    }
  }, [open, taskId]);

  const taskQueriesEnabled = open && !!currentTaskId;

  const taskDetailQuery = useQuery({
    queryKey: queryKeys.taskDetailBundle(currentTaskId ?? ""),
    queryFn: () => getTaskDetailBundle(currentTaskId!),
    enabled: taskQueriesEnabled,
  });

  const loading = taskQueriesEnabled && taskDetailQuery.isPending;

  useEffect(() => {
    currentTaskIdRef.current = currentTaskId;
  }, [currentTaskId]);

  useEffect(() => {
    if (!taskQueriesEnabled) {
      return;
    }

    const queryError = taskDetailQuery.error;

    if (queryError) {
      setLoadError(
        queryError instanceof Error
          ? queryError.message
          : "Failed to load task."
      );
      return;
    }

    if (loading) {
      setLoadError(null);
      return;
    }

    const bundle = taskDetailQuery.data;
    if (!bundle) {
      return;
    }

    const taskData = bundle.task;

    setLoadError(null);
    setSaveError(null);
    setSaved(false);

    setTask(taskData);
    setMembers([]);
    setMembersLoadedForTaskId(null);
    setAvailableTasks([]);
    setAvailableTasksLoadedForTaskId(null);
    setDependencyTaskId("");
    setSubtasks(bundle.subtasks);
    setDependencies(bundle.dependencyDetails);
    setImpact(null);
    setAssignees(bundle.assignees);
    setHistory([]);
    setAssigneeEvents([]);
    setActivityLoadedForTaskId(null);

    setTitle(taskData.title);
    setDescription(taskData.description ?? "");
    setPriority(taskData.priority);
    setStartDate(toInputDate(taskData.start_date));
    setDueDate(toInputDate(taskData.due_date));

    let cancelled = false;
    setImpactLoading(true);
    void getTaskImpact(taskData.id)
      .then((impactData) => {
        if (!cancelled) {
          setImpact(impactData);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load task impact:", err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setImpactLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    taskQueriesEnabled,
    loading,
    currentTaskId,
    taskDetailQuery.data,
    taskDetailQuery.error,
  ]);

  useEffect(() => {
    if (
      !open ||
      !currentTaskId ||
      !activityOpen ||
      activityLoadedForTaskId === currentTaskId
    ) {
      return;
    }

    const taskIdToLoad = currentTaskId;
    let cancelled = false;
    setActivityLoading(true);

    async function loadActivity() {
      try {
        await loadMembers();

        const [historyData, assigneeEventData] = await Promise.all([
          getTaskHistory(taskIdToLoad),
          getTaskAssigneeEvents(taskIdToLoad),
        ]);

        if (!cancelled) {
          setHistory(historyData);
          setAssigneeEvents(assigneeEventData);
          setActivityLoadedForTaskId(taskIdToLoad);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load task activity:", err);
        }
      } finally {
        if (!cancelled) {
          setActivityLoading(false);
        }
      }
    }

    void loadActivity();

    return () => {
      cancelled = true;
    };
  }, [open, currentTaskId, activityOpen, activityLoadedForTaskId]);

  // Load project members when an assignee selector needs them.
  async function loadMembers() {
    if (
      !task?.project_id ||
      membersLoading ||
      membersLoadedForTaskId === task.id
    ) {
      return;
    }

    const taskIdToLoad = task.id;

    try {
      setMembersLoading(true);
      const memberData = await getProjectMembers(task.project_id);

      if (currentTaskIdRef.current === taskIdToLoad) {
        setMembers(memberData);
        setMembersLoadedForTaskId(taskIdToLoad);
      }
    } catch (err) {
      console.error("Failed to load project members:", err);
    } finally {
      setMembersLoading(false);
    }
  }

  // Load project tasks when the dependency selector needs them.
  async function loadAvailableTasks() {
    if (
      !task?.project_id ||
      availableTasksLoading ||
      availableTasksLoadedForTaskId === task.id
    ) {
      return;
    }

    const taskIdToLoad = task.id;

    try {
      setAvailableTasksLoading(true);
      const projectTasks = await getTasks(task.project_id);

      if (currentTaskIdRef.current === taskIdToLoad) {
        setAvailableTasks(projectTasks);
        setAvailableTasksLoadedForTaskId(taskIdToLoad);
      }
    } catch (err) {
      console.error("Failed to load project tasks:", err);
    } finally {
      setAvailableTasksLoading(false);
    }
  }

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
        notifyTaskUpdated(task);
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
      notifyTaskUpdated(updated);

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
      setActivityLoadedForTaskId(taskId);
    } catch (err) {
      console.error("Failed to refresh task activity:", err);
    }
  }

  async function addTaskDependency() {
    if (!task || !dependencyTaskId) return;

    try {
      setDependencySaving(true);
      setSaveError(null);

      const blockingTaskId =
        dependencyType === "blocked_by"
          ? dependencyTaskId
          : task.id;
      const blockedTaskId =
        dependencyType === "blocked_by"
          ? task.id
          : dependencyTaskId;

      await createDependency(blockingTaskId, blockedTaskId);

      const updatedDependencies = await getTaskDependencyDetails(
        task.id
      );

      setDependencies(updatedDependencies);
      setDependencyTaskId("");
      notifyTaskUpdated();
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to add dependency."
      );
    } finally {
      setDependencySaving(false);
    }
  }

  async function removeTaskDependency(dependencyId: string) {
    const confirmed = window.confirm(
      "Remove this dependency?"
    );

    if (!confirmed) return;

    try {
      setDependencySaving(true);
      setSaveError(null);

      await deleteDependency(dependencyId);

      const updatedDependencies = await getTaskDependencyDetails(
        task!.id
      );

      setDependencies(updatedDependencies);
      notifyTaskUpdated();
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to remove dependency."
      );
    } finally {
      setDependencySaving(false);
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
      notifyTaskUpdated(updated);

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

      notifyTaskUpdated();
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

      notifyTaskUpdated();
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
      notifyTaskUpdated();
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

  const dependencyOptions = task
    ? availableTasks.filter(
        (availableTask) =>
          availableTask.id !== task.id &&
          availableTask.project_id === task.project_id &&
          !availableTask.is_deleted
      )
    : [];

  const activeBlockedByCount = task
    ? dependencies.filter(
        (dependency) =>
          dependency.blocked_task_id === task.id &&
          dependency.blocking_task_status !== "done" &&
          dependency.blocking_task_is_deleted === false
      ).length
    : 0;

  const dateConflictMessages = dependencies
    .filter((dependency) => dependency.date_conflict)
    .map(getDependencyConflictMessage)
    .filter((message) => message.length > 0);

  if (!open) {
    return null;
  }

  return (
    <TaskDetailDialogView
      parentTaskId={parentTaskId}
      setParentTaskId={setParentTaskId}
      setCurrentTaskId={setCurrentTaskId}
      deleteCurrentTask={deleteCurrentTask}
      saving={saving}
      onClose={onClose}
      loading={loading}
      error={loadError}
      task={task}
      title={title}
      setTitle={setTitle}
      assignees={assignees}
      members={members}
      membersLoading={membersLoading}
      loadMembers={loadMembers}
      assigneeLoading={assigneeLoading}
      removeAssignee={removeAssignee}
      addAssignee={addAssignee}
      startDate={startDate}
      setStartDate={setStartDate}
      dueDate={dueDate}
      setDueDate={setDueDate}
      priority={priority}
      setPriority={setPriority}
      changeStatus={changeStatus}
      saveError={saveError}
      saved={saved}
      saveChanges={saveChanges}
      description={description}
      setDescription={setDescription}
      subtasks={subtasks}
      onAddSubtask={onAddSubtask}
      removeSubtask={removeSubtask}
      subtasksOpen={subtasksOpen}
      setSubtasksOpen={setSubtasksOpen}
      dependencies={dependencies}
      dependenciesOpen={dependenciesOpen}
      setDependenciesOpen={setDependenciesOpen}
      activeBlockedByCount={activeBlockedByCount}
      dateConflictMessages={dateConflictMessages}
      dependencyType={dependencyType}
      setDependencyType={setDependencyType}
      dependencyTaskId={dependencyTaskId}
      setDependencyTaskId={setDependencyTaskId}
      dependencySaving={dependencySaving}
      dependencyOptions={dependencyOptions}
      availableTasksLoading={availableTasksLoading}
      loadAvailableTasks={loadAvailableTasks}
      addTaskDependency={addTaskDependency}
      removeTaskDependency={removeTaskDependency}
      impact={impact}
      impactLoading={impactLoading}
      impactOpen={impactOpen}
      setImpactOpen={setImpactOpen}
      activity={activity}
      activityLoading={activityLoading}
      activityOpen={activityOpen}
      setActivityOpen={setActivityOpen}
    />
  );
}
