export type NPC = {
  id: string;
  name: string;
  ancestry: string;     // e.g., Human, Elf, Dwarf
  occupation: string;   // e.g., Innkeeper, Guard, Scholar
  disposition: string;  // e.g., Friendly, Suspicious, Stoic
  quirk: string;        // e.g., Hums sea shanties when thinking
  bond: string;         // e.g., Protects their younger sibling at all costs
  ideal: string;        // e.g., Freedom, Power, Tradition
  flaw: string;         // e.g., Greedy, Impulsive, Gullible
  voiceHint: string;    // e.g., “soft Highland lilt, clipped”
  hook: string;         // e.g., “Needs help retrieving a stolen heirloom”
};

export type Monster = {
  id: string;
  name: string;
  size: "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan";
  type: string;            // e.g., Beast, Undead, Fiend
  alignment: string;       // e.g., Unaligned, CE, LE
  armorClass: number;
  hitPoints: number;
  hitDice: string;         // e.g., "5d8+10"
  speed: string;           // e.g., "30 ft., climb 20 ft."
  str: number; dex: number; con: number; int: number; wis: number; cha: number;
  savingThrows?: string[];
  skills?: string[];
  vulnerabilities?: string[];
  resistances?: string[];
  immunities?: string[];
  senses?: string[];       // e.g., "darkvision 60 ft."
  languages?: string[];    // e.g., "Common, Infernal"
  challenge: string;       // e.g., "2 (450 XP)"
  traits: { name: string; desc: string }[];
  actions: { name: string; desc: string }[];
  reactions?: { name: string; desc: string }[];
  legendaryActions?: { name: string; desc: string }[];
};
