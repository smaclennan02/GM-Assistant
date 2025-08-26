"use client";

import React, { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";
import type { CharactersState, PC, NPCPreset } from "@/types/characters";
import { Trash2, Plus, Users, User, Upload, Download } from "lucide-react";
import ConfirmPopover from "@/components/ui/ConfirmPopover";

/**
 * Character Hub (v0.4 + CSV Import/Export, strict)
 * - Strict CSV schema for PCs and Presets:
 *   id,name,ac,hp_current,hp_max,notes
 * - Export: exact columns, properly quoted.
 * - Import: exact header required; overwrite current list (with confirm).
 * - Presets remain mirrored into Characters blob.
 */

const NPC_PRESETS_KEY = "gma.v1.npc-presets";

/** ------- Small helpers ------- */
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function clampNumber(n: any): number | undefined {
  if (n === null || n === undefined || n === "") return undefined;
  const v = Number(n);
  return Number.isFinite(v) ? v : undefined;
}

function hpToDisplay(pc: PC): { current?: number; max?: number } {
  const anyHp: any = (pc as any).hp;
  if (anyHp && typeof anyHp === "object") {
    return { current: clampNumber(anyHp.current), max: clampNumber(anyHp.max) };
  }
  if (typeof anyHp === "number") {
    return { current: anyHp, max: undefined };
  }
  return {};
}

/** Mirror presets into Characters blob (minimal: name/ac/hp/notes passthrough). */
function mirrorPresetsIntoCharacters(charState: CharactersState, presets: NPCPreset[]): CharactersState {
  return {
    ...charState,
    npcs: [...presets],
    updatedAt: Date.now(),
  };
}

/** ------- CSV helpers (strict) ------- */
const PC_HEADERS = ["id", "name", "ac", "hp_current", "hp_max", "notes"] as const;
type PcCsvRow = Record<typeof PC_HEADERS[number], string>;

const PRESET_HEADERS = PC_HEADERS; // same schema
type PresetCsvRow = PcCsvRow;

/** RFC 4180-ish CSV stringify for an array of string arrays */
function csvStringify(rows: string[][]): string {
  const esc = (v: string) => {
    const needsQuotes = /[",\n\r]/.test(v);
    const s = v.replace(/"/g, '""');
    return needsQuotes ? `"${s}"` : s;
  };
  return rows.map((r) => r.map((c) => esc(c ?? "")).join(",")).join("\r\n");
}

/** RFC 4180-ish CSV parse -> array of string arrays */
function csvParse(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const N = text.length;
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  while (i < N) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < N && text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ",") {
        row.push(field);
        field = "";
        i++;
        continue;
      }
      if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
        continue;
      }
      if (ch === "\r") {
        // handle \r\n windows newlines
        if (i + 1 < N && text[i + 1] === "\n") {
          row.push(field);
          rows.push(row);
          row = [];
          field = "";
          i += 2;
          continue;
        } else {
          row.push(field);
          rows.push(row);
          row = [];
          field = "";
          i++;
          continue;
        }
      }
      field += ch;
      i++;
    }
  }
  // flush last
  row.push(field);
  rows.push(row);
  // Trim trailing empty newline row if present
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
    rows.pop();
  }
  return rows;
}

/** Validate exact headers (strict) and map to objects */
function parseStrictObjects<T extends string>(
  text: string,
  expectedHeaders: readonly T[]
): Record<T, string>[] {
  const rows = csvParse(text);
  if (rows.length === 0) throw new Error("CSV is empty.");
  const header = rows[0];
  const need = expectedHeaders as readonly string[];
  const sameLength = header.length === need.length;
  const exactMatch = sameLength && header.every((h, idx) => h === need[idx]);
  if (!exactMatch) {
    throw new Error(
      `Invalid headers.\nExpected: ${need.join(",")}\nFound: ${header.join(",")}`
    );
  }
  return rows.slice(1).map((r) => {
    const obj: any = {};
    need.forEach((k, i) => (obj[k] = r[i] ?? ""));
    return obj as Record<T, string>;
  });
}

