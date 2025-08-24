"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";
import { pcsStore, type PC } from "@/lib/characters";
import { User, Users, Skull, Lock, Unlock, Trash2, ChevronLeft, ChevronRight, Play, Info } from "lucide-react";
import { createPortal } from "react-dom";
import type { CharactersState } from "@/types/characters";
import DetailsDrawer from "@/components/DetailsDrawer";


/* Conditions, icons, colors (exactly as Resources) */
import {
  CONDITIONS,
  CONDITION_TIPS,
  CONDITION_META,
  type ConditionKey,
} from "@/lib/conditions";

/* Monsters data/types */
import { MONSTERS } from "@/lib/generators/monsters.data";
import type { Monster } from "@/types/monsters";


/* ===== Types (reuse tracker model, plus monKey) ===== */
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
  monKey?: string; // if added from MONSTERS, keep key for statblock lookup
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

/** Get all PCs from the unified CHARACTERS blob (preferred), or fall back to pcsStore. */
function getAllPCs(): PC[] {
  // Preferred: unified blob written by Characters page
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEYS.CHARACTERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.pcs)) return parsed.pcs as PC[];
      }
    }
  } catch {}

  // Fallback: pcsStore (supports array or { pcs: [...] })
  try {
    const s = (typeof window !== "undefined" ? (pcsStore.get() as any) : null);
    if (Array.isArray(s)) return s as PC[];
    if (s && Array.isArray(s.pcs)) return s.pcs as PC[];
  } catch {}

  return [];
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

/* ===== Floating Effects Menu ===== */
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
  // Prefer explicit average if present; else show dice
  const avg = (mon as any).hp_average as number | undefined;
  if (typeof avg === "number" && Number.isFinite(avg)) return `${avg} (${mon.hit_dice})`;
  return mon.hit_points ? `${mon.hit_points} (${mon.hit_dice ?? ""})` : (mon.hit_dice ?? "");
}

