import { nanoid } from "nanoid";

function rng(seed: number) {
  let x = seed || 2463534242;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 100000) / 100000;
  };
}

const toSeedNum = (s?: string) =>
  s ? Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0) : 0;

const pick = <T,>(arr: readonly T[], r: () => number): T =>
  arr[Math.floor(r() * arr.length)];

const names = [
  "Elira Blackthorn","Garrick Dunbar","Mira Thistle","Cassian Montclair",
  "Thaddeus Rowe","Sera Lyr","Orin Bramble","Nyra Grey"
];
const ancestries = ["Human","Elf","Dwarf","Halfling","Half-Orc","Tiefling","Gnome"];
const occupations = ["Innkeeper","Guard","Scholar","Fence","Sailor","Herbalist","Priest","Scout"];
const dispositions = ["Friendly","Reserved","Suspicious","Stoic","Boisterous","Anxious"];
const quirks = [
  "Hums sea shanties when thinking","Collects shiny bottlecaps","Keeps a raven familiar",
  "Counts steps under breath","Never swears, says ‘by the stars’ instead","Wears mismatched gloves"
];
const bonds = [
  "Protects their younger sibling at all costs","Owes a life-debt to a captain",
  "Sworn to keep a forbidden tome safe","In love with a rival guild member"
];
const ideals = ["Freedom","Power","Tradition","Knowledge","Charity","Ambition"];
const flaws = ["Greedy","Impulsive","Gullible","Cowardly","Vengeful","Overconfident"];
const voices = [
  "soft Highland lilt, clipped","raspy whisper, breathy","sing-song cadence, quick",
  "deep and measured, few words","posh drawl, theatrical"
];
const hooks = [
  "Needs help retrieving a stolen heirloom","Saw a shadowy cult in the sewers",
  "Will pay for safe passage to the next town","Knows a shortcut through haunted woods",
  "Seeks rare herbs to cure a wasting illness"
];

export function generateNPC(options?: {
  seed?: string;
  ancestry?: string;
  occupation?: string;
}) {
  const r = rng(toSeedNum(options?.seed));

  return {
    id: nanoid(8),
    name: pick(names, r),
    ancestry: options?.ancestry ?? pick(ancestries, r),
    occupation: options?.occupation ?? pick(occupations, r),
    disposition: pick(dispositions, r),
    quirk: pick(quirks, r),
    bond: pick(bonds, r),
    ideal: pick(ideals, r),
    flaw: pick(flaws, r),
    voiceHint: pick(voices, r),
    hook: pick(hooks, r),
  };
}
