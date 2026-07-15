import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const brand = readText("apps/web/src/brand.ts");
expect(
  brand.includes('PRODUCT_NAME = "The DnD Companion"'),
  "Brand constants must define the canonical product name.",
);
expect(
  brand.includes('PRODUCT_SHORT_NAME = "DnD Companion"'),
  "Brand constants must define the constrained short name.",
);
expect(
  brand.includes('PRODUCT_ORIGIN = "https://thedndcompanion.com"'),
  "Brand constants must define the canonical production origin.",
);

const layout = readText("apps/web/src/app/layout.tsx");
expect(
  layout.includes("metadataBase: new URL(PRODUCT_ORIGIN)"),
  "Root metadata must use the canonical production origin.",
);
expect(layout.includes("openGraph"), "Root metadata must define Open Graph branding.");
expect(layout.includes("twitter"), "Root metadata must define social-card branding.");
expect(
  !layout.includes("alternates:"),
  "Root metadata must not canonicalize every application route to the homepage.",
);

const twitterImage = readText("apps/web/src/app/twitter-image.tsx");
expect(twitterImage.includes("OpenGraphImage"), "Twitter cards must reuse the branded social image.");

const manifest = readText("apps/web/src/app/manifest.ts");
expect(manifest.includes("name: PRODUCT_NAME"), "PWA manifest must use the full product name.");
expect(
  manifest.includes("short_name: PRODUCT_SHORT_NAME"),
  "PWA manifest must use the constrained short name.",
);

const publicUiFiles = [
  "apps/web/src/app/layout.tsx",
  "apps/web/src/app/manifest.ts",
  "apps/web/src/components/auth-page-frame.tsx",
  "apps/web/src/components/protected-app-shell.tsx",
];

for (const path of publicUiFiles) {
  expect(
    !readText(path).includes("D&D Companion"),
    `${path} must not use the legacy product name.`,
  );
}

const brandFoundation = readText("docs/product/brand-foundation.md");
for (const requirement of [
  "## Canonical identity",
  "## Stitch-derived visual direction",
  "## Wordmark and icon",
  "## Typography",
  "## Tone of voice",
  "## Naming checklist",
]) {
  expect(brandFoundation.includes(requirement), `Brand foundation is missing ${requirement}.`);
}

if (failures.length > 0) {
  console.error("Brand validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Brand validation passed.");

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function readText(path) {
  return readFileSync(join(rootDir, path), "utf8");
}
