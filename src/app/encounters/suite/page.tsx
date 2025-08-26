"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";
import type { PC } from "@/lib/characters";
import {
  User,
  Users,
  Skull,
  Lock,
  Unlock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
  Dice1,
} from "lucide-react";
import { createPortal } from "react-dom";
import type { CharactersState } from "@/types/characters";
import DetailsDrawer from "@/components/DetailsDrawer";
import ConfirmPopover from "@/components/ui/ConfirmPopover";

import { rollDice, rollD20 } from "@/lib/dice";

/* Conditions (match Resources) */
import {
  CONDITIONS,
  CONDITION_TIPS,
  CONDITION_META,
  type ConditionKey,
} from "@/lib/conditions";

/* NPC race presets */
import { NPC_RACES, NPC_RACE_OPTIONS, type RaceKey } from "@/lib/npcs/races";

/* Monsters data/types */
import { MONSTERS } from "@/lib/generators/monsters.data";
import type { Monster } from "@/types/monsters";

import HomeButton from "@/components/HomeButton";


/* ===== Types ===== */
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
  npcPresetId?: string;
  npcRaceKey?: RaceKey; // NEW: on-the-fly NPCs can store a race key
  tags?: string[];
  conditions?: CondEntry[];
  kind?: "pc" | "npc" | "monster";
  monKey?: string;
};

