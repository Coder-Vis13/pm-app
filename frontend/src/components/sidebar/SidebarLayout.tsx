import { PanelLeft } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { SidebarDialog, SidebarConfirmDialog } from "./SidebarDialog";
import { useSidebarState } from "./useSidebarState";
import { useSidebarData } from "./useSidebarData";
import { cn } from "./sidebar-utils";
import { HomePage } from "../../pages/HomePage";
import { MyTasksPage } from "../../pages/MyTasksPage";
import { ProjectPage } from "../../pages/ProjectPage";
import { SectionPage } from "../../pages/SectionPage";

interface SidebarLayoutProps {
  appName?: string;
}

export function SidebarLayout({ appName }: SidebarLayoutProps) {
  const uiState = useSidebarState();
  const data = useSidebarData({
    onProjectCreated: uiState.handleProjectCreated,
    onProjectDeleted: uiState.handleProjectDeleted,
    onSectionDeleted: uiState.handleSectionDeleted,
  });

  const {
    projects,
    isLoading,
    loadError,
    isMutating,
    mutationError,
    clearMutationError,
    loadSidebarData,
    createProject,
    addSection,
    renameProject,
    renameSection,
    deleteProject,
    deleteSection,
  } = data;

  const {
    isOpen,
    selected,
    dialog,
    setDialog,
    closeDialog,
    toggleSidebar,
    expandProject,
    selectNav,
  } = uiState;

  const openDialog = (next: NonNullable<typeof dialog>) => {
    clearMutationError();
    setDialog(next);
  };

  const handleCancelDialog = () => {
    clearMutationError();
    closeDialog();
  };

  const renderMainContent = () => {
    switch (selected.type) {
      case "home":
  return (
    <HomePage
      onProjectSelect={(projectId) =>
        selectNav({
          type: "project",
          projectId,
        })
      }
      onMyTasksSelect={() =>
        selectNav({
          type: "my-tasks",
        })
      }
    />
  );
      case "my-tasks":
        return <MyTasksPage />;
      case "project": {
        const project = projects.find((item) => item.id === selected.projectId);
        return (
          <ProjectPage
            projectId={selected.projectId}
            projectName={project?.name}
            projectDescription={project?.description}
            onSectionSelect={(sectionId) =>
              selectNav({
                type: "section",
                projectId: selected.projectId,
                sectionId,
              })
            }
          />
        );
      }
      case "section": {
        const project = projects.find((item) => item.id === selected.projectId);
        const section = project?.sections.find(
          (item) => item.id === selected.sectionId
        );
        return (
    <SectionPage
      projectId={selected.projectId}
      sectionId={selected.sectionId}
      sectionName={section?.name}
    />
  );
      }
      default:
  return (
    <HomePage
      onProjectSelect={(projectId) =>
        selectNav({
          type: "project",
          projectId,
        })
      }
      onMyTasksSelect={() =>
        selectNav({
          type: "my-tasks",
        })
      }
    />
  );
    }
  };

  const renderDialog = () => {
    if (!dialog) return null;

    const dialogProps = {
      isSubmitting: isMutating,
      error: mutationError,
      onCancel: handleCancelDialog,
    };

    switch (dialog.kind) {
      case "add-project":
        return (
          <SidebarDialog
            title="Create project"
            placeholder="Project name"
            confirmLabel="Create"
            {...dialogProps}
            onConfirm={async (name) => {
              await createProject(name);
            }}
          />
        );
      case "add-section":
        return (
          <SidebarDialog
            title="Add section"
            placeholder="Section name"
            confirmLabel="Add"
            {...dialogProps}
            onConfirm={async (name) => {
              const success = await addSection(dialog.projectId, name);
              if (success) {
                expandProject(dialog.projectId);
                closeDialog();
              }
            }}
          />
        );
      case "rename-project":
        return (
          <SidebarDialog
            title="Rename project"
            initialValue={dialog.currentName}
            {...dialogProps}
            onConfirm={async (name) => {
              const success = await renameProject(dialog.projectId, name);
              if (success) {
                closeDialog();
              }
            }}
          />
        );
      case "rename-section":
        return (
          <SidebarDialog
            title="Rename section"
            initialValue={dialog.currentName}
            {...dialogProps}
            onConfirm={async (name) => {
              const success = await renameSection(
                dialog.projectId,
                dialog.sectionId,
                name
              );
              if (success) {
                closeDialog();
              }
            }}
          />
        );
      case "delete-project":
        return (
          <SidebarConfirmDialog
            title="Delete project"
            message={`Are you sure you want to delete "${dialog.projectName}"? This action cannot be undone.`}
            {...dialogProps}
            onConfirm={async () => {
              await deleteProject(dialog.projectId);
            }}
          />
        );
      case "delete-section":
        return (
          <SidebarConfirmDialog
            title="Delete section"
            message={`Are you sure you want to delete "${dialog.sectionName}"? This action cannot be undone.`}
            {...dialogProps}
            onConfirm={async () => {
              await deleteSection(dialog.projectId, dialog.sectionId);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        state={{
          ...uiState,
          setDialog: openDialog,
        }}
        projects={projects}
        isLoading={isLoading}
        loadError={loadError}
        onRetryLoad={() => void loadSidebarData()}
        appName={appName}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {!isOpen && (
          <div className="flex shrink-0 items-center border-b border-neutral-100 px-4 py-3">
            <button
              type="button"
              aria-label="Open sidebar"
              onClick={toggleSidebar}
              className={cn(
                "flex size-8 items-center justify-center rounded-md text-neutral-500",
                "transition-colors hover:bg-neutral-100 hover:text-neutral-800"
              )}
            >
              <PanelLeft className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-auto">{renderMainContent()}</main>
      </div>

      {renderDialog()}
    </div>
  );
}
