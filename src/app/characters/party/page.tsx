"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pcsStore, newId, type PC } from "@/lib/characters";
import { downloadJSON, uploadJSON } from "@/lib/io";
import { toast } from "sonner";

export default function PartyPage() {
  const [pcs, setPcs] = useState<PC[]>([]);
  useEffect(() => { setPcs(pcsStore.get()); }, []);
  useEffect(() => { pcsStore.set(pcs); }, [pcs]);

  function addPC() {
    setPcs(p => [...p, { id: newId(), name: "New PC", initMod: 0 }]);
  }
  function delPC(id: string) {
    setPcs(p => p.filter(x => x.id !== id));
  }
  function updPC(id: string, patch: Partial<PC>) {
    setPcs(p => p.map(x => x.id === id ? { ...x, ...patch } : x));
  }

  async function onExport() {
    downloadJSON("pcs.json", pcs);
    toast.success("Exported PCs");
  }

  async function onImport() {
    try {
      const data = await uploadJSON();
      const arr = data as unknown;
      if (!Array.isArray(arr)) throw new Error("JSON is not an array");
      // minimal shape check
      const imported: PC[] = arr.map((r) => {
        const o = r as Record<string, unknown>;
        return {
          id: typeof o.id === "string" ? (o.id as string) : newId(),
          name: String(o.name ?? "Unnamed"),
          initMod: typeof o.initMod === "number" ? (o.initMod as number) : undefined,
          ac: typeof o.ac === "number" ? (o.ac as number) : undefined,
          hp: typeof o.hp === "string" ? (o.hp as string) : undefined,
          passive: typeof o.passive === "number" ? (o.passive as number) : undefined,
          notes: typeof o.notes === "string" ? (o.notes as string) : undefined,
        };
      });
      setPcs(imported);
      toast.success(`Imported ${imported.length} PCs`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  }

  return (
    <Card className="bg-parchment/90">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Party (PCs)</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onExport}>Export</Button>
          <Button variant="outline" onClick={onImport}>Import</Button>
          <Button onClick={addPC}>+ Add PC</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pcs.length === 0 && <div className="opacity-70 text-sm">No PCs yet. Add your party.</div>}
        {pcs.map(pc => (
          <div key={pc.id} className="rounded border bg-white/70 p-3 grid md:grid-cols-6 gap-2 items-center">
            <Input value={pc.name} onChange={e=>updPC(pc.id, { name: e.target.value })} placeholder="Name" />
            <Input value={pc.initMod?.toString() ?? ""} onChange={e=>updPC(pc.id, { initMod: Number(e.target.value||0) })} placeholder="Init Mod" />
            <Input value={pc.ac?.toString() ?? ""} onChange={e=>updPC(pc.id, { ac: e.target.value?Number(e.target.value):undefined })} placeholder="AC" />
            <Input value={pc.hp ?? ""} onChange={e=>updPC(pc.id, { hp: e.target.value })} placeholder="HP e.g. 27/31" />
            <Input value={pc.passive?.toString() ?? ""} onChange={e=>updPC(pc.id, { passive: e.target.value?Number(e.target.value):undefined })} placeholder="Passive Perception" />
            <div className="flex gap-2">
              <Button variant="destructive" onClick={()=>delPC(pc.id)}>Delete</Button>
            </div>
          </div>
        ))}
        <div className="text-xs opacity-70">Tracker rolls 1d20 + Init Mod when adding a PC preset.</div>
      </CardContent>
    </Card>
  );
}
