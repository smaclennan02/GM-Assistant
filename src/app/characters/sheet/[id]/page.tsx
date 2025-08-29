"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStorageState } from "@/storage/useStorageState";
import { localDriver } from "@/storage/localDriver";
import { STORAGE_KEYS } from "@/storage/keys";
import type { CharactersState, PC, PCSheet, AbilityKey, SkillKey, AbilityScores, SkillProfs } from "@/types/characters";
import { abilityMod, profBonusFromLevel, derivePassives, hydrateSheetFromPC, skillBonus, spellAttackBonus, spellSaveDC } from "@/lib/sheet";
import { ChevronLeft } from "lucide-react";

/**
 * Full D&D 5e character sheet (local & printable)
 */

// 5e skills (UI ordering)
const SKILLS: { key: SkillKey; label: string; abil: AbilityKey }[] = [
  { key: "acrobatics", label: "Acrobatics", abil: "dex" },
  { key: "animalHandling", label: "Animal Handling", abil: "wis" },
  { key: "arcana", label: "Arcana", abil: "int" },
  { key: "athletics", label: "Athletics", abil: "str" },
  { key: "deception", label: "Deception", abil: "cha" },
  { key: "history", label: "History", abil: "int" },
  { key: "insight", label: "Insight", abil: "wis" },
  { key: "intimidation", label: "Intimidation", abil: "cha" },
  { key: "investigation", label: "Investigation", abil: "int" },
  { key: "medicine", label: "Medicine", abil: "wis" },
  { key: "nature", label: "Nature", abil: "int" },
  { key: "perception", label: "Perception", abil: "wis" },
  { key: "performance", label: "Performance", abil: "cha" },
  { key: "persuasion", label: "Persuasion", abil: "cha" },
  { key: "religion", label: "Religion", abil: "int" },
  { key: "sleightOfHand", label: "Sleight of Hand", abil: "dex" },
  { key: "stealth", label: "Stealth", abil: "dex" },
  { key: "survival", label: "Survival", abil: "wis" },
];

