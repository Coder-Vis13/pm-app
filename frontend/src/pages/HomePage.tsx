import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  FolderKanban,
} from "lucide-react";

import { TaskDetailDialog } from "@/components/task-detail-dialog/TaskDetailDialog";

import { getWorkspaces } from "@/api/workspace";
import { getProjects } from "@/api/project";
import { getProjectOverview } from "@/api/metrics";
import { getMyTasks } from "@/api/task";

import type {
  MyTask,
  Project,
  ProjectOverview,
  Workspace,
} from "@/types/database";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
} from "@/components/ui/progress";

interface HomePageProps {
  onProjectSelect: (projectId: string) => void;
  onMyTasksSelect: () => void;
}

const STATUS_LABELS: Record<MyTask["status"], string> = {
  to_do: "To do",
  in_progress: "In progress",
  waiting: "Waiting",
  blocked: "Blocked",
  done: "Done",
};

const STATUS_CLASSES: Record<MyTask["status"], string> = {
  to_do: "bg-neutral-100 text-neutral-700",
  in_progress: "bg-blue-50 text-blue-700",
  waiting: "bg-amber-50 text-amber-700",
  blocked: "bg-red-50 text-red-700",
  done: "bg-emerald-50 text-emerald-700",
};

export function HomePage({
  onProjectSelect,
  onMyTasksSelect,
}: HomePageProps) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectOverviews, setProjectOverviews] = useState<
    Record<string, ProjectOverview>
  >({});
  const [myTasks, setMyTasks] = useState<MyTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadHome() {
    try {
      setLoading(true);
      setError(null);

      const workspaces = await getWorkspaces();

      if (workspaces.length === 0) {
        setWorkspace(null);
        setProjects([]);
        setProjectOverviews({});
        setMyTasks([]);
        return;
      }

      const currentWorkspace = workspaces[0];

      const [workspaceProjects, assignedTasks] = await Promise.all([
        getProjects(currentWorkspace.id),
        getMyTasks(),
      ]);

      const overviewResults = await Promise.all(
        workspaceProjects.map(async (project) => {
          try {
            const overview = await getProjectOverview(project.id);
            return [project.id, overview] as const;
          } catch {
            return null;
          }
        })
      );

      const overviews: Record<string, ProjectOverview> = {};

      for (const result of overviewResults) {
        if (result) {
          overviews[result[0]] = result[1];
        }
      }

      setWorkspace(currentWorkspace);
      setProjects(workspaceProjects);
      setProjectOverviews(overviews);
      setMyTasks(assignedTasks);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load home page."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshHome() {
  try {
    setError(null);

    const [workspaceProjects, assignedTasks] = await Promise.all([
      workspace
        ? getProjects(workspace.id)
        : Promise.resolve([]),
      getMyTasks(),
    ]);

    const overviewResults = await Promise.all(
      workspaceProjects.map(async (project) => {
        try {
          const overview = await getProjectOverview(project.id);
          return [project.id, overview] as const;
        } catch {
          return null;
        }
      })
    );

    const overviews: Record<string, ProjectOverview> = {};

    for (const result of overviewResults) {
      if (result) {
        overviews[result[0]] = result[1];
      }
    }

    setProjects(workspaceProjects);
    setProjectOverviews(overviews);
    setMyTasks(assignedTasks);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to refresh home page."
    );
  }
}

  useEffect(() => {
    void loadHome();
  }, []);

  const activeTasks = useMemo(
    () =>
      myTasks
        .filter((task) => task.status !== "done")
        .slice(0, 5),
    [myTasks]
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-6xl animate-pulse space-y-10">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-neutral-100" />
            <div className="h-8 w-28 rounded bg-neutral-100" />
            <div className="h-4 w-72 rounded bg-neutral-100" />
          </div>

          <div className="space-y-4">
            <div className="h-5 w-24 rounded bg-neutral-100" />

            <div className="overflow-hidden rounded-xl border border-neutral-200">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 border-b border-neutral-100 last:border-b-0"
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="h-5 w-24 rounded bg-neutral-100" />
            <div className="h-40 rounded-xl border border-neutral-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-6xl rounded-xl border border-neutral-200 bg-background px-6 py-8">
          <p className="text-sm text-destructive">{error}</p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void loadHome()}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-10">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {workspace?.name ?? "Workspace"}
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Home
          </h1>

          <p className="text-sm text-muted-foreground">
            A quick view of your projects and current work.
          </p>
        </header>

        {/* Projects */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Projects
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Your active projects and their current progress.
              </p>
            </div>

            <span className="text-sm tabular-nums text-muted-foreground">
              {projects.length}{" "}
              {projects.length === 1 ? "project" : "projects"}
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 px-6 py-10 text-center">
              <FolderKanban className="mx-auto size-5 text-muted-foreground" />

              <p className="mt-3 text-sm font-medium text-foreground">
                No projects yet
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Projects created in this workspace will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-background">
              {projects.map((project) => {
                const overview = projectOverviews[project.id];

                const completion =
                  overview && overview.tasks.total > 0
                    ? Math.round(
                        (overview.tasks.completed /
                          overview.tasks.total) *
                          100
                      )
                    : 0;

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => onProjectSelect(project.id)}
                    className="block w-full border-b border-neutral-100 px-5 py-5 text-left transition-colors last:border-b-0 hover:bg-neutral-50/60"
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                          <FolderKanban className="size-4 text-neutral-600" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-foreground">
                            {project.name}
                          </h3>

                          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                            {project.description ||
                              "No project description."}
                          </p>
                        </div>
                      </div>

                      <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                    </div>

                    {overview && (
                      <div className="mt-5 space-y-3 pl-11">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <div className="flex items-center gap-4 text-muted-foreground">
                            <span>
                              {overview.tasks.total}{" "}
                              {overview.tasks.total === 1
                                ? "task"
                                : "tasks"}
                            </span>

                            <span>
                              {overview.tasks.completed} completed
                            </span>
                          </div>

                          <span className="font-medium tabular-nums text-foreground">
                            {completion}%
                          </span>
                        </div>

                        <Progress
                          value={completion}
                          className="gap-0"
                        >
                          <ProgressTrack className="h-1 bg-neutral-100">
                            <ProgressIndicator className="bg-neutral-800" />
                          </ProgressTrack>
                        </Progress>

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span
                            className={[
                              "rounded-full px-2 py-1 font-medium",
                              overview.health.status === "healthy"
                                ? "bg-emerald-50 text-emerald-700"
                                : overview.health.status === "at_risk"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700",
                            ].join(" ")}
                          >
                            {overview.health.status === "healthy"
                              ? "Healthy"
                              : overview.health.status === "at_risk"
                                ? "At risk"
                                : "Critical"}
                          </span>

                          {overview.tasks.byStatus.in_progress > 0 && (
                            <span className="text-muted-foreground">
                              {overview.tasks.byStatus.in_progress} in progress
                            </span>
                          )}

                          {overview.tasks.byStatus.blocked > 0 && (
                            <span className="text-red-600">
                              {overview.tasks.byStatus.blocked} blocked
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* My tasks */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                My tasks
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Your current work across projects.
              </p>
            </div>

            <button
              type="button"
              onClick={onMyTasksSelect}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="size-3.5" />
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-background">
            {activeTasks.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <CheckCircle2 className="mx-auto size-5 text-emerald-600" />

                <p className="mt-3 text-sm font-medium text-foreground">
                  You're all caught up
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  You have no active assigned tasks.
                </p>
              </div>
            ) : (
              activeTasks.map((task) => (
<button
  key={task.id}
  type="button"
  onClick={() => setSelectedTaskId(task.id)}
  className="flex w-full items-center gap-4 border-b border-neutral-100 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-neutral-50/60"
>
                  <Circle className="size-4 shrink-0 text-muted-foreground" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {task.title}
                    </p>

                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {task.project?.name ?? "Project"}
                      {task.section?.name
                        ? ` · ${task.section.name}`
                        : ""}
                    </p>
                  </div>

                  <Badge
                    variant="secondary"
                    className={[
                      "shrink-0 border-0 font-normal",
                      STATUS_CLASSES[task.status],
                    ].join(" ")}
                  >
                    {STATUS_LABELS[task.status]}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </section>
        
      </div>
      <TaskDetailDialog
  taskId={selectedTaskId}
  open={selectedTaskId !== null}
  onClose={() => setSelectedTaskId(null)}
  onUpdated={() => {
    void refreshHome();
  }}
/>
    </div>
  );
}
