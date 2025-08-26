export type RaceKey =
  | "human"
  | "elf"
  | "dwarf"
  | "halfling"
  | "orc"
  | "goblin"
  | "dragonborn"
  | "tiefling";

export type RacePreset = {
  key: RaceKey;
  name: string;
  base_ac: number;      // typical unarmored AC or simple armor
  hp_dice: string;      // e.g., "2d8+2"
  speed: string;        // e.g., "30 ft."
  notes?: string;
};

export const NPC_RACES: Record<RaceKey, RacePreset> = {
  human: {
    key: "human",
    name: "Human",
    base_ac: 11,
    hp_dice: "2d8+2",
    speed: "30 ft.",
  },
  elf: {
    key: "elf",
    name: "Elf",
    base_ac: 12,
    hp_dice: "2d8",
    speed: "30 ft.",
    notes: "Darkvision 60 ft., Keen Senses",
  },
  dwarf: {
    key: "dwarf",
    name: "Dwarf",
    base_ac: 12,
    hp_dice: "2d8+2",
    speed: "25 ft.",
    notes: "Darkvision 60 ft., Dwarven Resilience",
  },
  halfling: {
    key: "halfling",
    name: "Halfling",
    base_ac: 12,
    hp_dice: "2d8",
    speed: "25 ft.",
    notes: "Lucky",
  },
  orc: {
    key: "orc",
    name: "Orc",
    base_ac: 11,
    hp_dice: "2d8+4",
    speed: "30 ft.",
    notes: "Aggressive",
  },
  goblin: {
    key: "goblin",
    name: "Goblin",
    base_ac: 12,
    hp_dice: "2d6",
    speed: "30 ft.",
    notes: "Nimble Escape",
  },
  dragonborn: {
    key: "dragonborn",
    name: "Dragonborn",
    base_ac: 12,
    hp_dice: "2d8+2",
    speed: "30 ft.",
    notes: "Draconic Ancestry, Breath Weapon",
  },
  tiefling: {
    key: "tiefling",
    name: "Tiefling",
    base_ac: 11,
    hp_dice: "2d8",
    speed: "30 ft.",
    notes: "Hellish Resistance, Darkvision 60 ft.",
  },
};

// Small helper for UI lists
export const NPC_RACE_OPTIONS: { value: RaceKey; label: string }[] = Object.values(NPC_RACES).map(
  (r) => ({ value: r.key, label: r.name })
);
