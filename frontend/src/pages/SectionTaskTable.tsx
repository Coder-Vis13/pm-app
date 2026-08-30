import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { getSubtasks } from "@/api/task";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";


import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { SectionTask } from "@/types/database";

import {
  AssigneeCell,
  DependencyCell,
  DueDateCell,
  EmptyTasksState,
  ErrorState,
  PriorityBadge,
  RiskCell,
  SortIcon,
  StatusBadge,
  SubtaskIndicator,
  TableSkeleton,
} from "./section-task-ui";

import { TaskDetailDialog } from "./TaskDetailDialog";

interface SectionTaskTableProps {
  tasks: SectionTask[];
  loading: boolean;
  error: string | null;
  tabLabel: string;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  onTaskUpdated: () => void;
  onAddSubtask: (parentTaskId: string) => void;
  taskToOpen?: string | null;
  onTaskOpened?: () => void;
}

export function SectionTaskTable({
  tasks,
  loading,
  error,
  tabLabel,
  sorting,
  onSortingChange,
  onTaskUpdated,
  onAddSubtask,
  taskToOpen,
  onTaskOpened,
}: SectionTaskTableProps) {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    new Set()
  );

  const [subtasksByTask, setSubtasksByTask] = useState<
    Record<string, SectionTask[]>
  >({});

  const [loadingSubtasks, setLoadingSubtasks] = useState<Set<string>>(
    new Set()
  );

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);


  useEffect(() => {
  if (!taskToOpen) return;

  setSelectedTaskId(taskToOpen);
  onTaskOpened?.();
}, [taskToOpen, onTaskOpened]);

  const toggleSubtasks = useCallback(
    async (task: SectionTask) => {
      const isExpanded = expandedTaskIds.has(task.id);

      if (isExpanded) {
        setExpandedTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });

        return;
      }

      setExpandedTaskIds((prev) => {
        const next = new Set(prev);
        next.add(task.id);
        return next;
      });

      if (subtasksByTask[task.id]) {
        return;
      }

      setLoadingSubtasks((prev) => {
        const next = new Set(prev);
        next.add(task.id);
        return next;
      });

      try {
        const subtasks = await getSubtasks(task.id);

        setSubtasksByTask((prev) => ({
          ...prev,
          [task.id]: subtasks,
        }));
      } catch (err) {
        console.error("Failed to load subtasks:", err);

        setExpandedTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      } finally {
        setLoadingSubtasks((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      }
    },
    [expandedTaskIds, subtasksByTask]
  );

  const columns = useMemo<ColumnDef<SectionTask>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedTaskId(row.original.id)}
              className="min-w-0 truncate text-left text-sm font-medium text-foreground transition-colors hover:text-neutral-600"
            >
              {row.original.title}
            </button>

            <SubtaskIndicator
              count={row.original.subtaskCount}
              expanded={expandedTaskIds.has(row.original.id)}
              onClick={() => toggleSubtasks(row.original)}
            />
          </div>
        ),
      },

      {
        id: "assignees",
        header: "Assignee",
        enableSorting: false,
        cell: ({ row }) => (
          <AssigneeCell assignees={row.original.assignees} />
        ),
      },

      {
        accessorKey: "priority",
        header: "Priority",
        sortingFn: (rowA, rowB) => {
          const order = {
            critical: 4,
            high: 3,
            medium: 2,
            low: 1,
          };

          return (
            order[rowA.original.priority] -
            order[rowB.original.priority]
          );
        },
        cell: ({ row }) => (
          <PriorityBadge priority={row.original.priority} />
        ),
      },

      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status} />
        ),
      },

      {
        accessorKey: "due_date",
        header: "Due",
        sortingFn: (rowA, rowB) => {
          const aDate = rowA.original.due_date
            ? new Date(rowA.original.due_date).getTime()
            : Infinity;

          const bDate = rowB.original.due_date
            ? new Date(rowB.original.due_date).getTime()
            : Infinity;

          return aDate - bDate;
        },
        cell: ({ row }) => (
          <DueDateCell dueDate={row.original.due_date} />
        ),
      },

      {
        accessorKey: "risk_score",
        header: "Risk",
        cell: ({ row }) => (
          <RiskCell score={row.original.risk_score} />
        ),
      },

      {
        accessorKey: "dependencyCount",
        header: "Deps",
        cell: ({ row }) => (
          <DependencyCell count={row.original.dependencyCount} />
        ),
      },
    ],
    [expandedTaskIds, toggleSubtasks]
  );

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(sorting) : updater;

      onSortingChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });


  return (
    <>
      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-background">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState message={error} />
        ) : tasks.length === 0 ? (
          <EmptyTasksState tabLabel={tabLabel} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-b border-neutral-100 hover:bg-transparent"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="h-9 whitespace-nowrap bg-neutral-50/80 px-4 text-[11px] font-medium uppercase tracking-wide text-neutral-500"
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}

                            <SortIcon
                              direction={header.column.getIsSorted()}
                            />
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {table.getRowModel().rows.map((row) => {
                  const task = row.original;
                  const isExpanded = expandedTaskIds.has(task.id);
                  const subtasks = subtasksByTask[task.id] ?? [];
                  const isLoadingSubtasks = loadingSubtasks.has(task.id);

                  return (
                    <Fragment key={row.id}>
                      <TableRow className="group border-neutral-100 hover:bg-neutral-50/70">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="px-4 py-3 align-middle"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>

                      {isExpanded && isLoadingSubtasks ? (
                        <TableRow className="border-neutral-100 bg-neutral-50/30">
                          <TableCell
                            colSpan={columns.length}
                            className="px-4 py-3"
                          >
                            <div className="ml-8 text-sm text-muted-foreground">
                              Loading subtasks...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        isExpanded &&
                        subtasks.map((subtask) => (
                          <TableRow
                            key={subtask.id}
                            className="border-neutral-100 bg-neutral-50/20 hover:bg-neutral-50/60"
                          >
                            <TableCell className="px-4 py-2.5">
                              <div className="ml-8 flex items-center">
                                <span className="truncate text-sm text-foreground">
                                  {subtask.title}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="px-4 py-2.5">
                              <AssigneeCell
                                assignees={subtask.assignees}
                              />
                            </TableCell>

                            <TableCell className="px-4 py-2.5">
                              <PriorityBadge
                                priority={subtask.priority}
                              />
                            </TableCell>

                            <TableCell className="px-4 py-2.5">
                              <StatusBadge
                                status={subtask.status}
                              />
                            </TableCell>

                            <TableCell className="px-4 py-2.5">
                              <DueDateCell
                                dueDate={subtask.due_date}
                              />
                            </TableCell>

                            <TableCell className="px-4 py-2.5">
                              <RiskCell
                                score={subtask.risk_score}
                              />
                            </TableCell>

                            <TableCell className="px-4 py-2.5">
                              <DependencyCell
                                count={subtask.dependencyCount}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

<TaskDetailDialog
  taskId={selectedTaskId}
  open={selectedTaskId !== null}
  onClose={() => setSelectedTaskId(null)}
  onUpdated={onTaskUpdated}
  onAddSubtask={(parentTaskId) => {
    setSelectedTaskId(null);
    onAddSubtask(parentTaskId);
  }}
/>
    </>
  );
}