import { useEffect, useRef } from "react";
import { cn } from "./sidebar-utils";

interface SidebarDialogProps {
  title: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  destructive?: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  onConfirm: (value: string) => void | Promise<void>;
  onCancel: () => void;
}

export function SidebarDialog({
  title,
  initialValue = "",
  placeholder,
  confirmLabel = "Save",
  destructive = false,
  isSubmitting = false,
  error,
  onConfirm,
  onCancel,
}: SidebarDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    await onConfirm(inputRef.current?.value ?? initialValue);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4"
      onMouseDown={isSubmitting ? undefined : onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-4 shadow-xl"
      >
        <h2 className="text-sm font-medium text-neutral-900">{title}</h2>
        <input
          ref={inputRef}
          type="text"
          defaultValue={initialValue}
          placeholder={placeholder}
          disabled={isSubmitting}
          className="mt-3 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-500"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-md px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-neutral-900 hover:bg-neutral-800"
            )}
          >
            {isSubmitting ? "Saving..." : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

interface SidebarConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  isSubmitting?: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function SidebarConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  isSubmitting = false,
  error,
  onConfirm,
  onCancel,
}: SidebarConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4"
      onMouseDown={isSubmitting ? undefined : onCancel}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-4 shadow-xl"
      >
        <h2 className="text-sm font-medium text-neutral-900">{title}</h2>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-md px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isSubmitting}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
