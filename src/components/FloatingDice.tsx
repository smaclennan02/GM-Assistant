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

/* ---------- Component ---------- */
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

  /* ---------- Quick Rolls ---------- */
  const rollSingle = (sides: Die) => {
    const v = randInt(sides);
    pushLog(`d${sides} → ${v}`);
  };

  const rollD20 = (mod = 0) => {
    const v = randInt(20) + mod;
    pushLog(`d20${mod ? ` ${fmtSign(mod)}` : ""} → ${v}`);
  };

  const rollAdv = (mod = 0) => {
    const a = randInt(20);
    const b = randInt(20);
    const keep = Math.max(a, b);
    const total = keep + mod;
    pushLog(
      `d20 adv${mod ? ` ${fmtSign(mod)}` : ""} → ${total} (rolls: ${a}, ${b}; keep ${keep})`
    );
  };

  const rollDis = (mod = 0) => {
    const a = randInt(20);
    const b = randInt(20);
    const keep = Math.min(a, b);
    const total = keep + mod;
    pushLog(
      `d20 dis${mod ? ` ${fmtSign(mod)}` : ""} → ${total} (rolls: ${a}, ${b}; keep ${keep})`
    );
  };

  /* ---------- Custom Roller ---------- */
  const [n, setN] = useState(2);      // count
  const [s, setS] = useState(6);      // sides
  const [mod, setMod] = useState(0);  // modifier
  const [drop, setDrop] = useState(0);// drop lowest K

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
    const details =
      `rolls: [${rolls.join(", ")}]` +
      (dropCount ? `; kept: [${kept.join(", ")}]` : "");
    pushLog(`${expr} → ${total} (${details})`);
  };

  /* ---------- Presets ---------- */
  const preset2d6 = () => runPreset(2, 6, 0, 0);
  const preset3d6 = () => runPreset(3, 6, 0, 0);
  const preset4d6L = () => runPreset(4, 6, 0, 1); // drop lowest 1

  function runPreset(count: number, sides: number, modP: number, dropP: number) {
    setN(count); setS(sides); setMod(modP); setDrop(dropP);
    // Immediately roll with these values:
    const rolls: number[] = Array.from({ length: count }, () => randInt(sides));
    const sorted = [...rolls].sort((a, b) => a - b);
    const kept = sorted.slice(dropP);
    const sum = kept.reduce((t, x) => t + x, 0);
    const total = sum + modP;
    const expr =
      `${count}d${sides}` +
      (dropP ? ` drop${dropP}` : "") +
      (modP ? ` ${fmtSign(modP)}` : "");
    const details =
      `rolls: [${rolls.join(", ")}]` +
      (dropP ? `; kept: [${kept.join(", ")}]` : "");
    pushLog(`${expr} → ${total} (${details})`);
  }

  /* ---------- Log helper ---------- */
  function pushLog(line: string) {
    setLog((l) => [line, ...l].slice(0, 12));
  }

  /* ---------- Render ---------- */
  return (
    <div ref={rootRef} className="fixed z-[9998] bottom-4 right-4">
      {/* BIG toggle button (same button opens/closes) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={open ? "Close dice" : "Open dice"}
        className="relative grid place-items-center rounded-full border bg-neutral-950/80 hover:bg-neutral-900/90 shadow-lg w-16 h-16"
      >
        {Dice6 ? <Dice6 className="w-8 h-8" /> : <span className="text-2xl">🎲</span>}
      </button>

      {/* Panel that unfolds from the button (CSS transitions only) */}
      <div
        className={[
          "absolute bottom-[76px] right-0 w-[300px] rounded-xl border bg-neutral-950/95 shadow-2xl backdrop-blur p-3",
          "transform-gpu origin-bottom-right transition-all duration-200 ease-out",
          open ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2 pointer-events-none",
        ].join(" ")}
      >
        {/* D20 row: normal / adv / dis with optional mod */}
        <div className="flex items-center gap-2">
          <div className="text-xs opacity-70 w-10">d20</div>
          <button
            className="px-2 py-1 border rounded text-xs hover:bg-white/10"
            onClick={() => rollD20(0)}
            title="Roll d20"
          >Roll</button>
          <button
            className="px-2 py-1 border rounded text-xs hover:bg-white/10"
            onClick={() => rollAdv(0)}
            title="Roll d20 with advantage"
          >Adv</button>
          <button
            className="px-2 py-1 border rounded text-xs hover:bg-white/10"
            onClick={() => rollDis(0)}
            title="Roll d20 with disadvantage"
          >Dis</button>
          <div className="ml-auto flex items-center gap-1">
            <label className="text-xs opacity-70">mod</label>
            <input
              type="number"
              className="w-14 px-2 py-1 border rounded text-xs bg-transparent"
              defaultValue={0}
              onChange={(e) => {
                const m = Number(e.target.value || 0);
                // Update the three buttons to use current mod via closures:
                // We’ll just rebind handlers by reading value at click time:
                (rollD20 as any).mod = m;
                (rollAdv as any).mod = m;
                (rollDis as any).mod = m;
              }}
              onKeyDown={(e) => e.stopPropagation()}
              title="Default mod applied to d20 Roll/Adv/Dis"
            />
            <button
              className="px-2 py-1 border rounded text-xs hover:bg-white/10"
              title="Roll d20 with current mod"
              onClick={() => rollD20((rollD20 as any).mod ?? 0)}
            >Roll+mod</button>
          </div>
        </div>

        {/* Quick presets */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button className="px-2 py-1 border rounded text-xs hover:bg-white/10" onClick={preset2d6} title="2d6 total">2d6</button>
          <button className="px-2 py-1 border rounded text-xs hover:bg-white/10" onClick={preset3d6} title="3d6 total">3d6</button>
          <button className="px-2 py-1 border rounded text-xs hover:bg-white/10" onClick={preset4d6L} title="4d6 drop lowest">4d6-L</button>
        </div>

        {/* Standard single dice row */}
        <div className="mt-3 grid grid-cols-7 gap-1">
          {DICE.map((sides) => (
            <button
              key={sides}
              onClick={() => rollSingle(sides)}
              className="px-2 py-1 border rounded text-xs hover:bg-white/10"
              title={`Roll d${sides}`}
            >
              d{sides}
            </button>
          ))}
        </div>

        {/* Custom roller */}
        <div className="mt-3 grid grid-cols-12 gap-2 items-center">
          <div className="col-span-12 text-xs opacity-70">Custom</div>

          <label className="text-xs opacity-70 col-span-2 self-center">#</label>
          <input
            type="number"
            className="col-span-2 px-2 py-1 border rounded text-xs bg-transparent"
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
            className="col-span-2 px-2 py-1 border rounded text-xs bg-transparent"
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
            className="col-span-2 px-2 py-1 border rounded text-xs bg-transparent"
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
            className="col-span-3 px-2 py-1 border rounded text-xs bg-transparent"
            value={drop}
            onChange={(e) => setDrop(Number(e.target.value || 0))}
            onKeyDown={(e) => e.stopPropagation()}
            min={0}
            max={Math.max(0, n - 1)}
            title="Drop lowest K dice"
          />

          <div className="col-span-6" />
          <button
            className="col-span-6 px-2 py-1 border rounded text-xs hover:bg-white/10"
            onClick={doCustomRoll}
            title="Roll the custom expression"
          >
            Roll {n}d{s}{drop ? ` drop${drop}` : ""}{mod ? ` ${fmtSign(mod)}` : ""}
          </button>
        </div>

        {/* Log */}
        <div className="mt-3 text-xs opacity-70">Recent</div>
        <div className="mt-1 grid gap-1 max-h-36 overflow-auto pr-1">
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
      </div>
    </div>
  );
}
