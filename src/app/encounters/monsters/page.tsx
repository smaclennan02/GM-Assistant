"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Search, Plus, Shield, Heart, Swords, X } from "lucide-react";
import { MONSTERS } from "@/lib/generators/monsters.data";
import type { Monster } from "@/types/monsters";
import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";

/* Encounter storage shape (compatible with Tracker) */
type Combatant = {
  id: string;
  name: string;
  init: number | null;
  hp: number | null;
  ac: number | null;
  isPC?: boolean;
  pcId?: string;
  tags?: string[];
  conditions?: string[];
  kind?: "pc" | "npc" | "monster";
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

/* ---------- helpers ---------- */
function crToNum(cr: string): number {
  if (cr.includes("/")) {
    const [a, b] = cr.split("/").map(Number);
    return a / b;
  }
  const n = Number(cr);
  return Number.isFinite(n) ? n : 0;
}
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function nextNumberStart(base: string, names: string[]) {
  const re = new RegExp(`^${escapeRegExp(base)}\\s#(\\d+)$`, "i");
  let maxNum = 0;
  let hasBase = false;
  for (const n of names) {
    if (n === base) hasBase = true;
    const m = n.match(re);
    if (m) maxNum = Math.max(maxNum, Number(m[1]));
  }
  // If a plain "base" exists, treat it like #1 already taken.
  return hasBase ? Math.max(1, maxNum) + 1 : maxNum + 1;
}
function rollFromFormula(formula: string): number | null {
  const m = formula.trim().match(/^(\d+)d(\d+)([+\-]\d+)?$/i);
  if (!m) return null;
  const count = Number(m[1]);
  const sides = Number(m[2]);
  const mod = m[3] ? Number(m[3]) : 0;
  if (!Number.isFinite(count) || !Number.isFinite(sides)) return null;
  let sum = 0;
  for (let i = 0; i < count; i++) sum += 1 + Math.floor(Math.random() * sides);
  return sum + mod;
}

/* Filters */
const TYPES = ["Any","Beast","Humanoid","Undead","Giant","Monstrosity","Dragon","Fiend","Celestial"] as const;
const SIZES = ["Any","Tiny","Small","Medium","Large","Huge","Gargantuan"] as const;

export default function MonstersPage() {
  // Persisted encounter (same key as Tracker)
  const [enc, setEnc] = useStorageState<EncounterState>({
    key: STORAGE_KEYS.ENCOUNTERS,
    driver: localDriver,
    initial: initialEncounter,
    version: 1,
  });

  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("Any");
  const [size, setSize] = useState<(typeof SIZES)[number]>("Any");
  const [crMin, setCrMin] = useState<string>("0");
  const [crMax, setCrMax] = useState<string>("10");
  const [sel, setSel] = useState<Monster | null>(null);

  // Per-card add options (count + roll HP)
  const [addOpts, setAddOpts] = useState<Record<string, { count: number; roll: boolean }>>({});
  const getOpts = useCallback(
    (name: string) => addOpts[name] ?? { count: 1, roll: false },
    [addOpts]
  );
  const setCount = (name: string, n: number) =>
    setAddOpts((o) => ({ ...o, [name]: { ...(o[name] ?? { count: 1, roll: false }), count: Math.max(1, Math.floor(n || 1)) } }));
  const setRoll = (name: string, roll: boolean) =>
    setAddOpts((o) => ({ ...o, [name]: { ...(o[name] ?? { count: 1, roll: false }), roll } }));

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const min = crToNum(crMin);
    const max = crToNum(crMax);
    return MONSTERS.filter((m) => {
      if (s && !(`${m.name} ${m.type}`.toLowerCase().includes(s))) return false;
      if (type !== "Any" && !m.type.toLowerCase().startsWith(type.toLowerCase())) return false;
      if (size !== "Any" && m.size !== size) return false;
      const crn = crToNum(m.cr);
      if (crn < min || crn > max) return false;
      return true;
    }).sort((a, b) => {
      const ca = crToNum(a.cr), cb = crToNum(b.cr);
      if (ca !== cb) return ca - cb;
      return a.name.localeCompare(b.name);
    });
  }, [q, type, size, crMin, crMax]);

  const addMonsterToEncounter = useCallback((mon: Monster, opts?: { count?: number; rollHP?: boolean }) => {
    const count = Math.max(1, Math.floor(opts?.count ?? 1));
    const rollHP = !!opts?.rollHP;

    const existingNames = (enc.combatants || []).map((c) => c.name);
    const start = count > 1 ? nextNumberStart(mon.name, existingNames) : nextNumberStart(mon.name, existingNames); // we will decide below whether to use base or numbered

    const makeOne = (index: number, numbered: boolean): Combatant => {
      const name =
        numbered ? `${mon.name} #${start + index}` : mon.name;

      const hp = rollHP && mon.hpFormula
        ? (rollFromFormula(mon.hpFormula) ?? (mon.hpAvg ?? null))
        : (mon.hpAvg ?? null);

      return {
        id: newId(),
        name,
        init: null, // DM enters initiative manually
        hp,
        ac: mon.ac ?? null,
        isPC: false,
        kind: "monster",
        tags: [mon.type, `CR ${mon.cr}`, mon.size],
        conditions: [],
      };
    };

    const numbered =
      count > 1 ||
      existingNames.includes(mon.name); // if base name already taken, use numbering even for single add

    const additions: Combatant[] = [];
    for (let i = 0; i < count; i++) {
      additions.push(makeOne(i, numbered));
    }

    setEnc((e) => ({
      ...e,
      combatants: [...(e.combatants || []), ...additions],
      updatedAt: Date.now(),
    }));
  }, [enc.combatants, setEnc]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-lg border p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Monster Lookup</h1>
          <p className="text-xs opacity-60">Browse SRD monsters and add them to your current encounter.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" />
            <input
              className="pl-8 pr-3 py-2 border rounded bg-transparent"
              placeholder="Search name or type…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Filters */}
      <section className="rounded-lg border p-4 grid gap-3 md:grid-cols-4">
        <label className="text-xs opacity-70">
          Type
          <select className="mt-1 w-full border rounded bg-neutral-950/80 py-2 px-2" value={type} onChange={(e)=>setType(e.target.value as any)}>
            {TYPES.map((t)=> <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-xs opacity-70">
          Size
          <select className="mt-1 w-full border rounded bg-neutral-950/80 py-2 px-2" value={size} onChange={(e)=>setSize(e.target.value as any)}>
            {SIZES.map((t)=> <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-xs opacity-70">
          CR Min
          <input className="mt-1 w-full border rounded bg-neutral-950/80 py-2 px-2" value={crMin} onChange={(e)=>setCrMin(e.target.value)} />
        </label>
        <label className="text-xs opacity-70">
          CR Max
          <input className="mt-1 w-full border rounded bg-neutral-950/80 py-2 px-2" value={crMax} onChange={(e)=>setCrMax(e.target.value)} />
        </label>
      </section>

      {/* Results */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((m) => {
          const opts = getOpts(m.name);
          return (
            <article key={m.name} className="rounded-lg border bg-neutral-950/80">
              <div className="p-3 flex items-center gap-3 border-b">
                <div className="flex-1">
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs opacity-70">{m.size} • {m.type} • CR {m.cr}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1">
                    <Shield className="h-3.5 w-3.5" /> AC {m.ac}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1">
                    <Heart className="h-3.5 w-3.5" /> HP {m.hpAvg}
                  </span>
                </div>
              </div>

              <div className="p-3 flex items-center gap-2 flex-wrap">
                <button
                  className="px-3 py-2 border rounded text-sm hover:bg-white/10"
                  onClick={() => addMonsterToEncounter(m, { count: opts.count, rollHP: opts.roll })}
                  title="Add to current encounter (appears in Tracker)"
                >
                  <Plus className="inline-block h-4 w-4 mr-1" />
                  Add to Tracker
                </button>

                {/* Per-card controls: Count + Roll HP */}
                <div className="ml-auto flex items-center gap-3">
                  <label className="text-xs opacity-80 flex items-center gap-2">
                    Count
                    <input
                      type="number"
                      min={1}
                      className="w-16 px-2 py-1 border rounded text-sm bg-transparent"
                      value={opts.count}
                      onChange={(e) => setCount(m.name, Number(e.target.value))}
                      onKeyDown={(e) => e.stopPropagation()}
                      title="How many to add"
                    />
                  </label>

                  <label className="text-xs opacity-80 inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="accent-white"
                      checked={opts.roll}
                      onChange={(e) => setRoll(m.name, e.target.checked)}
                      title="Roll HP from formula instead of using average"
                    />
                    Roll HP
                  </label>

                  <button
                    className="px-3 py-2 border rounded text-sm hover:bg-white/10"
                    onClick={() => setSel(m)}
                    title="View stat block"
                  >
                    <Swords className="inline-block h-4 w-4 mr-1" />
                    View
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {list.length === 0 && (
          <div className="opacity-70 italic p-6 border rounded-lg">
            No monsters match your filters.
          </div>
        )}
      </section>

      {/* Modal */}
      {sel && (
        <div className="fixed inset-0 z-[9998]">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setSel(null)} />
          <div className="absolute right-6 top-6 bottom-6 w-[520px] max-w-[95vw] rounded-xl border bg-neutral-950 shadow-2xl overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{sel.name}</div>
                <div className="text-xs opacity-70">{sel.size} • {sel.type} • CR {sel.cr}</div>
              </div>
              <button className="px-2 py-1 border rounded hover:bg-white/10" onClick={()=>setSel(null)} title="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 grid gap-2">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1">
                  <Shield className="h-3.5 w-3.5" /> AC {sel.ac}
                </span>
                <span className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1">
                  <Heart className="h-3.5 w-3.5" /> HP {sel.hpAvg}{sel.hpFormula ? ` (${sel.hpFormula})` : ""}
                </span>
                {sel.speed && (
                  <span className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1">
                    Speed {sel.speed}
                  </span>
                )}
              </div>

              <div className="text-sm">
                <b>STR</b> {sel.ability.str} · <b>DEX</b> {sel.ability.dex} · <b>CON</b> {sel.ability.con} ·{" "}
                <b>INT</b> {sel.ability.int} · <b>WIS</b> {sel.ability.wis} · <b>CHA</b> {sel.ability.cha}
              </div>

              {sel.senses && <div className="text-sm"><b>Senses:</b> {sel.senses}</div>}
              {sel.languages && <div className="text-sm"><b>Languages:</b> {sel.languages}</div>}

              {sel.traits?.length ? (
                <div className="mt-1">
                  <div className="font-semibold">Traits</div>
                  <div className="space-y-1 mt-1">
                    {sel.traits.map((t)=>(
                      <div key={t.name}>
                        <span className="font-semibold">{t.name}.</span> {t.text}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {sel.actions?.length ? (
                <div className="mt-1">
                  <div className="font-semibold">Actions</div>
                  <div className="space-y-1 mt-1">
                    {sel.actions.map((a)=>(
                      <div key={a.name}>
                        <span className="font-semibold">{a.name}.</span> {a.text}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-2">
                <button
                  className="px-3 py-2 border rounded text-sm hover:bg-white/10"
                  onClick={()=> {
                    const opts = getOpts(sel.name);
                    addMonsterToEncounter(sel, { count: opts.count, rollHP: opts.roll });
                  }}
                  title="Add to current encounter (appears in Tracker)"
                >
                  <Plus className="inline-block h-4 w-4 mr-1" />
                  Add to Tracker
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