/** Convert PCs -> CSV text */
function pcsToCsv(pcs: PC[]): string {
  const header = [...PC_HEADERS];
  const body = pcs.map((p) => {
    const hp = hpToDisplay(p);
    return [
      String(p.id ?? ""),
      String(p.name ?? ""),
      p.ac === undefined || p.ac === null ? "" : String(p.ac),
      hp.current === undefined ? "" : String(hp.current),
      hp.max === undefined ? "" : String(hp.max),
      String((p as any).notes ?? ""),
    ];
  });
  return csvStringify([header as string[]].concat(body));
}

/** Convert Presets -> CSV text */
function presetsToCsv(presets: NPCPreset[]): string {
  const header = [...PRESET_HEADERS];
  const body = presets.map((np) => {
    const anyHp: any = np.hp || {};
    const cur = clampNumber(anyHp.current);
    const max = clampNumber(anyHp.max);
    return [
      String(np.id ?? ""),
      String(np.name ?? ""),
      np.ac === undefined || np.ac === null ? "" : String(np.ac),
      cur === undefined ? "" : String(cur),
      max === undefined ? "" : String(max),
      String((np as any).notes ?? ""),
    ];
  });
  return csvStringify([header as string[]].concat(body));
}

/** Trigger file download for CSV text */
function downloadCsv(filename: string, csvText: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CharactersPage() {
  /** Characters blob (PCs are the source of truth here) */
  const [chars, setChars] = useStorageState<CharactersState>({
    key: STORAGE_KEYS.CHARACTERS,
    driver: localDriver,
    initial: { pcs: [], npcs: [], updatedAt: 0 },
    version: 1,
  });

  /** NPC Presets (separate key, mirrored into Characters blob on change) */
  const [presets, setPresets] = useStorageState<NPCPreset[]>({
    key: NPC_PRESETS_KEY,
    driver: localDriver,
    initial: [],
    version: 1,
  });

  const pcs = useMemo(() => (Array.isArray(chars?.pcs) ? (chars!.pcs as PC[]) : []), [chars]);

  /** File inputs (hidden) */
  const filePcRef = useRef<HTMLInputElement | null>(null);
  const filePresetRef = useRef<HTMLInputElement | null>(null);

  /** ------- PCs CRUD ------- */
  const addPC = () => {
    const next: PC = {
      id: newId(),
      name: "New PC",
      ac: undefined,
      hp: { current: undefined as any, max: undefined as any },
      notes: "",
    } as any;
    setChars((prev) => ({
      ...prev,
      pcs: [...(prev.pcs || []), next],
      updatedAt: Date.now(),
    }));
  };

  const updatePC = (id: string, patch: Partial<PC>) => {
    setChars((prev) => ({
      ...prev,
      pcs: (prev.pcs || []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
      updatedAt: Date.now(),
    }));
  };

  const updatePCHP = (id: string, current?: number, max?: number) => {
    setChars((prev) => ({
      ...prev,
      pcs: (prev.pcs || []).map((p) =>
        p.id === id ? { ...p, hp: { current, max } as any } : p
      ),
      updatedAt: Date.now(),
    }));
  };

  const removePC = (id: string) => {
    setChars((prev) => ({
      ...prev,
      pcs: (prev.pcs || []).filter((p) => p.id !== id),
      updatedAt: Date.now(),
    }));
  };

  const clearAllPCs = () => {
    setChars((prev) => ({
      ...prev,
      pcs: [],
      updatedAt: Date.now(),
    }));
  };

  /** ------- Presets CRUD (with mirror) ------- */
  const addPreset = () => {
    const next: NPCPreset = {
      id: newId(),
      name: "New NPC Preset",
      ac: undefined as any,
      hp: { current: undefined as any, max: undefined as any } as any,
      notes: "",
    } as any;
    setPresets((prev) => {
      const updated = [...prev, next];
      setChars((prevChars) => mirrorPresetsIntoCharacters(prevChars, updated));
      return updated;
    });
  };

  const updatePreset = (id: string, patch: Partial<NPCPreset>) => {
    setPresets((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      setChars((prevChars) => mirrorPresetsIntoCharacters(prevChars, updated));
      return updated;
    });
  };

  const updatePresetHP = (id: string, current?: number, max?: number) => {
    setPresets((prev) => {
      const updated = prev.map((p) =>
        p.id === id ? { ...p, hp: { current, max } as any } : p
      );
      setChars((prevChars) => mirrorPresetsIntoCharacters(prevChars, updated));
      return updated;
    });
  };

  const removePreset = (id: string) => {
    setPresets((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      setChars((prevChars) => mirrorPresetsIntoCharacters(prevChars, updated));
      return updated;
    });
  };

  const clearAllPresets = () => {
    setPresets(() => {
      const updated: NPCPreset[] = [];
      setChars((prevChars) => mirrorPresetsIntoCharacters(prevChars, updated));
      return updated;
    });
  };

  /** ------- CSV Export/Import handlers ------- */
  const exportPCs = () => {
    const csv = pcsToCsv(pcs);
    downloadCsv("pcs-export.csv", csv);
  };

  const exportPresets = () => {
    const csv = presetsToCsv(presets);
    downloadCsv("npc-presets-export.csv", csv);
  };

  const onImportPCsPicked: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so picking the same file again re-triggers
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseStrictObjects(text, PC_HEADERS);
      // Strict mapping; overwrite existing
      const nextPcs: PC[] = rows.map((r) => {
        if (!r.id) throw new Error("Missing id in one of the rows.");
        return {
          id: r.id,
          name: r.name || "",
          ac: clampNumber(r.ac),
          hp: {
            current: clampNumber(r.hp_current),
            max: clampNumber(r.hp_max),
          } as any,
          notes: r.notes || "",
        } as any;
      });
      setChars((prev) => ({
        ...prev,
        pcs: nextPcs,
        updatedAt: Date.now(),
      }));
      alert(`Imported ${nextPcs.length} PCs.`);
    } catch (err: any) {
      alert(`Import failed: ${err?.message || String(err)}`);
    }
  };

  const onImportPresetsPicked: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseStrictObjects(text, PRESET_HEADERS);
      const next: NPCPreset[] = rows.map((r) => {
        if (!r.id) throw new Error("Missing id in one of the rows.");
        return {
          id: r.id,
          name: r.name || "",
          ac: clampNumber(r.ac),
          hp: {
            current: clampNumber(r.hp_current),
            max: clampNumber(r.hp_max),
          } as any,
          notes: r.notes || "",
        } as any;
      });
      setPresets(() => {
        // overwrite
        const updated = next;
        setChars((prevChars) => mirrorPresetsIntoCharacters(prevChars, updated));
        return updated;
      });
      alert(`Imported ${next.length} NPC presets.`);
    } catch (err: any) {
      alert(`Import failed: ${err?.message || String(err)}`);
    }
  };

  /** ------- UI ------- */
  return (
    <div className="space-y-4">
      {/* Hidden file pickers for imports */}
      <input
        ref={filePcRef}
        type="file"
        accept=".csv,text/csv"
        onChange={onImportPCsPicked}
        className="hidden"
      />
      <input
        ref={filePresetRef}
        type="file"
        accept=".csv,text/csv"
        onChange={onImportPresetsPicked}
        className="hidden"
      />

      {/* Header */}
      <header className="rounded-lg border p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Character Hub</h1>
          <p className="text-xs opacity-70">Manage your party and reusable NPC presets.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* PCs group */}
          <div className="flex items-center gap-2 rounded-lg border px-2 py-1">
            <span className="text-xs opacity-70">PCs</span>
            <button
              className="px-2 py-1 border rounded text-sm hover:bg-white/10 cursor-pointer inline-flex items-center gap-1"
              onClick={exportPCs}
              title="Export PCs to CSV"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <ConfirmPopover
              onConfirm={() => filePcRef.current?.click()}
              message="Importing will OVERWRITE all PCs with the CSV contents. Continue?"
              confirmLabel="Import CSV"
              cancelLabel="Cancel"
              align="right"
            >
              <button
                className="px-2 py-1 border rounded text-sm hover:bg-white/10 cursor-pointer inline-flex items-center gap-1"
                title="Import PCs from CSV (strict schema)"
              >
                <Upload className="h-4 w-4" /> Import
              </button>
            </ConfirmPopover>
            <div className="hidden sm:block h-6 w-px bg-white/10" />
            <ConfirmPopover
              onConfirm={clearAllPCs}
              message="Remove all PCs from the Character Hub? This does not affect NPC presets."
              confirmLabel="Clear PCs"
              cancelLabel="Cancel"
              align="right"
            >
              <button className="px-2 py-1 border rounded text-sm hover:bg-white/10 cursor-pointer">
                Clear PCs
              </button>
            </ConfirmPopover>
          </div>

          {/* Presets group */}
          <div className="flex items-center gap-2 rounded-lg border px-2 py-1">
            <span className="text-xs opacity-70">NPC Presets</span>
            <button
              className="px-2 py-1 border rounded text-sm hover:bg-white/10 cursor-pointer inline-flex items-center gap-1"
              onClick={exportPresets}
              title="Export NPC Presets to CSV"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <ConfirmPopover
              onConfirm={() => filePresetRef.current?.click()}
              message="Importing will OVERWRITE all NPC presets with the CSV contents. Continue?"
              confirmLabel="Import CSV"
              cancelLabel="Cancel"
              align="right"
            >
              <button
                className="px-2 py-1 border rounded text-sm hover:bg-white/10 cursor-pointer inline-flex items-center gap-1"
                title="Import NPC Presets from CSV (strict schema)"
              >
                <Upload className="h-4 w-4" /> Import
              </button>
            </ConfirmPopover>
            <div className="hidden sm:block h-6 w-px bg-white/10" />
            <ConfirmPopover
              onConfirm={clearAllPresets}
              message="Remove all NPC presets? This does not affect PCs."
              confirmLabel="Clear Presets"
              cancelLabel="Cancel"
              align="right"
            >
              <button className="px-2 py-1 border rounded text-sm hover:bg-white/10 cursor-pointer">
                Clear Presets
              </button>
            </ConfirmPopover>
          </div>
        </div>
      </header>

      {/* PCs Section */}
      <section className="rounded-lg border">
        <div className="p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 grid place-items-center rounded-full border bg-green-500/10 border-green-500/30 text-green-300">
              <User className="h-3.5 w-3.5" />
            </span>
            <h2 className="font-semibold">PCs</h2>
            <span className="text-xs opacity-70">({pcs.length})</span>
          </div>
          <Button onClick={addPC}><Plus className="h-4 w-4 mr-1" /> Add PC</Button>
        </div>

        <div className="px-2 pb-3">
          <table className="w-full text-left table-fixed">
            <thead className="bg-black/10">
              <tr>
                <th className="px-3 py-2 w-[32%] min-w-[220px]">Name</th>
                <th className="px-3 py-2 w-[12%]">AC</th>
                <th className="px-3 py-2 w-[18%]">HP (cur)</th>
                <th className="px-3 py-2 w-[18%]">HP (max)</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2 w-[90px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pcs.map((pc) => {
                const hp = hpToDisplay(pc);
                return (
                  <tr key={pc.id} className="border-t">
                    <td className="px-3 py-2">
                      <input
                        className="px-2 py-1 border rounded bg-transparent w-full"
                        value={pc.name || ""}
                        onChange={(e) => updatePC(pc.id, { name: e.target.value })}
                        placeholder="Name"
                        title={pc.name}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="px-2 py-1 border rounded bg-transparent w-full"
                        value={pc.ac ?? ""}
                        onChange={(e) =>
                          updatePC(pc.id, {
                            ac: e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="px-2 py-1 border rounded bg-transparent w-full"
                        value={hp.current ?? ""}
                        onChange={(e) => updatePCHP(pc.id, e.target.value === "" ? undefined : Number(e.target.value), hp.max)}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="px-2 py-1 border rounded bg-transparent w-full"
                        value={hp.max ?? ""}
                        onChange={(e) => updatePCHP(pc.id, hp.current, e.target.value === "" ? undefined : Number(e.target.value))}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
  <div className="inline-flex items-center gap-2">
    <a
      href={`/characters/sheet/${pc.id}`}
      className="px-2 py-1 border rounded text-xs hover:bg-white/10 cursor-pointer"
      title="Open character sheet"
    >
      Sheet
    </a>
    <ConfirmPopover
      onConfirm={() => removePC(pc.id)}
      message={`Remove "${pc.name || "this PC"}"?`}
      confirmLabel="Remove"
      cancelLabel="Cancel"
      align="right"
    >
      <button
        className="px-2 py-1 border rounded text-xs hover:bg-white/10 cursor-pointer"
        title="Remove"
      >
        <Trash2 className="h-4 w-4 inline-block" />
      </button>
    </ConfirmPopover>
  </div>
</td>

                  </tr>
                );
              })}

              {pcs.length === 0 && (
                <tr>
                  <td className="px-3 py-6 opacity-70" colSpan={6}>
                    No PCs yet. Use <b>Add PC</b> to create your party — or import from a CSV. The Encounter Suite can sync from here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* NPC Presets Section */}
      <section className="rounded-lg border">
        <div className="p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 grid place-items-center rounded-full border bg-blue-500/10 border-blue-500/30 text-blue-300">
              <Users className="h-3.5 w-3.5" />
            </span>
            <h2 className="font-semibold">NPC Presets</h2>
            <span className="text-xs opacity-70">({presets.length})</span>
          </div>
          <Button onClick={addPreset}><Plus className="h-4 w-4 mr-1" /> Add Preset</Button>
        </div>

        <div className="px-2 pb-3">
          <table className="w-full text-left table-fixed">
            <thead className="bg-black/10">
              <tr>
                <th className="px-3 py-2 w-[30%] min-w-[220px]">Name</th>
                <th className="px-3 py-2 w-[12%]">AC</th>
                <th className="px-3 py-2 w-[18%]">HP (cur)</th>
                <th className="px-3 py-2 w-[18%]">HP (max)</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2 w-[90px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {presets.map((np) => {
                const anyHp: any = np.hp || {};
                const cur = clampNumber(anyHp.current);
                const max = clampNumber(anyHp.max);
                return (
                  <tr key={np.id} className="border-t">
                    <td className="px-3 py-2">
                      <input
                        className="px-2 py-1 border rounded bg-transparent w-full"
                        value={np.name || ""}
                        onChange={(e) => updatePreset(np.id, { name: e.target.value })}
                        placeholder="Name"
                        title={np.name}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="px-2 py-1 border rounded bg-transparent w-full"
                        value={np.ac ?? ""}
                        onChange={(e) =>
                          updatePreset(np.id, {
                            ac: e.target.value === "" ? undefined : Number(e.target.value),
                          } as any)
                        }
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="px-2 py-1 border rounded bg-transparent w-full"
                        value={cur ?? ""}
                        onChange={(e) => updatePresetHP(np.id, e.target.value === "" ? undefined : Number(e.target.value), max)}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="px-2 py-1 border rounded bg-transparent w-full"
                        value={max ?? ""}
                        onChange={(e) => updatePresetHP(np.id, cur, e.target.value === "" ? undefined : Number(e.target.value))}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="px-2 py-1 border rounded bg-transparent w-full"
                        value={(np as any).notes || ""}
                        onChange={(e) => updatePreset(np.id, { notes: e.target.value } as any)}
                        placeholder="Notes"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <ConfirmPopover
                        onConfirm={() => removePreset(np.id)}
                        message={`Remove preset "${np.name || "this NPC"}"?`}
                        confirmLabel="Remove"
                        cancelLabel="Cancel"
                        align="right"
                      >
                        <button className="px-2 py-1 border rounded text-xs hover:bg-white/10 cursor-pointer" title="Remove">
                          <Trash2 className="h-4 w-4 inline-block" />
                        </button>
                      </ConfirmPopover>
                    </td>
                  </tr>
                );
              })}

              {presets.length === 0 && (
                <tr>
                  <td className="px-3 py-6 opacity-70" colSpan={6}>
                    No presets yet. Use <b>Add Preset</b> or import from CSV. Edits here are mirrored to the Characters blob.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
