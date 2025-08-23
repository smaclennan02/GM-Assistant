"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { npcsStore, newId, type NPCPreset, type Attitude } from "@/lib/characters";
import { downloadJSON, uploadJSON } from "@/lib/io";
import { toast } from "sonner";

const attitudes: Attitude[] = ["Friendly", "Neutral", "Hostile", "Other"];

function parseTags(s: string): string[] {
  return Array.from(new Set(
    s.split(",").map(t => t.trim()).filter(Boolean)
  ));
}

export default function NPCPresetsPage() {
  const [npcs, setNPCs] = useState<NPCPreset[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { setNPCs(npcsStore.get()); }, []);
  useEffect(() => { npcsStore.set(npcs); }, [npcs]);

  function add() {
    setNPCs(p => [...p, { id: newId(), name: "New NPC", attitude: "Neutral", tags: [] }]);
  }
  function del(id: string) {
    setNPCs(p => p.filter(x => x.id !== id));
  }
  function upd(id: string, patch: Partial<NPCPreset>) {
    setNPCs(p => p.map(x => x.id === id ? { ...x, ...patch } : x));
  }

  async function onExport() {
    downloadJSON("npcs.json", npcs);
    toast.success("Exported NPC presets");
  }
  async function onImport() {
    try {
      const data = await uploadJSON();
      const arr = data as unknown;
      if (!Array.isArray(arr)) throw new Error("JSON is not an array");
      const imported: NPCPreset[] = arr.map((r: any) => ({
        id: typeof r.id === "string" ? r.id : newId(),
        name: String(r.name ?? "Unnamed"),
        init: typeof r.init === "number" ? r.init : undefined,
        ac: typeof r.ac === "number" ? r.ac : undefined,
        hp: typeof r.hp === "string" ? r.hp : undefined,
        notes: typeof r.notes === "string" ? r.notes : undefined,
        attitude: (attitudes as string[]).includes(r.attitude) ? (r.attitude as Attitude) : "Neutral",
        tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
      }));
      setNPCs(imported);
      toast.success(`Imported ${imported.length} NPCs`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return npcs;
    return npcs.filter(n =>
      n.name.toLowerCase().includes(s) ||
      (n.tags || []).some(t => t.toLowerCase().includes(s)) ||
      (n.attitude || "").toLowerCase().includes(s)
    );
  }, [npcs, q]);

  return (
    <Card className="bg-parchment/90">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>NPC Presets</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onExport}>Export</Button>
          <Button variant="outline" onClick={onImport}>Import</Button>
          <Button onClick={add}>+ Add NPC</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Search name, tag, attitude…" value={q} onChange={e=>setQ(e.target.value)} />
        </div>

        {filtered.length === 0 && <div className="opacity-70 text-sm">No matching NPCs.</div>}

        {filtered.map(n => (
          <div key={n.id} className="rounded border bg-white/70 p-3 grid md:grid-cols-7 gap-2 items-center">
            <Input value={n.name} onChange={e=>upd(n.id, { name: e.target.value })} placeholder="Name" />
            <Input value={n.init?.toString() ?? ""} onChange={e=>upd(n.id, { init: e.target.value?Number(e.target.value):undefined })} placeholder="Init (optional)" />
            <Input value={n.ac?.toString() ?? ""} onChange={e=>upd(n.id, { ac: e.target.value?Number(e.target.value):undefined })} placeholder="AC (optional)" />
            <Input value={n.hp ?? ""} onChange={e=>upd(n.id, { hp: e.target.value })} placeholder="HP (optional)" />
            <select
              className="border rounded px-2 py-2 bg-white/80 text-sm"
              value={n.attitude ?? "Neutral"}
              onChange={e=>upd(n.id, { attitude: e.target.value as Attitude })}
              title="Attitude"
            >
              {attitudes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <Input
              value={(n.tags || []).join(", ")}
              onChange={e=>upd(n.id, { tags: parseTags(e.target.value) })}
              placeholder="tags, comma, separated"
            />
            <div className="flex gap-2">
              <Button variant="destructive" onClick={()=>del(n.id)}>Delete</Button>
            </div>
          </div>
        ))}
        <div className="text-xs opacity-70">
          Tip: In Tracker, NPCs are in the secondary preset dropdown; PCs are first.
        </div>
      </CardContent>
    </Card>
  );
}
