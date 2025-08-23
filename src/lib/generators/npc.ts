import { nanoid } from "nanoid";
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

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

export function generateNPC(seed?: Partial<{ ancestry: string; occupation: string }>) {
  return {
    id: nanoid(8),
    name: pick(names),
    ancestry: seed?.ancestry ?? pick(ancestries),
    occupation: seed?.occupation ?? pick(occupations),
    disposition: pick(dispositions),
    quirk: pick(quirks),
    bond: pick(bonds),
    ideal: pick(ideals),
    flaw: pick(flaws),
    voiceHint: pick(voices),
    hook: pick(hooks),
  };
}
