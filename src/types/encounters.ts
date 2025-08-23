export type Combatant = {
  id: string;
  name: string;
  init?: number | null;
  hp?: number | null;
  ac?: number | null;
  isPC?: boolean;
  conditions?: string[];
};

export type EncounterState = {
  combatants: Combatant[];
  round: number;          // 1+
  orderLocked: boolean;
  updatedAt: number;
};
