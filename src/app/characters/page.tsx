"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Upload, Download, Trash2, Info, Copy, Search } from "lucide-react";
import { STORAGE_KEYS } from "@/storage/keys";
import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { cn } from "@/lib/utils";
import { migrateCharactersIfNeeded } from "@/lib/migrations";
import type { CharactersState, PC } from "@/types/characters";

function downloadBlob(filename: string, data: string, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// CSV helpers (quoted fields supported)
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else cur += ch;
    } else {
      if (ch === ",") { out.push(cur); cur = ""; }
      else if (ch === '"') inQuotes = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function toCsv(rows: Array<Record<string, string | number | null | undefined>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h as keyof typeof r])).join(",")),
  ].join("\n");
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => (row[h] = cells[idx] ?? ""));
    rows.push(row);
  }
  return rows;
}

export default function CharactersPage() {
  // One-time migration: pull from legacy keys if empty
  useEffect(() => {
    migrateCharactersIfNeeded(STORAGE_KEYS.CHARACTERS);
  }, []);

  // >>> IMPORTANT: use the same options signature & shape as Encounters Suite
  const [chars, setChars] = useStorageState<CharactersState>({
    key: STORAGE_KEYS.CHARACTERS,
    driver: localDriver,
    initial: { pcs: [], npcs: [], updatedAt: Date.now() },
    version: 1,
  });

  const pcs = chars.pcs;

  // Active campaign + filter (safe if missing)
  const [activeCampaign] = useStorageState<string | null>({
    key: STORAGE_KEYS.ACTIVE_CAMPAIGN,
    driver: localDriver,
    initial: null,
    version: 1,
  });
  const [showAll, setShowAll] = useState(false);

  // Search
  const [q, setQ] = useState("");
  const visible = useMemo(() => {
    const base = (!activeCampaign || showAll) ? pcs : pcs.filter(p => p.campaignId === activeCampaign);
    if (!q.trim()) return base;
    const term = q.toLowerCase();
    return base.filter(p =>
      (p.name ?? "").toLowerCase().includes(term) ||
      (p.class ?? "").toLowerCase().includes(term)
    );
  }, [pcs, activeCampaign, showAll, q]);

  // Import
  const fileRef = useRef<HTMLInputElement>(null);
  function handleImportClick() { fileRef.current?.click(); }

  function updatePcs(mutator: (list: PC[]) => PC[]) {
    const next = mutator(pcs);
    setChars({ pcs: next, npcs: chars.npcs ?? [], updatedAt: Date.now() });
  }

  function handleClear() {
    if (confirm("Clear all characters?")) {
      setChars({ pcs: [], npcs: [], updatedAt: Date.now() });
    }
  }

  function handleExportJSON() {
    downloadBlob("characters.json", JSON.stringify(chars, null, 2), "application/json");
  }

  function handleExportCSV() {
    const csv = toCsv(
      pcs.map((p) => ({
        id: p.id,
        name: p.name,
        class: p.class ?? "",
        level: p.level ?? "",
        campaignId: (p as any).campaignId ?? "",
      }))
    );
    downloadBlob("characters.csv", csv, "text/csv;charset=utf-8");
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      if (file.name.endsWith(".json")) {
        const parsed = JSON.parse(text);
        const arr: PC[] = Array.isArray(parsed) ? parsed as PC[] : (parsed?.pcs ?? []);
        const cleaned: PC[] = arr.map((p) => ({
          id: p.id ?? crypto.randomUUID(),
          name: String(p.name ?? "Unnamed"),
          class: p.class,
          level: typeof p.level === "number" ? p.level : (p.level ? Number(p.level) : undefined),
          hp: p.hp,
          ac: p.ac,
          abilities: p.abilities,
          notes: p.notes,
          // preserve campaignId if present in your domain model
          ...(("campaignId" in (p as any)) ? { campaignId: (p as any).campaignId ?? null } : {}),
        }));
        setChars({ pcs: cleaned, npcs: chars.npcs ?? [], updatedAt: Date.now() });
        alert(`Imported ${cleaned.length} PCs from JSON.`);
      } else {
        // CSV path
        const rows = parseCsv(text);
        const cleaned: PC[] = rows.map((r) => ({
          id: r.id?.trim() ? r.id : crypto.randomUUID(),
          name: r.name || "Unnamed",
          class: r.class || undefined,
          level: r.level ? Number(r.level) : undefined,
          ...(r.campaignId ? { campaignId: r.campaignId } : {}),
        }));
        setChars({ pcs: cleaned, npcs: chars.npcs ?? [], updatedAt: Date.now() });
        alert(`Imported ${cleaned.length} PCs from CSV.`);
      }
    } catch (err) {
      console.error(err);
      alert("Import failed. Use JSON ({ pcs: [...] } or array) or CSV with headers id,name,class,level,campaignId");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleNew() {
    const id = crypto.randomUUID();
    updatePcs(list => [...list, { id, name: "New PC", class: "Adventurer", level: 1, ...(activeCampaign ? { campaignId: activeCampaign } : {}) } as PC]);
  }

  function handleDuplicate(pc: PC) {
    const id = crypto.randomUUID();
    updatePcs(list => [...list, { ...pc, id, name: (pc.name || "Unnamed") + " (Copy)" }]);
  }

  function handleDelete(pc: PC) {
    if (!confirm(`Delete ${pc.name || "this PC"}?`)) return;
    updatePcs(list => list.filter(p => p.id !== pc.id));
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Hidden file input for Import */}
      <input ref={fileRef} type="file" accept=".json,.csv" className="hidden" onChange={handleImportFile} />

      {/* Header controls */}
      <div className="flex flex-col gap-3 border rounded-lg p-3 bg-black/30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleImportClick} title="Import JSON/CSV">
              <Upload className="w-4 h-4 mr-1" /> Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON} title="Export JSON">
              <Download className="w-4 h-4 mr-1" /> Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} title="Export CSV">
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="w-4 h-4 mr-1" /> Clear
            </Button>
          </div>
          <div className="flex gap-2">
            {activeCampaign && (
              <Button variant="outline" size="sm" onClick={() => setShowAll(v => !v)}>
                {showAll ? "Showing All" : "Linked Only"}
              </Button>
            )}
            <Button size="sm" onClick={handleNew}>
              <Plus className="w-4 h-4 mr-1" /> New PC
            </Button>
          </div>
        </div>

        {/* Search row */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-black/20 w-full max-w-md">
            <Search className="w-4 h-4 opacity-70" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search PCs (name, class)…"
              className="bg-transparent border-0 focus-visible:ring-0"
            />
          </div>
          <div className="text-sm opacity-70 ml-auto">
            Showing <span className="font-medium">{visible.length}</span> of <span className="font-medium">{pcs.length}</span>
          </div>
        </div>
      </div>

      {/* PC grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {visible.map((pc) => (
          <Card key={pc.id} className={cn("bg-black/40 border rounded-xl hover:border-white/30 transition-colors")}>
            <CardHeader className="flex justify-between items-center pb-2">
              <CardTitle className="text-lg font-medium">
                <input
                  type="text"
                  value={pc.name ?? ""}
                  onChange={(e) => updatePcs(list => list.map(p => p.id === pc.id ? { ...p, name: e.target.value } : p))}
                  className="bg-transparent border-b border-white/20 focus:border-white/50 focus:outline-none"
                />
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" title="Duplicate" onClick={() => handleDuplicate(pc)}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button asChild variant="ghost" size="icon" title="Open Encounters Suite">
                  {/* Simple link to the suite so a user can load/sync PCs there */}
                  <a href="/encounters/suite">
                    <Info className="w-4 h-4" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(pc)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-70">Class</span>
                <input
                  type="text"
                  value={pc.class ?? ""}
                  onChange={(e) => updatePcs(list => list.map(p => p.id === pc.id ? { ...p, class: e.target.value } : p))}
                  className="bg-transparent border-b border-white/20 text-right focus:border-white/50 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-70">Level</span>
                <input
                  type="number"
                  min={1}
                  value={typeof pc.level === "number" ? pc.level : (pc.level ? Number(pc.level) : 1)}
                  onChange={(e) => updatePcs(list => list.map(p => p.id === pc.id ? { ...p, level: Number(e.target.value) || 1 } : p))}
                  className="bg-transparent border-b border-white/20 text-right focus:border-white/50 focus:outline-none w-16"
                />
              </div>
              {activeCampaign && (
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-70">Linked</span>
                  <input
                    type="checkbox"
                    checked={(pc as any).campaignId === activeCampaign}
                    onChange={(e) =>
                      updatePcs(list =>
                        list.map(p => p.id === pc.id ? { ...p, ...(e.target.checked ? { campaignId: activeCampaign } : { campaignId: null }) } : p)
                      )
                    }
                    className="accent-white"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {visible.length === 0 && (
          <div className="col-span-full text-center opacity-70 py-10">
            No PCs match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