export default function CharacterSheetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pcId = params?.id;

  const [chars, setChars] = useStorageState<CharactersState>({
    key: STORAGE_KEYS.CHARACTERS,
    driver: localDriver,
    initial: { pcs: [], npcs: [], updatedAt: 0 },
    version: 1,
  });

  const pc = useMemo<PC | undefined>(() => {
    const list = (chars?.pcs as PC[]) || [];
    return list.find((p) => p.id === pcId);
  }, [chars, pcId]);
  const [editing, setEditing] = useState(false);

  if (!pc) {
    return (
      <div className="space-y-4">
        <header className="rounded-lg border p-4 flex items-center gap-3">
          <button
            className="h-8 w-8 grid place-items-center rounded border hover:bg-white/10"
            onClick={() => router.push("/characters")}
            title="Back"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-bold">Character not found</h1>
        </header>
        <div className="rounded-lg border p-4 text-sm opacity-80">
          No PC with id <b>{pcId}</b>.
        </div>
      </div>
    );
  }

  // Hydrate full sheet from PC (empty when not found)
  const sheet: PCSheet = pc ? hydrateSheetFromPC(pc as PC) : ({} as PCSheet);

  const updatePC = (patch: Partial<PC>) => {
    setChars((prev) => ({
      ...prev,
      pcs: (prev.pcs || []).map((p) => (p.id === pc.id ? { ...p, ...patch } : p)),
      updatedAt: Date.now(),
    }));
  };

  const updateSheet = (patch: Partial<PCSheet>) => {
    setChars((prev) => ({
      ...prev,
      pcs: (prev.pcs || []).map((p) =>
        p.id === pc.id ? { ...p, sheet: { ...(p.sheet || {}), ...patch } } : p
      ),
      updatedAt: Date.now(),
    }));
  };

  // Derived / fallbacks
  const ac = sheet.combat?.ac ?? pc.ac;
  const hpCur = sheet.combat?.hp?.current ?? pc.hp?.current;
  const hpMax = sheet.combat?.hp?.max ?? pc.hp?.max;
  const pb = sheet.profBonus ?? profBonusFromLevel(sheet.identity?.level ?? pc.level);
  const passives = derivePassives(sheet);

  return (
    <div className="sheet-container space-y-4">
      {/* Header */}
      <header className="rounded-lg border p-4 flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <button
            className="h-8 w-8 grid place-items-center rounded border hover:bg-white/10"
            onClick={() => router.push("/characters")}
            title="Back"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Character Sheet</h1>
            <p className="text-xs opacity-70">D&D 5e • Local and printable</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-8 px-3 rounded border text-sm inline-flex items-center gap-1 hover:bg-white/10"
            onClick={() => setEditing(v => !v)}
            title={editing ? "Done" : "Edit"}
          >
            {editing ? "Done" : "Edit"}
          </button>
          <button
            className="no-print h-8 px-3 rounded border text-sm inline-flex items-center gap-1 hover:bg-white/10"
            onClick={() => window.print()}
            title="Print"
          >
            Print
          </button>
          <div className="text-xs opacity-70">ID: <b>{pc.id}</b></div>
        </div>
      </header>

      {/* Identity */}
      <section className="rounded-lg border p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <Labeled>
            <label className="text-xs opacity-70">Name</label>
             {editing ? (
              <input className="px-2 py-1 border rounded bg-transparent w-full" value={pc.name} onChange={(e)=>updatePC({ name: e.target.value })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5">{pc.name || "Untitled"}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Class / Subclass</label>
            {editing ? (
              <div className="grid grid-cols-2 gap-2">
                <input className="px-2 py-1 border rounded bg-transparent w-full" value={sheet.identity?.class || ""} onChange={(e)=>updateSheet({ identity: { ...(sheet.identity||{}), class: e.target.value } })} placeholder="Fighter" />
                <input className="px-2 py-1 border rounded bg-transparent w-full" value={sheet.identity?.subclass || ""} onChange={(e)=>updateSheet({ identity: { ...(sheet.identity||{}), subclass: e.target.value } })} placeholder="Champion" />
              </div>
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5">{[sheet.identity?.class, sheet.identity?.subclass].filter(Boolean).join(" – ") || "-"}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Level</label>
            {editing ? (
              <input type="number" className="px-2 py-1 border rounded bg-transparent w-full" value={sheet.identity?.level ?? pc.level ?? ""} onChange={(e)=>updateSheet({ identity: { ...(sheet.identity||{}), level: e.target.value===""? undefined : Number(e.target.value) } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5">{sheet.identity?.level ?? pc.level ?? "-"}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Race</label>
            {editing ? (
              <input className="px-2 py-1 border rounded bg-transparent w-full" value={sheet.identity?.race || ""} onChange={(e)=>updateSheet({ identity: { ...(sheet.identity||{}), race: e.target.value } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5">{sheet.identity?.race || "-"}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Background</label>
            {editing ? (
              <input className="px-2 py-1 border rounded bg-transparent w-full" value={sheet.identity?.background || ""} onChange={(e)=>updateSheet({ identity: { ...(sheet.identity||{}), background: e.target.value } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5">{sheet.identity?.background || "-"}</div>
            )}
          </Labeled>
          <Labeled className="md:col-span-1">
            <label className="text-xs opacity-70">Created / Updated</label>
            <div className=\ text-sm opacity-70 p-2 border rounded\>- • -</div>
          </Labeled>
        </div>
      </section>

      {/* Core Grid (desktop) */}
      <div className="xl:grid xl:grid-cols-12 xl:gap-3">

      {/* Abilities (Left) */}
      <div className="xl:col-span-3 order-2 xl:order-1">
      <section className="rounded-lg border p-3 space-y-3">
        <h2 className="font-semibold">Abilities</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {(["str","dex","con","int","wis","cha"] as AbilityKey[]).map((k) => (
            <div key={k} className="rounded-lg border p-2 space-y-2">
              <div className="text-xs opacity-70">{k.toUpperCase()}</div>
              {editing ? (
                <input
                  type="number"
                  className="px-2 py-1 border rounded bg-transparent w-full"
                  value={sheet.abilities?.[k] ?? ""}
                  onChange={(e) => {
                    const nextVal = e.target.value === "" ? undefined : Number(e.target.value);
                    const nextAbilities: Record<string, number | undefined> = { ...(sheet.abilities || {}) } as Record<string, number | undefined>;
                    nextAbilities[k] = nextVal;
                    updateSheet({ abilities: nextAbilities as unknown as AbilityScores });
                  }}
                  placeholder="10"
                />
              ) : (
                <div className="text-sm p-2 border rounded bg-white/5">{sheet.abilities?.[k] ?? "-"}</div>
              )}
              <div className="text-xs opacity-70">Mod</div>
              <div className="text-lg font-semibold leading-none">{fmtMod(abilityMod(sheet.abilities?.[k]))}</div>
            </div>
          ))}
        </div>
      </section>
      </div>

      {/* Senses & Proficiency (Left) */}
      <div className="xl:col-span-3 order-3 xl:order-2">
      <section className="rounded-lg border p-3 space-y-3">
        <h2 className="font-semibold">Senses & Proficiency</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Labeled>
            <label className="text-xs opacity-70">Proficiency Bonus</label>
            <div className="text-sm p-2 border rounded bg-white/5">{pb > 0 ? `+${pb}` : pb}</div>
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Alignment</label>
            {editing ? (
              <input className="px-2 py-1 border rounded bg-transparent w-full" value={sheet.identity?.alignment || ""} onChange={(e)=>updateSheet({ identity: { ...(sheet.identity||{}), alignment: e.target.value } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5">{sheet.identity?.alignment || "-"}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">XP</label>
            {editing ? (
              <input type="number" className="px-2 py-1 border rounded bg-transparent w-full" value={sheet.identity?.xp ?? ""} onChange={(e)=>updateSheet({ identity: { ...(sheet.identity||{}), xp: e.target.value===""? undefined : Number(e.target.value) } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5">{sheet.identity?.xp ?? "-"}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Passive Perception</label>
            <div className="text-sm p-2 border rounded bg-white/5">{passives.per ?? "-"}</div>
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Passive Insight</label>
            <div className="text-sm p-2 border rounded bg-white/5">{passives.ins ?? "-"}</div>
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Passive Investigation</label>
            <div className="text-sm p-2 border rounded bg-white/5">{passives.inv ?? "-"}</div>
          </Labeled>
        </div>
        <Labeled>
          <label className="text-xs opacity-70">Other Senses</label>
          {editing ? (
            <input className="px-2 py-1 border rounded bg-transparent w-full" value={sheet.senses?.note || ""} onChange={(e)=>updateSheet({ senses: { ...(sheet.senses||{}), note: e.target.value } })} placeholder="e.g., Darkvision 60 ft." />
          ) : (
            <div className="text-sm p-2 border rounded bg-white/5 min-h-[24px]">{sheet.senses?.note || ""}</div>
          )}
        </Labeled>
        <Labeled>
          <label className="text-xs opacity-70">Inspiration</label>
          {editing ? (
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!sheet.inspiration} onChange={(e)=>updateSheet({ inspiration: e.target.checked })} />
              Inspired
            </label>
          ) : (
            <div className="text-sm p-2 border rounded bg-white/5">{sheet.inspiration ? "Yes" : "No"}</div>
          )}
        </Labeled>
      </section>
      </div>

      {/* Combat (Center) */}
      <div className="xl:col-span-5 order-1 xl:order-3">
      <section className="rounded-lg border p-3 space-y-3">
        <h2 className="font-semibold">Combat</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Labeled>
            <label className="text-xs opacity-70">AC</label>
            {editing ? (
              <input type="number" className="px-2 py-1 border rounded bg-transparent w-full" value={ac ?? ""} onChange={(e)=>updateSheet({ combat: { ...(sheet.combat||{}), ac: e.target.value===""? undefined : Number(e.target.value) } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5">{ac ?? "-"}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Initiative</label>
            {editing ? (
              <input type="number" className="px-2 py-1 border rounded bg-transparent w-full" value={sheet.combat?.initiativeMod ?? ""} onChange={(e)=>updateSheet({ combat: { ...(sheet.combat||{}), initiativeMod: e.target.value===""? undefined : Number(e.target.value) } })} placeholder={`DEX mod ${fmtMod(abilityMod(sheet.abilities?.dex))}`} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5">{fmtMod((sheet.combat?.initiativeMod ?? abilityMod(sheet.abilities?.dex)))}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Speed (ft)</label>
            {editing ? (
              <input type="number" className="px-2 py-1 border rounded bg-transparent w-full" value={sheet.combat?.speed ?? ""} onChange={(e)=>updateSheet({ combat: { ...(sheet.combat||{}), speed: e.target.value===""? undefined : Number(e.target.value) } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5">{sheet.combat?.speed ?? "-"}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Hit Dice</label>
            {editing ? (
              <input className="px-2 py-1 border rounded bg-transparent w-full" value={sheet.combat?.hitDice || ""} onChange={(e)=>updateSheet({ combat: { ...(sheet.combat||{}), hitDice: e.target.value } })} placeholder="3d10" />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5">{sheet.combat?.hitDice || "-"}</div>
            )}
          </Labeled>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Labeled>
            <label className="text-xs opacity-70">HP</label>
            {editing ? (
              <div className="flex items-center gap-2">
                <input type="number" className="px-2 py-1 border rounded bg-transparent w-24" value={hpCur ?? ""} onChange={(e)=>updateSheet({ combat: { ...(sheet.combat||{}), hp: { ...(sheet.combat?.hp||{}), current: e.target.value===""? undefined : Number(e.target.value) } } })} placeholder="cur" />
                <span className="opacity-70">/</span>
                <input type="number" className="px-2 py-1 border rounded bg-transparent w-24" value={hpMax ?? ""} onChange={(e)=>updateSheet({ combat: { ...(sheet.combat||{}), hp: { ...(sheet.combat?.hp||{}), max: e.target.value===""? undefined : Number(e.target.value) } } })} placeholder="max" />
              </div>
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5">{typeof hpCur === "number" && typeof hpMax === "number" ? `${hpCur}/${hpMax}` : (typeof hpCur === "number" ? hpCur : "-")}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Temp HP</label>
            {editing ? (
              <input type="number" className="px-2 py-1 border rounded bg-transparent w-full" value={sheet.combat?.hp?.temp ?? ""} onChange={(e)=>updateSheet({ combat: { ...(sheet.combat||{}), hp: { ...(sheet.combat?.hp||{}), temp: e.target.value===""? undefined : Number(e.target.value) } } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5">{sheet.combat?.hp?.temp ?? "-"}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Death Saves</label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-xs opacity-70">Success</span>
                {[0,1,2].map((i)=>{
                  const filled = (sheet.combat?.deathSaves?.success ?? 0) > i;
                  return (
                    <button key={i} className={`h-5 w-5 rounded-full border ${filled? 'bg-white/80 text-black' : 'bg-transparent'}`} onClick={()=>{
                      if(!editing) return; const val = i+1; updateSheet({ combat: { ...(sheet.combat||{}), deathSaves: { ...(sheet.combat?.deathSaves||{}), success: val } } });
                    }} title={`${i+1}`}></button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs opacity-70">Fail</span>
                {[0,1,2].map((i)=>{
                  const filled = (sheet.combat?.deathSaves?.fail ?? 0) > i;
                  return (
                    <button key={i} className={`h-5 w-5 rounded-full border ${filled? 'bg-white/80 text-black' : 'bg-transparent'}`} onClick={()=>{
                      if(!editing) return; const val = i+1; updateSheet({ combat: { ...(sheet.combat||{}), deathSaves: { ...(sheet.combat?.deathSaves||{}), fail: val } } });
                    }} title={`${i+1}`}></button>
                  );
                })}
              </div>
            </div>
          </Labeled>
        </div>
      </section>
      </div>

      {/* Skills (Left, below saving throws) */}
      <div className="xl:col-span-3 order-4">
      <section className="rounded-lg border p-3 space-y-3">
        <h2 className="font-semibold">Skills</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {SKILLS.map(({ key, label, abil }) => {
            const rank = sheet.skills?.[key] ?? "none";
            const bonus = skillBonus(key, sheet.abilities, sheet.skills, pb);
            return (
              <div key={key} className="flex items-center justify-between rounded border p-2">
                <div className="text-sm">
                  <div className="font-medium">{label}</div>
                  <div className="text-xs opacity-70">{abil.toUpperCase()}</div>
                </div>
                <div className="flex items-center gap-2">
                  {editing ? (
                    <select
                      className="px-2 py-1 border rounded bg-transparent text-sm"
                      value={rank}
                      onChange={(e)=>{
                        const nextSkills: Record<string, "none"|"proficient"|"expertise"> = { ...(sheet.skills || {}) } as Record<string, "none"|"proficient"|"expertise">;
                        nextSkills[key] = e.target.value as "none"|"proficient"|"expertise";
                        updateSheet({ skills: nextSkills as unknown as SkillProfs });
                      }}
                    >
                      <option value="none">none</option>
                      <option value="proficient">proficient</option>
                      <option value="expertise">expertise</option>
                    </select>
                  ) : (
                    <div className="text-xs opacity-70">{rank}</div>
                  )}
                  <div className="text-sm font-semibold w-10 text-right">{fmtMod(bonus)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </div>

      {/* Saves */}
      <section className="rounded-lg border p-3 space-y-3">
        <h2 className="font-semibold">Saving Throws</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {(["str","dex","con","int","wis","cha"] as AbilityKey[]).map((k) => {
            const prof = !!sheet.saves?.[k];
            const bonus = abilityMod(sheet.abilities?.[k]) + (prof ? pb : 0);
            return (
              <div key={k} className="flex items-center justify-between rounded border p-2">
                <div className="text-sm">
                  <div className="font-medium">{k.toUpperCase()}</div>
                  <div className="text-xs opacity-70">Save</div>
                </div>
                <div className="flex items-center gap-2">
                  {editing ? (
                    <label className="text-xs inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={prof}
                        onChange={(e) => {
                          const next: Record<string, boolean> = { ...(sheet.saves || {}) } as Record<string, boolean>;
                          if (e.target.checked) next[k] = true; else delete next[k];
                          updateSheet({ saves: next as Partial<Record<AbilityKey, boolean>> });
                        }}
                      />
                      prof
                    </label>
                  ) : (
                    <div className="text-xs opacity-70">{prof ? "proficient" : ""}</div>
                  )}
                  <div className="text-sm font-semibold w-10 text-right">{fmtMod(bonus)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Proficiencies & Languages */}
      <section className="rounded-lg border p-3 space-y-3">
        <h2 className="font-semibold">Proficiencies & Languages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Labeled>
            <label className="text-xs opacity-70">Proficiencies (comma or newline separated)</label>
            {editing ? (
              <textarea
                className="px-2 py-2 border rounded bg-transparent w-full min-h-[80px]"
                value={(sheet.proficiencies || []).join("\n")}
                onChange={(e) => {
                  const arr = e.target.value.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
                  updateSheet({ proficiencies: arr });
                }}
              />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5 min-h-[24px]">{(sheet.proficiencies || []).join(", ") || "-"}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Languages</label>
            {editing ? (
              <textarea
                className="px-2 py-2 border rounded bg-transparent w-full min-h-[80px]"
                value={(sheet.languages || []).join("\n")}
                onChange={(e) => {
                  const arr = e.target.value.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
                  updateSheet({ languages: arr });
                }}
              />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5 min-h-[24px]">{(sheet.languages || []).join(", ") || "-"}</div>
            )}
          </Labeled>
        </div>
      </section>

      {/* Equipment */}
      <section className="rounded-lg border p-3 space-y-3">
        <h2 className="font-semibold">Equipment</h2>
        {editing ? (
          <textarea
            className="px-2 py-2 border rounded bg-transparent w-full min-h-[120px]"
            value={(sheet.equipment || []).join("\n")}
            onChange={(e)=>{
              const arr = e.target.value.split(/\n|,/).map(s=>s.trim()).filter(Boolean);
              updateSheet({ equipment: arr });
            }}
            placeholder="Add one item per line"
          />
        ) : (
          <div className="space-y-1">
            {(sheet.equipment || []).length === 0 && <div className="text-sm opacity-70">No equipment listed.</div>}
            {(sheet.equipment || []).map((it, i)=>(
              <div key={i} className="text-sm p-2 border rounded bg-white/5">{it}</div>
            ))}
          </div>
        )}
      </section>

      {/* Attacks */}
      <section className="rounded-lg border p-3 space-y-3">
        <h2 className="font-semibold">Attacks</h2>
        <div className="space-y-2">
          {(sheet.attacks || []).length === 0 && !editing && (
            <div className="text-sm opacity-70">No attacks listed.</div>
          )}
          {(sheet.attacks || []).map((atk, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center border rounded p-2">
              <div className="md:col-span-2">
                <label className="text-xs opacity-70">Name</label>
                {editing ? (
                  <input
                    className="px-2 py-1 border rounded bg-transparent w-full"
                    value={atk.name}
                    onChange={(e) => {
                      const next = [...(sheet.attacks || [])];
                      next[i] = { ...next[i], name: e.target.value };
                      updateSheet({ attacks: next });
                    }}
                  />
                ) : (
                  <div className="text-sm p-2 border rounded bg-white/5">{atk.name || "-"}</div>
                )}
              </div>
              <div>
                <label className="text-xs opacity-70">Bonus</label>
                {editing ? (
                  <input
                    type="number"
                    className="px-2 py-1 border rounded bg-transparent w-full"
                    value={typeof atk.bonus === "number" ? atk.bonus : ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? undefined : Number(e.target.value);
                      const next = [...(sheet.attacks || [])];
                      next[i] = { ...next[i], bonus: v };
                      updateSheet({ attacks: next });
                    }}
                  />
                ) : (
                  <div className="text-sm p-2 border rounded bg-white/5">{typeof atk.bonus === "number" ? (atk.bonus >= 0 ? `+${atk.bonus}` : `${atk.bonus}`) : "-"}</div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-xs opacity-70">Damage</label>
                {editing ? (
                  <input
                    className="px-2 py-1 border rounded bg-transparent w-full"
                    value={atk.damage || ""}
                    onChange={(e) => {
                      const next = [...(sheet.attacks || [])];
                      next[i] = { ...next[i], damage: e.target.value };
                      updateSheet({ attacks: next });
                    }}
                    placeholder="e.g., 1d8+3 slashing"
                  />
                ) : (
                  <div className="text-sm p-2 border rounded bg-white/5">{atk.damage || "-"}</div>
                )}
              </div>
              <div className="md:col-span-5">
                <label className="text-xs opacity-70">Notes</label>
                {editing ? (
                  <input
                    className="px-2 py-1 border rounded bg-transparent w-full"
                    value={atk.notes || ""}
                    onChange={(e) => {
                      const next = [...(sheet.attacks || [])];
                      next[i] = { ...next[i], notes: e.target.value };
                      updateSheet({ attacks: next });
                    }}
                  />
                ) : (
                  <div className="text-sm p-2 border rounded bg-white/5 min-h-[24px]">{atk.notes || ""}</div>
                )}
              </div>
              {editing && (
                <div className="md:col-span-5 flex justify-end">
                  <button
                    className="px-2 py-1 border rounded text-xs hover:bg-white/10"
                    onClick={() => {
                      const next = [...(sheet.attacks || [])];
                      next.splice(i, 1);
                      updateSheet({ attacks: next });
                    }}
                    title="Remove attack"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
          {editing && (
            <div>
              <button
                className="px-3 py-1.5 border rounded text-xs hover:bg-white/10"
                onClick={() => updateSheet({ attacks: [ ...(sheet.attacks || []), { name: "New Attack" } ] })}
                title="Add attack"
              >
                + Add Attack
              </button>
            </div>
          )}
        </div>

        <div className="h-px bg-white/10" />

        <h2 className="font-semibold">Spellcasting</h2>
        {/* Spellcasting summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Labeled>
            <label className="text-xs opacity-70">Spellcasting Ability</label>
            {editing ? (
              <select
                className="px-2 py-1 border rounded bg-transparent text-sm"
                value={sheet.spellcasting?.ability || ""}
                onChange={(e) => {
                  const val = e.target.value as "int"|"wis"|"cha"|"";
                  updateSheet({ spellcasting: { ...(sheet.spellcasting || {}), ability: (val || undefined) as "int"|"wis"|"cha"|undefined } });
                }}
              >
                <option value="">(none)</option>
                <option value="int">INT</option>
                <option value="wis">WIS</option>
                <option value="cha">CHA</option>
              </select>
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5">{(sheet.spellcasting?.ability || "-").toString().toUpperCase()}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Spell Attack Bonus</label>
            <div className="text-sm p-2 border rounded bg-white/5">{(() => { const v = spellAttackBonus(sheet); return v !== undefined ? fmtMod(v) : "-"; })()}</div>
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Spell Save DC</label>
            <div className="text-sm p-2 border rounded bg-white/5">{(() => { const v = spellSaveDC(sheet); return v !== undefined ? v : "-"; })()}</div>
          </Labeled>
        </div>

        {/* Slots */}
        <div className="space-y-2">
          <div className="text-xs opacity-70">Spell Slots</div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {[1,2,3,4,5,6,7,8,9].map((lvl) => (
              <div key={lvl} className="flex items-center justify-between rounded border p-2">
                <span className="text-xs">{lvl}st lvl</span>
                {editing ? (
                  <input
                    type="number"
                    className="px-2 py-1 border rounded bg-transparent w-20 text-right"
                    value={String(sheet.spellcasting?.slots?.[lvl as 1] ?? "")}
                    onChange={(e) => {
                      const val = e.target.value === "" ? undefined : Number(e.target.value);
                      const nextSlots: Record<number, number | undefined> = { ...(sheet.spellcasting?.slots || {}) } as Record<number, number|undefined>;
                      nextSlots[lvl] = val;
                      updateSheet({ spellcasting: { ...(sheet.spellcasting || {}), slots: nextSlots as Record<1|2|3|4|5|6|7|8|9, number|undefined> } });
                    }}
                  />
                ) : (
                  <span className="text-sm">{sheet.spellcasting?.slots?.[lvl as 1] ?? "-"}</span>
                )}
                <div className="flex items-center gap-1">
                  {Array.from({length: Math.max(0, Number(sheet.spellcasting?.slots?.[lvl as 1] || 0))}).map((_,i)=>{
                    const used = (sheet.spellcasting?.slotsExpended?.[lvl as 1] || 0) > i;
                    return (
                      <button key={i} className={`h-3.5 w-3.5 rounded-full border ${used? 'bg-white/80 text-black' : 'bg-transparent'}`} onClick={()=>{
                        if(!editing) return; const current = sheet.spellcasting?.slotsExpended?.[lvl as 1] || 0; const next = i < current ? i : i+1; const nextMap: Record<number, number|undefined> = { ...(sheet.spellcasting?.slotsExpended || {}) } as Record<number, number|undefined>; nextMap[lvl]= next; updateSheet({ spellcasting: { ...(sheet.spellcasting || {}), slotsExpended: nextMap as Record<1|2|3|4|5|6|7|8|9, number|undefined> } });
                      }} title={`Use slot ${i+1}`}></button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prepared by Level */}
        <div className="space-y-2">
          <div className="text-xs opacity-70">Prepared / Known per Level</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1,2,3,4,5,6,7,8,9].map((lvl) => {
              const prep = sheet.spellcasting?.preparedByLevel?.[lvl as 1] || [];
              const known = (sheet.spellcasting?.knownByLevel?.[lvl as 1] || sheet.spellcasting?.known || []) as string[];
              return (
                <div key={lvl} className="rounded border p-2">
                  <div className="text-xs opacity-70 mb-1">Level {lvl}</div>
                  {editing ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs opacity-70">Known</div>
                        <textarea className="px-2 py-2 border rounded bg-transparent w-full min-h-[60px]" value={known.join("\n")} onChange={(e)=>{
                          const arr = e.target.value.split(/\n/).map(s=>s.trim()).filter(Boolean);
                          const next = { ...(sheet.spellcasting?.knownByLevel || {}) } as Record<number, string[]>;
                          next[lvl] = arr;
                          updateSheet({ spellcasting: { ...(sheet.spellcasting || {}), knownByLevel: next as Partial<Record<1|2|3|4|5|6|7|8|9, string[]>> } });
                        }} />
                      </div>
                      <div>
                        <div className="text-xs opacity-70">Prepared</div>
                        <textarea className="px-2 py-2 border rounded bg-transparent w-full min-h-[60px]" value={prep.join("\n")} onChange={(e)=>{
                          const arr = e.target.value.split(/\n/).map(s=>s.trim()).filter(Boolean);
                          const next = { ...(sheet.spellcasting?.preparedByLevel || {}) } as Record<number, string[]>;
                          next[lvl] = arr;
                          updateSheet({ spellcasting: { ...(sheet.spellcasting || {}), preparedByLevel: next as Partial<Record<1|2|3|4|5|6|7|8|9, string[]>> } });
                        }} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm space-y-1 min-h-[24px]">
                      {prep.length === 0 ? (
                        <div className="opacity-70">-</div>
                      ) : (
                        prep.map((s, i) => <div key={i} className="p-1 border rounded bg-white/5">{s}</div>)
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Known Spells (optional) */}
        <div className="space-y-2">
          <div className="text-xs opacity-70">Known Spells</div>
          {editing ? (
            <textarea
              className="px-2 py-2 border rounded bg-transparent w-full min-h-[100px]"
              value={(sheet.spellcasting?.known || []).join("\n")}
              onChange={(e)=>{
                const arr = e.target.value.split(/\n/).map(s=>s.trim()).filter(Boolean);
                updateSheet({ spellcasting: { ...(sheet.spellcasting || {}), known: arr } });
              }}
              placeholder="One spell per line"
            />
          ) : (
            <div className="text-sm space-y-1 min-h-[24px]">
              {(sheet.spellcasting?.known || []).length === 0 ? (
                <div className="opacity-70">-</div>
              ) : (
                (sheet.spellcasting?.known || []).map((s, i) => <div key={i} className="p-1 border rounded bg-white/5">{s}</div>)
              )}
            </div>
          )}
        </div>
      </section>

      {/* Personality */}
      <section className="rounded-lg border p-3 space-y-3">
        <h2 className="font-semibold">Personality</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Labeled>
            <label className="text-xs opacity-70">Personality Traits</label>
            {editing ? (
              <textarea className="px-2 py-2 border rounded bg-transparent w-full min-h-[80px]" value={sheet.personality?.traits || ""} onChange={(e)=>updateSheet({ personality: { ...(sheet.personality||{}), traits: e.target.value } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5 min-h-[24px]">{sheet.personality?.traits || ""}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Ideals</label>
            {editing ? (
              <textarea className="px-2 py-2 border rounded bg-transparent w-full min-h-[80px]" value={sheet.personality?.ideals || ""} onChange={(e)=>updateSheet({ personality: { ...(sheet.personality||{}), ideals: e.target.value } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5 min-h-[24px]">{sheet.personality?.ideals || ""}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Bonds</label>
            {editing ? (
              <textarea className="px-2 py-2 border rounded bg-transparent w-full min-h-[80px]" value={sheet.personality?.bonds || ""} onChange={(e)=>updateSheet({ personality: { ...(sheet.personality||{}), bonds: e.target.value } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5 min-h-[24px]">{sheet.personality?.bonds || ""}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Flaws</label>
            {editing ? (
              <textarea className="px-2 py-2 border rounded bg-transparent w-full min-h-[80px]" value={sheet.personality?.flaws || ""} onChange={(e)=>updateSheet({ personality: { ...(sheet.personality||{}), flaws: e.target.value } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5 min-h-[24px]">{sheet.personality?.flaws || ""}</div>
            )}
          </Labeled>
        </div>
      </section>

      {/* Background & Treasure */}
      <section className="rounded-lg border p-3 space-y-3">
        <h2 className="font-semibold">Background</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Labeled>
            <label className="text-xs opacity-70">Appearance</label>
            {editing ? (
              <textarea className="px-2 py-2 border rounded bg-transparent w-full min-h-[100px]" value={sheet.background2?.appearance || ""} onChange={(e)=>updateSheet({ background2: { ...(sheet.background2||{}), appearance: e.target.value } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5 min-h-[24px]">{sheet.background2?.appearance || ""}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Allies & Organizations</label>
            {editing ? (
              <textarea className="px-2 py-2 border rounded bg-transparent w-full min-h-[100px]" value={sheet.background2?.allies || ""} onChange={(e)=>updateSheet({ background2: { ...(sheet.background2||{}), allies: e.target.value } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5 min-h-[24px]">{sheet.background2?.allies || ""}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Additional Features & Traits</label>
            {editing ? (
              <textarea className="px-2 py-2 border rounded bg-transparent w-full min-h-[100px]" value={sheet.background2?.additionalFeatures || ""} onChange={(e)=>updateSheet({ background2: { ...(sheet.background2||{}), additionalFeatures: e.target.value } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5 min-h-[24px]">{sheet.background2?.additionalFeatures || ""}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Backstory</label>
            {editing ? (
              <textarea className="px-2 py-2 border rounded bg-transparent w-full min-h-[100px]" value={sheet.background2?.backstory || ""} onChange={(e)=>updateSheet({ background2: { ...(sheet.background2||{}), backstory: e.target.value } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5 min-h-[24px]">{sheet.background2?.backstory || ""}</div>
            )}
          </Labeled>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Labeled>
            <label className="text-xs opacity-70">Symbol (text/URL)</label>
            {editing ? (
              <input className="px-2 py-1 border rounded bg-transparent w-full" value={sheet.background2?.symbol || ""} onChange={(e)=>updateSheet({ background2: { ...(sheet.background2||{}), symbol: e.target.value } })} />
            ) : (
              <div className="text-sm p-2 border rounded bg-white/5 min-h-[24px]">{sheet.background2?.symbol || ""}</div>
            )}
          </Labeled>
          <Labeled>
            <label className="text-xs opacity-70">Treasure</label>
            <div className="grid grid-cols-5 gap-2">
              {(["pp","gp","ep","sp","cp"] as const).map((coin)=> (
                <div key={coin} className="text-center">
                  <div className="text-xs opacity-70">{coin.toUpperCase()}</div>
                  {editing ? (
                    <input
                      type="number"
                      className="px-2 py-1 border rounded bg-transparent w-full"
                      value={String((sheet.treasure || ({} as Record<string, number>))[coin] ?? "")}
                      onChange={(e)=>{
                        const val = e.target.value === "" ? undefined : Number(e.target.value);
                        const next: Record<string, number|undefined> = { ...(sheet.treasure || {}) } as Record<string, number|undefined>;
                        next[coin] = val;
                        updateSheet({ treasure: next as { pp?: number; gp?: number; ep?: number; sp?: number; cp?: number } });
                      }}
                    />
                  ) : (
                    <div className="text-sm p-2 border rounded bg-white/5">{(sheet.treasure || ({} as Record<string, number>))[coin] ?? 0}</div>
                  )}
                </div>
              ))}
            </div>
          </Labeled>
        </div>
      </section>

      {/* Features & Traits */}
      <section className="rounded-lg border p-3 space-y-3">
        <h2 className="font-semibold">Features & Traits</h2>
        {editing ? (
          <div className="space-y-2">
            <textarea
              className="px-2 py-2 border rounded bg-transparent w-full min-h-[120px]"
              value={(sheet.features || []).join("\n")}
              onChange={(e) => {
                const arr = e.target.value.split(/\n/).map((s) => s.trim()).filter(Boolean);
                updateSheet({ features: arr });
              }}
              placeholder="Add one feature per line (e.g., Second Wind, Darkvision, Stonecunning)"
            />
          </div>
        ) : (
          <div className="space-y-1">
            {(sheet.features || []).length === 0 && (
              <div className="text-sm opacity-70">No features yet.</div>
            )}
            {(sheet.features || []).map((f, i) => (
              <div key={i} className="text-sm p-2 border rounded bg-white/5">{f}</div>
            ))}
          </div>
        )}
      </section>

      {/* Notes */}
      <section className="rounded-lg border p-3 space-y-2">
        <h2 className="font-semibold">Notes</h2>
        <textarea
          className="px-2 py-2 border rounded bg-transparent w-full min-h-[120px]"
          value={sheet.notes ?? pc.notes ?? ""}
          onChange={(e) => updateSheet({ notes: e.target.value })}
          placeholder="Personality, ideals, bonds, flaws, inventory highlights…"
        />
      </section>
    </div>
  );
}

/* ===== UI bits ===== */
function Labeled({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1 ${className ?? ""}`}>{children}</div>;
}

function fmtMod(n: number) { return n >= 0 ? `+${n}` : `${n}`; }
