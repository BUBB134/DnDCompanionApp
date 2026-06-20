import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/app/(protected)/campaigns/[campaignId]/characters/page.tsx",
  "apps/web/src/app/(protected)/campaigns/[campaignId]/characters/loading.tsx",
  "apps/web/src/app/(protected)/campaigns/[campaignId]/characters/[characterId]/page.tsx",
  "apps/web/src/app/(protected)/campaigns/[campaignId]/characters/[characterId]/loading.tsx",
  "apps/web/src/characters/actions.ts",
  "apps/web/src/characters/manage-character.ts",
  "apps/web/src/characters/repository.ts",
  "apps/web/src/components/character-create-form.tsx",
  "apps/web/src/components/character-edit-form.tsx",
  "apps/web/src/components/character-form-fields.tsx",
  "apps/web/src/components/character-list-view.tsx",
  "apps/web/src/components/character-profile.tsx",
  "docs/engineering/character-companion.md",
  "packages/db/migrations/0009_character_companion_profiles.sql",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing character companion file: ${file}`);
}

const schemaText = readText("packages/db/src/schema.ts");
for (const column of [
  "ancestry text",
  "background text",
  "backstory text",
  "goals text",
  "relationships text",
  "inventory_notes text",
  "personal_notes text",
  "level between 1 and 20",
]) {
  expect(
    schemaText.includes(column),
    `Character schema must include ${column}.`,
  );
}

const repositoryText = readText("apps/web/src/characters/repository.ts");
for (const accessRule of [
  "campaign_memberships.role = 'dm'",
  "characters.owner_user_id = $1",
  "characters.visibility = 'player-safe'",
  "else characters.visibility",
  "left join ability_summaries",
  "insert into characters",
  "update characters",
  "characters.updated_at = $16::timestamptz",
  "pg_advisory_xact_lock",
  "regexp_replace(btrim(characters.name)",
  "delete from ability_summaries",
]) {
  expect(
    repositoryText.includes(accessRule),
    `Character repository must enforce or persist: ${accessRule}.`,
  );
}

const migrationText = readText(
  "packages/db/migrations/0009_character_companion_profiles.sql",
);
expect(
  migrationText.includes(
    "set level = greatest(1, least(20, level))",
  ) &&
    migrationText.indexOf("set level = greatest(1, least(20, level))") <
      migrationText.indexOf("add constraint characters_level_range_check"),
  "Character migration must normalize legacy levels before adding the range constraint.",
);

const listPageText = readText(
  "apps/web/src/app/(protected)/campaigns/[campaignId]/characters/page.tsx",
);
for (const expectedText of [
  "isDatabaseCampaignId",
  "listCharacterSummariesForUser",
  "CharacterListView",
]) {
  expect(
    listPageText.includes(expectedText),
    `Character list route must include ${expectedText}.`,
  );
}

const listViewText = readText("apps/web/src/components/character-list-view.tsx");
for (const expectedText of [
  "/characters/new",
  "Start guided creation",
  "No characters yet",
  "Open character",
]) {
  expect(
    listViewText.includes(expectedText),
    `Character list view must include ${expectedText}.`,
  );
}

const detailPageText = readText(
  "apps/web/src/app/(protected)/campaigns/[campaignId]/characters/[characterId]/page.tsx",
);
for (const expectedText of [
  "isDatabaseCampaignId",
  "isDatabaseId",
  "getCharacterForUser",
  "CharacterProfile",
]) {
  expect(
    detailPageText.includes(expectedText),
    `Character detail route must include ${expectedText}.`,
  );
}

const navigationText = readText(
  "apps/web/src/components/app-shell-navigation.tsx",
);
expect(
  navigationText.includes('campaignScoped?: "characters"') &&
    navigationText.includes(
      "href: `/campaigns/${routeCampaignId}/characters`",
    ),
  "Character navigation must follow the campaign id in the current route.",
);

const characterProfileText = readText(
  "apps/web/src/components/character-profile.tsx",
);
for (const expectedText of [
  "Player-safe summary",
  "Private character details",
  "CharacterEditForm",
  "Ability summaries",
]) {
  expect(
    characterProfileText.includes(expectedText),
    `Character profile must include ${expectedText}.`,
  );
}

expect(
  readText("apps/web/src/components/campaign-shell.tsx").includes(
    "Open characters",
  ),
  "Campaign dashboard must link to character companions.",
);

const typescriptPath = resolveTypeScriptRuntimePath();
const typescriptRuntime = typescriptPath
  ? await import(pathToFileURL(typescriptPath).href)
  : null;
const typescript = typescriptRuntime
  ? (typescriptRuntime.default ?? typescriptRuntime)
  : null;

if (typescript) {
  const campaignTypesUrl = await transpileModuleToDataUrl(
    "packages/types/src/campaign.ts",
  );
  const databaseIdUrl = await transpileModuleToDataUrl(
    "apps/web/src/campaigns/database-id.ts",
  );
  const manageCharacterUrl = await transpileModuleToDataUrl(
    "apps/web/src/characters/manage-character.ts",
    [
      ["@dnd/types", campaignTypesUrl],
      ["@/campaigns/database-id", databaseIdUrl],
    ],
  );
  const manageCharacter = await import(manageCharacterUrl);
  const savedCampaignId = "11111111-1111-5111-8111-111111111111";
  const dmCampaign = {
    id: savedCampaignId,
    name: "Ashen Coast",
    role: "dm",
  };
  const validValues = {
    abilities:
      "Second Wind | Regain a small pool of hit points. | Bonus action\nAction Surge | Take one additional action. | Once per rest",
    ancestry: "Human",
    ancestryOptionSlug: "",
    background: "Sailor",
    backgroundOptionSlug: "",
    backstory: "Raised among the Ashen Coast privateers.",
    campaignId: savedCampaignId,
    characterId: "",
    className: "Fighter",
    classOptionSlug: "",
    creationMode: "standard",
    goals: "Open the drowned vault.",
    inventoryNotes: "Tide key, rope, lantern.",
    level: "3",
    name: "Mira Voss",
    personalNotes: "Captain Thorn knows too much.",
    relationships: "Owes Captain Thorn a favour.",
    revision: "",
    roleplayTraitOptionSlug: "",
    summary: "A practical fighter who reads the tides.",
    visibility: "player-safe",
  };
  const valid = manageCharacter.validateCharacterValues(
    validValues,
    dmCampaign,
  );

  expect(
    Object.keys(valid.fieldErrors).length === 0 &&
      valid.input.level === 3 &&
      valid.input.abilities.length === 2 &&
      valid.input.abilities[0]?.name === "Second Wind",
    "Character validation must normalize profile fields and ability summaries.",
  );

  const playerDmOnly = manageCharacter.validateCharacterValues(
    {
      ...validValues,
      visibility: "dm-only",
    },
    {
      ...dmCampaign,
      role: "player",
    },
  );
  expect(
    playerDmOnly.fieldErrors.visibility ===
      "Only DMs can mark characters as DM only.",
    "Players must not create DM-only character profiles.",
  );

  const preservedPlayerDmOnly = manageCharacter.validateCharacterValues(
    {
      ...validValues,
      characterId: "22222222-2222-5222-8222-222222222222",
      visibility: "dm-only",
    },
    {
      ...dmCampaign,
      role: "player",
    },
    {
      allowPreservedDmOnlyVisibility: true,
    },
  );
  expect(
    !preservedPlayerDmOnly.fieldErrors.visibility,
    "Player edits must be able to preserve a DM-only visibility set by a DM.",
  );

  const missingRevision = await manageCharacter.updateCharacterSubmission(
    {
      async updateCharacterForUser() {
        throw new Error("Repository must not run without a revision.");
      },
    },
    "33333333-3333-5333-8333-333333333333",
    dmCampaign,
    {
      ...validValues,
      characterId: "22222222-2222-5222-8222-222222222222",
    },
    String,
  );
  expect(
    !missingRevision.ok &&
      missingRevision.state.fieldErrors.revision ===
        "Reload this character before saving changes.",
    "Character updates must reject forms that do not carry a valid revision.",
  );

  const invalidAbilities = manageCharacter.validateCharacterValues(
    {
      ...validValues,
      abilities: "Second Wind without separators",
    },
    dmCampaign,
  );
  expect(
    invalidAbilities.fieldErrors.abilities?.includes(
      "Name | Summary | Optional trigger",
    ),
    "Character validation must reject malformed ability summaries.",
  );
}

if (failures.length > 0) {
  console.error("Character companion validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Character companion validation passed.");

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

async function transpileModuleToDataUrl(path, replacements = []) {
  let source = readText(path);

  for (const [from, to] of replacements) {
    source = source.replaceAll(from, to);
  }

  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ES2022,
      target: typescript.ScriptTarget.ES2022,
    },
    fileName: path,
  }).outputText;

  return moduleDataUrl(compiled);
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
