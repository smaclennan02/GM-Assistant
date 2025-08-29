// src/lib/dice.ts
// Lightweight dice roller with string parsing and breakdown output.
// Supports "d20", "1d20+3", "4d8+4", "2d6-1", whitespace tolerant.

export type DiceInput =
  | string
  | {
      count: number; // e.g. 1
      sides: number; // e.g. 20
      mod?: number; // e.g. +3/-1
    };

export type DiceResult = {
  total: number;
  rolls: number[];
  sides: number;
  mod: number;
  notation: string;
};

const DICE_RE = /^\s*(\d*)\s*d\s*(\d+)\s*([+-]\s*\d+)?\s*$/i;

export function parseDice(notation: string): { count: number; sides: number; mod: number } {
  const m = notation.match(DICE_RE);
  if (!m) throw new Error(`Invalid dice string: "${notation}"`);
  const count = m[1] ? parseInt(m[1], 10) : 1;
  const sides = parseInt(m[2], 10);
  const mod = m[3] ? parseInt(m[3].replace(/\s+/g, ""), 10) : 0;
  if (count <= 0 || sides <= 0) throw new Error(`Invalid dice values in "${notation}"`);
  return { count, sides, mod };
}

export function rollDice(input: DiceInput): DiceResult {
  let count: number, sides: number, mod: number;
  if (typeof input === "string") {
    ({ count, sides, mod } = parseDice(input));
  } else {
    count = Math.max(1, Math.floor(input.count));
    sides = Math.max(1, Math.floor(input.sides));
    mod = Math.floor(input.mod ?? 0);
  }

  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(1 + Math.floor(Math.random() * sides));
  }
  const total = rolls.reduce((a, b) => a + b, 0) + mod;

  const notation = `${count}d${sides}${mod ? (mod > 0 ? `+${mod}` : `${mod}`) : ""}`;
  return { total, rolls, sides, mod, notation };
}

// Convenience helpers
export function rollD20(mod: number = 0) {
  return rollDice({ count: 1, sides: 20, mod });
}

// Compatibility wrapper for UI dice tool
export type RollResult = {
  input: string;
  total: number;
  parts: string[];
  timestamp: number;
};

export function roll(input: string): RollResult {
  const r = rollDice(input);
  const rollsText = r.rolls.length ? r.rolls.join(" + ") : "";
  const modText = r.mod ? (r.mod > 0 ? ` + ${r.mod}` : ` - ${Math.abs(r.mod)}`) : "";
  const parts = [
    [rollsText, modText].filter(Boolean).join("") || `${r.notation}`,
  ];
  return {
    input: r.notation,
    total: r.total,
    parts,
    timestamp: Date.now(),
  };
}
