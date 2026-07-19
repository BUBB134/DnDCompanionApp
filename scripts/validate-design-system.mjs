import { readFile } from "node:fs/promises";
import process from "node:process";

const root = new URL("../", import.meta.url);

const [globals, sharedUi, shell, navigation, inventory] = await Promise.all([
  readFile(new URL("apps/web/src/app/globals.css", root), "utf8"),
  readFile(new URL("packages/ui/src/index.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/components/protected-app-shell.tsx", root), "utf8"),
  readFile(new URL("apps/web/src/components/app-shell-navigation.tsx", root), "utf8"),
  readFile(new URL("docs/product/stitch-screen-inventory.md", root), "utf8"),
]);

const failures = [];

const requiredTokens = [
  "--arcane-ink",
  "--arcane-canvas",
  "--arcane-parchment",
  "--arcane-gold",
  "--arcane-teal",
  "--arcane-oxblood",
  "--arcane-motion-fast",
  "@theme inline",
  "prefers-reduced-motion",
];

for (const token of requiredTokens) {
  if (!globals.includes(token)) {
    failures.push(`globals.css is missing the Arcane token or behavior: ${token}`);
  }
}

for (const primitive of [
  "SurfaceTone",
  'tone = "panel"',
  "SectionHeading",
  "StatusPill",
  "EmptyState",
]) {
  if (!sharedUi.includes(primitive)) {
    failures.push(`@dnd/ui is missing the shared design primitive: ${primitive}`);
  }
}

const legacyPalettePattern =
  /#(?:17161f|f7f1e5|fffaf0|c3943e|1f6f78|8b2f39|4b4657|625d6d)\b/i;

for (const [name, source] of [
  ["ProtectedAppShell", shell],
  ["AppShellNavigation", navigation],
]) {
  if (legacyPalettePattern.test(source)) {
    failures.push(`${name} still contains a core Arcane palette literal`);
  }
}

for (const evidence of [
  "Approved-screen inventory",
  "Known deviations",
  "Screenshot review process",
  "390x844",
  "1024x768",
  "1440x900",
  "DM-only and player-visible behavior",
]) {
  if (!inventory.includes(evidence)) {
    failures.push(`Stitch inventory is missing required evidence: ${evidence}`);
  }
}

if (failures.length > 0) {
  console.error("Arcane design-system validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  "Arcane design-system validation passed: tokens, primitives, shell, and Stitch review contract are present.",
);

