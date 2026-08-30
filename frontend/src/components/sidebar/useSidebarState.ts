import { useCallback, useState } from "react";
import type { NavTarget, OpenMenu, SidebarDialog } from "./types";
import { toggleExpandedProject } from "./sidebar-utils";

const defaultNav: NavTarget = { type: "home" };

export function useSidebarState() {
  const [isOpen, setIsOpen] = useState(true);
  const [selected, setSelected] = useState<NavTarget>(defaultNav);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(
    () => new Set()
  );
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null);
  const [dialog, setDialog] = useState<SidebarDialog | null>(null);

  const closeMenu = useCallback(() => setOpenMenu(null), []);

  const openDialog = useCallback((next: SidebarDialog) => {
    setDialog(next);
  }, []);

  const closeDialog = useCallback(() => {
    setDialog(null);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const selectNav = useCallback(
    (target: NavTarget) => {
      setSelected(target);
      closeMenu();
    },
    [closeMenu]
  );

  const expandProject = useCallback((projectId: string) => {
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      next.add(projectId);
      return next;
    });
  }, []);

  const toggleProjectExpanded = useCallback((projectId: string) => {
    setExpandedProjectIds((prev) => toggleExpandedProject(prev, projectId));
  }, []);

  const openProjectMenu = useCallback((projectId: string) => {
    setOpenMenu({ kind: "project", projectId });
  }, []);

  const openSectionMenu = useCallback(
    (projectId: string, sectionId: string) => {
      setOpenMenu({ kind: "section", projectId, sectionId });
    },
    []
  );

  const handleProjectCreated = useCallback(
    (projectId: string) => {
      expandProject(projectId);
      selectNav({ type: "project", projectId });
      closeDialog();
    },
    [expandProject, selectNav, closeDialog]
  );

  const handleProjectDeleted = useCallback((projectId: string) => {
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      next.delete(projectId);
      return next;
    });
    setSelected((prev) => {
      if (prev.type === "project" && prev.projectId === projectId) {
        return defaultNav;
      }
      if (prev.type === "section" && prev.projectId === projectId) {
        return defaultNav;
      }
      return prev;
    });
    setOpenMenu(null);
    closeDialog();
  }, [closeDialog]);

  const handleSectionDeleted = useCallback(
    (projectId: string, sectionId: string) => {
      setSelected((prev) => {
        if (
          prev.type === "section" &&
          prev.projectId === projectId &&
          prev.sectionId === sectionId
        ) {
          return { type: "project", projectId };
        }
        return prev;
      });
      setOpenMenu(null);
      closeDialog();
    },
    [closeDialog]
  );

  return {
    isOpen,
    selected,
    expandedProjectIds,
    openMenu,
    dialog,
    setDialog: openDialog,
    closeDialog,
    closeMenu,
    toggleSidebar,
    selectNav,
    expandProject,
    toggleProjectExpanded,
    openProjectMenu,
    openSectionMenu,
    handleProjectCreated,
    handleProjectDeleted,
    handleSectionDeleted,
  };
}

export type SidebarState = ReturnType<typeof useSidebarState>;
