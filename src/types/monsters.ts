export type AbilityScores = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};

export type MonsterTrait = { name: string; text: string };
export type MonsterAction = { name: string; text: string };

export type Monster = {
  name: string;
  type: string; // e.g., "Humanoid (goblinoid)"
  size: "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan";
  cr: string;   // "1/8","1/4","1/2","1","2","3","5", etc.
  ac: number;
  hpAvg: number;
  hpFormula?: string; // e.g., "2d6", "3d8+9"
  speed?: string;     // e.g., "30 ft.", "30 ft., climb 30 ft."
  ability: AbilityScores;
  senses?: string;
  languages?: string;
  traits?: MonsterTrait[];
  actions?: MonsterAction[];
};