function rollMonsterHP(mon: Monster): number | null {
  if (mon.hit_dice) {
    const rolled = rollDice(mon.hit_dice);
    return Number.isFinite(rolled) ? rolled : null;
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
  const [menu, setMenu] = useState<null | { id: string; x: number; y: number }>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Monster search state
  const [mq, setMq] = useState("");
  const [count, setCount] = useState(1);
  const [rollHP, setRollHP] = useState(true);

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
  const clearInits = () => {
    setEnc((e) => ({
      ...e,
      combatants: e.combatants.map((x) => ({ ...x, init: null })),
      activeId: null,
      updatedAt: Date.now(),
    }));
  };
  const toggleLock = () => {
    setEnc((e) => ({ ...e, orderLocked: !e.orderLocked, updatedAt: Date.now() }));
  };

  /* ===== Adders ===== */
  const addNPC = useCallback((name: string) => {
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
  }, [setEnc]);

  const loadAllPCs = useCallback(() => {
  const all = ((chars?.pcs as PC[]) || []);

  setEnc((e) => {
    // IDs of PCs that currently exist in Characters
    const keepIds = new Set(all.map((pc) => pc.id));

    // Map existing combatants by pcId
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

    // 1) Drop any combatant that was a PC but no longer exists in Characters
    const pruned = e.combatants.filter((c) => !c.pcId || keepIds.has(c.pcId));

    // 2) Apply updates to existing PCs
    const merged = pruned.map((c) =>
      updates.has(c.id) ? { ...c, ...updates.get(c.id)! } : c
    );

    // 3) Add new PCs that weren’t in the encounter yet
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
          monKey: mon.slug || mon.name, // slug preferred if present
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
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 border rounded text-sm hover:bg-white/10 cursor-pointer" onClick={startTurn} title="Start (ticks active)">
            <Play className="inline-block h-4 w-4 mr-1" /> Start
          </button>
          <button className="px-3 py-2 border rounded text-sm hover:bg-white/10 cursor-pointer" onClick={prevTurn} title="Previous (ticks new active)">
            <ChevronLeft className="inline-block h-4 w-4" />
          </button>
          <button className="px-3 py-2 border rounded text-sm hover:bg-white/10 cursor-pointer" onClick={nextTurn} title="Next (ticks new active)">
            <ChevronRight className="inline-block h-4 w-4" />
          </button>
          <div className="ml-2 text-sm px-3 py-2 rounded border">Round <b>{enc.round}</b></div>
          <button className="px-3 py-2 border rounded text-sm hover:bg-white/10 cursor-pointer" onClick={toggleLock} title={enc.orderLocked ? "Unlock sorting" : "Lock current order"}>
            {enc.orderLocked ? (<><Unlock className="inline-block h-4 w-4 mr-1" /> Unlock</>) : (<><Lock className="inline-block h-4 w-4 mr-1" /> Lock</>)}
          </button>
          <button className="px-3 py-2 border rounded text-sm hover:bg-white/10 cursor-pointer" onClick={clearInits} title="Clear all initiatives">
            Clear Inits
          </button>
        </div>
      </header>

      {/* Party at a glance */}
      <section className="rounded-lg border p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2 items-center">
            <Button onClick={loadAllPCs} title="Load or sync PCs (no duplicates)">Load PCs</Button>
            <div className="flex items-center gap-2">
              <Input placeholder="Quick NPC name…" className="w-56" value={quickNPCName} onChange={(e) => setQuickNPCName(e.target.value)} />
              <Button onClick={() => addNPC(quickNPCName)}>+ Add NPC</Button>
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
        <section className="lg:col-span-2 rounded-lg border overflow-x-auto">
          <table className="w-full text-left table-auto">
            <thead className="bg-black/10 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 w-10">Turn</th>
                <th className="px-2 lg:px-3 py-2 min-w-[160px] md:min-w-[200px] lg:min-w-[220px]">Name</th>
                <th className="px-2 lg:px-3 py-2 w-20 md:w-24">Init</th>
                <th className="px-2 lg:px-3 py-2 w-24">HP</th>
                <th className="px-2 lg:px-3 py-2 w-16 md:w-20">AC</th>
                <th className="px-2 lg:px-3 py-2 w-[140px] md:w-[180px] lg:w-[200px]">Effects</th>
                <th className="px-2 lg:px-3 py-2 w-[84px] md:w-[96px] text-center">Actions</th>
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

                return (
                  <tr
                    key={c.id}
                    className={"border-t" + (isActive ? " bg-amber-500/10 outline outline-1 outline-amber-400/30" : "")}
                  >
                    <td className="px-3 py-2">
                      <button
                        className={"h-6 w-6 grid place-items-center rounded-full border hover:bg-white/10 cursor-pointer " + (isActive ? "bg-amber-500/20 border-amber-400/40" : "")}
                        onClick={() => setActive(c.id)}
                        title={isActive ? "Active turn (ticks)" : "Make active (ticks)"}
                        aria-label={isActive ? "Active turn" : "Make active"}
                      >
                        {isActive ? "▶" : "•"}
                      </button>
                    </td>

                    <td className="px-3 py-2 min-w-[200px] lg:min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <span className={`h-6 w-6 grid place-items-center rounded-full border ${badge}`} title={k.toUpperCase()}>
                          <KindIcon className="h-3.5 w-3.5" />
                        </span>
                       <input
                        className="px-2 py-1 border rounded bg-transparent w-full max-w-[360px] lg:max-w-[420px]"
                        value={c.name}
                        onChange={(e) => update(c.id, { name: e.target.value })}
                        title={c.name}
/>

                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="px-2 py-1 border rounded w-20 bg-transparent"
                        value={c.init ?? ""}
                        onChange={(e) => update(c.id, { init: e.target.value === "" ? null : Number(e.target.value) })}
                      />
                    </td>

                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="px-2 py-1 border rounded w-24 bg-transparent"
                        value={c.hp ?? ""}
                        onChange={(e) => update(c.id, { hp: e.target.value === "" ? null : Number(e.target.value) })}
                        placeholder="—"
                      />
                    </td>

                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="px-2 py-1 border rounded w-20 bg-transparent"
                        value={c.ac ?? ""}
                        onChange={(e) => update(c.id, { ac: e.target.value === "" ? null : Number(e.target.value) })}
                        placeholder="—"
                      />
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(c.conditions || []).map((entry, i) => {
                            const key = isTimed(entry) ? entry.key : (entry as ConditionKey);
                            const meta = CONDITION_META[key];
                            const Icon = meta.icon;
                            const tip = CONDITION_TIPS[key];
                            const rounds = isTimed(entry) ? entry.rounds : undefined;
                            return (
                              <button
                                key={`${key}-${i}`}
                                className={`px-1.5 py-1 border rounded text-xs ${meta.bg} ${meta.border} ${meta.text} cursor-pointer`}
                                title={rounds ? `${key} — ${tip} (${rounds} rnd${rounds === 1 ? "" : "s"} left) • click to remove` : `${key} — ${tip} • click to remove`}
                                onClick={() => removeConditionFrom(c.id, key)}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                <span className="sr-only">{key}</span>
                              </button>
                            );
                          })}
                        </div>
                        <button
                          className="px-2 py-1 border rounded text-xs hover:bg-white/10 cursor-pointer"
                          onClick={(e) => setMenu({ id: c.id, x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY })}
                          title="Add effect"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    <td className="px-2 lg:px-3 py-2 text-center">
  <div className="inline-flex items-center gap-2">
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
                  <td className="px-3 py-6 opacity-70" colSpan={8}>
                    No combatants yet. Use <b>Load PCs</b>, add an NPC, or add monsters from the right panel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Right panel: Monster search + Info panel */}
        <aside className="rounded-lg border p-3 space-y-4">
          {/* Monster search/add */}
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
                <input
                  type="checkbox"
                  checked={rollHP}
                  onChange={(e) => setRollHP(e.target.checked)}
                />
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

      {/* Floating Effects Menu */}
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

            <DetailsDrawer
        open={!!drawerId}
        onClose={() => setDrawerId(null)}
        title="Details"
      >
        {drawerId && (
          <CombatantDetails id={drawerId} enc={enc} pcs={pcs} />
        )}
      </DetailsDrawer>

    </div>
  );
}

/* ===== Details component (right panel) ===== */
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
    return (
      <div className="rounded border p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 grid place-items-center rounded-full border bg-green-500/10 border-green-500/30 text-green-300">
            <User className="h-3.5 w-3.5" />
          </span>
          <div className="font-medium">{c.name}</div>
        </div>
        {labelVal("AC", c.ac ?? pc?.ac)}
        {labelVal("HP", c.hp ?? (typeof pc?.hp?.current === "number" && typeof pc?.hp?.max === "number" ? `${pc?.hp?.current}/${pc?.hp?.max}` : pc?.hp?.current))}
        <div className="text-xs opacity-80 whitespace-pre-wrap">{(pc as any)?.notes || "—"}</div>
      </div>
    );
  }

  if (kind === "monster") {
    // find by monKey or name fallback
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

    return (
      <div className="rounded border p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 grid place-items-center rounded-full border bg-red-500/10 border-red-500/30 text-red-300">
            <Skull className="h-3.5 w-3.5" />
          </span>
          <div className="font-medium">{mon.name}</div>
        </div>
        {labelVal("Type", `${mon.size} ${mon.type}`)}
        {labelVal("CR", mon.challenge_rating)}
        {labelVal("AC", acVal)}
        {labelVal("HP", hpAverageOrDice(mon))}
        <div className="grid grid-cols-3 gap-x-3 gap-y-1 mt-2">
          <StatRow label="Speed" value={typeof mon.speed === "string" ? mon.speed : (mon.speed?.walk ?? "—")} />
          <StatRow label="STR" value={mon.strength} />
          <StatRow label="DEX" value={mon.dexterity} />
          <StatRow label="CON" value={mon.constitution} />
          <StatRow label="INT" value={mon.intelligence} />
          <StatRow label="WIS" value={mon.wisdom} />
          <StatRow label="CHA" value={mon.charisma} />
        </div>

        {mon.saving_throws && <StatRow label="Saves" value={mon.saving_throws} />}
        {mon.skills && <StatRow label="Skills" value={mon.skills} />}
        {mon.senses && <StatRow label="Senses" value={mon.senses} />}
        {mon.languages && <StatRow label="Languages" value={mon.languages} />}

        {Array.isArray(mon.special_abilities) && mon.special_abilities.length > 0 && (
          <div className="mt-2">
            <div className="text-xs font-semibold mb-1">Traits</div>
            <div className="space-y-1">
              {mon.special_abilities.map((t, i) => (
                <div key={i} className="text-xs">
                  <span className="font-semibold">{t.name}.</span> {t.desc}
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(mon.actions) && mon.actions.length > 0 && (
          <div className="mt-2">
            <div className="text-xs font-semibold mb-1">Actions</div>
            <div className="space-y-1">
              {mon.actions.map((a, i) => (
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

  // NPC
  return (
    <div className="rounded border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="h-6 w-6 grid place-items-center rounded-full border bg-blue-500/10 border-blue-500/30 text-blue-300">
          <Users className="h-3.5 w-3.5" />
        </span>
        <div className="font-medium">{c.name}</div>
      </div>
      {labelVal("AC", c.ac)}
      {labelVal("HP", c.hp)}
      <div className="text-xs opacity-70">Generic NPC line. (You can flesh this out later.)</div>
    </div>
  );
}
