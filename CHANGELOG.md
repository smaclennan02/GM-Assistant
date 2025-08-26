# Changelog

All notable changes to this project will be documented in this file.
# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org) and the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Planned
- v0.6.0 — Campaign Hub deep linking (`/campaign/[id]`), tabs (Overview, Session Log, Linked PCs/NPCs), save/restore encounters to campaign logs.
- v0.7.0 — Resources Hub refresh with preset encounters, exports, snapshots.

## [0.5.0] - 2025-08-26
### Added
- **Characters Hub refresh** to match Suite style: dark UI, rounded cards, no inner scrollbars.
- **Header control group**: Import, Export, Clear, New PC.
- **PC card grid** with inline edit (name, class, level) and “Details” affordance.
- **Active campaign filtering**: when an Active Campaign is set, Characters defaults to linked PCs with a “Show all” toggle.

### Changed
- Consolidated spacing, borders, and hover states to match the Encounter Suite.
- New PCs automatically link to current Active Campaign (if set).

## [0.4.0] - 2025-08-25
### Added
- **Campaign Hub** redesigned into campaign cards with CSV import/export, notes, and session logs.
- **Home** page campaign selector that sets `STORAGE_KEYS.ACTIVE_CAMPAIGN`.
- **Global Top Nav** (`src/components/Nav.tsx`) with links to all hubs and an **Active Campaign** badge.
- **Campaign page** shows the single active campaign’s details.

### Changed
- Removed scattered “Home” buttons (navigation is now global).
- Legacy encounter routes redirect to `/encounters/suite` (kept from 0.2.x).

## [0.3.0] - 2025-08-24
### Changed
- Removed experimental **bulk selection** (caused state bugs).
- Simplified back to **single-target conditions**.
- Tightened table padding and **active turn indicator** to a minimal single-ring marker.
- **Round controls** encapsulated in their own box.
- Added **Clear Encounter** button.

## [0.2.0] - 2025-08-25
### Added
- **Slide-over Details Drawer** for combatant info (opens from the right, closes on backdrop or Esc). Zero table reflow and plenty of space for monster stat blocks and PC details.
- **Active Info state** on rows (Info button shows active background when that combatant is open).

### Changed
- **Encounter table density & layout**: tighter column widths (Name/Init/HP/AC/Effects), merged *Info*+*Remove* into a single **Actions** column, and flexible Name input so the **Actions** stay visible without horizontal scrolling.
- **Responsive layout**: table gets more room at smaller widths (sidebar stacks later), reducing the chance of horizontal scroll.
- **Consistent affordances**: all pressable controls now use pointer cursor + hover state (including chips, Info, and action buttons).

### Fixed
- Invalid hook call caused by a misplaced `useState` (moved `drawerId` inside the component).
- Stray reference to `drawerId` inside the Effects menu (menu restored to a simple close button).
- Residual links: removed any remaining Tracker/Builder/Monsters links from the Suite page UI (legacy routes still redirect to the Suite).

### Notes
- The Encounter Suite remains the single destination for running combat: initiative tracking, effects, Monster Manual (search + Add N + optional Roll HP), and details—now via a non-intrusive drawer.

## [0.1.22] - 2025-08-24
### Added
- **Encounter Suite** consolidation: one-page flow (tracker + Monster Manual + right-side Info panel), PC sync (Load PCs add/update/prune).
### Changed
- Nav now points to Encounter Suite as the single Encounters destination; old routes redirect to it.
### Fixed
- Ghost PCs (e.g., “Ajax”) pruned during sync to match Characters tab.



## [0.1.21] – 2025-08-24
### Added
- Tracker: Effects can have **round durations**; add via “+” menu with optional rounds.
- Tracker: **Auto-tick** timed effects when a creature becomes active (Start / Next / Prev). Auto-removes at 0.

### Compatibility
- Existing encounters still work: untimed effects remain simple keys.
- Adding a timed version of an existing effect **replaces** the untimed one for that row (and vice versa), avoiding duplicates.

## [0.1.20] – 2025-08-24
### Changed
- Tracker: Effects now use the **exact** icons & colors from `lib/conditions`.
- Tracker: “+” opens a floating **cursor-anchored** menu (portal), no table squish.
- Tracker: Effect chips are **icon-only** with tooltips; click to remove.

### Fixed
- Tracker: **Load PCs** merges by `pcId` to prevent duplicates.

## [0.1.18] – 2025-08-24
### Added
- Monsters page: **Add N copies** with **auto-numbering** (Goblin #1…#N).
- Monsters page: **Roll HP** toggle — rolls from the HP formula when available; otherwise uses average.

## [0.1.15] – 2025-08-23
### Added
- Floating Dice: d20 **Advantage/Disadvantage** and a **multi-dice custom roller** with **drop lowest** and mod.
- Presets: **2d6**, **3d6**, **4d6-L** with detailed breakdown in the log.

## [0.1.14] – 2025-08-23
### Changed
- Floating Dice: larger button, same-button toggle, and an “unravel from button” animation.

## [0.1.13] – 2025-08-23
### Changed
- Tracker Effects: “+” now opens a **cursor-anchored popover** with a compact icon grid and search.
### Improved
- No layout shift; fixed-width Effects column preserved.
- Click outside / Esc to close; selecting an effect auto-closes.

## [0.1.12] – 2025-08-23
### Added
- **Tracker QoL**:
  - Inline **d20 roll** on each combatant; uses PC **initMod** when present (or +0).
  - **Export/Import Encounter** (JSON) to reuse later.
  - **Bulk actions**: remove all NPCs, clear all effects, reset encounter.
### Notes
- Stable layout preserved (fixed-width Effects column). Compatible with existing data.

## [0.1.11] – 2025-08-23
### Fixed
- Tracker Effects picker: guarded missing icons to prevent “Element type is invalid” crash.
- Replaced rare Lucide icons with widely supported ones (Restrained → Lock, Exhaustion → Battery).

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
