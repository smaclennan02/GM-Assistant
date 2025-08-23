"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";

import type { CharactersState, PC as PCBase } from "@/types/characters";
import { downloadJSON, uploadJSON } from "@/lib/io";

/* ---------------- types & helpers ---------------- */

/** Extend your PC type with optional extras you were using before */
type PCX = PCBase & {
  initMod?: number;
  passive?: number;
};

type Attitude = "Friendly" | "Neutral" | "Hostile" | "Other";

type NPCPreset = {
  id: string;
  name: string;
  init?: number;
  ac?: number;
  hp?: string; // free text for presets, e.g. "22/40"
  notes?: string;
  attitude?: Attitude;
  tags?: string[];
};

/** Separate key for NPC presets (keeps things simple) */
const NPC_PRESETS_KEY = "gma.v1.npc-presets";

const attitudes: Attitude[] = ["Friendly", "Neutral", "Hostile", "Other"];

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/** Convert "27/31" or "27" into { current, max } */
function parseHPText(s: string | undefined): { current?: number; max?: number } | undefined {
  if (!s) return undefined;
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  const [a, b] = trimmed.split("/");
  const cur = Number(a);
  const mx = b != null ? Number(b) : undefined;
  const current = Number.isFinite(cur) ? cur : undefined;
  const max = mx != null && Number.isFinite(mx) ? mx : undefined;
  if (current == null && max == null) return undefined;
  return { current, max };
}

/** Render {current, max} back to "current/max" (or "" if none) */
function hpToText(pc: PCBase): string {
  const c = pc.hp?.current;
  const m = pc.hp?.max;
  if (typeof c === "number" && typeof m === "number") return `${c}/${m}`;
  if (typeof c === "number") return String(c);
  if (typeof m === "number") return `/${m}`;
  return "";
}

function parseTags(s: string): string[] {
  return Array.from(new Set(s.split(",").map((t) => t.trim()).filter(Boolean)));
}

