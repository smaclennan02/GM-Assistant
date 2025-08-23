"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";
import type { CharactersState, PC } from "@/types/characters";
import { CONDITIONS, CONDITION_TIPS, CONDITION_META, type ConditionKey } from "@/lib/conditions";
import { downloadJSON, uploadJSON } from "@/lib/io";

/* ========= Types ========= */
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
function d20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/* ========= Floating Effects Menu (cursor-anchored popover) ========= */
function EffectsMenuPortal({
  x,
  y,
  current,
  onPick,
  onClear,
  onClose,
}: {
  x: number;
  y: number;
  current: string[];
  onPick: (k: ConditionKey) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [q, setQ] = useState("");

  // Close on outside click / Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      const node = ref.current;
      if (node && !node.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  const available = useMemo(() => {
    const s = q.trim().toLowerCase();
    return CONDITIONS
      .filter(k => !current.includes(k))
      .filter(k => !s || k.toLowerCase().includes(s) || (CONDITION_TIPS[k]?.toLowerCase().includes(s)));
  }, [current, q]);

  // Keep within viewport (basic clamp)
  const menuW = 280;
  const menuH = 320;
  const pad = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.max(pad, Math.min(x, vw - menuW - pad));
  const top = Math.max(pad, Math.min(y, vh - menuH - pad));

  const content = (
    <div style={{ position: "fixed", left, top, zIndex: 9999 }}>
      <div
        ref={ref}
        className="w-[280px] max-h-[320px] rounded-lg border bg-neutral-950 shadow-xl p-2"
      >
        <div className="flex items-center gap-2 mb-2">
          <input
            autoFocus
            className="w-full px-2 py-1 border rounded text-sm bg-transparent"
            placeholder="Search effects…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="button"
            className="px-2 py-1 border rounded text-xs"
            title="Remove all effects"
            onClick={() => {
              onClear();
              onClose();
            }}
          >
            Clear
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 overflow-auto">
          {available.map((k) => {
            const meta = CONDITION_META[k];
            const Icon = meta?.icon;
            return (
              <button
                key={k}
                type="button"
                className={`h-10 rounded border ${meta.bg} ${meta.border} ${meta.text} flex flex-col items-center justify-center text-[10px] leading-tight text-center px-1 hover:bg-white/10`}
                title={CONDITION_TIPS[k]}
                onClick={() => {
                  onPick(k);
                  onClose();
                }}
              >
                {Icon ? <Icon className="h-4 w-4" /> : <span className="text-xs">?</span>}
                <span className="truncate w-full">{k}</span>
              </button>
            );
          })}
          {available.length === 0 && (
            <div className="col-span-4 text-xs opacity-70 p-2 text-center">No effects available</div>
          )}
        </div>

        <div className="mt-2 flex justify-end">
          <button className="px-2 py-1 border rounded text-xs" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

/* ========= Page ========= */
export default function InitiativePage() {
  const [enc, setEnc] = useStorageState<EncounterState>({
    key: STORAGE_KEYS.ENCOUNTERS,
    driver: localDriver,
    initial: initialEncounter,
    version: 1,
  });

  const [chars] = useStorageState<CharactersState>({
    key: STORAGE_KEYS.CHARACTERS,
    driver: localDriver,
    initial: { pcs: [], npcs: [], updatedAt: Date.now() },
    version: 1,
  });

  const pcById = useMemo(() => new Map((chars?.pcs ?? []).map(p => [p.id, p])), [chars?.pcs]);

  const pcIdsInEncounter = useMemo(
    () => new Set(enc.combatants.filter((c) => c.pcId).map((c) => c.pcId as string)),
    [enc.combatants]
  );

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

  /* Helpers */
  const getInitMod = useCallback((c: Combatant) => {
    if (!c.pcId) return 0;
    const pc = pcById.get(c.pcId);
    const mod = (pc && (pc as any).initMod);
    return typeof mod === "number" ? mod : 0;
  }, [pcById]);

  /* Actions */
  const addMissingPCs = useCallback(() => {
    const count = chars?.pcs?.length ?? 0;
    if (!count) return;
    const now = Date.now();

    setEnc((e) => {
      const existingByPcId = new Map(
        e.combatants.filter((c) => c.pcId).map((c) => [c.pcId as string, c])
      );
      const additions: Combatant[] = [];
      for (const pc of chars.pcs) {
        if (!existingByPcId.has(pc.id)) additions.push(pcToCombatant(pc));
      }
      if (!additions.length) return e;
      return { ...e, combatants: [...e.combatants, ...additions], updatedAt: now };
    });
  }, [chars?.pcs, setEnc]);

  const syncLinkedPCs = useCallback(() => {
    if (!chars?.pcs?.length) return;
    const pcByIdLocal = new Map(chars.pcs.map((p) => [p.id, p]));
    setEnc((e) => ({
      ...e,
      combatants: e.combatants.map((c) => {
        if (!c.pcId) return c;
        const pc = pcByIdLocal.get(c.pcId);
        if (!pc) return c;
        return {
          ...c,
          name: pc.name ?? c.name,
          ac: typeof pc.ac === "number" ? pc.ac : c.ac,
          hp: typeof pc.hp?.current === "number" ? pc.hp.current : c.hp,
          isPC: true,
          conditions: c.conditions ?? [],
        };
      }),
      updatedAt: Date.now(),
    }));
  }, [chars?.pcs, setEnc]);

  const clearAllInits = useCallback(() => {
    setEnc((e) => ({
      ...e,
      combatants: e.combatants.map((c) => ({ ...c, init: null })),
      updatedAt: Date.now(),
    }));
  }, [setEnc]);

  const remove = useCallback(
    (id: string) => {
      setEnc((e) => ({
        ...e,
        combatants: e.combatants.filter((c) => c.id !== id),
        updatedAt: Date.now(),
      }));
    },
    [setEnc]
  );

  const update = useCallback(
    (id: string, patch: Partial<Combatant>) => {
      setEnc((e) => ({
        ...e,
        combatants: e.combatants.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        updatedAt: Date.now(),
      }));
    },
    [setEnc]
  );

  const addNPC = useCallback(
    (name: string) => {
      setEnc((e) => ({
        ...e,
        combatants: [
          ...e.combatants,
          {
            id: newId(),
            name: name || "NPC",
            init: null,
            hp: null,
            ac: null,
            isPC: false,
            tags: [],
            conditions: [],
          },
        ],
        updatedAt: Date.now(),
      }));
    },
    [setEnc]
  );

  const toggleLock = useCallback(() => {
    setEnc((e) => ({ ...e, orderLocked: !e.orderLocked, updatedAt: Date.now() }));
  }, [setEnc]);

  const nextRound = useCallback(() => {
    setEnc((e) => ({ ...e, round: Math.max(1, e.round + 1), updatedAt: Date.now() }));
  }, [setEnc]);

  const prevRound = useCallback(() => {
    setEnc((e) => ({ ...e, round: Math.max(1, e.round - 1), updatedAt: Date.now() }));
  }, [setEnc]);

  const toggleCondition = useCallback(
    (id: string, cond: string) => {
      setEnc((e) => ({
        ...e,
        combatants: e.combatants.map((c) => {
          if (c.id !== id) return c;
          const list = c.conditions ?? [];
          const exists = list.includes(cond);
          const next = exists ? list.filter((x) => x !== cond) : [...list, cond];
          return { ...c, conditions: next };
        }),
        updatedAt: Date.now(),
      }));
    },
    [setEnc]
  );

  const clearConditions = useCallback(
    (id: string) => {
      setEnc((e) => ({
        ...e,
        combatants: e.combatants.map((c) => (c.id === id ? { ...c, conditions: [] } : c)),
        updatedAt: Date.now(),
      }));
    },
    [setEnc]
  );

  /* Bulk actions */
  const removeAllNPCs = useCallback(() => {
    setEnc(e => ({
      ...e,
      combatants: e.combatants.filter(c => c.isPC),
      updatedAt: Date.now(),
    }));
  }, [setEnc]);

  const clearAllEffects = useCallback(() => {
    setEnc(e => ({
      ...e,
      combatants: e.combatants.map(c => ({ ...c, conditions: [] })),
      updatedAt: Date.now(),
    }));
  }, [setEnc]);

  const resetEncounter = useCallback(() => {
    setEnc(e => ({
      ...initialEncounter,
      updatedAt: Date.now(),
    }));
  }, [setEnc]);

  /* Export/Import */
  const exportEncounter = useCallback(() => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      encounter: enc,
    };
    downloadJSON("encounter.json", payload);
  }, [enc]);

  const importEncounter = useCallback(async () => {
    try {
      const data = await uploadJSON();
      const payload = (data as any) ?? {};
      const incoming = payload.encounter ?? payload;
      if (!incoming || !Array.isArray(incoming.combatants)) {
        alert("Invalid encounter file");
        return;
      }
      const clean: EncounterState = {
        combatants: (incoming.combatants as any[]).map((c) => ({
          id: typeof c.id === "string" ? c.id : newId(),
          name: String(c.name ?? "Unnamed"),
          init: typeof c.init === "number" ? c.init : null,
          hp: typeof c.hp === "number" ? c.hp : null,
          ac: typeof c.ac === "number" ? c.ac : null,
          isPC: !!c.isPC,
          pcId: typeof c.pcId === "string" ? c.pcId : undefined,
          tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
          conditions: Array.isArray(c.conditions) ? c.conditions.map(String) : [],
        })),
        round: Math.max(1, Number(incoming.round ?? 1)),
        orderLocked: !!incoming.orderLocked,
        updatedAt: Date.now(),
      };
      setEnc(clean);
    } catch (e) {
      alert("Import failed");
    }
  }, [setEnc]);

  /* Cursor-anchored menu state */
  const [menu, setMenu] = useState<null | {
    x: number; y: number;
    current: string[];
    onPick: (k: ConditionKey) => void;
    onClear: () => void;
  }>(null);

  const openMenuAt = (ev: React.MouseEvent, current: string[], onPick: (k: ConditionKey) => void, onClear: () => void) => {
    const menuW = 280, menuH = 320, pad = 8;
    const { clientX, clientY } = ev;
    const vw = window.innerWidth, vh = window.innerHeight;
    let x = clientX, y = clientY;
    if (x + menuW + pad > vw) x = vw - menuW - pad;
    if (y + menuH + pad > vh) y = vh - menuH - pad;
    setMenu({ x, y, current, onPick, onClear });
  };

  /* ---------- UI ---------- */
  const [npcName, setNpcName] = useState("");

  return (
    <div className="p-0 space-y-6">
      <header className="rounded-lg border p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Encounter Tracker</h1>
          <p className="text-xs opacity-60">Shortcuts: [ and ] change round • L toggles lock</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 border rounded" onClick={prevRound} aria-label="Previous round">−</button>
            <div className="px-3 py-2 border rounded">Round <b>{enc.round}</b></div>
            <button className="px-3 py-2 border rounded" onClick={nextRound} aria-label="Next round">+</button>
          </div>
          <div className="hidden sm:block h-6 w-px bg-neutral-800" />
          <button className="px-3 py-2 border rounded" onClick={toggleLock} aria-pressed={enc.orderLocked}>
            {enc.orderLocked ? "Unlock Order" : "Lock Order"}
          </button>
          <button className="px-3 py-2 border rounded" onClick={clearAllInits} title="Set all initiatives to blank">
            Clear Inits
          </button>
        </div>
      </header>

      {/* Bulk actions */}
      <section className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Bulk Actions</h2>
          <div className="ml-auto flex flex-wrap gap-2">
            <button className="px-3 py-2 border rounded" onClick={removeAllNPCs} title="Remove all NPC entries">Remove all NPCs</button>
            <button className="px-3 py-2 border rounded" onClick={clearAllEffects} title="Clear all effects from everyone">Clear all effects</button>
            <button className="px-3 py-2 border rounded" onClick={resetEncounter} title="Clear list and reset round to 1">Reset encounter</button>
            <button className="px-3 py-2 border rounded" onClick={exportEncounter} title="Download encounter as JSON">Export</button>
            <button className="px-3 py-2 border rounded" onClick={importEncounter} title="Load an encounter from JSON">Import</button>
          </div>
        </div>
      </section>

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
              <th className="px-3 py-2 w-56">Effects</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const conds = c.conditions ?? [];
              const pcMod = getInitMod(c);
              return (
                <tr key={c.id} className="border-t align-top">
                  <td className="px-3 py-2">
                    <input
                      className="px-2 py-1 border rounded w-full input-compact"
                      value={c.name}
                      onChange={(e) => update(c.id, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        className="px-2 py-1 border rounded w-24 input-compact"
                        value={c.init ?? ""}
                        onChange={(e) => update(c.id, { init: parseMaybeNumber(e.target.value) })}
                        inputMode="numeric"
                        placeholder="—"
                        title="Enter initiative manually"
                      />
                      <button
                        type="button"
                        className="px-2 py-1 border rounded text-xs"
                        title={c.isPC ? `Roll d20 + ${pcMod >= 0 ? "+" : ""}${pcMod}` : "Roll d20"}
                        onClick={() => {
                          const roll = d20() + (c.isPC ? pcMod : 0);
                          update(c.id, { init: roll });
                        }}
                      >
                        🎲 Roll
                      </button>
                    </div>
                    {c.isPC ? (
                      <div className="text-[10px] opacity-60 mt-1">
                        Mod: {pcMod >= 0 ? "+" : ""}{pcMod}
                      </div>
                    ) : null}
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
                  <td className="px-3 py-2 w-56 align-top">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-wrap gap-1 min-h-6">
                        {conds.map((cond) => {
                          const meta = CONDITION_META[cond as ConditionKey];
                          const Icon = meta?.icon;
                          return (
                            <button
                              key={cond}
                              type="button"
                              title={`${cond}: ${CONDITION_TIPS[cond as ConditionKey] || ""}\n(click to remove)`}
                              className={`h-6 w-6 grid place-items-center rounded border ${meta?.bg ?? "bg-white/5"} ${meta?.border ?? "border-white/20"} ${meta?.text ?? "text-white"} hover:bg-white/10`}
                              onClick={() => toggleCondition(c.id, cond)}
                            >
                              {Icon ? <Icon className="h-3.5 w-3.5" /> : <span className="text-xs">?</span>}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        className="h-6 w-6 grid place-items-center border rounded hover:bg-white/10"
                        title="Add effect"
                        onClick={(e) => openMenuAt(
                          e,
                          conds,
                          (k) => toggleCondition(c.id, k),
                          () => clearConditions(c.id)
                        )}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
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

      {/* Floating menu (rendered into body) */}
      {menu ? (
        <EffectsMenuPortal
          x={menu.x}
          y={menu.y}
          current={menu.current}
          onPick={menu.onPick}
          onClear={menu.onClear}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </div>
  );
}

/** Helper: convert a PC to a combatant */
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
    conditions: [],
  };
}
