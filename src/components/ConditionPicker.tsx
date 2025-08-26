// src/components/ConditionPicker.tsx
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CONDITIONS, CONDITION_TIPS, ConditionKey } from "@/lib/conditions";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  anchor: { x: number; y: number };
  mode?: "apply" | "remove"; // "apply" = allow rounds input; "remove" = no rounds
  onPick: (key: ConditionKey, rounds?: number) => void;
  onClose: () => void;
};

export default function ConditionPicker({ open, anchor, mode = "apply", onPick, onClose }: Props) {
  const [query, setQuery] = React.useState("");
  const [index, setIndex] = React.useState(0);
  const [rounds, setRounds] = React.useState<number | "">("");
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setIndex(0);
    setRounds("");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    containerRef.current?.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
  }, [open]);

  if (!open) return null;

  const keys = Object.keys(CONDITIONS) as ConditionKey[];
  const filtered = keys.filter((k) => k.toLowerCase().includes(query.toLowerCase()));
  const activeKey = filtered[index] ?? filtered[0];

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!activeKey) return;
      const n = typeof rounds === "number" ? rounds : rounds === "" ? undefined : Number(rounds) || undefined;
      onPick(activeKey, mode === "apply" ? n : undefined);
    }
  };

  const style: React.CSSProperties = {
    position: "fixed",
    top: anchor.y,
    left: anchor.x,
    zIndex: 50,
    maxWidth: 360,
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="rounded-2xl border border-white/10 bg-neutral-900 shadow-xl"
      style={style}
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          placeholder={mode === "apply" ? "Add condition…" : "Remove condition…"}
          className="w-full bg-transparent outline-none text-sm placeholder:text-neutral-400"
        />
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Close picker"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-3 p-3">
        <ul className="max-h-64 overflow-auto w-56 pr-1">
          {filtered.length === 0 && (
            <li className="text-neutral-400 text-sm px-2 py-1">No matches</li>
          )}
          {filtered.map((k, i) => (
            <li key={k}>
              <button
                className={
                  "w-full text-left px-2 py-1 rounded cursor-pointer " +
                  (i === index ? "bg-white/10" : "hover:bg-white/5")
                }
                onMouseEnter={() => setIndex(i)}
                onClick={() => onPick(k, mode === "apply" ? (typeof rounds === "number" ? rounds : undefined) : undefined)}
                data-cond-key={k}
              >
                <span className="font-medium">{k}</span>
                <span className="block text-xs text-neutral-400">
                  {CONDITION_TIPS?.[k as keyof typeof CONDITION_TIPS] ?? ""}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {mode === "apply" && (
          <div className="w-32">
            <label className="block text-xs text-neutral-400 mb-1">Rounds</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={rounds}
              onChange={(e) => setRounds(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-neutral-800 border border-white/10 rounded px-2 py-1 text-sm"
              placeholder="optional"
            />
            <p className="mt-2 text-[10px] text-neutral-500">
              Enter to confirm. Esc to close. ↑/↓ to navigate.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