/* ---------------- page ---------------- */
export default function CharactersPage() {
  const [tab, setTab] = useState<"pcs" | "npcs">("pcs");

  /** Characters (PCs) – this is what the tracker reads */
  const [chars, setChars] = useStorageState<CharactersState>({
    key: STORAGE_KEYS.CHARACTERS, // IMPORTANT: tracker reads from here
    driver: localDriver,
    initial: { pcs: [], npcs: [], updatedAt: Date.now() },
    version: 1,
  });

  /** NPC presets – kept in a simple separate key */
  const [npcPresets, setNpcPresets] = useStorageState<NPCPreset[]>({
    key: NPC_PRESETS_KEY,
    driver: localDriver,
    initial: [],
    version: 1,
  });

  return (
    <div className="space-y-6">
      <Card className="bg-parchment/90">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Characters</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={tab === "pcs" ? "default" : "outline"}
              onClick={() => setTab("pcs")}
            >
              PCs
            </Button>
            <Button
              variant={tab === "npcs" ? "default" : "outline"}
              onClick={() => setTab("npcs")}
            >
              NPC Presets
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tab === "pcs" ? (
            <PCsPanel
              pcs={chars.pcs as PCX[]}
              setPCs={(updater) =>
                setChars((s) => ({
                  ...s,
                  pcs: updater(s.pcs as PCX[]),
                  updatedAt: Date.now(),
                }))
              }
            />
          ) : (
            <NPCsPanel
              npcs={npcPresets}
              setNPCs={(updater) =>
                setNpcPresets((p) => updater(p))
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- PCs ---------------- */
function PCsPanel({
  pcs,
  setPCs,
}: {
  pcs: PCX[];
  setPCs: (updater: (prev: PCX[]) => PCX[]) => void;
}) {
  const [q, setQ] = useState("");

  function addPC() {
    setPCs((p) => [
      ...p,
      {
        id: newId(),
        name: "New PC",
        ac: undefined,
        hp: undefined, // shown as empty, DM can type "27/31"
        notes: "",
        initMod: 0,
      },
    ]);
  }
  function delPC(id: string) {
    setPCs((p) => p.filter((x) => x.id !== id));
  }
  function updPC(id: string, patch: Partial<PCX>) {
    setPCs((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function onExport() {
    downloadJSON("pcs.json", pcs);
    toast.success("Exported PCs");
  }
  async function onImport() {
    try {
      const data = await uploadJSON();
      if (!Array.isArray(data)) throw new Error("JSON is not an array");
      const imported: PCX[] = data.map((r: unknown) => {
        const d = r as Partial<PCX>;
        const hpParsed =
          typeof d.hp === "string"
            ? parseHPText(d.hp)
            : d.hp && typeof d.hp === "object"
            ? { current: (d.hp as any).current, max: (d.hp as any).max }
            : undefined;

        return {
          id: typeof d.id === "string" ? d.id : newId(),
          name: String(d.name ?? "Unnamed"),
          ac: typeof d.ac === "number" ? d.ac : undefined,
          hp: hpParsed?.current != null || hpParsed?.max != null ? { current: hpParsed.current ?? undefined, max: hpParsed.max ?? undefined } : undefined,
          notes: typeof d.notes === "string" ? d.notes : undefined,
          initMod: typeof d.initMod === "number" ? d.initMod : undefined,
          passive: typeof d.passive === "number" ? d.passive : undefined,
          class: typeof d.class === "string" ? d.class : undefined,
          level: typeof d.level === "number" ? d.level : undefined,
          abilities: (d as any).abilities,
        };
      });
      setPCs(() => imported);
      toast.success(`Imported ${imported.length} PCs`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return pcs;
    return pcs.filter(
      (pc) =>
        pc.name.toLowerCase().includes(s) ||
        (pc.notes || "").toLowerCase().includes(s)
    );
  }, [pcs, q]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search PCs…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={onExport}>
            Export
          </Button>
          <Button variant="outline" onClick={onImport}>
            Import
          </Button>
          <Button onClick={addPC}>+ Add PC</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded border bg-white/80">
        <table className="min-w-full text-sm table-ui sticky-header table-tight">
          <thead className="bg-black/5">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left w-20">AC</th>
              <th className="p-2 text-left w-32">HP</th>
              <th className="p-2 text-left w-24">Init mod</th>
              <th className="p-2 text-left">Notes</th>
              <th className="p-2 text-left w-36">Sheet</th>
              <th className="p-2 text-left w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pc) => (
              <tr key={pc.id} className="border-t">
                <td className="p-2">
                  <Input
                    value={pc.name}
                    onChange={(e) => updPC(pc.id, { name: e.target.value })}
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={pc.ac?.toString() || ""}
                    onChange={(e) =>
                      updPC(pc.id, {
                        ac: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="AC"
                    inputMode="numeric"
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={hpToText(pc)}
                    onChange={(e) => {
                      const parsed = parseHPText(e.target.value);
                      updPC(pc.id, {
                        hp:
                          parsed && (parsed.current != null || parsed.max != null)
                            ? { current: parsed.current, max: parsed.max }
                            : undefined,
                      });
                    }}
                    placeholder="e.g., 27/31"
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={pc.initMod?.toString() ?? ""}
                    onChange={(e) =>
                      updPC(pc.id, {
                        initMod: Number(e.target.value || 0),
                      })
                    }
                    placeholder="+0"
                    inputMode="numeric"
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={pc.notes ?? ""}
                    onChange={(e) => updPC(pc.id, { notes: e.target.value })}
                    placeholder="notes…"
                  />
                </td>
                <td className="p-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      toast.info("Character sheet feature coming soon!")
                    }
                    title="Open character sheet (coming soon)"
                  >
                    📄 Sheet
                  </Button>
                </td>
                <td className="p-2">
                  <Button variant="destructive" onClick={() => delPC(pc.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="p-3 opacity-70" colSpan={7}>
                  No PCs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs opacity-70">
        Tip: Use Encounters → Tracker to load your PCs into initiative. They’ll be
        added with blank initiative so you only type the roll each fight.
      </div>
    </div>
  );
}

/* ---------------- NPCs ---------------- */
function NPCsPanel({
  npcs,
  setNPCs,
}: {
  npcs: NPCPreset[];
  setNPCs: (updater: (prev: NPCPreset[]) => NPCPreset[]) => void;
}) {
  const [q, setQ] = useState("");

  function add() {
    setNPCs((p) => [
      ...p,
      { id: newId(), name: "New NPC", attitude: "Neutral", tags: [] },
    ]);
  }
  function del(id: string) {
    setNPCs((p) => p.filter((x) => x.id !== id));
  }
  function upd(id: string, patch: Partial<NPCPreset>) {
    setNPCs((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function onExport() {
    downloadJSON("npcs.json", npcs);
    toast.success("Exported NPC presets");
  }
  async function onImport() {
    try {
      const data = await uploadJSON();
      if (!Array.isArray(data)) throw new Error("JSON is not an array");
      const imported: NPCPreset[] = data.map((r: unknown) => {
        const d = r as Partial<NPCPreset>;
        return {
          id: typeof d.id === "string" ? d.id : newId(),
          name: String(d.name ?? "Unnamed"),
          init: typeof d.init === "number" ? d.init : undefined,
          ac: typeof d.ac === "number" ? d.ac : undefined,
          hp: typeof d.hp === "string" ? d.hp : undefined,
          notes: typeof d.notes === "string" ? d.notes : undefined,
          attitude: attitudes.includes(d.attitude as Attitude)
            ? (d.attitude as Attitude)
            : "Neutral",
          tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
        };
      });
      setNPCs(() => imported);
      toast.success(`Imported ${imported.length} NPCs`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return npcs;
    return npcs.filter(
      (n) =>
        n.name.toLowerCase().includes(s) ||
        (n.notes || "").toLowerCase().includes(s) ||
        (n.attitude || "").toLowerCase().includes(s) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(s))
    );
  }, [npcs, q]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search NPCs (name, tag, attitude)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={onExport}>
            Export
          </Button>
          <Button variant="outline" onClick={onImport}>
            Import
          </Button>
          <Button onClick={add}>+ Add NPC</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded border bg-white/80">
        <table className="min-w-full text-sm table-ui sticky-header table-tight">
          <thead className="bg-black/5">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left w-24">Init</th>
              <th className="p-2 text-left w-20">AC</th>
              <th className="p-2 text-left w-32">HP</th>
              <th className="p-2 text-left w-28">Attitude</th>
              <th className="p-2 text-left">Tags</th>
              <th className="p-2 text-left">Notes</th>
              <th className="p-2 text-left w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((n) => (
              <tr key={n.id} className="border-t">
                <td className="p-2">
                  <Input
                    value={n.name}
                    onChange={(e) => upd(n.id, { name: e.target.value })}
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={n.init?.toString() ?? ""}
                    onChange={(e) =>
                      upd(n.id, {
                        init: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="(optional)"
                    inputMode="numeric"
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={n.ac?.toString() ?? ""}
                    onChange={(e) =>
                      upd(n.id, {
                        ac: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="AC"
                    inputMode="numeric"
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={n.hp ?? ""}
                    onChange={(e) => upd(n.id, { hp: e.target.value })}
                    placeholder="e.g., 22 or 22/40"
                  />
                </td>
                <td className="p-2">
                  <select
                    className="border rounded px-2 py-2 bg-white/80 text-sm"
                    value={n.attitude ?? "Neutral"}
                    onChange={(e) => upd(n.id, { attitude: e.target.value as Attitude })}
                  >
                    {attitudes.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2 min-w-[180px]">
                  <Input
                    value={(n.tags || []).join(", ")}
                    onChange={(e) => upd(n.id, { tags: parseTags(e.target.value) })}
                    placeholder="guard, dock, smuggler"
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={n.notes ?? ""}
                    onChange={(e) => upd(n.id, { notes: e.target.value })}
                    placeholder="notes…"
                  />
                </td>
                <td className="p-2">
                  <Button variant="destructive" onClick={() => del(n.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="p-3 opacity-70" colSpan={8}>
                  No NPCs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs opacity-70">
        Tip: In Encounters → Tracker, PCs load from your Characters tab and NPC presets
        can be added ad-hoc as needed.
      </div>
    </div>
  );
}
