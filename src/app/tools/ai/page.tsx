"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wand2, Dice5, Copy, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import type { NPC, Monster } from "@/lib/types";
import { types as monsterTypes } from "@/lib/generators/monster";

/* ---------- helpers ---------- */
function toGMPrompt(npc: NPC) {
  return [
    `Create dialogue as this NPC in a D&D 5e scene.`,
    `Name: ${npc.name}`,
    `Ancestry: ${npc.ancestry}`,
    `Occupation: ${npc.occupation}`,
    `Disposition: ${npc.disposition}`,
    `Quirk: ${npc.quirk}`,
    `Bond: ${npc.bond}`,
    `Ideal: ${npc.ideal}`,
    `Flaw: ${npc.flaw}`,
    `Voice hint: ${npc.voiceHint}`,
    `Hook: ${npc.hook}`,
  ].join("\n");
}
function toNPCStat(npc: NPC) {
  return `${npc.name} (${npc.ancestry} ${npc.occupation})
- Disposition: ${npc.disposition}
- Quirk: ${npc.quirk}
- Bond: ${npc.bond}
- Ideal: ${npc.ideal}
- Flaw: ${npc.flaw}
- Voice: ${npc.voiceHint}
- Hook: ${npc.hook}
#${npc.id}`;
}
function toMonsterBlock(m: Monster) {
  const ability = (v: number) => `${v} (${v >= 10 ? "+" : ""}${Math.floor((v - 10) / 2)})`;
  const traitLines = m.traits.map(t => `***${t.name}.*** ${t.desc}`).join("\n");
  const actionLines = m.actions.map(a => `***${a.name}.*** ${a.desc}`).join("\n");
  const senses = (m.senses ?? []).join(", ");
  const langs = (m.languages ?? []).join(", ");
  const saves = (m.savingThrows ?? []).join(", ") || "—";
  const skills = (m.skills ?? []).join(", ") || "—";
  const res = (m.resistances ?? []).join(", ") || "—";
  const imm = (m.immunities ?? []).join(", ") || "—";
  const vul = (m.vulnerabilities ?? []).join(", ") || "—";

  return `***${m.name}***
*${m.size} ${m.type}, ${m.alignment}*
___
**Armor Class** ${m.armorClass}
**Hit Points** ${m.hitPoints} (${m.hitDice})
**Speed** ${m.speed}
___
**STR** ${ability(m.str)}  **DEX** ${ability(m.dex)}  **CON** ${ability(m.con)}  **INT** ${ability(m.int)}  **WIS** ${ability(m.wis)}  **CHA** ${ability(m.cha)}
___
**Saving Throws** ${saves}
**Skills** ${skills}
**Vulnerabilities** ${vul}
**Resistances** ${res}
**Immunities** ${imm}
**Senses** ${senses}
**Languages** ${langs}
**Challenge** ${m.challenge}
___
${traitLines}

***Actions***
${actionLines}

#${m.id}`;
}

