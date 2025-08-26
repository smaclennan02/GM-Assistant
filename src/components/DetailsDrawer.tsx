// src/components/DetailsDrawer.tsx
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useRememberedState } from "@/hooks/useRememberedState";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  // Optional: use to namespace the remembered tab across different drawers
  rememberKey?: string; // e.g. "pc-details" | "monster-details"
  children: React.ReactNode;
};

export default function DetailsDrawer({ open, onClose, title, rememberKey = "details-drawer", children }: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [lastTab, setLastTab] = useRememberedState<string>(`gma.${rememberKey}.lastTab`, "default");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Memory: watch clicks inside the drawer for any element with data-drawer-tab
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const tabEl = t?.closest?.("[data-drawer-tab]") as HTMLElement | null;
      const key = tabEl?.getAttribute?.("data-drawer-tab");
      if (key) setLastTab(key);
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [setLastTab]);

  if (!mounted) return null;
  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] lg:w-[520px] bg-neutral-900 border-l border-white/10 shadow-2xl flex flex-col"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {/* Expose lastTab to children via data attribute for optional default selection */}
            <div data-drawer-lasttab={lastTab} />
          </div>
          <button
            onClick={onClose}
            className="px-2 py-1 border rounded text-xs hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
            title="Close"
          >
            <span className="inline-flex items-center gap-1">
              <X className="w-4 h-4" /> Close
            </span>
          </button>
        </header>

        <div ref={ref} className="flex-1 overflow-auto p-4">
          {children}
        </div>
      </aside>
    </>,
    document.body
  );
}
