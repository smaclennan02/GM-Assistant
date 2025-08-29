Contributing Guide
==================

Release automation
------------------
We use release-please in GitHub Actions to automate version bumps and CHANGELOG updates. The footer in the app reads the version from `package.json`, so it updates automatically when a release is cut.

Flow
- Create a feature branch from `main`.
- Commit with Conventional Commit messages (see below).
- Open a Pull Request. The commitlint CI will validate commit messages and PR title.
- Merge your PR.
- The `release-please` Action opens or updates a “release PR” that bumps `package.json` and updates `CHANGELOG.md`.
- Merge the release PR to tag and finalize the release.

Conventional Commits
--------------------
Use the following types to drive semantic versioning:
- `feat:` – a new feature (bumps MINOR version)
- `fix:` – a bug fix (bumps PATCH version)
- `chore:`, `docs:`, `refactor:`, `test:` – maintenance (no version bump)

Examples
- `feat: quick NPC race selector`
- `fix: handle SSR for useSearchParams`
- `chore: bump deps`

Local versioning (optional)
---------------------------
If you’re cutting a local build and want to bump patch manually:

```bash
npm run version:patch
```

This updates `package.json` and appends a section to `CHANGELOG.md` (via `scripts/postversion.mjs`).

