import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Loader2,
  ListTree,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { PriorityLevel, StatusType, TaskAssignee } from "@/types/database";

export const PAGE_CONTAINER =
  "mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10";

export const STATUS_LABELS: Record<StatusType, string> = {
  to_do: "To do",
  in_progress: "In progress",
  waiting: "Waiting",
  blocked: "Blocked",
  done: "Done",
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

export function priorityBadgeVariant(priority: PriorityLevel) {
  if (priority === "critical") return "danger" as const;
  if (priority === "high") return "warning" as const;
  if (priority === "medium") return "outline" as const;
  return "secondary" as const;
}

export function statusBadgeVariant(status: StatusType) {
  if (status === "done") return "success" as const;
  if (status === "blocked") return "danger" as const;
  if (status === "in_progress") return "default" as const;
  if (status === "waiting") return "warning" as const;
  return "outline" as const;
}

export function formatDueDate(dueDate: string) {
  const date = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(date);
  due.setHours(0, 0, 0, 0);

  const isOverdue = due < today;

  return {
    label: date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    isOverdue,
  };
}

export function riskTone(score: number) {
  if (score >= 70) {
    return {
      className: "text-red-600",
      label: "High",
    };
  }

  if (score >= 40) {
    return {
      className: "text-amber-600",
      label: "Medium",
    };
  }

  return {
    className: "text-neutral-500",
    label: "Low",
  };
}


export function SubtaskIndicator({
  count,
  expanded,
  onClick,
}: {
  count: number;
  expanded: boolean;
  onClick: () => void;
}) {
  if (count === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground"
      aria-label={
        expanded
          ? "Collapse subtasks"
          : "Expand subtasks"
      }
    >
      {expanded ? (
        <ChevronDown
          className="size-3"
          strokeWidth={1.75}
        />
      ) : (
        <ChevronRight
          className="size-3"
          strokeWidth={1.75}
        />
      )}

      <ListTree
        className="size-3.5"
        strokeWidth={1.75}
      />

      {count}
    </button>
  );
}

export function AssigneeCell({
  assignees,
}: {
  assignees: TaskAssignee[];
}) {
  if (assignees.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        Unassigned
      </span>
    );
  }

  const first = assignees[0];
  const name =
    first.app_user?.name ?? "Unknown user";
  const extraCount = assignees.length - 1;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar size="sm">
        <AvatarFallback className="text-[10px] font-medium">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">
          {name}
        </p>

        {extraCount > 0 && (
          <p className="text-xs text-muted-foreground">
            +{extraCount} more
          </p>
        )}
      </div>
    </div>
  );
}

export function PriorityBadge({
  priority,
}: {
  priority: PriorityLevel;
}) {
  return (
    <Badge
      variant={priorityBadgeVariant(priority)}
      className="h-6 rounded-md px-2 text-xs font-normal"
    >
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

export function StatusBadge({
  status,
}: {
  status: StatusType;
}) {
  return (
    <Badge
      variant={statusBadgeVariant(status)}
      className="h-6 rounded-md px-2 text-xs font-normal"
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function DueDateCell({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const { label, isOverdue } = formatDueDate(dueDate);

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm ${
        isOverdue ? "text-red-600" : "text-foreground"
      }`}
    >
      <Calendar className="size-3.5 shrink-0 opacity-60" strokeWidth={1.75} />
      {label}
    </span>
  );
}

export function RiskCell({ score }: { score: number }) {
  const tone = riskTone(score);

  return (
    <span className={`text-sm tabular-nums ${tone.className}`}>
      {score}
      <span className="sr-only"> ({tone.label} risk)</span>
    </span>
  );
}

export function DependencyCell({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <GitBranch className="size-3.5 shrink-0" strokeWidth={1.75} />
      {count}
    </span>
  );
}

export function SummarySkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-6">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
      {message}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 px-4 py-6 text-sm text-red-600">
      <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
      <span>{message}</span>
    </div>
  );
}

export function EmptyTasksState({ tabLabel }: { tabLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <p className="text-sm text-muted-foreground">
        No {tabLabel === "All" ? "" : `${tabLabel.toLowerCase()} `}
        tasks in this section.
      </p>
      <Button type="button" variant="outline" size="sm">
        <Plus className="size-3.5" strokeWidth={1.75} />
        Create task
      </Button>
    </div>
  );
}

export function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") {
    return <ArrowUp className="size-3 opacity-60" strokeWidth={1.75} />;
  }

  if (direction === "desc") {
    return <ArrowDown className="size-3 opacity-60" strokeWidth={1.75} />;
  }

  return null;
}
