export type AbilityScores = { str:number; dex:number; con:number; int:number; wis:number; cha:number };

export type PC = {
  id: string;
  name: string;
  class?: string;
  level?: number;
  hp?: { current?: number; max?: number };
  ac?: number;
  passive?: number;
  abilities?: Partial<AbilityScores>;
  notes?: string;
  // Optional campaign association used by Characters hub
  campaignId?: string | null;
  // Full sheet (5e) stored here; Characters page keeps light fields in sync
  sheet?: PCSheet;
};

export type NPC = {
  id: string;
  name: string;
  role?: string;
  attitude?: "hostile" | "neutral" | "friendly";
  tags?: string[];
  notes?: string;
};

export type CharactersState = {
  pcs: PC[];
  npcs: NPC[];
  updatedAt: number;
};

// ===== 5e Sheet Types =====
export type AbilityKey = keyof AbilityScores; // 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type SaveProf = Partial<Record<AbilityKey, boolean>>; // save proficiencies

export type SkillKey =
  | "acrobatics" | "animalHandling" | "arcana" | "athletics" | "deception" | "history"
  | "insight" | "intimidation" | "investigation" | "medicine" | "nature" | "perception"
  | "performance" | "persuasion" | "religion" | "sleightOfHand" | "stealth" | "survival";

export type SkillRank = "none" | "proficient" | "expertise";
export type SkillProfs = Partial<Record<SkillKey, SkillRank>>;

export type Attack = { name: string; bonus?: number; damage?: string; notes?: string };

export type SpellSlots = {
  1?: number; 2?: number; 3?: number; 4?: number; 5?: number; 6?: number; 7?: number; 8?: number; 9?: number;
};

export type SpellcastingAbility = "int" | "wis" | "cha";

export type PCSheet = {
  identity?: {
    class?: string;
    subclass?: string;
    level?: number;
    background?: string;
    race?: string;
    alignment?: string;
    xp?: number;
  };
  abilities?: AbilityScores; // base scores (mods derived)
  saves?: SaveProf;
  skills?: SkillProfs;
  profBonus?: number; // derived from level if omitted
  inspiration?: boolean;
  combat?: {
    ac?: number;
    initiativeMod?: number; // if omitted, use DEX mod
    speed?: number;
    hp?: { current?: number; max?: number; temp?: number };
    hitDice?: string; // e.g., "1d8"
    deathSaves?: { success?: number; fail?: number };
  };
  senses?: {
    passivePerception?: number; // derived from WIS + prof if omitted
    passiveInsight?: number;
    passiveInvestigation?: number;
    note?: string; // e.g., Darkvision 60 ft.
  };
  personality?: {
    traits?: string;
    ideals?: string;
    bonds?: string;
    flaws?: string;
  };
  proficiencies?: string[]; // armor/weapons/tools
  languages?: string[];
  features?: string[]; // class/race/background features
  attacks?: Attack[];
  spellcasting?: {
    ability?: SpellcastingAbility;
    spellAttackBonus?: number; // derived if omitted
    spellSaveDC?: number; // derived if omitted
    slots?: SpellSlots;
    slotsExpended?: SpellSlots; // number used at each level
    prepared?: string[]; // legacy flat list
    known?: string[]; // for known-spell casters
    preparedByLevel?: Partial<Record<1|2|3|4|5|6|7|8|9, string[]>>; // structured prepared spells
    knownByLevel?: Partial<Record<1|2|3|4|5|6|7|8|9, string[]>>; // structured known spells
  };
  equipment?: string[];
  treasure?: { pp?: number; gp?: number; ep?: number; sp?: number; cp?: number };
  background2?: {
    appearance?: string;
    allies?: string;
    symbol?: string; // text or URL for a symbol
    additionalFeatures?: string;
    backstory?: string;
  };
  notes?: string;
};
