import type { Monster } from "@/types/monsters";

// Starter SRD-style sample set. Expand whenever you like.
export const MONSTERS: Monster[] = [
  {
    name: "Goblin",
    type: "Humanoid (goblinoid)",
    size: "Small",
    cr: "1/4",
    ac: 15,
    hpAvg: 7,
    hpFormula: "2d6",
    speed: "30 ft.",
    ability: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    senses: "Darkvision 60 ft., passive Perception 9",
    languages: "Common, Goblin",
    traits: [
      {
        name: "Nimble Escape",
        text:
          "The goblin can take the Disengage or Hide action as a bonus action on each of its turns.",
      },
    ],
    actions: [
      {
        name: "Scimitar",
        text:
          "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.",
      },
      {
        name: "Shortbow",
        text:
          "Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
      },
    ],
  },
  {
    name: "Orc",
    type: "Humanoid (orc)",
    size: "Medium",
    cr: "1/2",
    ac: 13,
    hpAvg: 15,
    hpFormula: "2d8+6",
    speed: "30 ft.",
    ability: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 },
    senses: "Darkvision 60 ft., passive Perception 10",
    languages: "Common, Orc",
    traits: [
      {
        name: "Aggressive",
        text:
          "As a bonus action, the orc can move up to its speed toward a hostile creature that it can see.",
      },
    ],
    actions: [
      {
        name: "Greataxe",
        text:
          "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 9 (1d12 + 3) slashing damage.",
      },
    ],
  },
  {
    name: "Bandit",
    type: "Humanoid (any race)",
    size: "Medium",
    cr: "1/8",
    ac: 12,
    hpAvg: 11,
    hpFormula: "2d8+2",
    speed: "30 ft.",
    ability: { str: 11, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
    languages: "Any one (usually Common)",
    actions: [
      {
        name: "Scimitar",
        text:
          "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) slashing damage.",
      },
      {
        name: "Light Crossbow",
        text:
          "Ranged Weapon Attack: +3 to hit, range 80/320 ft., one target. Hit: 5 (1d8 + 1) piercing damage.",
      },
    ],
  },
  {
    name: "Guard",
    type: "Humanoid (any race)",
    size: "Medium",
    cr: "1/8",
    ac: 16,
    hpAvg: 11,
    hpFormula: "2d8+2",
    speed: "30 ft.",
    ability: { str: 13, dex: 12, con: 12, int: 10, wis: 11, cha: 10 },
    actions: [
      {
        name: "Spear",
        text:
          "Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d6 + 1) piercing damage.",
      },
    ],
  },
  {
    name: "Skeleton",
    type: "Undead",
    size: "Medium",
    cr: "1/4",
    ac: 13,
    hpAvg: 13,
    hpFormula: "2d8+4",
    speed: "30 ft.",
    ability: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
    senses: "Darkvision 60 ft., passive Perception 9",
    languages:
      "Understands the languages it knew in life but can't speak",
    actions: [
      {
        name: "Shortsword",
        text:
          "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
      },
      {
        name: "Shortbow",
        text:
          "Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
      },
    ],
  },
  {
    name: "Zombie",
    type: "Undead",
    size: "Medium",
    cr: "1/4",
    ac: 8,
    hpAvg: 22,
    hpFormula: "3d8+9",
    speed: "20 ft.",
    ability: { str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5 },
    traits: [
      {
        name: "Undead Fortitude",
        text:
          "If damage reduces the zombie to 0 HP, it makes a Con save to drop to 1 HP instead (DC 5 + damage taken).",
      },
    ],
    actions: [
      {
        name: "Slam",
        text:
          "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage.",
      },
    ],
  },
  {
    name: "Wolf",
    type: "Beast",
    size: "Medium",
    cr: "1/4",
    ac: 13,
    hpAvg: 11,
    hpFormula: "2d8+2",
    speed: "40 ft.",
    ability: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
    senses: "Passive Perception 13",
    traits: [
      {
        name: "Pack Tactics",
        text:
          "The wolf has advantage on an attack roll against a creature if at least one of the wolf's allies is within 5 ft. of the creature.",
      },
    ],
    actions: [
      {
        name: "Bite",
        text:
          "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) piercing damage. If the target is a creature, it must succeed on a DC 11 Strength saving throw or be knocked prone.",
      },
    ],
  },
  {
    name: "Giant Spider",
    type: "Beast",
    size: "Large",
    cr: "1",
    ac: 14,
    hpAvg: 26,
    hpFormula: "4d10+4",
    speed: "30 ft., climb 30 ft.",
    ability: { str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4 },
    senses: "Blindsight 10 ft., Darkvision 60 ft., passive Perception 10",
    traits: [
      {
        name: "Spider Climb",
        text:
          "The spider can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
      },
    ],
    actions: [
      {
        name: "Bite",
        text:
          "Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 7 (1d8 + 3) piercing damage plus poison.",
      },
    ],
  },
  {
    name: "Ogre",
    type: "Giant",
    size: "Large",
    cr: "2",
    ac: 11,
    hpAvg: 59,
    hpFormula: "7d10+21",
    speed: "40 ft.",
    ability: { str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7 },
    actions: [
      {
        name: "Greatclub",
        text:
          "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.",
      },
    ],
  },
  {
    name: "Troll",
    type: "Giant",
    size: "Large",
    cr: "5",
    ac: 15,
    hpAvg: 84,
    hpFormula: "8d10+40",
    speed: "30 ft.",
    ability: { str: 18, dex: 13, con: 20, int: 7, wis: 9, cha: 7 },
    traits: [
      {
        name: "Regeneration",
        text:
          "The troll regains 10 hit points at the start of its turn if it has at least 1 hit point.",
      },
    ],
    actions: [
      {
        name: "Multiattack",
        text:
          "The troll makes three attacks: one with its bite and two with its claws.",
      },
    ],
  },
  {
    name: "Giant Rat",
    type: "Beast",
    size: "Small",
    cr: "1/8",
    ac: 12,
    hpAvg: 7,
    hpFormula: "2d6",
    speed: "30 ft.",
    ability: { str: 7, dex: 15, con: 11, int: 2, wis: 10, cha: 4 },
    senses: "Darkvision 60 ft., passive Perception 10",
    actions: [
      {
        name: "Bite",
        text:
          "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.",
      },
    ],
  },
  {
    name: "Knight",
    type: "Humanoid (any race)",
    size: "Medium",
    cr: "3",
    ac: 18,
    hpAvg: 52,
    hpFormula: "8d8+16",
    speed: "30 ft.",
    ability: { str: 16, dex: 11, con: 14, int: 11, wis: 11, cha: 15 },
    actions: [
      {
        name: "Multiattack",
        text: "The knight makes two melee weapon attacks.",
      },
    ],
  },
];
