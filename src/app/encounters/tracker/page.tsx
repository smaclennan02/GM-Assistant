"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";
import { pcsStore, type PC } from "@/lib/characters";
import { createPortal } from "react-dom";
import { User, Users, Skull, Lock, Unlock, Trash2, ChevronLeft, ChevronRight, Play } from "lucide-react";

/* ==== Shared conditions (EXACT match to Resources) ==== */
import {
  CONDITIONS,
  CONDITION_TIPS,
  CONDITION_META,
  type ConditionKey,
} from "@/lib/conditions";

/* ========= Types ========= */
type TimedCondition = { key: ConditionKey; rounds: number };
type CondEntry = ConditionKey | TimedCondition;

type Combatant = {
  id: string;
  name: string;
  init: number | null;
  hp: number | null;
  ac: number | null;
  isPC?: boolean;
  pcId?: string;
  tags?: string[];
  conditions?: CondEntry[];
  kind?: "pc" | "npc" | "monster";
};

type EncounterState = {
  combatants: Combatant[];
  round: number;
  orderLocked: boolean;
  updatedAt: number;
  activeId?: string | null; // whose turn is active
};

const initialEncounter: EncounterState = {
  combatants: [],
  round: 1,
  orderLocked: false,
  updatedAt: Date.now(),
  activeId: null,
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/* ========= Helpers ========= */
function getKind(c: Combatant): "pc" | "npc" | "monster" {
  if (c.kind) return c.kind;
  if (c.isPC || c.pcId) return "pc";
  if ((c.tags || []).some((t) => /^CR\s+/i.test(t))) return "monster";
  return "npc";
}

function parseHPFromPC(pc: PC): number | null {
  const anyHp: any = (pc as any).hp;
  if (typeof anyHp === "string") {
    const m = anyHp.match(/^\s*(\d+)/);
    return m ? Number(m[1]) : null;
  }
  if (anyHp && typeof anyHp.current === "number") return anyHp.current;
  return null;
}

function pcToCombatant(pc: PC): Combatant {
  return {
    id: newId(),
    pcId: pc.id,
    name: pc.name || "PC",
    init: null,
    hp: parseHPFromPC(pc),
    ac: typeof (pc as any).ac === "number" ? (pc as any).ac : null,
    isPC: true,
    kind: "pc",
    tags: [],
    conditions: [],
  };
}

/* ---- Condition utils ---- */
function isTimed(x: CondEntry): x is TimedCondition {
  return typeof x === "object" && x !== null && "key" in x && "rounds" in x;
}
function condKeyOf(x: CondEntry): ConditionKey {
  return (isTimed(x) ? x.key : x) as ConditionKey;
}

/** Upsert a condition by key. If rounds provided, set/replace as timed; if not, set to untimed. */
function upsertCondition(list: CondEntry[] | undefined, key: ConditionKey, rounds?: number): CondEntry[] {
  const arr = [...(list || [])];
  const idx = arr.findIndex((e) => condKeyOf(e) === key);
  if (rounds && rounds > 0) {
    const entry: TimedCondition = { key, rounds };
    if (idx >= 0) arr[idx] = entry;
    else arr.push(entry);
  } else {
    // Untimed – replace any existing timed/untimed with plain key
    if (idx >= 0) arr[idx] = key;
    else arr.push(key);
  }
  return arr;
}

/** Remove a condition by key (removes any timed/untimed variant). */
function removeConditionByKey(list: CondEntry[] | undefined, key: ConditionKey): CondEntry[] {
  return (list || []).filter((e) => condKeyOf(e) !== key);
}

/** Tick conditions for a given combatant ID: decrement timed; remove at 0; untimed unchanged. */
function tickConditionsForId(list: Combatant[], id: string): Combatant[] {
  return list.map((c) => {
    if (c.id !== id) return c;
    const next: CondEntry[] = [];
    for (const e of c.conditions || []) {
      if (isTimed(e)) {
        const r = e.rounds - 1;
        if (r > 0) next.push({ key: e.key, rounds: r });
        // else drop (auto-remove)
      } else {
        next.push(e); // untimed stays
      }
    }
    return { ...c, conditions: next };
  });
}

/* ========= Floating Effects Menu (portal; opens at cursor) ========= */
function EffectsMenu({
  x,
  y,
  onClose,
  onPick,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onPick: (key: ConditionKey, rounds?: number) => void;
}) {
  // Clamp within viewport to avoid overflow
  const width = 380;
  const height = 280;
  const pad = 12;
  const vw = typeof window !== "undefined" ? window.innerWidth : width;
  const vh = typeof window !== "undefined" ? window.innerHeight : height;
  const left = Math.max(pad, Math.min(x, vw - width - pad));
  const top = Math.max(pad, Math.min(y, vh - height - pad));

  const [rounds, setRounds] = useState<string>(""); // optional rounds

  return createPortal(
    <div className="fixed inset-0 z-[9999]" onClick={onClose}>
      <div
        className="fixed rounded-xl border bg-neutral-950 shadow-2xl p-2"
        style={{ left, top, width, maxHeight: height }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Optional duration row */}
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs opacity-80 whitespace-nowrap">Rounds (optional)</label>
          <input
            type="number"
            min={1}
            placeholder="e.g. 10"
            value={rounds}
            onChange={(e) => setRounds(e.target.value)}
            className="w-24 px-2 py-1 border rounded bg-transparent text-sm"
          />
          <span className="text-xs opacity-60">Click a condition to add.</span>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {CONDITIONS.map((c) => {
            const meta = CONDITION_META[c as ConditionKey];
            const Icon = meta.icon;
            return (
              <button
                key={c}
                className="flex items-center gap-2 px-2 py-2 border rounded hover:bg-white/10 text-xs"
                onClick={() => {
                  const n = Number(rounds);
                  onPick(c as ConditionKey, Number.isFinite(n) && n > 0 ? n : undefined);
                }}
                title={c}
              >
                <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full border ${meta.bg} ${meta.border} ${meta.text}`}>
                  <Icon className="h-3 w-3" />
                </span>
                <span className="truncate">{c}</span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end mt-2">
          <button className="px-2 py-1 border rounded text-xs hover:bg-white/10" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ========= Page ========= */
export default function InitiativePage() {
  const [enc, setEnc] = useStorageState<EncounterState>({
    key: STORAGE_KEYS.ENCOUNTERS,
    driver: localDriver,
    initial: initialEncounter,
    version: 1,
  });

  const [quickNPCName, setQuickNPCName] = useState("");
  const [menu, setMenu] = useState<null | { id: string; x: number; y: number }>(null);

  // Derived sorted view
  const sorted = useMemo(() => {
    const list = enc.combatants || [];
    if (enc.orderLocked) return list;
    const rank = (c: Combatant) =>
      getKind(c) === "pc" ? 2 : getKind(c) === "npc" ? 1 : 0;
    return [...list].sort((a, b) => {
      const ai = a.init ?? Number.NEGATIVE_INFINITY;
      const bi = b.init ?? Number.NEGATIVE_INFINITY;
      if (bi !== ai) return bi - ai; // higher first
      const rk = rank(b) - rank(a);
      if (rk !== 0) return rk; // PCs before NPCs before Monsters
      return a.name.localeCompare(b.name);
    });
  }, [enc.combatants, enc.orderLocked]);

  /* ===== Turn / Round controls (tick when a creature becomes active) ===== */
  function firstEligible(list: Combatant[]) {
    return list.find((c) => c.init !== null) ?? list[0] ?? null;
  }

  const startTurn = useCallback(() => {
    if (sorted.length === 0) return;
    const first = firstEligible(sorted);
    if (!first) return;
    setEnc((e) => {
      const withTick = tickConditionsForId(e.combatants, first.id);
      return { ...e, combatants: withTick, activeId: first.id, updatedAt: Date.now() };
    });
  }, [sorted, setEnc]);

  const nextTurn = useCallback(() => {
    if (sorted.length === 0) return;
    // If nothing selected yet, start
    if (!enc.activeId) return startTurn();

    const idx = Math.max(0, sorted.findIndex((c) => c.id === enc.activeId));
    const nextIndex = (idx + 1) % sorted.length;
    const wrapped = nextIndex === 0;
    const nextC = sorted[nextIndex];

    setEnc((e) => {
      const withTick = nextC ? tickConditionsForId(e.combatants, nextC.id) : e.combatants;
      return {
        ...e,
        combatants: withTick,
        activeId: nextC?.id ?? null,
        round: wrapped ? (e.round ?? 1) + 1 : e.round,
        updatedAt: Date.now(),
      };
    });
  }, [enc.activeId, sorted, setEnc, startTurn]);

  const prevTurn = useCallback(() => {
    if (sorted.length === 0) return;
    // If nothing selected yet, start
    if (!enc.activeId) return startTurn();

    const idx = Math.max(0, sorted.findIndex((c) => c.id === enc.activeId));
    const prevIndex = (idx - 1 + sorted.length) % sorted.length;
    const wrappedBack = prevIndex === sorted.length - 1;
    const prevC = sorted[prevIndex];

    setEnc((e) => {
      const withTick = prevC ? tickConditionsForId(e.combatants, prevC.id) : e.combatants;
      return {
        ...e,
        combatants: withTick,
        activeId: prevC?.id ?? null,
        round: Math.max(1, wrappedBack ? (e.round ?? 1) - 1 : (e.round ?? 1)),
        updatedAt: Date.now(),
      };
    });
  }, [enc.activeId, sorted, setEnc, startTurn]);

  function setActive(id: string) {
    setEnc((e) => {
      const withTick = tickConditionsForId(e.combatants, id);
      return { ...e, combatants: withTick, activeId: id, updatedAt: Date.now() };
    });
  }

  /* ===== Basic mutations ===== */
  const update = (id: string, patch: Partial<Combatant>) => {
    setEnc((e) => ({
      ...e,
      combatants: e.combatants.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      updatedAt: Date.now(),
    }));
  };

  const remove = (id: string) => {
    setEnc((e) => ({
      ...e,
      combatants: e.combatants.filter((x) => x.id !== id),
      activeId: e.activeId === id ? null : e.activeId,
      updatedAt: Date.now(),
    }));
  };

  const clearInits = () => {
    setEnc((e) => ({
      ...e,
      combatants: e.combatants.map((x) => ({ ...x, init: null })),
      activeId: null,
      updatedAt: Date.now(),
    }));
  };

  const toggleLock = () => {
    setEnc((e) => ({
      ...e,
      orderLocked: !e.orderLocked,
      updatedAt: Date.now(),
    }));
  };

  /* ===== Adders ===== */
  const [quickNPCName, setQuickNPCNameLocal] = useState(quickNPCName);
  function setQuickNPCName(v: string) { setQuickNPCNameLocal(v); }

  const addNPC = useCallback(
    (name: string) => {
      const nm = (name || "").trim() || "NPC";
      setEnc((e) => ({
        ...e,
        combatants: [
          ...e.combatants,
          {
            id: newId(),
            name: nm,
            init: null,
            hp: null,
            ac: null,
            isPC: false,
            kind: "npc",
            tags: [],
            conditions: [],
          },
        ],
        updatedAt: Date.now(),
      }));
      setQuickNPCName("");
    },
    [setEnc]
  );

  // Load PCs – MERGE instead of duplicate
  const loadAllPCs = useCallback(() => {
    const pcs = (typeof window !== "undefined" ? (pcsStore.get() as PC[]) : []) || [];
    if (pcs.length === 0) return;

    setEnc((e) => {
      const byPcId = new Map<string, Combatant>();
      for (const c of e.combatants) if (c.pcId) byPcId.set(c.pcId, c);

      const updates = new Map<string, Partial<Combatant>>();
      const additions: Combatant[] = [];

      for (const pc of pcs) {
        const existing = byPcId.get(pc.id);
        const hp = parseHPFromPC(pc);
        const ac = typeof (pc as any).ac === "number" ? (pc as any).ac : null;

        if (existing) {
          updates.set(existing.id, {
            name: pc.name || existing.name,
            hp,
            ac,
            kind: "pc",
            isPC: true,
          });
        } else {
          additions.push(pcToCombatant(pc));
        }
      }

      const merged = e.combatants.map((c) =>
        updates.has(c.id) ? { ...c, ...updates.get(c.id)! } : c
      );

      return {
        ...e,
        combatants: merged.concat(additions),
        updatedAt: Date.now(),
      };
    });
  }, [setEnc]);

  /* ===== Condition mutations ===== */
  function addCondition(id: string, key: ConditionKey, rounds?: number) {
    setEnc((e) => ({
      ...e,
      combatants: e.combatants.map((x) =>
        x.id === id ? { ...x, conditions: upsertCondition(x.conditions, key, rounds) } : x
      ),
      updatedAt: Date.now(),
    }));
  }
  function removeCondition(id: string, key: ConditionKey) {
    setEnc((e) => ({
      ...e,
      combatants: e.combatants.map((x) =>
        x.id === id ? { ...x, conditions: removeConditionByKey(x.conditions, key) } : x
      ),
      updatedAt: Date.now(),
    }));
  }

  /* ===== Render ===== */
  return (
    <div className="p-0 space-y-6">
      {/* Header */}
      <header className="rounded-lg border p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Encounter Tracker</h1>
          <div className="text-xs opacity-70">
            PCs load in with blank initiative so you can enter rolls quickly.
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Turn controls */}
          <button
            className="px-3 py-2 border rounded text-sm hover:bg-white/10"
            onClick={startTurn}
            title="Start on the first combatant (also ticks their timed effects)"
          >
            <Play className="inline-block h-4 w-4 mr-1" />
            Start
          </button>
          <button
            className="px-3 py-2 border rounded text-sm hover:bg-white/10"
            onClick={prevTurn}
            title="Previous turn (ticks new active)"
          >
            <ChevronLeft className="inline-block h-4 w-4" />
          </button>
          <button
            className="px-3 py-2 border rounded text-sm hover:bg-white/10"
            onClick={nextTurn}
            title="Next turn (ticks new active)"
          >
            <ChevronRight className="inline-block h-4 w-4" />
          </button>

          {/* Round display */}
          <div className="ml-2 text-sm px-3 py-2 rounded border">
            Round <span className="font-semibold">{enc.round}</span>
          </div>

          {/* Lock & Clear */}
          <button
            className="px-3 py-2 border rounded text-sm hover:bg-white/10"
            onClick={toggleLock}
            title={enc.orderLocked ? "Unlock sorting" : "Lock current order"}
          >
            {enc.orderLocked ? (
              <>
                <Unlock className="inline-block h-4 w-4 mr-1" /> Unlock
              </>
            ) : (
              <>
                <Lock className="inline-block h-4 w-4 mr-1" /> Lock
              </>
            )}
          </button>
          <button
            className="px-3 py-2 border rounded text-sm hover:bg-white/10"
            onClick={clearInits}
            title="Clear all initiatives"
          >
            Clear Inits
          </button>
        </div>
      </header>

      {/* Quick adds */}
      <section className="rounded-lg border p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Quick NPC name…"
            className="w-56"
            value={quickNPCName}
            onChange={(e) => setQuickNPCName(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => addNPC(quickNPCName)}>+ Add NPC</Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button onClick={loadAllPCs} title="Load or sync PCs (no duplicates)">
            Load PCs
          </Button>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-lg border overflow-x-auto">
        <table className="w-full text-left table-auto">
          <thead className="bg-black/10 sticky top-0">
            <tr>
              <th className="px-3 py-2 w-10">Turn</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 w-24">Init</th>
              <th className="px-3 py-2 w-28">HP</th>
              <th className="px-3 py-2 w-24">AC</th>
              <th className="px-3 py-2 w-[260px]">Effects</th>
              <th className="px-3 py-2 w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const k = getKind(c);
              const KindIcon = k === "pc" ? User : k === "monster" ? Skull : Users;
              const color =
                k === "pc"
                  ? "bg-green-500/10 border-green-500/30 text-green-300"
                  : k === "monster"
                  ? "bg-red-500/10 border-red-500/30 text-red-300"
                  : "bg-blue-500/10 border-blue-500/30 text-blue-300";
              const active = enc.activeId === c.id;

              return (
                <tr
                  key={c.id}
                  className={
                    "border-t " +
                    (active ? "bg-amber-500/10 outline outline-1 outline-amber-400/30" : "")
                  }
                >
                  {/* Turn marker */}
                  <td className="px-3 py-2">
                    <button
                      className={
                        "h-6 w-6 grid place-items-center rounded-full border " +
                        (active ? "bg-amber-500/20 border-amber-400/40" : "hover:bg-white/10")
                      }
                      onClick={() => setActive(c.id)}
                      title={active ? "Active turn (ticks)" : "Make active (ticks)"}
                      aria-label={active ? "Active turn" : "Make active"}
                    >
                      {active ? "▶" : "•"}
                    </button>
                  </td>

                  {/* Name with kind icon */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-6 w-6 grid place-items-center rounded-full border ${color}`}
                        title={k === "pc" ? "PC" : k === "monster" ? "Monster" : "NPC"}
                        aria-label={k === "pc" ? "PC" : k === "monster" ? "Monster" : "NPC"}
                      >
                        <KindIcon className="h-3.5 w-3.5" />
                      </span>
                      <input
                        className="px-2 py-1 border rounded w-full bg-transparent"
                        value={c.name}
                        onChange={(e) => update(c.id, { name: e.target.value })}
                      />
                    </div>
                  </td>

                  {/* Init */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="px-2 py-1 border rounded w-20 bg-transparent"
                      value={c.init ?? ""}
                      onChange={(e) =>
                        update(c.id, {
                          init: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </td>

                  {/* HP */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="px-2 py-1 border rounded w-24 bg-transparent"
                      value={c.hp ?? ""}
                      onChange={(e) =>
                        update(c.id, {
                          hp: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      placeholder="—"
                    />
                  </td>

                  {/* AC */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="px-2 py-1 border rounded w-20 bg-transparent"
                      value={c.ac ?? ""}
                      onChange={(e) =>
                        update(c.id, { ac: e.target.value === "" ? null : Number(e.target.value) })
                      }
                      placeholder="—"
                    />
                  </td>

                  {/* Effects: icon chips + compact '+' that opens floating card at cursor */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {/* Active effects as small chips (icon only; tooltip text; click to remove) */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {(c.conditions || []).map((entry, i) => {
                          const key = condKeyOf(entry);
                          const meta = CONDITION_META[key];
                          const Icon = meta.icon;
                          const tip = CONDITION_TIPS[key];
                          const rounds = isTimed(entry) ? entry.rounds : undefined;
                          return (
                            <button
                              key={`${key}-${i}`}
                              className={`px-1.5 py-1 border rounded text-xs ${meta.bg} ${meta.border} ${meta.text}`}
                              title={
                                rounds
                                  ? `${key} — ${tip} (${rounds} rnd${rounds === 1 ? "" : "s"} remaining) • click to remove`
                                  : `${key} — ${tip} • click to remove`
                              }
                              onClick={() => removeCondition(c.id, key)}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              <span className="sr-only">{key}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* '+' opens a PORTAL menu near cursor; no table reflow */}
                      <button
                        className="px-2 py-1 border rounded text-xs hover:bg-white/10"
                        onClick={(e) =>
                          setMenu({
                            id: c.id,
                            x: (e as React.MouseEvent).clientX,
                            y: (e as React.MouseEvent).clientY,
                          })
                        }
                        title="Add effect"
                      >
                        +
                      </button>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2">
                    <button
                      className="px-2 py-1 border rounded text-xs hover:bg-white/10"
                      onClick={() => remove(c.id)}
                      title="Remove"
                    >
                      <Trash2 className="inline-block h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td className="px-3 py-6 opacity-70" colSpan={7}>
                  No combatants yet. Use <b>Load PCs</b> or add an NPC/Monster.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Optional tiny legend */}
      <div className="text-xs opacity-70 flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <span className="h-4 w-4 grid place-items-center rounded-full border bg-green-500/10 border-green-500/30 text-green-300">●</span>
          PC
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-4 w-4 grid place-items-center rounded-full border bg-blue-500/10 border-blue-500/30 text-blue-300">●</span>
          NPC
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-4 w-4 grid place-items-center rounded-full border bg-red-500/10 border-red-500/30 text-red-300">●</span>
          Monster
        </span>
      </div>

      {/* Floating Effects Menu (portal) */}
      {menu && (
        <EffectsMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onPick={(key, rounds) => {
            if (!menu?.id) return;
            addCondition(menu.id, key, rounds);
          }}
        />
      )}
    </div>
  );
}
