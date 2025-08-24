"use client";

import React, { useEffect, useRef, useState } from "react";
import { Dice6 } from "lucide-react";

/* ---------- Helpers ---------- */
const DICE = [4, 6, 8, 10, 12, 20, 100] as const;
type Die = typeof DICE[number];

function randInt(maxInclusive: number) {
  return 1 + Math.floor(Math.random() * maxInclusive);
}
function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}
function fmtSign(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

/* ---------- Types ---------- */
type LogColor = "neutral" | "green" | "red";
type LogEntry = {
  id: string;
  title: string;    // big line, eg "20" or "23"
  subtitle: string; // small breakdown
  color: LogColor;
};

/* ---------- Component ---------- */
export default function FloatingDice() {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
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

  const pushLog = (e: LogEntry) => {
    setLog((l) => [e, ...l].slice(0, 12));
  };
  const newId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  /* ---------- d20 row (with Adv/Dis + mod) ---------- */
  const [d20Mod, setD20Mod] = useState(0);

  const rollD20 = (mod = 0) => {
    const base = randInt(20);
    const total = base + mod;
    pushLog({
      id: newId(),
      title: String(total),
      subtitle: `d20${mod ? ` ${fmtSign(mod)}` : ""} • roll ${base}`,
      color: "neutral",
    });
  };

  const rollAdv = (mod = 0) => {
    const a = randInt(20);
    const b = randInt(20);
    const keep = Math.max(a, b);
    const total = keep + mod;
    pushLog({
      id: newId(),
      title: String(total),
      subtitle: `d20 ADV${mod ? ` ${fmtSign(mod)}` : ""} • rolls ${a}, ${b} • kept ${keep}`,
      color: "green",
    });
  };

  const rollDis = (mod = 0) => {
    const a = randInt(20);
    const b = randInt(20);
    const keep = Math.min(a, b);
    const total = keep + mod;
    pushLog({
      id: newId(),
      title: String(total),
      subtitle: `d20 DIS${mod ? ` ${fmtSign(mod)}` : ""} • rolls ${a}, ${b} • kept ${keep}`,
      color: "red",
    });
  };

  /* ---------- Quick singles ---------- */
  const rollSingle = (sides: Die) => {
    const v = randInt(sides);
    pushLog({
      id: newId(),
      title: String(v),
      subtitle: `d${sides}`,
      color: "neutral",
    });
  };

  /* ---------- Custom Roller ---------- */
  const [n, setN] = useState(4);
  const [s, setS] = useState(6);
  const [mod, setMod] = useState(0);
  const [drop, setDrop] = useState(1); // drop lowest 1 by default (4d6-L)

  const doCustomRoll = () => {
    const count = clampInt(n, 1, 100);
    const sides = clampInt(s, 2, 1000);
    const modClamped = clampInt(mod, -999, 999);
    const dropCount = clampInt(drop, 0, Math.max(0, count - 1));

    const rolls: number[] = Array.from({ length: count }, () => randInt(sides));
    const sorted = [...rolls].sort((a, b) => a - b);
    const kept = sorted.slice(dropCount);
    const sum = kept.reduce((t, x) => t + x, 0);
    const total = sum + modClamped;

    const expr =
      `${count}d${sides}` +
      (dropCount ? ` drop${dropCount}` : "") +
      (modClamped ? ` ${fmtSign(modClamped)}` : "");

    pushLog({
      id: newId(),
      title: String(total),
      subtitle: `${expr} • rolls [${rolls.join(", ")}]${dropCount ? ` • kept [${kept.join(", ")}]` : ""}`,
      color: "neutral",
    });
  };

  const preset2d6 = () => { setN(2); setS(6); setMod(0); setDrop(0); doCustomRoll(); };
  const preset3d6 = () => { setN(3); setS(6); setMod(0); setDrop(0); doCustomRoll(); };
  const preset4d6L = () => { setN(4); setS(6); setMod(0); setDrop(1); doCustomRoll(); };

  /* ---------- Render ---------- */
  return (
    <div ref={rootRef} className="fixed z-[9998] bottom-6 right-6">
      {/* BIGGER dice button; same button toggles open/close */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={open ? "Close dice" : "Open dice"}
        className="relative grid place-items-center rounded-full border bg-neutral-950/90 hover:bg-neutral-900/95 shadow-xl w-18 h-18"
        style={{ width: 72, height: 72 }} // bigger than w-16 h-16
      >
        {Dice6 ? <Dice6 className="w-10 h-10" /> : <span className="text-3xl">🎲</span>}
      </button>

      {/* Unfolding panel — FIXED SIZE so it never jumps */}
      <div
        className={[
          "absolute right-0",
          "rounded-2xl border bg-neutral-950/95 shadow-2xl backdrop-blur",
          "transform-gpu origin-bottom-right transition-all duration-200 ease-out",
          open ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 translate-y-2 pointer-events-none",
        ].join(" ")}
        style={{
          bottom: 84,  // sits just above the big button
          width: 380,  // wider
          height: 500, // fixed height: no jitter when history fills
        }}
      >
        <div className="h-full flex flex-col p-4 gap-3">
          {/* d20 Row: bigger, color-coded */}
          <div className="flex items-center gap-3">
            <div className="text-sm opacity-70 w-12">d20</div>

            <button
              className="px-3 py-2 rounded text-sm border bg-sky-500/10 border-sky-500/30 text-sky-300 hover:bg-sky-500/20"
              onClick={() => rollD20(d20Mod)}
              title={`Roll d20${d20Mod ? ` ${fmtSign(d20Mod)}` : ""}`}
            >
              Roll
            </button>

            <button
              className="px-3 py-2 rounded text-sm border bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20"
              onClick={() => rollAdv(d20Mod)}
              title={`Roll d20 with Advantage${d20Mod ? ` ${fmtSign(d20Mod)}` : ""}`}
            >
              Advantage
            </button>

            <button
              className="px-3 py-2 rounded text-sm border bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
              onClick={() => rollDis(d20Mod)}
              title={`Roll d20 with Disadvantage${d20Mod ? ` ${fmtSign(d20Mod)}` : ""}`}
            >
              Disadvantage
            </button>

            <div className="ml-auto flex items-center gap-2">
              <label className="text-xs opacity-70">mod</label>
              <input
                type="number"
                className="w-16 px-2 py-2 border rounded text-sm bg-transparent"
                value={d20Mod}
                onChange={(e) => setD20Mod(Number(e.target.value || 0))}
                onKeyDown={(e) => e.stopPropagation()}
                title="Modifier applied to d20 rolls"
              />
            </div>
          </div>

          {/* Presets */}
          <div className="grid grid-cols-3 gap-2">
            <button className="px-3 py-2 rounded text-sm border hover:bg-white/10" onClick={preset2d6} title="2d6 total">2d6</button>
            <button className="px-3 py-2 rounded text-sm border hover:bg-white/10" onClick={preset3d6} title="3d6 total">3d6</button>
            <button className="px-3 py-2 rounded text-sm border hover:bg-white/10" onClick={preset4d6L} title="4d6 drop lowest">4d6-L</button>
          </div>

          {/* Standard single dice */}
          <div className="grid grid-cols-7 gap-2">
            {DICE.map((sides) => (
              <button
                key={sides}
                onClick={() => rollSingle(sides)}
                className="px-3 py-2 rounded text-sm border hover:bg-white/10"
                title={`Roll d${sides}`}
              >
                d{sides}
              </button>
            ))}
          </div>

          {/* Custom roller (bigger) */}
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-12 text-xs opacity-70">Custom</div>

            <label className="text-xs opacity-70 col-span-2 self-center">#</label>
            <input
              type="number"
              className="col-span-2 px-2 py-2 border rounded text-sm bg-transparent"
              value={n}
              onChange={(e) => setN(Number(e.target.value || 1))}
              onKeyDown={(e) => e.stopPropagation()}
              min={1}
              max={100}
              title="Number of dice"
            />

            <label className="text-xs opacity-70 col-span-2 self-center">d</label>
            <input
              type="number"
              className="col-span-2 px-2 py-2 border rounded text-sm bg-transparent"
              value={s}
              onChange={(e) => setS(Number(e.target.value || 2))}
              onKeyDown={(e) => e.stopPropagation()}
              min={2}
              max={1000}
              title="Sides per die"
            />

            <label className="text-xs opacity-70 col-span-2 self-center">mod</label>
            <input
              type="number"
              className="col-span-2 px-2 py-2 border rounded text-sm bg-transparent"
              value={mod}
              onChange={(e) => setMod(Number(e.target.value || 0))}
              onKeyDown={(e) => e.stopPropagation()}
              min={-999}
              max={999}
              title="Flat modifier"
            />

            <label className="text-xs opacity-70 col-span-3 self-center">drop</label>
            <input
              type="number"
              className="col-span-3 px-2 py-2 border rounded text-sm bg-transparent"
              value={drop}
              onChange={(e) => setDrop(Number(e.target.value || 0))}
              onKeyDown={(e) => e.stopPropagation()}
              min={0}
              max={Math.max(0, n - 1)}
              title="Drop lowest K dice"
            />

            <div className="col-span-6" />
            <button
              className="col-span-6 px-3 py-2 rounded text-sm border hover:bg-white/10"
              onClick={doCustomRoll}
              title="Roll the custom expression"
            >
              Roll {n}d{s}{drop ? ` drop${drop}` : ""}{mod ? ` ${fmtSign(mod)}` : ""}
            </button>
          </div>

          {/* History: fixed space, scroll inside; entries are big & wrap */}
          <div className="text-xs opacity-70">History</div>
          <div className="flex-1 min-h-[140px] max-h-[180px] overflow-auto pr-1">
            {log.length === 0 ? (
              <div className="text-xs opacity-60">No rolls yet.</div>
            ) : (
              <div className="grid gap-2">
                {log.map((e) => (
                  <div
                    key={e.id}
                    className={[
                      "rounded-lg border p-2 bg-white/5",
                      e.color === "green" ? "border-green-500/40" : e.color === "red" ? "border-red-500/40" : "border-white/20",
                    ].join(" ")}
                  >
                    <div className="text-xl font-bold leading-none">{e.title}</div>
                    <div className="text-xs opacity-80 mt-1 whitespace-normal break-words">
                      {e.subtitle}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
