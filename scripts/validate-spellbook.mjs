import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const requiredFiles = [
  "packages/db/migrations/0011_character_spellbooks.sql",
  "apps/web/src/spells/manage-spellbook.ts",
  "apps/web/src/spells/repository.ts",
  "apps/web/src/spells/actions.ts",
  "apps/web/src/components/character-spellbook-manager.tsx",
  "apps/web/src/app/(protected)/campaigns/[campaignId]/characters/[characterId]/spellbook/page.tsx",
  "docs/engineering/character-spellbook.md",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing spellbook file: ${file}`);
}

const schemaText = readText("packages/db/src/schema.ts");
for (const snippet of [
  '"spell_definitions"',
  '"character_spells"',
  '"character_spell_slots"',
  "preparation_state in ('known', 'prepared')",
  "unique (character_id, spell_slug)",
  "used_slots between 0 and total_slots",
]) {
  expect(
    schemaText.includes(snippet),
    `Spellbook schema is missing: ${snippet}`,
  );
}

const migrationText = readText(
  "packages/db/migrations/0011_character_spellbooks.sql",
);
for (const snippet of [
  "create table if not exists spell_definitions",
  "create table if not exists character_spells",
  "create table if not exists character_spell_slots",
  "array['cleric']",
  "array['wizard']",
  "on conflict (slug) where campaign_id is null",
]) {
  expect(
    migrationText.includes(snippet),
    `Spellbook migration is missing: ${snippet}`,
  );
}

const repositoryText = readText("apps/web/src/spells/repository.ts");
for (const snippet of [
  "campaign_memberships.user_id = $1",
  "campaign_memberships.role = 'dm'",
  "characters.owner_user_id = $1",
  "spell_definitions.visibility = 'player-safe'",
  "character_spells.preparation_state",
  "character_spells.spell_slug = effective_spells.slug",
  "on conflict (character_id, spell_slug)",
  "used_slots + $3 between 0 and total_slots",
  "withDatabaseTransaction",
]) {
  expect(
    repositoryText.includes(snippet),
    `Spellbook repository is missing access/state logic: ${snippet}`,
  );
}

const componentText = readText(
  "apps/web/src/components/character-spellbook-manager.tsx",
);
for (const snippet of [
  "Current spellbook",
  "Database-backed catalog",
  "Use slot",
  "Restore slot",
  "Known",
  "Prepared",
]) {
  expect(
    componentText.includes(snippet),
    `Spellbook UI is missing: ${snippet}`,
  );
}

await validateManagementHelpers();

if (failures.length > 0) {
  console.error("Character spellbook validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Character spellbook validation passed.");

async function validateManagementHelpers() {
  const typescriptPath = resolveTypeScriptRuntimePath();

  if (!typescriptPath) {
    failures.push(
      "TypeScript is required to validate spellbook management helpers.",
    );
    return;
  }

  const typescript = await import(pathToFileURL(typescriptPath).href);
  let source = readText("apps/web/src/spells/manage-spellbook.ts");
  source = source.replace(
    'from "@dnd/types"',
    `from "${moduleDataUrl(`
      export const spellPreparationStates = ["known", "prepared"];
    `)}"`,
  );
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ES2022,
      target: typescript.ScriptTarget.ES2022,
    },
    fileName: "apps/web/src/spells/manage-spellbook.ts",
  }).outputText;
  const management = await import(moduleDataUrl(compiled));

  expect(
    management.parseSpellPreparationState("known") === "known" &&
      management.parseSpellPreparationState("prepared") === "prepared" &&
      management.parseSpellPreparationState("always") === null,
    "Spell preparation parsing must accept only known/prepared.",
  );
  expect(
    management.parseSpellLevel("1") === 1 &&
      management.parseSpellLevel("9") === 9 &&
      management.parseSpellLevel("0") === null &&
      management.parseSpellLevel("2.5") === null,
    "Spell levels must be whole numbers from 1 through 9.",
  );
  expect(
    management.parseTotalSpellSlots("0") === 0 &&
      management.parseTotalSpellSlots("9") === 9 &&
      management.parseTotalSpellSlots("-1") === null &&
      management.parseTotalSpellSlots("10") === null,
    "Total spell slots must be whole numbers from 0 through 9.",
  );
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function readText(path) {
  return readFileSync(resolve(path), "utf8");
}

function resolve(path) {
  return join(rootDir, path);
}

function moduleDataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

function resolveTypeScriptRuntimePath() {
  const localPath = resolve("node_modules/typescript/lib/typescript.js");

  if (existsSync(localPath)) {
    return localPath;
  }

  const vscodeBasePath = join(
    process.env.LOCALAPPDATA ?? "",
    "Programs",
    "Microsoft VS Code",
  );

  if (!existsSync(vscodeBasePath)) {
    return null;
  }

  for (const entry of readdirSync(vscodeBasePath, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidatePath = join(
      vscodeBasePath,
      entry.name,
      "resources",
      "app",
      "extensions",
      "node_modules",
      "typescript",
      "lib",
      "typescript.js",
    );

    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}
