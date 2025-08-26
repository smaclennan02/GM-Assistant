// src/lib/migrations.ts

// Legacy keys we used before switching to src/storage/keys.ts
const LEGACY_KEYS = [
  "gm.characters",         // legacy characters (array or { pcs: [...] })
  "gm.campaigns",
  "gm.activeCampaign",
  "gm.encounters",
];

type AnyJson = any;

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * One-time migration: if the target key is empty, try to copy characters from
 * any legacy key that contains an array or an object with { pcs }.
 */
export function migrateCharactersIfNeeded(targetKey: string) {
  const ls = safeLocalStorage();
  if (!ls) return;

  // If target already has data, bail.
  try {
    const raw = ls.getItem(targetKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      const count = Array.isArray(parsed) ? parsed.length : parsed?.pcs?.length ?? 0;
      if (count > 0) return;
    }
  } catch {
    // ignore parse error and continue migration attempt
  }

  // Scan legacy keys for something usable
  for (const key of LEGACY_KEYS) {
    const raw = ls.getItem(key);
    if (!raw) continue;

    try {
      const parsed: AnyJson = JSON.parse(raw);
      const pcs = Array.isArray(parsed) ? parsed : parsed?.pcs;
      if (Array.isArray(pcs) && pcs.length > 0) {
        const canonical = {
          pcs,
          npcs: Array.isArray(parsed?.npcs) ? parsed.npcs : [],
          updatedAt: Date.now(),

        };
        ls.setItem(targetKey, JSON.stringify(canonical));
        ls.setItem(`${targetKey}.__migratedFrom`, key);
        return;
      }
    } catch {
      // ignore malformed legacy value
    }
  }
}
