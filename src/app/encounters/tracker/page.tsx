"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";
import type { CharactersState, PC } from "@/types/characters";

/** Combatant in the encounter. Linked to PCs via pcId; NPCs have no pcId. */
type Combatant = {
  id: string;
  name: string;
  init: number | null;
  hp: number | null;
  ac: number | null;
  isPC?: boolean;
  pcId?: string;     // link to Characters store
  tags?: string[];   // legacy (safe to keep)
  conditions?: string[]; // NEW in 0.1.7
};

type EncounterState = {
  combatants: Combatant[];
  round: number;
  orderLocked: boolean;
  updatedAt: number;
};

const initialEncounter: EncounterState = {
  combatants: [],
  round: 1,
  orderLocked: false,
  updatedAt: Date.now(),
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function parseMaybeNumber(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ---------- Conditions dictionary (short rules for tooltips) ---------- */
const CONDITIONS = [
  "Blinded","Charmed","Deafened","Frightened","Grappled","Incapacitated",
  "Invisible","Paralyzed","Petrified","Poisoned","Prone","Restrained",
  "Stunned","Unconscious","Exhaustion"
] as const;

const CONDITION_TIPS: Record<string, string> = {
  Blinded: "Fails sight checks; attacks vs it have adv; its attacks have disadv.",
  Charmed: "Can’t attack charmer; charmer has advantage on social checks.",
  Deafened: "Can’t hear; fails sound-based checks.",
  Frightened: "Disadv on checks/attacks while source visible; can’t move closer.",
  Grappled: "Speed 0; ends if grappler is incapacitated or moved away.",
  Incapacitated: "Can’t take actions or reactions.",
  Invisible: "Unseen; attacks vs it have disadv; its attacks have adv.",
  Paralyzed: "Incapacitated; can’t move/speak; auto fail Str/Dex saves; attacks vs it have adv; crits within 5 ft.",
  Petrified: "Transformed to stone; incapacitated; resists all damage; vulnerable to bludgeoning.",
  Poisoned: "Disadv on attacks and ability checks.",
  Prone: "Crawl; disadv on attacks; attacks vs it have adv if within 5 ft, otherwise disadv.",
  Restrained: "Speed 0; disadv on attacks and Dex saves; attacks vs it have adv.",
  Stunned: "Incapacitated; can’t move; fails Str/Dex saves; attacks vs it have adv.",
  Unconscious: "Incapacitated; drops items; prone; fails Str/Dex saves; attacks within 5 ft crit.",
  Exhaustion: "Levels 1–6; penalties scale. (Track level in notes.)"
};

/* ---------- Component ---------- */
export default function InitiativePage() {
  /** Encounter (persistent) */
  const [enc, setEnc] = useStorageState<EncounterState>({
    key: STORAGE_KEYS.ENCOUNTERS,
    driver: localDriver,
    initial: initialEncounter,
    version: 1,
  });

  /** Characters (read-only) */
  const [chars] = useStorageState<CharactersState>({
    key: STORAGE_KEYS.CHARACTERS,
    driver: localDriver,
    initial: { pcs: [], npcs: [], updatedAt: Date.now() },
    version: 1,
  });

  /** Derived: PCs already linked in encounter */
  const pcIdsInEncounter = useMemo(
    () => new Set(enc.combatants.filter(c => c.pcId).map(c => c.pcId as string)),
    [enc.combatants]
  );

  /** Sort display: highest init first; null low; PCs before NPCs on tie; then name */
  const sorted = useMemo(() => {
    const arr = [...enc.combatants];
    if (enc.orderLocked) return arr;
    return arr.sort((a, b) => {
      const ai = a.init ?? Number.NEGATIVE_INFINITY;
      const bi = b.init ?? Number.NEGATIVE_INFINITY;
      if (bi !== ai) return bi - ai;
      const ap = a.isPC ? 1 : 0;
      const bp = b.isPC ? 1 : 0;
      if (bp !== ap) return bp - ap;
      return a.name.localeCompare(b.name);
    });
  }, [enc.combatants, enc.orderLocked]);

  /* ---------- Actions ---------- */

  /** Add any PCs not currently in the encounter (init left blank) */
  const addMissingPCs = useCallback(() => {
    const count = chars?.pcs?.length ?? 0;
    if (!count) return;
    const now = Date.now();

    setEnc(e => {
      const existingByPcId = new Map(
        e.combatants.filter(c => c.pcId).map(c => [c.pcId as string, c])
      );

      const additions: Combatant[] = [];
      for (const pc of chars.pcs) {
        if (!existingByPcId.has(pc.id)) additions.push(pcToCombatant(pc));
      }
      if (!additions.length) return e;

      return { ...e, combatants: [...e.combatants, ...additions], updatedAt: now };
    });
  }, [chars?.pcs, setEnc]);

  /** Sync PC-linked combatants with latest Characters data (keep initiative) */
  const syncLinkedPCs = useCallback(() => {
    if (!chars?.pcs?.length) return;
    const pcById = new Map(chars.pcs.map(p => [p.id, p]));
    setEnc(e => ({
      ...e,
      combatants: e.combatants.map(c => {
        if (!c.pcId) return c;
        const pc = pcById.get(c.pcId);
        if (!pc) return c;
        return {
          ...c,
          name: pc.name ?? c.name,
          ac: typeof pc.ac === "number" ? pc.ac : c.ac,
          hp: typeof pc.hp?.current === "number" ? pc.hp.current : c.hp,
          isPC: true,
          conditions: c.conditions ?? []
        };
      }),
      updatedAt: Date.now(),
    }));
  }, [chars?.pcs, setEnc]);

  /** Clear all initiatives (leave everyone in the list) */
  const clearAllInits = useCallback(() => {
    setEnc(e => ({
      ...e,
      combatants: e.combatants.map(c => ({ ...c, init: null })),
      updatedAt: Date.now(),
    }));
  }, [setEnc]);

  const remove = useCallback((id: string) => {
    setEnc(e => ({ ...e, combatants: e.combatants.filter(c => c.id !== id), updatedAt: Date.now() }));
  }, [setEnc]);

  const update = useCallback((id: string, patch: Partial<Combatant>) => {
    setEnc(e => ({
      ...e,
      combatants: e.combatants.map(c => (c.id === id ? { ...c, ...patch } : c)),
      updatedAt: Date.now(),
    }));
  }, [setEnc]);

  const addNPC = useCallback((name: string) => {
    setEnc(e => ({
      ...e,
      combatants: [...e.combatants, { id: newId(), name: name || "NPC", init: null, hp: null, ac: null, isPC: false, tags: [], conditions: [] }],
      updatedAt: Date.now(),
    }));
  }, [setEnc]);

  const toggleLock = useCallback(() => {
    setEnc(e => ({ ...e, orderLocked: !e.orderLocked, updatedAt: Date.now() }));
  }, [setEnc]);

  const nextRound = useCallback(() => {
    setEnc(e => ({ ...e, round: Math.max(1, e.round + 1), updatedAt: Date.now() }));
  }, [setEnc]);

  const prevRound = useCallback(() => {
    setEnc(e => ({ ...e, round: Math.max(1, e.round - 1), updatedAt: Date.now() }));
  }, [setEnc]);

  /* ---------- Conditions helpers ---------- */
  const toggleCondition = useCallback((id: string, cond: string) => {
    setEnc(e => ({
      ...e,
      combatants: e.combatants.map(c => {
        if (c.id !== id) return c;
        const list = c.conditions ?? [];
        const exists = list.includes(cond);
        const next = exists ? list.filter(x => x !== cond) : [...list, cond];
        return { ...c, conditions: next };
      }),
      updatedAt: Date.now(),
    }));
  }, [setEnc]);

  const clearConditions = useCallback((id: string) => {
    setEnc(e => ({
      ...e,
      combatants: e.combatants.map(c => (c.id === id ? { ...c, conditions: [] } : c)),
      updatedAt: Date.now(),
    }));
  }, [setEnc]);

  /* ---------- QoL: auto-load PCs & keyboard shortcuts ---------- */

  // Auto-load PCs the first time you open the tracker if the encounter is empty
  const autoloadRef = useRef(false);
  useEffect(() => {
    if (autoloadRef.current) return;
    if (enc.combatants.length === 0 && (chars?.pcs?.length ?? 0) > 0) {
      autoloadRef.current = true;
      addMissingPCs();  // runs once per mount
    }
  }, [enc.combatants.length, chars?.pcs?.length, addMissingPCs]);

  // Keyboard shortcuts: [ = prev round, ] = next round, L = lock/unlock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;

      if (e.code === "BracketLeft") { e.preventDefault(); prevRound(); }
      else if (e.code === "BracketRight") { e.preventDefault(); nextRound(); }
      else if (e.key === "l" || e.key === "L") { e.preventDefault(); toggleLock(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevRound, nextRound, toggleLock]);

  /* ---------- UI State ---------- */

  const [npcName, setNpcName] = useState("");

  return (
    <div className="p-0 space-y-6">
      {/* Header with spacing & grouping */}
      <header className="rounded-lg border p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Encounter Tracker</h1>
          <p className="text-xs opacity-60">Shortcuts: [ and ] change round • L toggles lock</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Round controls grouped */}
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 border rounded" onClick={prevRound} aria-label="Previous round">−</button>
            <div className="px-3 py-2 border rounded">Round <b>{enc.round}</b></div>
            <button className="px-3 py-2 border rounded" onClick={nextRound} aria-label="Next round">+</button>
          </div>

          {/* Divider on wider screens */}
          <div className="hidden sm:block h-6 w-px bg-neutral-800" />

          <button className="px-3 py-2 border rounded" onClick={toggleLock} aria-pressed={enc.orderLocked}>
            {enc.orderLocked ? "Unlock Order" : "Lock Order"}
          </button>

          <button className="px-3 py-2 border rounded" onClick={clearAllInits} title="Set all initiatives to blank">
            Clear Inits
          </button>
        </div>
      </header>

      {/* Party controls */}
      <section className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Party</h2>
          <span className="text-sm opacity-70">PCs: <b>{chars?.pcs?.length ?? 0}</b></span>
          <span className="text-sm opacity-70">Loaded: <b>{pcIdsInEncounter.size}</b></span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className={`px-3 py-2 border rounded ${(!chars?.pcs?.length ? "opacity-50 cursor-not-allowed" : "cursor-pointer")}`}
              onClick={addMissingPCs}
              disabled={!chars?.pcs?.length}
              title={!chars?.pcs?.length ? "Add PCs in the Characters tab first" : "Add any missing PCs to this encounter"}
            >
              Load PCs (add missing)
            </button>
            <button
              type="button"
              className="px-3 py-2 border rounded cursor-pointer"
              onClick={syncLinkedPCs}
              title="Refresh names/AC/HP from Characters; keeps your initiative"
            >
              Sync from Characters
            </button>
          </div>
        </div>
        <div className="text-xs opacity-70">
          Tip: PCs are added with <b>blank initiative</b>. Type each roll and the list will sort automatically (unless locked).
        </div>
      </section>

      {/* Quick NPC add */}
      <section className="rounded-lg border p-4 space-y-2">
        <h3 className="font-semibold">Quick NPC</h3>
        <div className="flex gap-2">
          <input
            className="px-3 py-2 border rounded input-compact"
            placeholder="Goblin"
            value={npcName}
            onChange={(e) => setNpcName(e.target.value)}
          />
          <button className="px-3 py-2 border rounded" onClick={() => { addNPC(npcName); setNpcName(""); }}>
            Add NPC
          </button>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-lg border overflow-x-auto">
        <table className="w-full text-left table-ui sticky-header table-tight">
          <thead>
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Init</th>
              <th className="px-3 py-2">HP</th>
              <th className="px-3 py-2">AC</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Conditions</th>{/* NEW */}
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const conds = c.conditions ?? [];
              return (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      className="px-2 py-1 border rounded w-full input-compact"
                      value={c.name}
                      onChange={(e) => update(c.id, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="px-2 py-1 border rounded w-24 input-compact"
                      value={c.init ?? ""}
                      onChange={(e) => update(c.id, { init: parseMaybeNumber(e.target.value) })}
                      inputMode="numeric"
                      placeholder="—"
                      title="Enter initiative manually"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="px-2 py-1 border rounded w-24 input-compact"
                      value={c.hp ?? ""}
                      onChange={(e) => update(c.id, { hp: parseMaybeNumber(e.target.value) })}
                      inputMode="numeric"
                      placeholder="—"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="px-2 py-1 border rounded w-24 input-compact"
                      value={c.ac ?? ""}
                      onChange={(e) => update(c.id, { ac: parseMaybeNumber(e.target.value) })}
                      inputMode="numeric"
                      placeholder="—"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {c.isPC ? (
                      <span className="inline-flex items-center gap-1 text-green-700 border rounded px-2 py-0.5 text-xs">
                        PC{c.pcId ? " • linked" : ""}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-300 border rounded px-2 py-0.5 text-xs">
                        NPC
                      </span>
                    )}
                  </td>
                  {/* Conditions column */}
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {conds.map(cond => (
                        <span
                          key={cond}
                          title={CONDITION_TIPS[cond] || ""}
                          className="inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-xs"
                        >
                          {cond}
                          <button
                            className="ml-1 rounded-full px-1 text-xs border"
                            title="Remove"
                            onClick={() => toggleCondition(c.id, cond)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <select
                        aria-label="Add condition"
                        className="border rounded px-2 py-1 text-xs bg-transparent"
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          toggleCondition(c.id, val);
                          e.currentTarget.value = "";
                        }}
                      >
                        <option value="" disabled>Add…</option>
                        {CONDITIONS.map(k => (
                          <option key={k} value={k} title={CONDITION_TIPS[k]}>{k}</option>
                        ))}
                      </select>
                      {conds.length > 0 && (
                        <button
                          className="px-2 py-1 border rounded text-xs"
                          onClick={() => clearConditions(c.id)}
                          title="Clear all conditions"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button className="px-2 py-1 border rounded" onClick={() => remove(c.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center italic opacity-70" colSpan={7}>
                  No combatants yet. Click <b>Load PCs</b> to add your party or use Quick NPC.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/** Helper: convert a PC to a combatant (init left null so DM only types initiative) */
function pcToCombatant(pc: PC): Combatant {
  return {
    id: newId(),
    pcId: pc.id,
    name: pc.name || "PC",
    init: null,
    hp: typeof pc.hp?.current === "number" ? pc.hp.current : null,
    ac: typeof pc.ac === "number" ? pc.ac : null,
    isPC: true,
    tags: [],
    conditions: [], // NEW
  };
}
