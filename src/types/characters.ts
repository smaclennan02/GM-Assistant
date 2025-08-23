export type AbilityScores = { str:number; dex:number; con:number; int:number; wis:number; cha:number };

export type PC = {
  id: string;
  name: string;
  class?: string;
  level?: number;
  hp?: { current:number; max:number };
  ac?: number;
  abilities?: Partial<AbilityScores>;
  notes?: string;
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
