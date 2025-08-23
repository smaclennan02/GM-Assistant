export type RollResult = {
  input: string;        // e.g., "2d20kh1+5"
  total: number;
  parts: string[];      // ["d20: 17, 4 -> 17", "+5"]
  timestamp: number;
};
const rand = () => Math.random();

function rollDie(d: number) { return Math.floor(rand() * d) + 1; }

export function roll(input: string): RollResult {
  // Very small parser: supports 2d20, advantage: 2d20kh1, disadvantage: 2d20kl1, +/-
  // examples: "1d20+5", "2d20kh1+7", "4d6dl1", "3d8-1"
  const ts = Date.now();
  const tokens = input.replace(/\s+/g, "").match(/[+-]?[^+-]+/g) ?? [];
  const parts: string[] = [];
  let total = 0;

  for (const t of tokens) {
    const sign = t.startsWith("-") ? -1 : 1;
    const body = t.replace(/^[-+]/, "");
    const m = body.match(/^(\d*)d(\d+)(k[hl](\d+)|d[hl](\d+))?$/i);
    if (m) {
      const count = Number(m[1] || 1);
      const faces = Number(m[2]);
      const mod = m[3] || "";
      const keepHigh = /kh(\d+)/i.exec(mod)?.[1];
      const keepLow  = /kl(\d+)/i.exec(mod)?.[1];
      const dropHigh = /dh(\d+)/i.exec(mod)?.[1];
      const dropLow  = /dl(\d+)/i.exec(mod)?.[1];

      const rolls = Array.from({ length: count }, () => rollDie(faces));
      let used = [...rolls];
      if (keepHigh) used = rolls.sort((a,b)=>b-a).slice(0, Number(keepHigh));
      if (keepLow)  used = rolls.sort((a,b)=>a-b).slice(0, Number(keepLow));
      if (dropHigh) used = rolls.sort((a,b)=>a-b).slice(0, rolls.length - Number(dropHigh));
      if (dropLow)  used = rolls.sort((a,b)=>b-a).slice(0, rolls.length - Number(dropLow));

      const sum = used.reduce((a,b)=>a+b,0) * sign;
      total += sum;
      parts.push(`${t.includes("d")? "d"+faces : ""}: ${rolls.join(", ")} -> ${used.join("+")} = ${sum}`);
    } else {
      const num = Number(body) * sign;
      total += num;
      parts.push(`${sign>0?"+":""}${num}`);
    }
  }

  return { input, total, parts, timestamp: ts };
}
