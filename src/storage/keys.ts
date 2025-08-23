const NS = "gma";   // GM Assistant
const MAJOR = "v1"; // bump on breaking store changes

export const STORAGE_KEYS = {
  CHARACTERS: `${NS}.${MAJOR}.characters`,
  NOTES:      `${NS}.${MAJOR}.notes`,
  ENCOUNTERS: `${NS}.${MAJOR}.encounters`,
  RESOURCES:  `${NS}.${MAJOR}.resources`,   // ← NEW
  SETTINGS:   `${NS}.${MAJOR}.settings`,
} as const;
