export type Condition = { name: string; brief: string };
export const CONDITIONS: Condition[] = [
  { name: "Blinded", brief: "Fail sight checks; attacks vs you have advantage; your attacks have disadvantage." },
  { name: "Charmed", brief: "Can’t attack charmer; charmer has advantage on social checks." },
  { name: "Deafened", brief: "Fail hearing checks." },
  { name: "Frightened", brief: "Disadvantage while source is in sight; can’t willingly move closer." },
  { name: "Grappled", brief: "Speed 0; ends if grappler incapacitated or moved away." },
  { name: "Incapacitated", brief: "No actions or reactions." },
  { name: "Invisible", brief: "Heavily obscured; attacks vs you have disadvantage; your attacks have advantage." },
  { name: "Paralyzed", brief: "Incapacitated; fail Str/Dex saves; attacks vs you have advantage; crits within 5 ft." },
  { name: "Petrified", brief: "Transformed; incapacitated; resist all damage; vulnerable to bludgeoning." },
  { name: "Poisoned", brief: "Disadvantage on attack rolls and ability checks." },
  { name: "Prone", brief: "Crawl; attacks vs you at 5 ft have advantage; ranged attacks vs you have disadvantage." },
  { name: "Restrained", brief: "Speed 0; attacks vs you have advantage; your attacks have disadvantage; Dex saves disadvantage." },
  { name: "Stunned", brief: "Incapacitated; fail Str/Dex saves; attacks vs you have advantage." },
  { name: "Unconscious", brief: "Incapacitated; drop held items; prone; attacks vs you have advantage; crits within 5 ft." }
];