type EncounterState = {
  combatants: Combatant[];
  round: number;
  orderLocked: boolean;
  updatedAt: number;
  activeId?: string | null;
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

/* ===== Helpers ===== */
function getKind(c: Combatant): "pc" | "npc" | "monster" {
  if (c.kind) return c.kind;
  if (c.isPC || c.pcId) return "pc";
  if (c.monKey || (c.tags || []).some((t) => /^CR\s+/i.test(t))) return "monster";
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
function upsertCondition(list: CondEntry[] | undefined, key: ConditionKey, rounds?: number): CondEntry[] {
  const arr = [...(list || [])];
  const idx = arr.findIndex((e) => condKeyOf(e) === key);
  if (rounds && rounds > 0) {
    const entry: TimedCondition = { key, rounds };
    if (idx >= 0) arr[idx] = entry; else arr.push(entry);
  } else {
    if (idx >= 0) arr[idx] = key; else arr.push(key);
  }
  return arr;
}
function removeConditionByKey(list: CondEntry[] | undefined, key: ConditionKey): CondEntry[] {
  return (list || []).filter((e) => condKeyOf(e) !== key);
}
function tickConditionsForId(list: Combatant[], id: string): Combatant[] {
  return list.map((c) => {
    if (c.id !== id) return c;
    const next: CondEntry[] = [];
    for (const e of c.conditions || []) {
      if (isTimed(e)) {
        const r = e.rounds - 1;
        if (r > 0) next.push({ key: e.key, rounds: r });
      } else next.push(e);
    }
    return { ...c, conditions: next };
  });
}

/* ===== Floating Effects Menu (per-row) ===== */
function EffectsMenu({
  x, y, onClose, onPick,
}: {
  x: number; y: number;
  onClose: () => void;
  onPick: (key: ConditionKey, rounds?: number) => void;
}) {
  const width = 380, height = 280, pad = 12;
  const vw = typeof window !== "undefined" ? window.innerWidth : width;
  const vh = typeof window !== "undefined" ? window.innerHeight : height;
  const left = Math.max(pad, Math.min(x, vw - width - pad));
  const top = Math.max(pad, Math.min(y, vh - height - pad));
  const [rounds, setRounds] = useState<string>("");

  return createPortal(
    <div className="fixed inset-0 z-[9999]" onClick={onClose}>
      <div
        className="fixed rounded-xl border bg-neutral-950 shadow-2xl p-2"
        style={{ left, top, width, maxHeight: height }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs opacity-80 whitespace-nowrap">Rounds (optional)</label>
          <input
            type="number" min={1} placeholder="e.g. 10"
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
                className="flex items-center gap-2 px-2 py-2 border rounded hover:bg-white/10 text-xs cursor-pointer"
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
          <button
            className="px-2 py-1 border rounded text-xs hover:bg-white/10 cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

/* ===== Monster helpers ===== */
function monsterMatches(m: Monster, q: string) {
  const s = q.toLowerCase();
  return (
    m.name.toLowerCase().includes(s) ||
    (m.type || "").toLowerCase().includes(s) ||
    (m.size || "").toLowerCase().includes(s)
  );
}

function hpAverageOrDice(mon: Monster): string {
  const avg = (mon as any).hp_average as number | undefined;
  if (typeof avg === "number" && Number.isFinite(avg)) return `${avg} (${mon.hit_dice})`;
  return mon.hit_points ? `${mon.hit_points} (${mon.hit_dice ?? ""})` : mon.hit_dice ?? "";
}

function rollMonsterHP(mon: Monster): number | null {
  if (mon.hit_dice) {
    const r = rollDice(mon.hit_dice);
    return r.total;
  }
  return mon.hit_points ?? null;
}

/* ===== Main Page ===== */
export default function EncounterSuitePage() {
  const [enc, setEnc] = useStorageState<EncounterState>({
    key: STORAGE_KEYS.ENCOUNTERS,
    driver: localDriver,
    initial: initialEncounter,
    version: 1,
  });

  const [chars] = useStorageState<CharactersState>({
    key: STORAGE_KEYS.CHARACTERS,
    driver: localDriver,
    initial: { pcs: [], npcs: [], updatedAt: 0 },
    version: 1,
  });

  const [quickNPCName, setQuickNPCName] = useState("");
  const [quickNPCRace, setQuickNPCRace] = useState<RaceKey | "">(""); // NEW
  const [menu, setMenu] = useState<null | { id: string; x: number; y: number }>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  // Monster search state
  const [mq, setMq] = useState("");
  const [count, setCount] = useState(1);
  const [rollHP, setRollHP] = useState(true);

  // Undo snapshot for "Clear Inits"
  const undoTimer = useRef<NodeJS.Timeout | null>(null);
  const lastInitSnapshot = useRef<{ combatants: Combatant[]; activeId: string | null } | null>(null);
  const [showUndo, setShowUndo] = useState(false);

  /* ===== Derived ===== */
  const pcs = useMemo(() => ((chars?.pcs as PC[]) || []), [chars]);

  const sorted = useMemo(() => {
    const list = enc.combatants || [];
    if (enc.orderLocked) return list;
    const rank = (c: Combatant) => (getKind(c) === "pc" ? 2 : getKind(c) === "npc" ? 1 : 0);
    return [...list].sort((a, b) => {
      const ai = a.init ?? Number.NEGATIVE_INFINITY;
      const bi = b.init ?? Number.NEGATIVE_INFINITY;
      if (bi !== ai) return bi - ai;
      const rk = rank(b) - rank(a);
      if (rk !== 0) return rk;
      return a.name.localeCompare(b.name);
    });
  }, [enc.combatants, enc.orderLocked]);

  const active = sorted.find((c) => c.id === enc.activeId) || null;

  const monsterResults = useMemo(() => {
    const s = mq.trim().toLowerCase();
    if (!s) return MONSTERS.slice(0, 24);
    return MONSTERS.filter((m) => monsterMatches(m, s)).slice(0, 30);
  }, [mq]);

  /* ===== Keyboard shortcuts (N/P/S) ===== */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        nextTurn();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        prevTurn();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        if (!enc.activeId) startTurn(); else nextTurn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enc.activeId]);

  /* ===== Turn / Round controls ===== */
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
    if (drawerId === id) setDrawerId(null);
  };

  /* ===== Clear Inits with confirm + micro-undo ===== */
  const doClearInits = () => {
    lastInitSnapshot.current = {
      combatants: enc.combatants.map((c) => ({ ...c })),
      activeId: enc.activeId ?? null,
    };
    setEnc((e) => ({
      ...e,
      combatants: e.combatants.map((x) => ({ ...x, init: null })),
      activeId: null,
      updatedAt: Date.now(),
    }));
    setShowUndo(true);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setShowUndo(false), 5000);
  };
  const undoClearInits = () => {
    if (!lastInitSnapshot.current) return;
    const snap = lastInitSnapshot.current;
    setEnc((e) => ({
      ...e,
      combatants: snap.combatants,
      activeId: snap.activeId,
      updatedAt: Date.now(),
    }));
    setShowUndo(false);
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
  };

  const toggleLock = () => {
    setEnc((e) => ({ ...e, orderLocked: !e.orderLocked, updatedAt: Date.now() }));
  };

  /* ===== Clear Encounter ===== */
  const clearEncounter = () => {
    setEnc({
      combatants: [],
      round: 1,
      orderLocked: false,
      activeId: null,
      updatedAt: Date.now(),
    });
    setShowUndo(false);
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
  };

  /* ===== Adders ===== */
  const addNPC = useCallback(
    (name: string, raceKey?: RaceKey) => {
      const nm = (name || "").trim() || "NPC";
      const race = raceKey ? NPC_RACES[raceKey] : null;
      const rolledHp = race ? rollDice(race.hp_dice).total : null;

      setEnc((e) => ({
        ...e,
        combatants: [
          ...e.combatants,
          {
            id: newId(),
            name: nm,
            init: null,
            hp: rolledHp,
            ac: race ? race.base_ac : null,
            isPC: false,
            kind: "npc",
            tags: [race?.name || ""].filter(Boolean),
            conditions: [],
            npcRaceKey: race ? race.key : undefined,
          },
        ],
        updatedAt: Date.now(),
      }));
      setQuickNPCName("");
    },
    [setEnc]
  );

  const loadAllPCs = useCallback(() => {
    const all = ((chars?.pcs as PC[]) || []);
    setEnc((e) => {
      const keepIds = new Set(all.map((pc) => pc.id));
      const byPcId = new Map<string, Combatant>();
      for (const c of e.combatants) if (c.pcId) byPcId.set(c.pcId, c);

      const updates = new Map<string, Partial<Combatant>>();
      const additions: Combatant[] = [];

      for (const pc of all) {
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

      const pruned = e.combatants.filter((c) => !c.pcId || keepIds.has(c.pcId));
      const merged = pruned.map((c) => (updates.has(c.id) ? { ...c, ...updates.get(c.id)! } : c));

      return {
        ...e,
        combatants: merged.concat(additions),
        updatedAt: Date.now(),
      };
    });
  }, [chars, setEnc]);

  function addConditionTo(id: string, key: ConditionKey, rounds?: number) {
    setEnc((e) => ({
      ...e,
      combatants: e.combatants.map((x) => x.id === id ? { ...x, conditions: upsertCondition(x.conditions, key, rounds) } : x),
      updatedAt: Date.now(),
    }));
  }
  function removeConditionFrom(id: string, key: ConditionKey) {
    setEnc((e) => ({
      ...e,
      combatants: e.combatants.map((x) => x.id === id ? { ...x, conditions: removeConditionByKey(x.conditions, key) } : x),
      updatedAt: Date.now(),
    }));
  }

  function addMonsters(mon: Monster, n: number, rollHp: boolean) {
    const count = Math.max(1, Math.min(20, n | 0));
    const suffix = (i: number) => String.fromCharCode(65 + i); // A, B, C…
    setEnc((e) => {
      const added: Combatant[] = [];
      for (let i = 0; i < count; i++) {
        const rolled = rollHp ? rollMonsterHP(mon) : (mon.hit_points ?? null);
        added.push({
          id: newId(),
          name: count === 1 ? mon.name : `${mon.name} ${suffix(i)}`,
          init: null,
          hp: rolled,
          ac: typeof mon.armor_class === "number" ? mon.armor_class : (Array.isArray(mon.armor_class) ? (mon.armor_class[0]?.value ?? null) : null),
          isPC: false,
          kind: "monster",
          tags: [`CR ${mon.challenge_rating ?? "?"}`, mon.type || ""].filter(Boolean),
          conditions: [],
          monKey: mon.slug || mon.name,
        });
      }
      return { ...e, combatants: [...e.combatants, ...added], updatedAt: Date.now() };
    });
  }

  /* ===== Render ===== */
  return (
    <div className="space-y-4">
      {/* Top bar */}
      <header className="rounded-lg border p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Encounter Suite</h1>
          <p className="text-xs opacity-70">Run the whole fight from one page: tracker, monsters, and details.</p>
        </div>

        {/* Right side controls (cohesive) */}
        <div className="flex items-center gap-3">
          {/* Status: ring + active name */}
          <div className="flex items-center gap-2">
  <HomeButton />
  {/* (keep the rest of your buttons: Start, Prev, Next, Round, Lock, Clear Inits, etc.) */}

            
            <button
              className={
                "h-5 w-5 rounded-full border cursor-pointer transition-colors " +
                (!enc.activeId
                  ? "border-neutral-600 hover:border-neutral-400"
                  : "bg-amber-400 border-amber-400")
              }
              title={!enc.activeId ? "Start encounter (S)" : "Next turn (S or N)"}
              aria-label={!enc.activeId ? "Start encounter" : "Next turn"}
              onClick={() => (!enc.activeId ? startTurn() : nextTurn())}
            />
            <div className="text-sm px-3 py-1 rounded border flex items-center gap-1">
              {enc.activeId && active ? (
                <>
                  <span className="opacity-90">Active:</span>
                  <span
                    className="font-semibold leading-none truncate max-w-[18ch]"
                    title={active.name}
                  >
                    {active.name}
                  </span>
                </>
              ) : (
                <>Idle</>
              )}
            </div>
          </div>

          {/* Round controls box */}
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg border">
            <button
              className="h-7 w-7 grid place-items-center rounded border hover:bg-white/10"
              onClick={prevTurn}
              title="Previous (P)"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm px-2 py-1 rounded border flex items-center gap-1">
              <span>Round</span>
              <span className="font-semibold leading-none">{enc.round}</span>
            </div>
            <button
              className="h-7 w-7 grid place-items-center rounded border hover:bg-white/10"
              onClick={nextTurn}
              title="Next (N)"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Order lock */}
          <button className="px-3 py-2 border rounded text-sm hover:bg-white/10 cursor-pointer" onClick={toggleLock} title={enc.orderLocked ? "Unlock sorting" : "Lock current order"}>
            {enc.orderLocked ? (<><Unlock className="inline-block h-4 w-4 mr-1" /> Unlock</>) : (<><Lock className="inline-block h-4 w-4 mr-1" /> Lock</>)}
          </button>

          {/* Clear Inits (with undo) */}
          <ConfirmPopover
            onConfirm={doClearInits}
            message="Clear all initiatives and reset the active turn?"
            confirmLabel="Clear"
            cancelLabel="Cancel"
            align="right"
          >
            <button className="px-3 py-2 border rounded text-sm hover:bg-white/10 cursor-pointer" title="Clear all initiatives">
              Clear Inits
            </button>
          </ConfirmPopover>

          {showUndo && (
            <button
              className="px-3 py-2 border rounded text-sm bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
              onClick={undoClearInits}
              title="Undo clear (5s)"
            >
              Undo
            </button>
          )}

          {/* Clear Encounter */}
          <ConfirmPopover
            onConfirm={clearEncounter}
            message="Clear the entire encounter? This removes all combatants, resets the round to 1, clears the active turn, and unlocks ordering."
            confirmLabel="Clear Encounter"
            cancelLabel="Cancel"
            align="right"
          >
            <button className="px-3 py-2 border rounded text-sm bg-red-500/10 border-red-500/40 text-red-300 hover:bg-red-500/20 cursor-pointer" title="Clear entire encounter">
              Clear Encounter
            </button>
          </ConfirmPopover>
        </div>
      </header>

      {/* Party at a glance */}
      <section className="rounded-lg border p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
  <div className="flex items-center gap-3 flex-wrap">
    {/* Load PCs (standalone) */}
    <div>
      <Button onClick={loadAllPCs} title="Load or sync PCs (no duplicates)">Load PCs</Button>
    </div>

    {/* Divider (wide screens only) */}
    <div className="hidden sm:block h-6 w-px bg-white/10" />

    {/* Quick NPC group (bordered so it reads as a separate tool) */}
    <div className="flex items-center gap-2 rounded-lg border px-2 py-1">
      <span className="text-xs opacity-70">Quick NPC</span>
      <Input
        placeholder="Name…"
        className="w-44"
        value={quickNPCName}
        onChange={(e) => setQuickNPCName(e.target.value)}
      />
      <select
        className="px-2 py-1 border rounded bg-transparent text-sm"
        value={quickNPCRace}
        onChange={(e) => setQuickNPCRace((e.target.value || "") as any)}
        title="Race (optional)"
      >
        <option value="">— Race —</option>
        {NPC_RACE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <Button onClick={() => addNPC(quickNPCName, quickNPCRace || undefined)}>+ Add NPC</Button>
    </div>
  </div>

  <div className="text-xs opacity-70">PCs: <b>{pcs.length}</b></div>
</div>

        <div className="mt-3 flex gap-2 overflow-x-auto">
          {pcs.map((pc) => (
            <div key={pc.id} className="min-w-[180px] rounded border bg-white/5 p-2">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 grid place-items-center rounded-full border bg-green-500/10 border-green-500/30 text-green-300">
                  <User className="h-3.5 w-3.5" />
                </span>
                <div className="font-medium text-sm">{pc.name}</div>
              </div>
              <div className="mt-1 text-xs opacity-80">
                AC {pc.ac ?? "—"} • HP{" "}
                {typeof pc.hp?.current === "number" && typeof pc.hp?.max === "number"
                  ? `${pc.hp.current}/${pc.hp.max}` : (typeof pc.hp?.current === "number" ? pc.hp.current : "—")}
              </div>
            </div>
          ))}
          {pcs.length === 0 && <div className="text-xs opacity-70">No PCs saved yet.</div>}
        </div>
      </section>

      {/* Main split: Tracker (left) + Info/Monster Panel (right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Tracker (spans 2) */}
        <section className="lg:col-span-2 rounded-lg border p-2">
          <table className="w-full text-left table-fixed">
            <thead className="bg-black/10 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 w-10">Turn</th>
                <th className="px-2 lg:px-3 py-2 w-[38%] min-w-[220px]">Name</th>
                <th className="px-2 lg:px-3 py-2 w-[12%]">Init</th>
                <th className="px-2 lg:px-3 py-2 w-[14%]">HP</th>
                <th className="px-2 lg:px-3 py-2 w-[12%]">AC</th>
                <th className="px-2 lg:px-3 py-2 w-[16%]">Effects</th>
                <th className="px-2 lg:px-3 py-2 w-[14%] text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const k = getKind(c);
                const KindIcon = k === "pc" ? User : k === "monster" ? Skull : Users;
                const badge =
                  k === "pc"
                    ? "bg-green-500/10 border-green-500/30 text-green-300"
                    : k === "monster"
                    ? "bg-red-500/10 border-red-500/30 text-red-300"
                    : "bg-blue-500/10 border-blue-500/30 text-blue-300";
                const isActive = enc.activeId === c.id;
                const nonEditableName = !!(c.isPC || c.pcId || (c as any).npcPresetId);

                return (
                  <tr
                    key={c.id}
                    className={
                      "border-t" +
                      (isActive ? " bg-amber-500/10 outline outline-1 outline-amber-400/30" : "")
                    }
                  >
                    {/* Turn dot */}
                    <td className="px-3 py-2">
                      <button
                        className={
                          "h-5 w-5 rounded-full border cursor-pointer transition-colors " +
                          (isActive
                            ? "bg-amber-400 border-amber-400"
                            : "border-neutral-600 hover:border-neutral-400")
                        }
                        onClick={() => setActive(c.id)}
                        title={isActive ? "Active turn (ticks)" : "Make active (ticks)"}
                        aria-label={isActive ? "Active turn" : "Make active"}
                        aria-pressed={isActive}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActive(c.id);
                          }
                        }}
                      />
                    </td>

                    {/* Name */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-6 w-6 grid place-items-center rounded-full border ${badge}`}
                          title={k.toUpperCase()}
                        >
                          <KindIcon className="h-3.5 w-3.5" />
                        </span>

                        {nonEditableName ? (
                          <div className="px-2 py-1 w-full truncate" title={c.name}>
                            {c.name}
                          </div>
                        ) : (
                          <input
                            className="px-2 py-1 border rounded bg-transparent w-full"
                            value={c.name}
                            onChange={(e) => update(c.id, { name: e.target.value })}
                            title={c.name}
                          />
                        )}
                      </div>
                    </td>

                    {/* Init */}
                    <td className="px-3 py-2">
                      <div className="flex items-center">
                        <input
                          type="number"
                          className="px-2 py-1 border rounded w-20 bg-transparent"
                          value={c.init ?? ""}
                          onChange={(e) =>
                            update(c.id, { init: e.target.value === "" ? null : Number(e.target.value) })
                          }
                        />
                        {c.isPC && (
                          <button
                            className="ml-2 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 border rounded hover:bg-white/10"
                            title="Roll initiative (Shift+Click to add a modifier)"
                            onClick={(e) => {
                              let mod = 0;
                              if ((e as React.MouseEvent).shiftKey) {
                                const ans = window.prompt("Dex modifier to add (e.g., 3 or -1):", "0");
                                if (ans !== null && ans.trim() !== "") mod = Number(ans) || 0;
                              }
                              const r = rollD20(mod);
                              setEnc((prev) => {
                                const next = {
                                  ...prev,
                                  combatants: prev.combatants.map((x) =>
                                    x.id === c.id ? { ...x, init: r.total } : x
                                  ),
                                };
                                next.updatedAt = Date.now();
                                return next;
                              });
                            }}
                          >
                            <Dice1 className="w-3 h-3" />
                            Init
                          </button>
                        )}
                      </div>
                    </td>

                    {/* HP */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="px-2 py-1 border rounded w-24 bg-transparent"
                        value={c.hp ?? ""}
                        onChange={(e) =>
                          update(c.id, { hp: e.target.value === "" ? null : Number(e.target.value) })
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

                    {/* Effects */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(c.conditions || []).map((entry, i) => {
                            const key = isTimed(entry) ? entry.key : (entry as ConditionKey);
                            const meta = CONDITION_META[key as keyof typeof CONDITION_META];
                            const tip = CONDITION_TIPS[key as keyof typeof CONDITION_TIPS] ?? "";
                            const rounds = isTimed(entry) ? entry.rounds : undefined;

                            const baseClasses = meta
                              ? `${meta.bg} ${meta.border} ${meta.text}`
                              : "bg-white/5 border-white/10 text-white/80";
                            const PillIcon = meta?.icon ?? Info;

                            return (
                              <button
                                key={`${key}-${i}`}
                                className={`px-1.5 py-1 border rounded text-xs ${baseClasses} hover:brightness-110 cursor-pointer`}
                                title={
                                  rounds
                                    ? `${key} — ${tip} (${rounds} rnd${rounds === 1 ? "" : "s"} left) • click to remove`
                                    : `${key} — ${tip} • click to remove`
                                }
                                onClick={() => removeConditionFrom(c.id, key)}
                              >
                                <PillIcon className="h-3.5 w-3.5" />
                                <span className="sr-only">{key}</span>
                              </button>
                            );
                          })}
                        </div>
                        <button
                          className="px-2 py-1 border rounded text-xs hover:bg-white/10 cursor-pointer"
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
                    <td className="px-2 lg:px-3 py-2 text-center">
                      <div className="inline-flex items-center gap-2 pr-1">
                        <button
                          className="px-2 py-1 border rounded text-xs hover:bg-white/10 cursor-pointer"
                          title="Show details"
                          onClick={() => setDrawerId(c.id)}
                        >
                          <Info className="inline-block h-4 w-4" />
                        </button>
                        <button
                          className="px-2 py-1 border rounded text-xs hover:bg-white/10 cursor-pointer"
                          onClick={() => remove(c.id)}
                          title="Remove"
                        >
                          <Trash2 className="inline-block h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {sorted.length === 0 && (
                <tr>
                  <td className="px-3 py-6 opacity-70" colSpan={7}>
                    No combatants yet. Use <b>Load PCs</b>, add an NPC, or add monsters from the right panel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Right panel: Monster search + Info panel */}
        <aside className="rounded-lg border p-3 space-y-4">
          <div className="space-y-2">
            <h2 className="font-semibold">Monster Manual</h2>
            <div className="flex items-center gap-2 max-w-[140px] md:max-w-[180px] lg:max-w-[200px]">
              <Input placeholder="Search monsters…" value={mq} onChange={(e) => setMq(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-2 border rounded px-2 py-1">
                <span>Add</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="w-16 bg-transparent"
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                />
                <span>copies</span>
              </label>
              <label className="flex items-center gap-2 border rounded px-2 py-1 cursor-pointer">
                <input type="checkbox" checked={rollHP} onChange={(e) => setRollHP(e.target.checked)} />
                <span>Roll HP</span>
              </label>
            </div>

            <div className="max-h-[320px] overflow-auto rounded border bg-white/5">
              {monsterResults.map((m) => (
                <div key={m.slug || m.name} className="flex items-center gap-2 px-2 py-2 border-b">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{m.name}</div>
                    <div className="text-xs opacity-70 truncate">
                      {m.size} {m.type} • AC {Array.isArray(m.armor_class) ? (m.armor_class[0]?.value ?? "—") : (m.armor_class ?? "—")} • HP {hpAverageOrDice(m)}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => addMonsters(m, count, rollHP)}>Add</Button>
                </div>
              ))}
              {monsterResults.length === 0 && (
                <div className="p-3 text-xs opacity-70">No results.</div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Floating Effects Menu (per row) */}
      {menu && (
        <EffectsMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onPick={(key, rounds) => {
            if (!menu?.id) return;
            addConditionTo(menu.id, key, rounds);
          }}
        />
      )}

      <DetailsDrawer open={!!drawerId} onClose={() => setDrawerId(null)} title="Details">
        {drawerId && <CombatantDetails id={drawerId} enc={enc} pcs={pcs} />}
      </DetailsDrawer>
    </div>
  );
}

/* ===== Details component ===== */
function labelVal(label: string, val?: React.ReactNode) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="opacity-70">{label}</span>
      <span className="font-medium">{val ?? "—"}</span>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return <div className="text-xs"><span className="opacity-70">{label}:</span> <span>{value ?? "—"}</span></div>;
}

function CombatantDetails({ id, enc, pcs }: { id: string; enc: EncounterState; pcs: PC[] }) {
  const c = enc.combatants.find((x) => x.id === id);
  if (!c) return <div className="text-xs opacity-70">Not found.</div>;

  const kind = getKind(c);

  if (kind === "pc") {
  const pc = pcs.find((p) => p.id === c.pcId) || null;
  const sheet: any = (pc as any)?.sheet || {};
  const acVal =
    typeof c.ac === "number"
      ? c.ac
      : typeof (pc as any)?.ac === "number"
      ? (pc as any).ac
      : undefined;

  const hpCur =
    typeof c.hp === "number"
      ? c.hp
      : typeof (pc as any)?.hp?.current === "number"
      ? (pc as any).hp.current
      : undefined;
  const hpMax =
    typeof (pc as any)?.hp?.max === "number" ? (pc as any).hp.max : undefined;

  const mod = (n?: number) =>
    typeof n === "number" && Number.isFinite(n) ? Math.floor((n - 10) / 2) : 0;
  const fmtMod = (m: number) => (m >= 0 ? `+${m}` : `${m}`);

  return (
    <div className="rounded border p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 grid place-items-center rounded-full border bg-green-500/10 border-green-500/30 text-green-300">
            <User className="h-3.5 w-3.5" />
          </span>
          <div className="font-medium">{c.name}</div>
        </div>
        <a
          href={pc ? `/characters/sheet/${pc.id}` : "#"}
          className="px-2 py-1 border rounded text-xs hover:bg-white/10 cursor-pointer"
          title="Open full sheet"
          onClick={(e) => {
            if (!pc) e.preventDefault();
          }}
        >
          Open Sheet
        </a>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-2">
        {labelVal("AC", acVal ?? "—")}
        {labelVal("HP", hpMax !== undefined ? `${hpCur ?? "—"}/${hpMax}` : hpCur ?? "—")}
        {labelVal("Speed", sheet.speed ?? "—")}
      </div>

      {/* Identity */}
      <div className="grid grid-cols-2 gap-2">
        {labelVal("Class", sheet.class ?? "—")}
        {labelVal("Level", sheet.level ?? "—")}
        {labelVal("Race", sheet.race ?? "—")}
        {labelVal("Background", sheet.background ?? "—")}
        {labelVal("Prof. Bonus", sheet.profBonus !== undefined ? `+${sheet.profBonus}` : "—")}
      </div>

      {/* Abilities */}
      <div>
        <div className="text-xs font-semibold mb-1">Abilities</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["STR", sheet.str],
            ["DEX", sheet.dex],
            ["CON", sheet.con],
            ["INT", sheet.int],
            ["WIS", sheet.wis],
            ["CHA", sheet.cha],
          ].map(([lbl, val]) => {
            const v = val as number | undefined;
            const m = mod(v);
            return (
              <div key={lbl as string} className="rounded border p-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="opacity-70">{lbl as string}</span>
                  <span className="font-medium">{v ?? "—"}</span>
                </div>
                <div className="text-xs opacity-70">Mod</div>
                <div className="text-sm font-semibold leading-none">{fmtMod(m)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <div className="text-xs font-semibold mb-1">Notes</div>
        <div className="text-xs opacity-80 whitespace-pre-wrap">
          {sheet.notes ?? (pc as any)?.notes ?? "—"}
        </div>
      </div>
    </div>
  );
}


  if (kind === "monster") {
    const mon =
      MONSTERS.find((m) => (m.slug || m.name) === c.monKey) ||
      MONSTERS.find((m) => m.name === c.name) ||
      null;

    if (!mon) {
      return (
        <div className="rounded border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 grid place-items-center rounded-full border bg-red-500/10 border-red-500/30 text-red-300">
              <Skull className="h-3.5 w-3.5" />
            </span>
            <div className="font-medium">{c.name}</div>
          </div>
          <div className="text-xs opacity-70">No stat block found.</div>
        </div>
      );
    }

    const acVal = Array.isArray(mon.armor_class) ? (mon.armor_class[0]?.value ?? "—") : (mon.armor_class ?? "—");
    const m = mon as any;

    return (
      <div className="rounded border p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 grid place-items-center rounded-full border bg-red-500/10 border-red-500/30 text-red-300">
            <Skull className="h-3.5 w-3.5" />
          </span>
          <div className="font-medium">{mon.name}</div>
        </div>
        {labelVal("Type", `${mon.size} ${mon.type}`)}
        {labelVal("CR", m.challenge_rating)}
        {labelVal("AC", acVal)}
        {labelVal("HP", hpAverageOrDice(mon))}
        <div className="grid grid-cols-3 gap-x-3 gap-y-1 mt-2">
          <StatRow label="Speed" value={typeof m.speed === "string" ? m.speed : (m.speed?.walk ?? "—")} />
          <StatRow label="STR" value={mon.strength} />
          <StatRow label="DEX" value={mon.dexterity} />
          <StatRow label="CON" value={mon.constitution} />
          <StatRow label="INT" value={mon.intelligence} />
          <StatRow label="WIS" value={mon.wisdom} />
          <StatRow label="CHA" value={mon.charisma} />
        </div>

        {m.saving_throws && <StatRow label="Saves" value={m.saving_throws} />}
        {m.skills && <StatRow label="Skills" value={m.skills} />}
        {m.senses && <StatRow label="Senses" value={m.senses} />}
        {m.languages && <StatRow label="Languages" value={m.languages} />}

        {Array.isArray(m.special_abilities) && m.special_abilities.length > 0 && (
          <div className="mt-2">
            <div className="text-xs font-semibold mb-1">Traits</div>
            <div className="space-y-1">
              {m.special_abilities.map((t: any, i: number) => (
                <div key={i} className="text-xs">
                  <span className="font-semibold">{t.name}.</span> {t.desc}
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(m.actions) && m.actions.length > 0 && (
          <div className="mt-2">
            <div className="text-xs font-semibold mb-1">Actions</div>
            <div className="space-y-1">
              {m.actions.map((a: any, i: number) => (
                <div key={i} className="text-xs">
                  <span className="font-semibold">{a.name}.</span> {a.desc}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // NPC (generic or race-backed)
  const race = c.npcRaceKey ? NPC_RACES[c.npcRaceKey] : null;

  return (
    <div className="rounded border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="h-6 w-6 grid place-items-center rounded-full border bg-blue-500/10 border-blue-500/30 text-blue-300">
          <Users className="h-3.5 w-3.5" />
        </span>
        <div className="font-medium">{c.name}</div>
      </div>

      {labelVal("Race", race?.name ?? "—")}
      {labelVal("AC", c.ac ?? (race?.base_ac ?? "—"))}
      {labelVal("HP", c.hp ?? (race ? `${race.hp_dice} (roll)` : "—"))}
      {labelVal("Speed", race?.speed ?? "—")}
      {race?.notes && <div className="text-xs opacity-80">{race.notes}</div>}

      {!race && <div className="text-xs opacity-70">Generic NPC line. (Pick a race next time to auto-fill stats.)</div>}
    </div>
  );
}
