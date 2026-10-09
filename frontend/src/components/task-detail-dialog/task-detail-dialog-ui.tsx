import type {
  Dispatch,
  ReactNode,
  SetStateAction,
} from "react";

import {
  ChevronDown,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Circle,
  Flag,
  Loader2,
  Save,
  Target,
  User,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  PriorityLevel,
  ProjectMemberWithUser,
  StatusType,
  Task,
  TaskAssignee,
} from "@/types/database";

import {
  getInitials,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/pages/section-task-ui";
import {
  formatRelativeTime,
  type ActivityEntry,
} from "./task-detail-dialog-utils";

export function ActivityItem({
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

export function StatusMenu({
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

export function PriorityMenu({
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

export function TaskField({
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

export function TaskSection({
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

export function EmptySectionText({
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

export function ImpactItem({
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

interface TaskDetailDialogFieldsProps {
  task: Task;
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  assignees: TaskAssignee[];
  members: ProjectMemberWithUser[];
  membersLoading: boolean;
  loadMembers: () => Promise<void>;
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
  saving: boolean;
  saveChanges: () => void;
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
}

// Renders the editable task fields.
export function TaskDetailDialogFields({
  task,
  title,
  setTitle,
  assignees,
  members,
  membersLoading,
  loadMembers,
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
  saving,
  saveChanges,
  description,
  setDescription,
}: TaskDetailDialogFieldsProps) {
  return (
    <>
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
                onOpenChange={(isOpen) => {
                  if (isOpen) {
                    void loadMembers();
                  }
                }}
                onValueChange={(value) => {
                  if (value) {
                    void addAssignee(value);
                  }
                }}
                disabled={assigneeLoading || membersLoading}
              >
                <SelectTrigger className="h-8 w-auto min-w-32 border-dashed border-neutral-300 px-2.5 text-sm">
                  <SelectValue
                    placeholder={
                      membersLoading
                        ? "Loading members..."
                        : "+ Add assignee"
                    }
                  />
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
    </>
  );
}
