import type { LucideIcon } from "lucide-react";
import {
  EyeOff, Heart, VolumeX, AlertTriangle, Link as LinkIcon, Ban, Ghost,
  PauseCircle, Gem, Skull, ArrowDown, Handcuffs, Zap, Moon, BatteryLow
} from "lucide-react";

/** Canonical list used everywhere */
export const CONDITIONS = [
  "Blinded","Charmed","Deafened","Frightened","Grappled","Incapacitated",
  "Invisible","Paralyzed","Petrified","Poisoned","Prone","Restrained",
  "Stunned","Unconscious","Exhaustion"
] as const;

export type ConditionKey = typeof CONDITIONS[number];

export const CONDITION_TIPS: Record<ConditionKey, string> = {
  Blinded: "Sight-based checks fail; attacks vs it have adv; its attacks have disadv.",
  Charmed: "Can’t attack charmer; charmer has advantage on social checks.",
  Deafened: "Can’t hear; fails sound-based checks.",
  Frightened: "Disadv on checks/attacks while source visible; can’t move closer.",
  Grappled: "Speed 0; ends if grappler is incapacitated or moved away.",
  Incapacitated: "Can’t take actions or reactions.",
  Invisible: "Unseen; attacks vs it have disadv; its attacks have adv.",
  Paralyzed: "Incapacitated; can’t move/speak; auto-fail Str/Dex saves; attacks vs it have adv; crits within 5 ft.",
  Petrified: "Turned to stone; incapacitated; resists most damage; vulnerable to bludgeoning.",
  Poisoned: "Disadvantage on attacks and ability checks.",
  Prone: "Crawl; disadv on attacks; attackers within 5 ft have advantage.",
  Restrained: "Speed 0; disadv on attacks and Dex saves; attacks vs it have adv.",
  Stunned: "Incapacitated; can’t move; fails Str/Dex saves; attacks vs it have adv.",
  Unconscious: "Incapacitated; prone; auto-fail Str/Dex saves; attacks within 5 ft crit.",
  Exhaustion: "Levels 1–6; penalties escalate. (Track level below.)",
};

type Meta = {
  icon: LucideIcon;
  text: string;   // text color class
  bg: string;     // background tint class
  border: string; // border tint class
};

export const CONDITION_META: Record<ConditionKey, Meta> = {
  Blinded:     { icon: EyeOff,      text: "text-yellow-300",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30" },
  Charmed:     { icon: Heart,       text: "text-pink-300",    bg: "bg-pink-500/10",    border: "border-pink-500/30" },
  Deafened:    { icon: VolumeX,     text: "text-blue-300",    bg: "bg-blue-500/10",    border: "border-blue-500/30" },
  Frightened:  { icon: AlertTriangle,text: "text-amber-300",  bg: "bg-amber-500/10",   border: "border-amber-500/30" },
  Grappled:    { icon: LinkIcon,    text: "text-orange-300",  bg: "bg-orange-500/10",  border: "border-orange-500/30" },
  Incapacitated:{ icon: Ban,        text: "text-slate-300",   bg: "bg-slate-500/10",   border: "border-slate-500/30" },
  Invisible:   { icon: Ghost,       text: "text-violet-300",  bg: "bg-violet-500/10",  border: "border-violet-500/30" },
  Paralyzed:   { icon: PauseCircle, text: "text-rose-300",    bg: "bg-rose-500/10",    border: "border-rose-500/30" },
  Petrified:   { icon: Gem,         text: "text-zinc-300",    bg: "bg-zinc-500/10",    border: "border-zinc-500/30" },
  Poisoned:    { icon: Skull,       text: "text-green-300",   bg: "bg-green-500/10",   border: "border-green-500/30" },
  Prone:       { icon: ArrowDown,   text: "text-cyan-300",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30" },
  Restrained:  { icon: Handcuffs,   text: "text-red-300",     bg: "bg-red-500/10",     border: "border-red-500/30" },
  Stunned:     { icon: Zap,         text: "text-indigo-300",  bg: "bg-indigo-500/10",  border: "border-indigo-500/30" },
  Unconscious: { icon: Moon,        text: "text-sky-300",     bg: "bg-sky-500/10",     border: "border-sky-500/30" },
  Exhaustion:  { icon: BatteryLow,  text: "text-lime-300",    bg: "bg-lime-500/10",    border: "border-lime-500/30" },
};
