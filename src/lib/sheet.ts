import type { AbilityKey, AbilityScores, PC, PCSheet, SkillKey, SkillProfs, SkillRank } from "@/types/characters";

export function abilityMod(score?: number): number {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  return Math.floor((score - 10) / 2);
}

export function profBonusFromLevel(level?: number): number {
  const lvl = typeof level === "number" && level > 0 ? level : 1;
  // 5e 2014 table: +2 at 1–4, +3 at 5–8, +4 at 9–12, +5 at 13–16, +6 at 17–20
  if (lvl >= 17) return 6;
  if (lvl >= 13) return 5;
  if (lvl >= 9) return 4;
  if (lvl >= 5) return 3;
  return 2;
}

export function skillAbility(skill: SkillKey): AbilityKey {
  const map: Record<SkillKey, AbilityKey> = {
    athletics: "str",
    acrobatics: "dex",
    sleightOfHand: "dex",
    stealth: "dex",
    arcana: "int",
    history: "int",
    investigation: "int",
    nature: "int",
    religion: "int",
    animalHandling: "wis",
    insight: "wis",
    medicine: "wis",
    perception: "wis",
    survival: "wis",
    deception: "cha",
    intimidation: "cha",
    performance: "cha",
    persuasion: "cha",
  };
  return map[skill];
}

export function skillBonus(
  skill: SkillKey,
  abilities?: AbilityScores,
  profs?: SkillProfs,
  profBonus?: number,
): number {
  const a = abilityMod(abilities?.[skillAbility(skill)]);
  const rank: SkillRank = profs?.[skill] ?? "none";
  const pb = profBonus ?? 0;
  if (rank === "expertise") return a + pb * 2;
  if (rank === "proficient") return a + pb;
  return a;
}

export function passiveFrom(skillTotal: number): number { return 10 + (skillTotal | 0); }

export function derivePassives(sheet: PCSheet): { per?: number; ins?: number; inv?: number } {
  const pb = sheet.profBonus ?? profBonusFromLevel(sheet.identity?.level);
  const per = passiveFrom(skillBonus("perception", sheet.abilities, sheet.skills, pb));
  const ins = passiveFrom(skillBonus("insight", sheet.abilities, sheet.skills, pb));
  const inv = passiveFrom(skillBonus("investigation", sheet.abilities, sheet.skills, pb));
  return { per, ins, inv };
}

export function spellAttackBonus(sheet: PCSheet): number | undefined {
  const ab = sheet.spellcasting?.ability;
  const pb = sheet.profBonus ?? profBonusFromLevel(sheet.identity?.level);
  if (!ab) return undefined;
  const mod = abilityMod(sheet.abilities?.[ab]);
  return mod + pb;
}

export function spellSaveDC(sheet: PCSheet): number | undefined {
  const ab = sheet.spellcasting?.ability;
  const pb = sheet.profBonus ?? profBonusFromLevel(sheet.identity?.level);
  if (!ab) return undefined;
  const mod = abilityMod(sheet.abilities?.[ab]);
  return 8 + pb + mod;
}

// Merge legacy top-level PC fields into sheet if missing.
export function hydrateSheetFromPC(pc: PC): PCSheet {
  const sheet: PCSheet = pc.sheet ? { ...pc.sheet } : {};
  sheet.identity = sheet.identity || {};
  if (pc.class && !sheet.identity.class) sheet.identity.class = pc.class;
  if (typeof pc.level === "number" && !sheet.identity.level) sheet.identity.level = pc.level;
  sheet.combat = sheet.combat || {};
  if (typeof pc.ac === "number" && typeof sheet.combat.ac !== "number") sheet.combat.ac = pc.ac;
  sheet.combat.hp = sheet.combat.hp || {};
  if (typeof pc.hp?.current === "number" && typeof sheet.combat.hp.current !== "number") sheet.combat.hp.current = pc.hp.current;
  if (typeof pc.hp?.max === "number" && typeof sheet.combat.hp.max !== "number") sheet.combat.hp.max = pc.hp.max;
  // copy simple abilities if available
  if (pc.abilities) {
    sheet.abilities = { ...({} as AbilityScores), ...(sheet.abilities || {}), ...(pc.abilities || {}) } as AbilityScores;
  }
  return sheet;
}

