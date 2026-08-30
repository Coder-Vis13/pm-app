import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "./sidebar-utils";

interface SidebarDropdownMenuProps {
  open: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
}

export function SidebarDropdownMenu({
  open,
  onClose,
  trigger,
  children,
  align = "end",
}: SidebarDropdownMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      {trigger}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-50 mt-1 min-w-[168px] rounded-md border border-neutral-200 bg-white py-1 shadow-lg",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface SidebarMenuItemProps {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

export function SidebarMenuItem({
  label,
  onClick,
  destructive = false,
}: SidebarMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors",
        destructive
          ? "text-red-600 hover:bg-red-50"
          : "text-neutral-700 hover:bg-neutral-100"
      )}
    >
      {label}
    </button>
  );
}

export function SidebarMenuSeparator() {
  return <div className="my-1 border-t border-neutral-100" role="separator" />;
}
