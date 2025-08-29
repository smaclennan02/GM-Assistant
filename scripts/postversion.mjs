// scripts/postversion.mjs
// Appends a version header to CHANGELOG.md after `npm version` runs.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

function today() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = pkg.version;
const date = today();

const changelogPath = new URL("../CHANGELOG.md", import.meta.url);
const hasChangelog = existsSync(changelogPath);
const current = hasChangelog ? readFileSync(changelogPath, "utf8") : "";

const header = `\n## v${version} - ${date}\n- Bump version.\n`;

// If this version already exists in the changelog, do nothing.
if (current.includes(`v${version} -`)) {
  process.exit(0);
}

let nextContent = current;
if (current.startsWith("# Changelog")) {
  nextContent = current + header;
} else {
  nextContent = `# Changelog\n${header}\n${current}`.trim() + "\n";
}

writeFileSync(changelogPath, nextContent, "utf8");
console.log(`CHANGELOG.md updated for v${version}`);

