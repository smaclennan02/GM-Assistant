import { nanoid } from "nanoid";

type Size = "Small" | "Medium" | "Large" | "Huge";

function rng(seed: number) {
  let x = seed || 2463534242;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) % 100000) / 100000;
  };
}
const toSeedNum = (s?: string) => (s ? Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0) : 0);

const pick = <T,>(arr: readonly T[], r: () => number): T => arr[Math.floor(r() * arr.length)];
const roll = (min: number, max: number, r: () => number) => Math.floor(r() * (max - min + 1)) + min;

const names = [
  "Grave Hound","Ash Wight","Mire Troll","Skyscour Drake","Gloom Stalker",
  "Cinder Imp","Thornback Boar","Moss Golem","Salt Siren","Ravenous Ghast"
] as const;
const sizes: readonly Size[] = ["Small","Medium","Large","Huge"] as const;
export const types = [
  "Beast",
  "Undead",
  "Fiend",
  "Monstrosity",
  "Dragon",
  "Construct",
  "Fey",
  "Elemental",
] as const;
const alignments = ["Unaligned","LE","CE","NE","CG","NN"] as const;
const speeds = ["30 ft.","40 ft.","30 ft., climb 20 ft.","30 ft., fly 40 ft.","20 ft., swim 30 ft."] as const;

const traitPool: readonly Readonly<[string, string]>[] = [
  ["Keen Smell", "The monster has advantage on Wisdom (Perception) checks that rely on smell."],
  ["Pack Tactics", "The monster has advantage on an attack roll against a creature if at least one of the monster’s allies is within 5 feet of the creature and the ally isn’t incapacitated."],
  ["Sunlight Sensitivity", "While in sunlight, the monster has disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight."],
  ["Amphibious", "The monster can breathe air and water."],
  ["Magic Resistance", "The monster has advantage on saving throws against spells and other magical effects."],
];
const actionPool: readonly Readonly<[string, string]>[] = [
  ["Bite", "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 9 (2d6+2) piercing damage."],
  ["Claw", "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8+3) slashing damage."],
  ["Tail", "Melee Weapon Attack: +4 to hit, reach 10 ft., one target. Hit: 11 (2d8+2) bludgeoning damage."],
  ["Fire Spit (Recharge 5–6)", "Ranged Weapon Attack: +5 to hit, range 30/90 ft., one target. Hit: 10 (3d6) fire damage."],
  ["Shadow Grasp (Recharge 6)", "The target must succeed on a DC 13 Strength saving throw or be restrained by shadowy tendrils until the end of its next turn."],
];

export function generateMonster(options?: {
  seed?: string;
  crHint?: number;
  typeHint?: typeof types[number];
}) {
  const r = rng(toSeedNum(options?.seed));
  const name = pick(names, r);
  const size = pick(sizes, r);
  if (options?.typeHint && !types.includes(options.typeHint)) {
    throw new Error(`Unsupported monster type: ${options.typeHint}`);
  }
  const type = options?.typeHint ?? pick(types, r);
  const alignment = pick(alignments, r);
  const baseAC: Record<Size, number> = { Small: 12, Medium: 13, Large: 14, Huge: 15 };
  const armorClass = baseAC[size] + roll(0, 2, r);

  const crIndex = options?.crHint ?? roll(0, 6, r);
  const crTable = [
    { cr: "1/4 (50 XP)", hp: [2, 8, 2] as const },
    { cr: "1/2 (100 XP)", hp: [4, 8, 4] as const },
    { cr: "1 (200 XP)", hp: [6, 8, 6] as const },
    { cr: "2 (450 XP)", hp: [9, 8, 9] as const },
    { cr: "3 (700 XP)", hp: [11, 8, 11] as const },
    { cr: "4 (1,100 XP)", hp: [12, 10, 12] as const },
    { cr: "5 (1,800 XP)", hp: [14, 10, 14] as const },
  ] as const;
  const cr = crTable[Math.min(crIndex, crTable.length - 1)];
  const [diceN, diceType, bonus] = cr.hp;
  const avgHP = Math.floor((diceN * (diceType + 1)) / 2 + bonus);
  const hitDice = `${diceN}d${diceType}+${bonus}`;

  const speed = pick(speeds, r);
  const stat = () => roll(8, 18, r);
  const STR = stat(), DEX = stat(), CON = stat(), INT = stat(), WIS = stat(), CHA = stat();

  const [tAName, tADesc] = pick(traitPool, r);
  const [tBName, tBDesc] = pick(traitPool.filter(([n]) => n !== tAName), r);
  const [aAName, aADesc] = pick(actionPool, r);
  const [aBName, aBDesc] = pick(actionPool.filter(([n]) => n !== aAName), r);

  return {
    id: nanoid(8),
    name,
    size,
    type,
    alignment,
    armorClass,
    hitPoints: avgHP,
    hitDice,
    speed,
    str: STR, dex: DEX, con: CON, int: INT, wis: WIS, cha: CHA,
    senses: ["passive Perception " + (10 + Math.floor((WIS - 10) / 2))],
    languages: ["—"],
    challenge: cr.cr,
    traits: [{ name: tAName, desc: tADesc }, { name: tBName, desc: tBDesc }],
    actions: [{ name: aAName, desc: aADesc }, { name: aBName, desc: aBDesc }],
  };
}
