import { useEffect, useMemo, useState } from "react";
import type { SortingState } from "@tanstack/react-table";

import { getMyTasks } from "@/api/task";
import type { MyTask, StatusType } from "@/types/database";

import { TaskTable } from "./TaskTable";
import { ErrorState } from "./section-task-ui";

const TABS: {
  value: "all" | StatusType;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "to_do", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting", label: "Waiting" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

export function MyTasksPage() {
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [selectedTab, setSelectedTab] = useState<"all" | StatusType>("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTasks() {
    try {
      setLoading(true);
      setError(null);

      const data = await getMyTasks();
      setTasks(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load your tasks."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    if (selectedTab === "all") {
      return tasks;
    }

    return tasks.filter((task) => task.status === selectedTab);
  }, [tasks, selectedTab]);

  const activeTabLabel =
    TABS.find((tab) => tab.value === selectedTab)?.label ?? "All";

  if (error && !loading) {
    return (
      <div className="p-8">
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            My tasks
          </h1>

          <p className="text-sm text-muted-foreground">
            Tasks assigned to you across your projects.
          </p>
        </header>

        <section className="space-y-3">
          <div className="flex w-full overflow-x-auto border-b border-neutral-200">
            {TABS.map((tab) => {
              const count =
                tab.value === "all"
                  ? tasks.length
                  : tasks.filter(
                      (task) => task.status === tab.value
                    ).length;

              const active = selectedTab === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setSelectedTab(tab.value)}
                  className={[
                    "shrink-0 border-b-2 px-3 pb-2.5 pt-1.5 text-sm font-medium transition-colors",
                    active
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {tab.label}

                  <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <TaskTable
            tasks={filteredTasks}
            loading={loading}
            error={error}
            emptyLabel={
              selectedTab === "all"
                ? "My tasks"
                : activeTabLabel
            }
            sorting={sorting}
            onSortingChange={setSorting}
            onTaskUpdated={loadTasks}
            showProjectContext
          />
        </section>
      </div>
    </div>
  );
}
