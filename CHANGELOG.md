# Changelog

All notable changes to this project will be documented in this file.

## [0.1.10] – 2025-08-23
### Changed
- Tracker effects are now **icon-only** with hover tooltips (no text chips).
### Added
- Inline **Effects picker** (➕ button) with a compact overlay menu.
### Improved
- Layout stability: fixed-width effects column; no horizontal jump when adding/removing multiple effects.

## [0.1.9] – 2025-08-23
### Added
- **Color-coded condition icons** across Tracker and Resources (unique icon + tinted badge per condition).
### Improved
- Condition chips now include quick remove (×) with clearer visual grouping.


## [0.1.8] – 2025-08-23
### Added
- **Resources v1** page:
  - **Conditions**: searchable reference with concise rules summaries.
  - **Party Rest**: per-PC Short Rest / Long Rest actions with timestamps.
  - **Exhaustion**: per-PC level 0–6 with level descriptions.
### Notes
- New persistent store key: `gma.v1.resources` (added to `STORAGE_KEYS`).
- Backward compatible; no changes required to Characters or Encounters.

## [0.1.7] – 2025-08-23
### Added
- **Tracker: Conditions** — per-combatant condition chips (Prone, Grappled, Poisoned, etc.) with tooltips; click to remove.
- **Round tools** — keyboard shortcuts: `[` previous round, `]` next round, `L` lock/unlock order.
### Improved
- Encounter Tracker header spacing & grouping for controls.
### Notes
- Backward compatible: existing encounters load fine. `conditions` are added lazily to combatants.

## [0.1.6] – 2025-08-23
### Added
- Encounters hub redesign: single header + three link-cards (Tracker, Builder, Monsters) for a cleaner entry point.
### Improved
- Global readability polish: zebra rows, hover highlight, sticky table headers, compact inputs, focus rings, nicer scrollbars.
- Tracker: auto-load PCs on first open if encounter is empty; denser header with padding and grouped controls.
### Fixed
- Layout: consistent containers and padding around nav/content/footer; sticky nav restored with dice roller and toasts.

## [0.1.5] – 2025-08-23
### Added
- Dark mode (forced site-wide) with temporary overrides for light components.
- Utilities: `.table-ui`, `.sticky-header`, `.table-tight`, `.input-compact`, `.section`.
### Improved
- Navigation visibility in dark mode; safe z-index and backdrop.

## [0.1.4] – 2025-08-23
### Added
- Tracker–Characters linking: **Load PCs (add missing)**, **Sync from Characters**, **Clear Inits**.
- Tracker NPC quick-add.
### Improved
- Sorting: init desc, PCs before NPCs on tie, name asc.
- Lock order + round controls persisted.

## [0.1.3] – 2025-08-23
### Added
- Characters page migrated to persistent store (`gma.v1.characters`) with import/export.
- HP text parsing (“27/31”) → `{ current, max }`. Keeps `initMod`, `passive`, notes.
### Improved
- NPC Presets persisted separately.

## [0.1.2] – 2025-08-22
### Added
- Storage primitives: `useStorageState`, `localDriver`, namespaced `STORAGE_KEYS`.
- Debug page `/debug/storage` for verification (debounced writes, cross-tab sync).

## [0.1.1] – 2025-08-22
### Added
- Initial project baseline captured; Floating Dice Roller; basic Encounters/Initiative tracker; Characters; Campaign notes.

---

## Planned Patches

> Each of these will be released as **0.1.x** in order. If we need to insert hotfixes, we’ll increment the next number and keep sequence.

### 0.1.7 — Tracker: Conditions & Round Tools
- Add per-combatant **conditions** chips (Prone, Grappled, Poisoned, etc.).
- Quick apply/remove; tooltip with rules summary.
- Persist conditions; show small icons; filter highlight.
- Keyboard: `[`/`]` adjust round; `L` toggle lock.

### 0.1.8 — Resources Tab v1
- **Conditions reference** (searchable, compact).
- **Rest tracking** (short/long rests) with per-PC resets note area.
- **Exhaustion** tracker with level description.

### 0.1.9 — Character Sheet “View” (Placeholder)
- “View Sheet” drawer: name, AC, HP (current/max), notes, init mod, passive.
- Open from Characters and from Tracker (linked PCs).
- Preps groundwork for future builder/editor.

### 0.1.10 — Encounter Quality of Life
- Initiative roll helper (optional): quick d20 + init mod populate field.
- Bulk actions: clear all initiatives, set all to “—”, remove all NPCs.
- Export/import **encounter** (JSON) for reuse.

### 0.1.11 — Campaign Notes Enhancements
- **Pinned notes** at top; quick pin/unpin.
- **Templates**: session recap, NPC log, loot log; one-click create.

### 0.1.12 — Manual Generators v1
- **Names** generator (race/culture toggles, copy-to-clipboard).
- **Loot** generator (by CR/tier).
- **Encounter** randomizer (by APL/biome) → can send to Builder.

### 0.1.13 — Content Packs Framework
- SRD base pack wired into Resources/Monsters.
- Pack toggles in a simple **Content** settings panel.

### 0.1.14 — IndexedDB Driver (Optional)
- `idbDriver` drop-in for larger datasets.
- Migration from `localStorage` → `IndexedDB` (one-time).

### 0.1.15 — AI Helpers (Alpha)
- NPC prompt helper (personality/backstory).
- Flavour text generator (rooms, scenes).
- Safety guardrails + “paste into note” action.

### 0.1.16 — Polish & Perf
- Route-level code-splitting where heavy.
- Save latency hints; error toasts standardization.
- Accessibility pass: labels, tab order, color contrast.

---

## Release Checklist (each patch)

1. **Code complete** on a feature branch (e.g., `feat/tracker-conditions`).
2. Update **CHANGELOG.md** with a new `## [0.1.X] – YYYY-MM-DD` entry.
3. Bump version:
   - `npm version patch`  
   - This updates `package.json` and creates a git tag `v0.1.X`.
4. Push:
   - `git push && git push --tags`
5. Verify:
   - Smoke test Characters, Tracker, Notes, Encounters hub in dark mode.
6. Create GitHub Release:
   - Title: `v0.1.X`
   - Body: paste the matching CHANGELOG section.

---

## Conventions (keep things professional)

- **Branch names:** `feat/...`, `fix/...`, `chore/...`
- **Commits:** Conventional Commits  
  Examples:
  - `feat(tracker): add conditions chips with tooltip summaries`
  - `fix(nav): ensure sticky z-index over page content`
  - `chore(release): 0.1.7`

---

## Want me to prep the next patch now?
I can implement **0.1.7 (Tracker: Conditions & Round Tools)** with:
- condition chips,
- tiny rules tooltips,
- and keyboard shortcuts (`[` `]` `L`).

Say “ship 0.1.7” and I’ll paste the exact files/sections to add.
