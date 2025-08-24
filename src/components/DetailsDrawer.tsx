"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function DetailsDrawer({ open, title = "Details", onClose, children }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // focus trap (lightweight): focus close on open
    setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000]"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Panel */}
      <div
        className="absolute right-0 top-0 h-full w-full sm:w-[420px] lg:w-[520px] bg-neutral-950 border-l shadow-2xl
                   transition-transform duration-200 ease-out translate-x-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">{title}</h3>
          <button
            ref={closeRef}
            className="inline-flex items-center gap-2 px-2 py-1 border rounded text-sm hover:bg-white/10 cursor-pointer"
            onClick={onClose}
            aria-label="Close details"
          >
            <X className="h-4 w-4" /> Close
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100%-52px)]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