/* ---------- page ---------- */
export default function AIToolsPage() {
  // NPC state
  const [npcLoading, setNpcLoading] = useState(false);
  const [npc, setNpc] = useState<NPC | null>(null);
  const [ancestry, setAncestry] = useState("");
  const [occupation, setOccupation] = useState("");
  const [npcSeed, setNpcSeed] = useState("");

  // Monster state
  const [monLoading, setMonLoading] = useState(false);
  const [mon, setMon] = useState<Monster | null>(null);
  const [typeHint, setTypeHint] = useState<typeof monsterTypes[number] | "">("");
  const [crHint, setCrHint] = useState("");
  const [monSeed, setMonSeed] = useState("");

  const copy = (text: string, label: string) =>
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied`),
      () => toast.error(`Failed to copy ${label}`)
    );

const genNPC = useCallback(async () => {
  setNpcLoading(true);
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: "npc",
        options: {
          seed: npcSeed || undefined,
          ancestry: ancestry || undefined,
          occupation: occupation || undefined,
        },
      }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to generate");
    setNpc(json.data);
    toast.success("NPC generated");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    toast.error(msg);
  } finally {
    setNpcLoading(false);
  }
}, [ancestry, occupation, npcSeed]);

const genMonster = useCallback(async () => {
  if (typeHint && !monsterTypes.includes(typeHint)) {
    toast.error("Unsupported monster type");
    return;
  }
  setMonLoading(true);
  try {
    const crNum = Number(crHint);
    const opts: Record<string, unknown> = {
      typeHint: typeHint || undefined,
      seed: monSeed || undefined,
    };
    if (crHint) {
      if (Number.isFinite(crNum)) {
        opts.crHint = crNum;
      } else {
        toast.warning("Invalid CR hint. Ignoring value.");
      }
    }

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: "monster",
        options: opts,
      }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to generate");
    setMon(json.data);
    toast.success("Monster generated");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    toast.error(msg);
  } finally {
    setMonLoading(false);
  }
}, [typeHint, crHint, monSeed]);

  // keyboard: r → reroll whichever tab is visible
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() !== "r" || e.metaKey || e.ctrlKey || e.altKey) return;
    const tab = document.querySelector('[role="tab"][data-state="active"]') as HTMLElement | null;
    if (tab?.id?.includes("npc")) genNPC();
    if (tab?.id?.includes("monster")) genMonster();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [genNPC, genMonster]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wand2 className="size-5" />
        <h1 className="text-2xl font-semibold">AI Prompt Helper</h1>
      </div>

      <Tabs defaultValue="npc" className="space-y-4">
        <TabsList>
          <TabsTrigger id="tab-npc" value="npc">NPC</TabsTrigger>
          <TabsTrigger id="tab-monster" value="monster">Monster</TabsTrigger>
        </TabsList>

        {/* NPC TAB */}
        <TabsContent value="npc">
          <Card className="bg-parchment/90">
            <CardHeader><CardTitle>Random NPC</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm opacity-80">Ancestry (optional)</label>
                  <Input value={ancestry} onChange={(e) => setAncestry(e.target.value)} placeholder="Elf, Human…" />
                </div>
                <div>
                  <label className="text-sm opacity-80">Occupation (optional)</label>
                  <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Guard, Innkeeper…" />
                </div>
                <div>
                  <label className="text-sm opacity-80">Seed (optional)</label>
                  <Input value={npcSeed} onChange={(e) => setNpcSeed(e.target.value)} placeholder="Any text/number" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={genNPC} disabled={npcLoading} className="gap-2">
                  <Dice5 className="size-4" /> {npcLoading ? "Rolling…" : "Generate"}
                </Button>
                <Button variant="secondary" onClick={() => setNpc(null)}>Clear</Button>
                <Button variant="outline" onClick={genNPC} disabled={npcLoading} className="gap-2" title="Shortcut: 'r'">
                  <RefreshCcw className="size-4" /> Roll again
                </Button>
              </div>

              {npc && (
                <div className="mt-6 rounded-xl border p-4 bg-white/60">
                  <div className="text-lg font-semibold">{npc.name}</div>
                  <div className="opacity-80">{npc.ancestry} • {npc.occupation}</div>
                  <ul className="mt-3 space-y-1 text-sm">
                    <li><b>Disposition:</b> {npc.disposition}</li>
                    <li><b>Quirk:</b> {npc.quirk}</li>
                    <li><b>Bond:</b> {npc.bond}</li>
                    <li><b>Ideal:</b> {npc.ideal}</li>
                    <li><b>Flaw:</b> {npc.flaw}</li>
                    <li><b>Voice:</b> {npc.voiceHint}</li>
                    <li><b>Hook:</b> {npc.hook}</li>
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => copy(toGMPrompt(npc), "GM Prompt")}><Copy className="size-4" /> Copy GM Prompt</Button>
                    <Button variant="outline" className="gap-2" onClick={() => copy(toNPCStat(npc), "Statblock")}><Copy className="size-4" /> Copy Statblock</Button>
                  </div>
                  <div className="mt-3 text-xs opacity-70">Seed: {npcSeed || "(none)"} • ID: {npc.id}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MONSTER TAB */}
        <TabsContent value="monster">
          <Card className="bg-parchment/90">
            <CardHeader><CardTitle>Random Monster</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm opacity-80">Type hint (optional)</label>
                  <Input
                    value={typeHint}
                    onChange={(e) => setTypeHint(e.target.value as typeof monsterTypes[number] | "")}
                    list="monster-types"
                    placeholder="Undead, Beast, Fiend…"
                  />
                  <datalist id="monster-types">
                    {monsterTypes.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-sm opacity-80">CR hint (0–10, optional)</label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={crHint}
                    onChange={(e) => setCrHint(e.target.value)}
                    placeholder="e.g., 2"
                  />
                </div>
                <div>
                  <label className="text-sm opacity-80">Seed (optional)</label>
                  <Input value={monSeed} onChange={(e) => setMonSeed(e.target.value)} placeholder="Any text/number" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={genMonster} disabled={monLoading} className="gap-2">
                  <Dice5 className="size-4" /> {monLoading ? "Rolling…" : "Generate"}
                </Button>
                <Button variant="secondary" onClick={() => setMon(null)}>Clear</Button>
                <Button variant="outline" onClick={genMonster} disabled={monLoading} className="gap-2" title="Shortcut: 'r'">
                  <RefreshCcw className="size-4" /> Roll again
                </Button>
              </div>

              {mon && (
                <div className="mt-6 rounded-xl border p-4 bg-white/60">
                  <div className="text-lg font-semibold">{mon.name}</div>
                  <div className="opacity-80">{mon.size} • {mon.type} • {mon.alignment}</div>

                  <ul className="mt-3 space-y-1 text-sm">
                    <li><b>AC:</b> {mon.armorClass}</li>
                    <li><b>HP:</b> {mon.hitPoints} ({mon.hitDice})</li>
                    <li><b>Speed:</b> {mon.speed}</li>
                    <li><b>STR/DEX/CON/INT/WIS/CHA:</b> {mon.str}/{mon.dex}/{mon.con}/{mon.int}/{mon.wis}/{mon.cha}</li>
                    <li><b>Challenge:</b> {mon.challenge}</li>
                  </ul>

                  <div className="mt-2">
                    <div className="font-medium">Traits</div>
                    <ul className="list-disc ml-5 text-sm">
                      {mon.traits.map((t) => <li key={t.name}><b>{t.name}.</b> {t.desc}</li>)}
                    </ul>
                  </div>
                  <div className="mt-2">
                    <div className="font-medium">Actions</div>
                    <ul className="list-disc ml-5 text-sm">
                      {mon.actions.map((a) => <li key={a.name}><b>{a.name}.</b> {a.desc}</li>)}
                    </ul>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => copy(toMonsterBlock(mon), "Monster Statblock")}><Copy className="size-4" /> Copy Statblock</Button>
                  </div>

                  <div className="mt-3 text-xs opacity-70">Seed: {monSeed || "(none)"} • ID: {mon.id}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
