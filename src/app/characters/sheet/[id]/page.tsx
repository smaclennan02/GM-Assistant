"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";
import type { CharactersState, PC } from "@/types/characters";
import { ChevronLeft } from "lucide-react";

/**
 * Lightweight, paywall-free 5e sheet stored locally inside each PC.
 * We add/consume an optional pc.sheet object without changing your CSV schema.
 */

type SheetData = {
  class?: string;
  level?: number;
  race?: string;
  background?: string;
  profBonus?: number;
  speed?: number;
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  notes?: string;
};

function mod(n?: number) {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.floor((n - 10) / 2);
}

export default function CharacterSheetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pcId = params?.id;

  const [chars, setChars] = useStorageState<CharactersState>({
    key: STORAGE_KEYS.CHARACTERS,
    driver: localDriver,
    initial: { pcs: [], npcs: [], updatedAt: 0 },
    version: 1,
  });

  const pc = useMemo<PC | undefined>(() => {
    const list = (chars?.pcs as PC[]) || [];
    return list.find((p) => p.id === pcId);
  }, [chars, pcId]);

  if (!pc) {
    return (
      <div className="space-y-4">
        <header className="rounded-lg border p-4 flex items-center gap-3">
          <button
            className="h-8 w-8 grid place-items-center rounded border hover:bg-white/10"
            onClick={() => router.push("/characters")}
            title="Back"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-bold">Character not found</h1>
        </header>
        <div className="rounded-lg border p-4 text-sm opacity-80">
          No PC with id <b>{pcId}</b>.
        </div>
      </div>
    );
  }

  // Safe access to sheet
  const sheet: SheetData = ((pc as any).sheet || {}) as SheetData;

  const updatePC = (patch: Partial<PC>) => {
    setChars((prev) => ({
      ...prev,
      pcs: (prev.pcs || []).map((p) => (p.id === pc.id ? { ...p, ...patch } : p)),
      updatedAt: Date.now(),
    }));
  };

  const updateSheet = (patch: Partial<SheetData>) => {
    setChars((prev) => ({
      ...prev,
      pcs: (prev.pcs || []).map((p) =>
        p.id === pc.id ? { ...p, sheet: { ...(p as any).sheet, ...patch } } as any : p
      ),
      updatedAt: Date.now(),
    }));
  };

  // Derived / fallbacks
  const ac = typeof pc.ac === "number" ? pc.ac : undefined;
  const hpCur = typeof (pc as any).hp?.current === "number" ? (pc as any).hp?.current : undefined;
  const hpMax = typeof (pc as any).hp?.max === "number" ? (pc as any).hp?.max : undefined;

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="rounded-lg border p-4 flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <button
            className="h-8 w-8 grid place-items-center rounded border hover:bg-white/10"
            onClick={() => router.push("/characters")}
            title="Back"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Character Sheet</h1>
            <p className="text-xs opacity-70">All local, no paywalls.</p>
          </div>
        </div>
        <div className="text-xs opacity-70">ID: <b>{pc.id}</b></div>
      </header>

      {/* Top identity row */}
      <section className="rounded-lg border p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <Labeled>
            <label className="text-xs opacity-70">Name</label>
            <input
              className="px-2 py-1 border rounded bg-transparent w-full"
              value={pc.name || ""}
              onChange={(e) => updatePC({ name: e.target.value })}
            />
          </Labeled>

          <Labeled>
            <label className="text-xs opacity-70">Class</label>
            <input
              className="px-2 py-1 border rounded bg-transparent w-full"
              value={sheet.class || ""}
              onChange={(e) => updateSheet({ class: e.target.value })}
              placeholder="Fighter"
            />
          </Labeled>

          <Labeled>
            <label className="text-xs opacity-70">Level</label>
            <input
              type="number"
              className="px-2 py-1 border rounded bg-transparent w-full"
              value={sheet.level ?? ""}
              onChange={(e) => updateSheet({ level: e.target.value === "" ? undefined : Number(e.target.value) })}
              placeholder="1"
            />
          </Labeled>

          <Labeled>
            <label className="text-xs opacity-70">Race</label>
            <input
              className="px-2 py-1 border rounded bg-transparent w-full"
              value={sheet.race || ""}
              onChange={(e) => updateSheet({ race: e.target.value })}
              placeholder="Human"
            />
          </Labeled>

          <Labeled>
            <label className="text-xs opacity-70">Background</label>
            <input
              className="px-2 py-1 border rounded bg-transparent w-full"
              value={sheet.background || ""}
              onChange={(e) => updateSheet({ background: e.target.value })}
              placeholder="Soldier"
            />
          </Labeled>

          <div className="grid grid-cols-3 gap-3">
            <Labeled>
              <label className="text-xs opacity-70">Prof. Bonus</label>
              <input
                type="number"
                className="px-2 py-1 border rounded bg-transparent w-full"
                value={sheet.profBonus ?? ""}
                onChange={(e) =>
                  updateSheet({ profBonus: e.target.value === "" ? undefined : Number(e.target.value) })
                }
                placeholder="+2"
              />
            </Labeled>
            <Labeled>
              <label className="text-xs opacity-70">Speed</label>
              <input
                type="number"
                className="px-2 py-1 border rounded bg-transparent w-full"
                value={sheet.speed ?? ""}
                onChange={(e) =>
                  updateSheet({ speed: e.target.value === "" ? undefined : Number(e.target.value) })
                }
                placeholder="30"
              />
            </Labeled>
            <Labeled>
              <label className="text-xs opacity-70">AC</label>
              <input
                type="number"
                className="px-2 py-1 border rounded bg-transparent w-full"
                value={ac ?? ""}
                onChange={(e) =>
                  // keep AC also on the PC for Encounter Suite
                  updatePC({ ac: e.target.value === "" ? undefined : Number(e.target.value) })
                }
                placeholder="—"
              />
            </Labeled>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Labeled>
              <label className="text-xs opacity-70">HP (current)</label>
              <input
                type="number"
                className="px-2 py-1 border rounded bg-transparent w-full"
                value={hpCur ?? ""}
                onChange={(e) => {
                  const cur = e.target.value === "" ? undefined : Number(e.target.value);
                  const max = typeof (pc as any).hp?.max === "number" ? (pc as any).hp?.max : undefined;
                  updatePC({ hp: { current: cur, max } as any });
                }}
              />
            </Labeled>
            <Labeled>
              <label className="text-xs opacity-70">HP (max)</label>
              <input
                type="number"
                className="px-2 py-1 border rounded bg-transparent w-full"
                value={hpMax ?? ""}
                onChange={(e) => {
                  const max = e.target.value === "" ? undefined : Number(e.target.value);
                  const cur = typeof (pc as any).hp?.current === "number" ? (pc as any).hp?.current : undefined;
                  updatePC({ hp: { current: cur, max } as any });
                }}
              />
            </Labeled>
          </div>
        </div>
      </section>

      {/* Abilities */}
      <section className="rounded-lg border p-3 space-y-3">
        <h2 className="font-semibold">Abilities</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <Ability label="STR" value={sheet.str} onChange={(v) => updateSheet({ str: v })} />
          <Ability label="DEX" value={sheet.dex} onChange={(v) => updateSheet({ dex: v })} />
          <Ability label="CON" value={sheet.con} onChange={(v) => updateSheet({ con: v })} />
          <Ability label="INT" value={sheet.int} onChange={(v) => updateSheet({ int: v })} />
          <Ability label="WIS" value={sheet.wis} onChange={(v) => updateSheet({ wis: v })} />
          <Ability label="CHA" value={sheet.cha} onChange={(v) => updateSheet({ cha: v })} />
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-lg border p-3 space-y-2">
        <h2 className="font-semibold">Notes</h2>
        <textarea
          className="px-2 py-2 border rounded bg-transparent w-full min-h-[120px]"
          value={sheet.notes ?? (pc as any).notes ?? ""}
          onChange={(e) => updateSheet({ notes: e.target.value })}
          placeholder="Personality, ideals, bonds, flaws, inventory highlights…"
        />
      </section>
    </div>
  );
}

/* ===== UI bits ===== */
function Labeled({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>;
}

function Ability({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v?: number) => void;
}) {
  const m = mod(value);
  const modStr = m >= 0 ? `+${m}` : `${m}`;
  return (
    <div className="rounded-lg border p-2 space-y-2">
      <div className="text-xs opacity-70">{label}</div>
      <input
        type="number"
        className="px-2 py-1 border rounded bg-transparent w-full"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        placeholder="10"
      />
      <div className="text-xs opacity-70">Mod</div>
      <div className="text-lg font-semibold leading-none">{modStr}</div>
    </div>
  );
}
