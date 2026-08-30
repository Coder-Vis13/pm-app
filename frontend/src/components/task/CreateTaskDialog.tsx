import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  Calendar,
  ChevronLeft,
  Flag,
  ListTree,
  Loader2,
  User,
} from "lucide-react";

import {
  addTaskAssignee,
  createTask,
  createSubtask,
} from "@/api/task";
import { getProjectMembers } from "@/api/user";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  AppUser,
  PriorityLevel,
  ProjectMember,
  StatusType,
} from "@/types/database";


interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sectionId: string;
  sectionName?: string;
  onCreated: () => void;
  initialParentTaskId?: string | null;
}

const PRIORITIES: PriorityLevel[] = [
  "low",
  "medium",
  "high",
  "critical",
];

const STATUSES: StatusType[] = [
  "to_do",
  "in_progress",
  "waiting",
  "blocked",
  "done",
];

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const STATUS_LABELS: Record<StatusType, string> = {
  to_do: "To do",
  in_progress: "In progress",
  waiting: "Waiting",
  blocked: "Blocked",
  done: "Done",
};

interface ProjectMemberWithUser extends ProjectMember {
  app_user?: AppUser | null;
}

export function CreateTaskDialog({
  open,
  onClose,
  projectId,
  sectionId,
  sectionName,
  onCreated,
  initialParentTaskId,
}: CreateTaskDialogProps) {
  const [taskType, setTaskType] = useState<"task" | "subtask">(
    "task"
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [status, setStatus] =
    useState<StatusType>("to_do");

  const [priority, setPriority] =
    useState<PriorityLevel>("medium");

  const [assigneeId, setAssigneeId] =
    useState("unassigned");

  const [parentTaskId, setParentTaskId] =
    useState("none");

  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [members, setMembers] = useState<
    ProjectMemberWithUser[]
  >([]);

  const [loadingMembers, setLoadingMembers] =
    useState(false);

  const [creating, setCreating] = useState(false);

  const [error, setError] = useState<string | null>(
    null
  );

  const [parentTaskTitle, setParentTaskTitle] = useState("");


useEffect(() => {
  if (!open) {
    return;
  }

  setTaskType(
    initialParentTaskId ? "subtask" : "task"
  );

  setTitle("");
  setDescription("");
  setStatus("to_do");
  setPriority("medium");
  setAssigneeId("unassigned");

  setParentTaskId(
    initialParentTaskId ?? "none"
  );

  setParentTaskTitle("");

  setStartDate("");
  setDueDate("");
  setError(null);

  let cancelled = false;

  async function loadMembers() {
    try {
      setLoadingMembers(true);

      const data = await getProjectMembers(projectId);

      if (!cancelled) {
        setMembers(data);
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load project members."
        );
      }
    } finally {
      if (!cancelled) {
        setLoadingMembers(false);
      }
    }
  }

  loadMembers();

  return () => {
    cancelled = true;
  };
}, [open, projectId, initialParentTaskId]);


async function handleCreateParentForSubtask() {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    setError("Task title is required.");
    return;
  }

  try {
    setCreating(true);
    setError(null);

   const parent = await createTask(projectId, {
  title: trimmedTitle,
  sectionId,
  description: description.trim() || undefined,
  status,
  priority,
  startDate: startDate
    ? new Date(startDate).toISOString()
    : undefined,
  dueDate: dueDate
    ? new Date(dueDate).toISOString()
    : undefined,
});

if (assigneeId !== "unassigned") {
  await addTaskAssignee(
    parent.id,
    assigneeId,
    parent.updated_at
  );
}

setTaskType("subtask");
setParentTaskId(parent.id);
setParentTaskTitle(parent.title);

setTitle("");
setDescription("");
setStatus("to_do");
setPriority(parent.priority);
setError(null);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to create parent task."
    );
  } finally {
    setCreating(false);
  }
}


  async function handleCreate() {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Task title is required.");
      return;
    }

    if (
      taskType === "subtask" &&
      parentTaskId === "none"
    ) {
      setError("A parent task is required.");
      return;
    }

    try {
      setCreating(true);
      setError(null);
let task;

if (taskType === "subtask") {
  task = await createSubtask(parentTaskId, {
    title: trimmedTitle,
    description: description.trim() || undefined,
    priority,
    startDate: startDate
      ? new Date(startDate).toISOString()
      : undefined,
    dueDate: dueDate
      ? new Date(dueDate).toISOString()
      : undefined,
  });
} else {
  task = await createTask(projectId, {
    title: trimmedTitle,
    sectionId,
    description: description.trim() || undefined,
    status,
    priority,
    startDate: startDate
      ? new Date(startDate).toISOString()
      : undefined,
    dueDate: dueDate
      ? new Date(dueDate).toISOString()
      : undefined,
  });
}

      onCreated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create task."
      );
    } finally {
      setCreating(false);
    }
  }

  const selectedMember = members.find(
    (member) =>
      (member.user_id ?? member.id) === assigneeId
  );

  

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !creating) {
          onClose();
        }
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] max-w-3xl gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl">
        {/* Header */}
        <DialogHeader className="border-b border-neutral-100 px-7 py-5">
          <DialogTitle className="text-base font-semibold">
            New {taskType}
          </DialogTitle>

          <DialogDescription className="text-xs">
            {sectionName
              ? `Create a ${taskType} in ${sectionName}.`
              : `Create a new ${taskType}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto px-7 py-6">
          <div className="space-y-6">
            
            {/* Title */}
            <Input
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder={
                taskType === "subtask"
                  ? "Subtask title"
                  : "Task title"
              }
              autoFocus
              className="h-auto border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0 placeholder:text-neutral-300"
            />

            {/* Description */}
            <Textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Add a description..."
              rows={5}
              className="resize-none rounded-lg border-neutral-200 bg-neutral-50/50 text-sm leading-6 focus-visible:bg-background"
            />

            {/* Fields */}
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <CreateField
                icon={<Flag className="size-4" />}
                label="Status"
              >
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(
                      value as StatusType
                    )
                  }
                >
                  <SelectTrigger className="h-9 border-neutral-200">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {STATUSES.map((value) => (
                      <SelectItem
                        key={value}
                        value={value}
                      >
                        {STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CreateField>

              <CreateField
                icon={<Flag className="size-4" />}
                label="Priority"
              >
                <Select
                  value={priority}
                  onValueChange={(value) =>
                    setPriority(
                      value as PriorityLevel
                    )
                  }
                >
                  <SelectTrigger className="h-9 border-neutral-200">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {PRIORITIES.map((value) => (
                      <SelectItem
                        key={value}
                        value={value}
                      >
                        {PRIORITY_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CreateField>

              <CreateField
                icon={<User className="size-4" />}
                label="Assignee"
              >
                <Select
                  value={assigneeId}
                  onValueChange={(value) =>
                    setAssigneeId(
                      value ?? "unassigned"
                    )
                  }
                  disabled={loadingMembers}
                >
                  <SelectTrigger className="h-9 border-neutral-200">
                    <SelectValue>
                      {assigneeId === "unassigned"
                        ? "Unassigned"
                        : selectedMember?.app_user
                            ?.name ??
                          "Unknown user"}
                    </SelectValue>
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="unassigned">
                      Unassigned
                    </SelectItem>

                    {members.map((member) => {
                      const value =
                        member.user_id ??
                        member.id;

                      return (
                        <SelectItem
                          key={value}
                          value={value}
                        >
                          {member.app_user?.name ??
                            "Unknown user"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </CreateField>

{taskType === "subtask" && (
  <CreateField
    icon={<ListTree className="size-4" />}
    label="Parent task"
  >
    <div className="flex h-9 items-center rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm">
      {parentTaskTitle || "Selected parent task"}
    </div>
  </CreateField>
)}

              <CreateField
                icon={
                  <Calendar className="size-4" />
                }
                label="Start date"
              >
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(event.target.value)
                  }
                  className="h-9 border-neutral-200"
                />
              </CreateField>

              <CreateField
                icon={
                  <Calendar className="size-4" />
                }
                label="Due date"
              >
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(event) =>
                    setDueDate(event.target.value)
                  }
                  className="h-9 border-neutral-200"
                />
              </CreateField>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
<div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50/40 px-7 py-3.5">
  {taskType === "task" ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={creating || !title.trim()}
      onClick={handleCreateParentForSubtask}
    >
      <ListTree className="size-3.5" />
      Create subtask
    </Button>
  ) : (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={creating}
      onClick={() => {
        setTaskType("task");
        setParentTaskId("none");
        setParentTaskTitle("");
      }}
    >
      <ChevronLeft className="size-3.5" />
      Back to parent task
    </Button>
  )}

  <div className="flex items-center gap-2">
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={creating}
      onClick={onClose}
    >
      Cancel
    </Button>

    <Button
      type="button"
      size="sm"
      disabled={creating || !title.trim()}
      onClick={handleCreate}
    >
      {creating && (
        <Loader2 className="size-3.5 animate-spin" />
      )}

      {taskType === "subtask"
        ? "Create subtask"
        : "Create task"}
    </Button>
  </div>
</div>
      </DialogContent>
    </Dialog>
  );
}

function CreateField({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>

      {children}
    </div>
  );
}