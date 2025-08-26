"use client";

import React from "react";

/**
 * Lightweight inline confirm popover. No external deps.
 *
 * Usage:
 * <ConfirmPopover onConfirm={...} message="Clear all initiatives?">
 *   <button>Clear Inits</button>
 * </ConfirmPopover>
 */
export default function ConfirmPopover({
  children,
  onConfirm,
  onCancel,
  message = "Are you sure?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  align = "right",
}: {
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const el = triggerRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <span ref={triggerRef} className="relative inline-flex">
      <span
        onClick={() => setOpen((v) => !v)}
        className="inline-flex"
        role="button"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {children}
      </span>

      {open && (
        <div
          className={`absolute z-[10000] top-full mt-1 min-w-[220px] rounded-lg border bg-neutral-950 shadow-xl p-3 ${align === "left" ? "left-0" : "right-0"}`}
          role="dialog"
        >
          <div className="text-sm mb-3">{message}</div>
          <div className="flex gap-2 justify-end">
            <button
              className="px-2.5 py-1.5 text-xs border rounded hover:bg-white/10"
              onClick={() => {
                setOpen(false);
                onCancel?.();
              }}
            >
              {cancelLabel}
            </button>
            <button
              className="px-2.5 py-1.5 text-xs border rounded bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
