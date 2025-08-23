"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dice6 } from "lucide-react";

const DICE = [4, 6, 8, 10, 12, 20, 100] as const;
type Die = typeof DICE[number];

export default function FloatingDice() {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, []);

  const roll = (sides: Die) => {
    const value = 1 + Math.floor(Math.random() * sides);
    setLog((l) => [`d${sides} → ${value}`, ...l].slice(0, 8));
  };

  return (
    <div ref={rootRef} className="fixed z-[9998] bottom-4 right-4">
      {/* BIGGER dice button; same button toggles open/close */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={open ? "Close dice" : "Open dice"}
        className="relative grid place-items-center rounded-full border bg-neutral-950/80 hover:bg-neutral-900/90 shadow-lg w-16 h-16"
      >
        {Dice6 ? <Dice6 className="w-8 h-8" /> : <span className="text-2xl">🎲</span>}
      </button>

      {/* Unraveling panel from the button */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scaleY: 0.75, y: 8 }}
            animate={{ opacity: 1, scaleY: 1, y: 0 }}
            exit={{ opacity: 0, scaleY: 0.75, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            style={{ transformOrigin: "bottom right" }}
            className="absolute bottom-[76px] right-0 w-[260px] rounded-xl border bg-neutral-950/95 shadow-2xl backdrop-blur p-3"
          >
            <div className="grid grid-cols-7 gap-1">
              {DICE.map((sides) => (
                <button
                  key={sides}
                  onClick={() => roll(sides)}
                  className="px-2 py-1 border rounded text-xs hover:bg-white/10"
                  title={`Roll d${sides}`}
                >
                  d{sides}
                </button>
              ))}
            </div>

            <div className="mt-3 text-xs opacity-70">Recent</div>
            <div className="mt-1 grid gap-1 max-h-28 overflow-auto pr-1">
              {log.length === 0 ? (
                <div className="text-xs opacity-60">No rolls yet.</div>
              ) : (
                log.map((e, idx) => (
                  <div key={idx} className="text-sm border rounded px-2 py-1 bg-white/5">
                    {e}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
