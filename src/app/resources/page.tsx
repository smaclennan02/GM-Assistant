"use client";

import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";
import type { CharactersState } from "@/types/characters";
import { CONDITIONS, CONDITION_TIPS, CONDITION_META, type ConditionKey } from "@/lib/conditions";

/* Exhaustion summaries (kept local here) */
const EXHAUSTION_LEVELS: { level: number; summary: string }[] = [
  { level: 0, summary: "No penalties." },
  { level: 1, summary: "Disadvantage on ability checks." },
  { level: 2, summary: "Speed halved." },
  { level: 3, summary: "Disadvantage on attack rolls and saving throws." },
  { level: 4, summary: "Hit point maximum halved." },
  { level: 5, summary: "Speed reduced to 0." },
  { level: 6, summary: "Dead." },
];

type PCResources = {
  exhaustion?: number;
  notes?: string;
  lastShort?: number;
  lastLong?: number;
};

type ResourcesState = {
  byPcId: Record<string, PCResources>;
  updatedAt: number;
};

const initialResources: ResourcesState = {
  byPcId: {},
  updatedAt: Date.now(),
};

function fmtWhen(ts?: number): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function ResourcesPage() {
  const [chars] = useStorageState<CharactersState>({
    key: STORAGE_KEYS.CHARACTERS,
    driver: localDriver,
    initial: { pcs: [], npcs: [], updatedAt: Date.now() },
    version: 1,
  });

  const [res, setRes] = useStorageState<ResourcesState>({
    key: STORAGE_KEYS.RESOURCES,
    driver: localDriver,
    initial: initialResources,
    version: 1,
  });

  const [q, setQ] = useState("");
  const filteredConditions = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return CONDITIONS;
    return CONDITIONS.filter(c =>
      c.toLowerCase().includes(s) || (CONDITION_TIPS[c]?.toLowerCase().includes(s))
    );
  }, [q]);

  const pcs = chars.pcs ?? [];

  const updPcRes = (pcId: string, patch: Partial<PCResources>) => {
    setRes((r) => {
      const existing = r.byPcId[pcId] ?? {};
      return {
        ...r,
        byPcId: { ...r.byPcId, [pcId]: { ...existing, ...patch } },
        updatedAt: Date.now(),
      };
    });
  };

  const shortRest = (pcId: string) => updPcRes(pcId, { lastShort: Date.now() });
  const longRest = (pcId: string) => updPcRes(pcId, { lastLong: Date.now(), exhaustion: 0 });
  const setExhaustion = (pcId: string, delta: number) => {
    const cur = res.byPcId[pcId]?.exhaustion ?? 0;
    const next = Math.max(0, Math.min(6, cur + delta));
    updPcRes(pcId, { exhaustion: next });
  };

  return (
    <div className="space-y-6">
      <header className="rounded-lg border p-4">
        <h1 className="text-2xl font-bold">Resources</h1>
        <p className="text-sm opacity-70">Quick references and trackers you’ll actually use at the table.</p>
      </header>

      {/* CONDITIONS */}
      <section className="rounded-lg border p-4 space-y-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold">Conditions</h2>
            <p className="text-xs opacity-60">Search and skim concise summaries.</p>
          </div>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conditions…"
            className="w-full sm:w-64"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredConditions.map((c) => {
            const meta = CONDITION_META[c as ConditionKey];
            const Icon = meta?.icon;
            return (
              <div key={c} className="rounded-lg border p-3 bg-white/5">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-2 border rounded-full px-2.5 py-1 text-xs ${meta.bg} ${meta.border} ${meta.text}`}>
                    {Icon ? <Icon className="h-4 w-4" /> : null}
                    <strong className="tracking-wide">{c}</strong>
                  </span>
                </div>
                <p className="text-sm opacity-85 mt-2">{CONDITION_TIPS[c]}</p>
              </div>
            );
          })}
          {filteredConditions.length === 0 && (
            <div className="text-sm opacity-70">No matches.</div>
          )}
        </div>
      </section>

      {/* PARTY REST & EXHAUSTION */}
      <section className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold">Party Rest & Exhaustion</h2>
            <p className="text-xs opacity-60">Track short/long rests and exhaustion for each PC.</p>
          </div>
          <div className="text-xs opacity-60">PCs: <b>{pcs.length}</b></div>
        </div>

        {pcs.length === 0 ? (
          <div className="text-sm opacity-70">
            No PCs found. Add them in <span className="font-medium">Characters</span> first.
          </div>
        ) : (
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-left table-ui sticky-header table-tight">
              <thead>
                <tr>
                  <th className="px-3 py-2">PC</th>
                  <th className="px-3 py-2">AC</th>
                  <th className="px-3 py-2">HP</th>
                  <th className="px-3 py-2">Short Rest</th>
                  <th className="px-3 py-2">Long Rest</th>
                  <th className="px-3 py-2">Exhaustion</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {pcs.map((pc) => {
                  const state = res.byPcId[pc.id] ?? {};
                  const ex = state.exhaustion ?? 0;
                  const level = EXHAUSTION_LEVELS[Math.max(0, Math.min(6, ex))];

                  return (
                    <tr key={pc.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{pc.name}</div>
                      </td>
                      <td className="px-3 py-2 w-20">{pc.ac ?? "—"}</td>
                      <td className="px-3 py-2 w-28">
                        {typeof pc.hp?.current === "number" && typeof pc.hp?.max === "number"
                          ? `${pc.hp.current}/${pc.hp.max}`
                          : (typeof pc.hp?.current === "number" ? `${pc.hp.current}` : "—")}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => shortRest(pc.id)}>
                            Mark
                          </Button>
                          <span className="text-xs opacity-70">{fmtWhen(state.lastShort)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => longRest(pc.id)}>
                            Mark
                          </Button>
                          <span className="text-xs opacity-70">{fmtWhen(state.lastLong)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 w-[280px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => setExhaustion(pc.id, -1)}>-</Button>
                          <div className="px-3 py-1 border rounded text-sm">
                            Level <b>{ex}</b>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => setExhaustion(pc.id, +1)}>+</Button>
                          <span className="text-xs opacity-70">{level.summary}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 min-w-[220px]">
                        <textarea
                          className="w-full min-h-[40px] max-h-32 border rounded p-2 text-sm bg-transparent"
                          placeholder="Rest notes (HD spent, slots recovered, etc.)"
                          value={state.notes ?? ""}
                          onChange={(e) => updPcRes(pc.id, { notes: e.target.value })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
