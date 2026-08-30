import { Home, ListTodo } from "lucide-react";
import type { SidebarState } from "./useSidebarState";
import type { ProjectWithSections } from "./types";
import { SidebarHeader, SidebarAccount } from "./SidebarChrome";
import { SidebarNavItem } from "./SidebarNavItem";
import { ProjectsSectionHeader } from "./ProjectsSectionHeader";
import { ProjectRow } from "./ProjectRow";
import { cn } from "./sidebar-utils";

interface SidebarProps {
  state: SidebarState;
  projects: ProjectWithSections[];
  isLoading?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
  appName?: string;
}

export function Sidebar({
  state,
  projects,
  isLoading = false,
  loadError = null,
  onRetryLoad,
  appName,
}: SidebarProps) {
  const {
    isOpen,
    selected,
    expandedProjectIds,
    openMenu,
    toggleSidebar,
    selectNav,
    toggleProjectExpanded,
    openProjectMenu,
    openSectionMenu,
    closeMenu,
    setDialog,
  } = state;

  const projectsDisabled = isLoading || Boolean(loadError);

  return (
    <>
      <style>{`
        .sidebar-scroll {
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        .sidebar-scroll:hover {
          scrollbar-color: rgb(212 212 212) transparent;
        }
        .sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 9999px;
        }
        .sidebar-scroll:hover::-webkit-scrollbar-thumb {
          background-color: rgb(212 212 212);
        }
      `}</style>

      <aside
        aria-hidden={!isOpen}
        className={cn(
          "flex h-full shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/80 transition-[width,opacity] duration-300 ease-in-out",
          isOpen ? "w-65 opacity-100" : "w-0 overflow-hidden opacity-0"
        )}
      >
        <div
          className={cn(
            "flex h-full min-w-65 flex-col",
            !isOpen && "pointer-events-none"
          )}
        >
          <SidebarHeader appName={appName} onCollapse={toggleSidebar} />

          <nav
            aria-label="Main navigation"
            className="sidebar-scroll flex min-h-0 flex-1 flex-col px-2"
          >
            <div className="space-y-0.5 pb-4">
              <SidebarNavItem
                label="Home"
                icon={Home}
                selected={selected.type === "home"}
                onClick={() => selectNav({ type: "home" })}
              />
              <SidebarNavItem
                label="My tasks"
                icon={ListTodo}
                selected={selected.type === "my-tasks"}
                onClick={() => selectNav({ type: "my-tasks" })}
              />
            </div>

            <ProjectsSectionHeader
              onAddProject={() => setDialog({ kind: "add-project" })}
              disabled={projectsDisabled}
            />

            {isLoading && (
              <p className="px-2 py-2 text-xs text-neutral-400">
                Loading projects...
              </p>
            )}

            {loadError && (
              <div className="px-2 py-2">
                <p className="text-xs text-red-600">{loadError}</p>
                {onRetryLoad && (
                  <button
                    type="button"
                    onClick={onRetryLoad}
                    className="mt-1 text-xs text-neutral-600 underline-offset-2 hover:underline"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {!isLoading && !loadError && (
              <div className="space-y-0.5 pb-4">
                {projects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    selected={selected}
                    expandedProjectIds={expandedProjectIds}
                    openMenu={openMenu}
                    onSelectProject={() =>
                      selectNav({ type: "project", projectId: project.id })
                    }
                    onToggleExpanded={() => toggleProjectExpanded(project.id)}
                    onOpenMenu={() => openProjectMenu(project.id)}
                    onCloseMenu={closeMenu}
                    onSelectSection={(sectionId) =>
                      selectNav({
                        type: "section",
                        projectId: project.id,
                        sectionId,
                      })
                    }
                    onOpenSectionMenu={(sectionId) =>
                      openSectionMenu(project.id, sectionId)
                    }
                    onRenameProject={() =>
                      setDialog({
                        kind: "rename-project",
                        projectId: project.id,
                        currentName: project.name,
                      })
                    }
                    onAddSection={() =>
                      setDialog({ kind: "add-section", projectId: project.id })
                    }
                    onDeleteProject={() =>
                      setDialog({
                        kind: "delete-project",
                        projectId: project.id,
                        projectName: project.name,
                      })
                    }
                    onRenameSection={(sectionId, currentName) =>
                      setDialog({
                        kind: "rename-section",
                        projectId: project.id,
                        sectionId,
                        currentName,
                      })
                    }
                    onDeleteSection={(sectionId, sectionName) =>
                      setDialog({
                        kind: "delete-section",
                        projectId: project.id,
                        sectionId,
                        sectionName,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </nav>

          <SidebarAccount
            selected={selected}
            onSelect={() => selectNav({ type: "account" })}
          />
        </div>
      </aside>
    </>
  );
}
