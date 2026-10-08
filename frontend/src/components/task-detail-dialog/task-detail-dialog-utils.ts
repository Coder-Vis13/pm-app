import type {
  AssigneeEvent,
  PriorityLevel,
  ProjectMemberWithUser,
  StatusType,
  TaskHistory,
} from "@/types/database";

import {
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/pages/section-task-ui";

export interface DependencyDetails {
  id: string;
  blocking_task_id: string | null;
  blocked_task_id: string | null;
  created_at: string | null;
  blocking_task_title: string | null;
  blocked_task_title: string | null;
  blocking_task_status: StatusType | null;
  blocking_task_start_date: string | null;
  blocking_task_due_date: string | null;
  blocking_task_is_deleted: boolean | null;
  blocked_task_status: StatusType | null;
  blocked_task_start_date: string | null;
  blocked_task_due_date: string | null;
  blocked_task_is_deleted: boolean | null;
  date_conflict: boolean;
}

export interface ActivityEntry {
  id: string;
  label: string;
  detail?: string;
  actorName: string;
  createdAt: string;
}

export function buildActivity(
  history: TaskHistory[],
  assigneeEvents: AssigneeEvent[],
  members: ProjectMemberWithUser[]
): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  const memberById = new Map(
    members
      .filter((member) => member.user_id)
      .map((member) => [
        member.user_id!,
        member.app_user?.name ?? "A member",
      ])
  );

  const getActorName = (actorId: string) =>
    memberById.get(actorId) ?? "A member";

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

    const actorName = getActorName(current.actor_id);

    if (current.event_type === "created" || !previous?.task_snapshot) {
      entries.push({
        id: `history-created-${current.id}`,
        label: `${actorName} created the task`,
        actorName,
        createdAt: current.created_at,
      });

      continue;
    }

    const prev = previous.task_snapshot;
    const next = current.task_snapshot;

    if (prev.status !== next.status) {
      entries.push({
        id: `status-${current.id}`,
        label: `${actorName} changed status`,
        detail: `${formatStatus(prev.status)} → ${formatStatus(next.status)}`,
        actorName,
        createdAt: current.created_at,
      });
    }

    if (prev.priority !== next.priority) {
      entries.push({
        id: `priority-${current.id}`,
        label: `${actorName} changed priority`,
        detail: `${formatPriority(prev.priority)} → ${formatPriority(next.priority)}`,
        actorName,
        createdAt: current.created_at,
      });
    }

    if (prev.title !== next.title) {
      entries.push({
        id: `title-${current.id}`,
        label: `${actorName} changed the title`,
        detail: next.title ?? "",
        actorName,
        createdAt: current.created_at,
      });
    }

    if (prev.description !== next.description) {
      entries.push({
        id: `description-${current.id}`,
        label: `${actorName} updated the description`,
        actorName,
        createdAt: current.created_at,
      });
    }

    if (prev.start_date !== next.start_date) {
      entries.push({
        id: `start-date-${current.id}`,
        label: `${actorName} changed the start date`,
        detail: next.start_date
          ? formatDate(next.start_date)
          : "Removed",
        actorName,
        createdAt: current.created_at,
      });
    }

    if (prev.due_date !== next.due_date) {
      entries.push({
        id: `due-date-${current.id}`,
        label: `${actorName} changed the due date`,
        detail: next.due_date
          ? formatDate(next.due_date)
          : "Removed",
        actorName,
        createdAt: current.created_at,
      });
    }
  }

  for (const event of assigneeEvents) {
    const affectedMember = event.user_id
      ? memberById.get(event.user_id) ?? "A member"
      : "A member";

    const actorName = getActorName(event.actor_id);

    entries.push({
      id: `assignee-${event.id}`,
      label:
        event.event_type === "assignee_added"
          ? `${actorName} assigned ${affectedMember}`
          : `${actorName} unassigned ${affectedMember}`,
      actorName,
      createdAt: event.created_at,
    });
  }

  return entries.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );
}

export function formatStatus(
  status: StatusType | null | undefined
) {
  if (!status) return "Unknown";

  return STATUS_LABELS[status];
}

export function formatPriority(
  priority: PriorityLevel | null | undefined
) {
  if (!priority) return "Unknown";

  return PRIORITY_LABELS[priority];
}

export function formatRelativeTime(value: string) {
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

export function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown";

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Explains the exact date conflict between two dependent tasks.
export function getDependencyConflictMessage(
  dependency: DependencyDetails
) {
  const blockingDueDate = dependency.blocking_task_due_date;
  const blockedStartDate = dependency.blocked_task_start_date;
  const blockedDueDate = dependency.blocked_task_due_date;
  const blockingTitle =
    dependency.blocking_task_title ?? "The blocking task";
  const blockedTitle =
    dependency.blocked_task_title ?? "The blocked task";
  const messages: string[] = [];

  if (
    blockingDueDate &&
    blockedStartDate &&
    new Date(blockedStartDate).getTime() <
      new Date(blockingDueDate).getTime()
  ) {
    messages.push(
      blockedTitle +
        " starts " +
        formatDate(blockedStartDate) +
        ", before " +
        blockingTitle +
        " is due " +
        formatDate(blockingDueDate) +
        "."
    );
  }

  if (
    blockingDueDate &&
    blockedDueDate &&
    new Date(blockedDueDate).getTime() <
      new Date(blockingDueDate).getTime()
  ) {
    messages.push(
      blockedTitle +
        " is due " +
        formatDate(blockedDueDate) +
        ", before " +
        blockingTitle +
        " is due " +
        formatDate(blockingDueDate) +
        "."
    );
  }

  return messages.join(" ");
}

export function toInputDate(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
