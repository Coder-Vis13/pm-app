import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Plus,
} from "lucide-react";
import type { SortingState } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
} from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  getSectionTaskSummary,
  getSectionTasks,
} from "@/api/task";

import type {
  SectionTask,
  SectionTaskSummary,
  StatusType,
} from "@/types/database";

import { TaskTable } from "./TaskTable";
import {
  ErrorState,
  PAGE_CONTAINER,
  SummarySkeleton,
} from "./section-task-ui";

import { CreateTaskDialog } from "../components/task/CreateTaskDialog";

interface SectionPageProps {
  projectId: string;
  sectionId: string;
  sectionName?: string;
}

type TaskTab = "all" | StatusType;

const TABS: { value: TaskTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "to_do", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting", label: "Waiting" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

export function SectionPage({
  projectId,
  sectionId,
  sectionName,
}: SectionPageProps) {
  const [selectedTab, setSelectedTab] = useState<TaskTab>("all");
  const [summary, setSummary] = useState<SectionTaskSummary | null>(null);
  const [tasks, setTasks] = useState<SectionTask[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskParentId, setCreateTaskParentId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [taskToOpen, setTaskToOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        setSummaryLoading(true);
        setSummaryError(null);

        const data = await getSectionTaskSummary(
          projectId,
          sectionId
        );

        if (!cancelled) {
          setSummary(data);
        }
      } catch (err) {
        if (!cancelled) {
          setSummaryError(
            err instanceof Error
              ? err.message
              : "Failed to load section summary."
          );
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
}, [projectId, sectionId, refreshKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      try {
        setLoading(true);
        setError(null);

        const status =
          selectedTab === "all" ? undefined : selectedTab;

        const data = await getSectionTasks(
          projectId,
          sectionId,
          status
        );

        if (!cancelled) {
          setTasks(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load tasks."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      cancelled = true;
    };
}, [projectId, sectionId, selectedTab, refreshKey]);

  const activeTabLabel =
    TABS.find((tab) => tab.value === selectedTab)?.label ?? "All";

  function handleCreateTask() {
  setCreateTaskParentId(null);
  setCreateTaskOpen(true);
}

function handleCreateSubtask(parentTaskId: string) {
  setCreateTaskParentId(parentTaskId);
  setCreateTaskOpen(true);
}

  return (
    <div className={PAGE_CONTAINER}>
      <div className="space-y-7">
        {/* Header */}
        <header className="space-y-4">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            Project
          </button>

          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {sectionName ?? "Section"}
              </h1>

              <p className="text-sm text-muted-foreground">
                Organize and track the work in this section.
              </p>
            </div>

            <Button
  type="button"
  size="sm"
  className="shrink-0"
  onClick={handleCreateTask}
>
  <Plus
    className="size-3.5"
    strokeWidth={1.75}
  />
  Create task
</Button>
          </div>
        </header>

        {/* Progress */}
        <section className="space-y-2.5">
          {summaryLoading ? (
            <SummarySkeleton />
          ) : summaryError ? (
            <ErrorState message={summaryError} />
          ) : summary ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                  <span className="font-medium text-foreground">
                    {summary.total}{" "}
                    {summary.total === 1 ? "task" : "tasks"}
                  </span>

                  <span className="text-muted-foreground">
                    {summary.completed} completed
                  </span>

                  <span className="text-muted-foreground">
                    {summary.remaining} remaining
                  </span>
                </div>

                <span className="text-sm font-medium tabular-nums text-foreground">
                  {summary.progressPercent}%
                </span>
              </div>

              <Progress
                value={summary.progressPercent}
                className="gap-0"
              >
                <ProgressTrack className="h-1 bg-neutral-100">
                  <ProgressIndicator className="bg-neutral-800" />
                </ProgressTrack>
              </Progress>
            </>
          ) : null}
        </section>

        {/* Task workspace */}
        <section className="space-y-3">
          <Tabs
            value={selectedTab}
            onValueChange={(value) =>
              setSelectedTab(value as TaskTab)
            }
          >
            <TabsList
              variant="line"
              className="h-auto w-full justify-start gap-0 overflow-x-auto border-b border-neutral-200 pb-0"
            >
              {TABS.map((tab) => {
                const count =
                  tab.value === "all"
                    ? summary?.total
                    : summary?.byStatus[tab.value];

                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="shrink-0 gap-1.5 rounded-none px-3 pb-2.5 pt-1.5 text-sm font-medium text-muted-foreground data-active:text-foreground"
                  >
                    {tab.label}

                    {count !== undefined && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

  <TaskTable
  tasks={tasks}
  loading={loading}
  error={error}
  emptyLabel={activeTabLabel}
  sorting={sorting}
  onSortingChange={setSorting}
  onTaskUpdated={() =>
    setRefreshKey((value) => value + 1)
  }
  onAddSubtask={handleCreateSubtask}
  taskToOpen={taskToOpen}
  onTaskOpened={() => setTaskToOpen(null)}
  showProjectContext={false}
/>
<CreateTaskDialog
  open={createTaskOpen}
  onClose={() => {
    setCreateTaskOpen(false);
    setCreateTaskParentId(null);
  }}
  projectId={projectId}
  sectionId={sectionId}
  sectionName={sectionName}
  initialParentTaskId={createTaskParentId}
  onCreated={() => setRefreshKey((value) => value + 1)}
/>
        </section>
      </div>
    </div>
  );
}