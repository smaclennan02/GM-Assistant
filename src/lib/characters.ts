export type PC = {
  id: string;
  name: string;
  initMod?: number;
  ac?: number;
  hp?: string;
  passive?: number;
  notes?: string;
};

export type Attitude = "Friendly" | "Neutral" | "Hostile" | "Other";

export type NPCPreset = {
  id: string;
  name: string;
  init?: number;     // if omitted, tracker rolls d20 on add
  ac?: number;
  hp?: string;
  notes?: string;
  attitude?: Attitude;
  tags?: string[];   // e.g. ["guard","dock","smuggler"]
};

const read = <T,>(k: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k: string, v: unknown) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
};

export const pcsStore = {
  key: "chars.pcs",
  get(): PC[] { return read<PC[]>(this.key, []); },
  set(v: PC[]) { write(this.key, v); },
};

export const npcsStore = {
  key: "chars.npcs",
  get(): NPCPreset[] { return read<NPCPreset[]>(this.key, []); },
  set(v: NPCPreset[]) { write(this.key, v); },
};

export const newId = () => Math.random().toString(36).slice(2, 9);
