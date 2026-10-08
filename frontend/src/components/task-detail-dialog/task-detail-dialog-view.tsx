import type {
  Dispatch,
  SetStateAction,
} from "react";

import {
  ChevronRight,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
  PriorityLevel,
  ProjectMemberWithUser,
  SectionTask,
  StatusType,
  Task,
  TaskAssignee,
  TaskImpact,
} from "@/types/database";

import type {
  ActivityEntry,
  DependencyDetails,
} from "./task-detail-dialog-utils";
import { TaskDetailDialogFields } from "./task-detail-dialog-ui";
import { TaskDetailDialogSections } from "./task-detail-dialog-sections";

interface TaskDetailDialogViewProps {
  parentTaskId: string | null;
  setParentTaskId: Dispatch<SetStateAction<string | null>>;
  setCurrentTaskId: Dispatch<SetStateAction<string | null>>;
  deleteCurrentTask: () => void;
  saving: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  task: Task | null;
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  assignees: TaskAssignee[];
  members: ProjectMemberWithUser[];
  assigneeLoading: boolean;
  removeAssignee: (assignee: TaskAssignee) => void;
  addAssignee: (userId: string) => void;
  startDate: string;
  setStartDate: Dispatch<SetStateAction<string>>;
  dueDate: string;
  setDueDate: Dispatch<SetStateAction<string>>;
  priority: PriorityLevel;
  setPriority: Dispatch<SetStateAction<PriorityLevel>>;
  changeStatus: (status: StatusType) => void;
  saveError: string | null;
  saved: boolean;
  saveChanges: () => void;
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
  subtasks: SectionTask[];
  onAddSubtask?: (parentTaskId: string) => void;
  removeSubtask: (subtask: SectionTask) => void;
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
  addTaskDependency: () => void;
  removeTaskDependency: (dependencyId: string) => void;
  impact: TaskImpact | null;
  impactOpen: boolean;
  setImpactOpen: Dispatch<SetStateAction<boolean>>;
  activity: ActivityEntry[];
  activityOpen: boolean;
  setActivityOpen: Dispatch<SetStateAction<boolean>>;
}

// Renders the dialog frame and its composed sections.
export function TaskDetailDialogView({
  parentTaskId,
  setParentTaskId,
  setCurrentTaskId,
  deleteCurrentTask,
  saving,
  onClose,
  loading,
  error,
  task,
  title,
  setTitle,
  assignees,
  members,
  assigneeLoading,
  removeAssignee,
  addAssignee,
  startDate,
  setStartDate,
  dueDate,
  setDueDate,
  priority,
  setPriority,
  changeStatus,
  saveError,
  saved,
  saveChanges,
  description,
  setDescription,
  subtasks,
  onAddSubtask,
  removeSubtask,
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
  addTaskDependency,
  removeTaskDependency,
  impact,
  impactOpen,
  setImpactOpen,
  activity,
  activityOpen,
  setActivityOpen,
}: TaskDetailDialogViewProps) {
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

              <TaskDetailDialogFields
                task={task}
                title={title}
                setTitle={setTitle}
                assignees={assignees}
                members={members}
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
                saving={saving}
                saveChanges={saveChanges}
                description={description}
                setDescription={setDescription}
              />
              <TaskDetailDialogSections
                task={task}
                subtasks={subtasks}
                setParentTaskId={setParentTaskId}
                setCurrentTaskId={setCurrentTaskId}
                parentTaskId={parentTaskId}
                onAddSubtask={onAddSubtask}
                removeSubtask={removeSubtask}
                saving={saving}
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
                addTaskDependency={addTaskDependency}
                removeTaskDependency={removeTaskDependency}
                impact={impact}
                impactOpen={impactOpen}
                setImpactOpen={setImpactOpen}
                activity={activity}
                activityOpen={activityOpen}
                setActivityOpen={setActivityOpen}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
