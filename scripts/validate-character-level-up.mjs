import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const requiredFiles = [
  "apps/web/src/app/(protected)/campaigns/[campaignId]/characters/[characterId]/level-up/page.tsx",
  "apps/web/src/app/(protected)/campaigns/[campaignId]/characters/[characterId]/level-up/loading.tsx",
  "apps/web/src/characters/level-up-actions.ts",
  "apps/web/src/characters/manage-level-up.ts",
  "apps/web/src/components/character-level-up-form.tsx",
  "docs/engineering/guided-character-level-up.md",
  "packages/db/migrations/0013_character_level_progressions.sql",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing character level-up file: ${file}`);
}

const schemaText = readText("packages/db/src/schema.ts");
for (const snippet of [
  '"character_level_progressions"',
  "create table character_level_progressions",
  "to_level = from_level + 1",
  "unique (character_id, to_level)",
  "added_abilities jsonb",
]) {
  expect(
    schemaText.includes(snippet),
    `Character progression schema must include ${snippet}.`,
  );
}

const migrationText = readText(
  "packages/db/migrations/0013_character_level_progressions.sql",
);
for (const snippet of [
  "create table if not exists character_level_progressions",
  "character_level_progressions_step_check",
  "character_level_progressions_character_level_unique",
  "character_level_progressions_character_idx",
]) {
  expect(
    migrationText.includes(snippet),
    `Character progression migration must include ${snippet}.`,
  );
}

const repositoryText = readText("apps/web/src/characters/repository.ts");
for (const snippet of [
  "completeCharacterLevelUpForUser",
  "withDatabaseTransaction",
  "campaign_memberships.role = 'dm'",
  "characters.owner_user_id = $1",
  "and $4 = characters.level + 1",
  "characters.updated_at = $6::timestamptz",
  "insert into character_level_progressions",
  "insert into ability_summaries",
  "added_abilities",
]) {
  expect(
    repositoryText.includes(snippet),
    `Character progression repository must include ${snippet}.`,
  );
}

const actionText = readText("apps/web/src/characters/level-up-actions.ts");
for (const snippet of [
  "requireAuthSession",
  "getCurrentCampaignAccess",
  "getCharacterForUser",
  "completeLevelUpSubmission",
  "revalidateLevelUpPaths",
]) {
  expect(
    actionText.includes(snippet),
    `Level-up action must include ${snippet}.`,
  );
}

const routeText = readText(
  "apps/web/src/app/(protected)/campaigns/[campaignId]/characters/[characterId]/level-up/page.tsx",
);
expect(
  routeText.includes("character.accessLevel !== \"full\"") &&
    routeText.includes("!character.canEdit") &&
    routeText.includes("CharacterLevelUpForm"),
  "Level-up route must require full owner/DM access and render the guided form.",
);

const componentText = readText(
  "apps/web/src/components/character-level-up-form.tsx",
);
for (const snippet of [
  "Guided character progression",
  "Meaningful change",
  "New feature reminders",
  "Level-up progress",
  "Reach level",
]) {
  expect(
    componentText.includes(snippet),
    `Guided level-up UI must include ${snippet}.`,
  );
}

const profileText = readText(
  "apps/web/src/components/character-profile.tsx",
);
expect(
  profileText.includes("Start level-up") &&
    profileText.includes("Level-up history") &&
    profileText.includes("character.progressions"),
  "Full character profiles must expose guided level-up and progression history.",
);

const formText = readText(
  "apps/web/src/components/character-form-fields.tsx",
);
expect(
  formText.includes("Use the guided level-up flow") &&
    formText.includes('<input name="level" type="hidden"'),
  "General character editing must keep level changes in the guided flow.",
);

const memoryText = readText("apps/web/src/memory/retrieval.ts");
expect(
  memoryText.includes("createCharacterProgressionMemoryDocument") &&
    memoryText.includes('"character_level_progressions"') &&
    memoryText.includes("character.isOwnedByCurrentUser"),
  "Progression history must enter grounded memory without weakening owner visibility.",
);

await validateLevelUpHelpers();

if (failures.length > 0) {
  console.error("Character level-up validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Character level-up validation passed.");

async function validateLevelUpHelpers() {
  const typescriptPath = resolveTypeScriptRuntimePath();

  if (!typescriptPath) {
    failures.push(
      "TypeScript is required to validate character level-up helpers.",
    );
    return;
  }

  const typescriptRuntime = await import(pathToFileURL(typescriptPath).href);
  const typescript = typescriptRuntime.default ?? typescriptRuntime;
  const databaseIdSource = readText(
    "apps/web/src/campaigns/database-id.ts",
  );
  const databaseIdUrl = moduleDataUrl(
    typescript.transpileModule(databaseIdSource, {
      compilerOptions: {
        module: typescript.ModuleKind.ES2022,
        target: typescript.ScriptTarget.ES2022,
      },
      fileName: "apps/web/src/campaigns/database-id.ts",
    }).outputText,
  );
  const source = readText("apps/web/src/characters/manage-level-up.ts").replaceAll(
    "@/campaigns/database-id",
    databaseIdUrl,
  );
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ES2022,
      target: typescript.ScriptTarget.ES2022,
    },
    fileName: "apps/web/src/characters/manage-level-up.ts",
  }).outputText;
  const levelUp = await import(moduleDataUrl(compiled));
  const campaignId = "11111111-1111-5111-8111-111111111111";
  const characterId = "22222222-2222-5222-8222-222222222222";
  const character = {
    abilities: [],
    accessLevel: "full",
    backstory: "",
    canEdit: true,
    goals: "",
    id: characterId,
    inventoryNotes: "",
    isOwnedByCurrentUser: true,
    level: 4,
    name: "Mira",
    personalNotes: "",
    relationships: "",
    summary: "",
    updatedAt: "2026-06-21T08:00:00.000Z",
    visibility: "player-safe",
  };
  const values = {
    abilities:
      "Extra Attack | Attack twice when taking the Attack action. | 1 action",
    campaignId,
    characterId,
    currentLevel: "4",
    revision: character.updatedAt,
    summary: "Mira can now control the front line more reliably.",
  };
  const valid = levelUp.validateLevelUpValues(values, character);

  expect(
    Object.keys(valid.fieldErrors).length === 0 &&
      valid.input.currentLevel === 4 &&
      valid.input.targetLevel === 5 &&
      valid.input.abilities[0]?.name === "Extra Attack",
    "Level-up validation must normalize a one-level progression and new features.",
  );

  const stale = levelUp.validateLevelUpValues(
    {
      ...values,
      currentLevel: "3",
    },
    character,
  );
  expect(
    stale.fieldErrors.currentLevel?.includes("changed"),
    "Level-up validation must reject stale current levels.",
  );

  const maxLevel = levelUp.validateLevelUpValues(
    {
      ...values,
      currentLevel: "20",
    },
    {
      ...character,
      level: 20,
    },
  );
  expect(
    maxLevel.fieldErrors.currentLevel ===
      "This character is already level 20.",
    "Level-up validation must enforce the level 20 cap.",
  );

  let repositoryInput = null;
  const submission = await levelUp.completeLevelUpSubmission(
    {
      async completeCharacterLevelUpForUser(_userId, input) {
        repositoryInput = input;
        return {
          ...character,
          level: 5,
        };
      },
    },
    "33333333-3333-5333-8333-333333333333",
    character,
    values,
    String,
  );
  expect(
    submission.ok &&
      repositoryInput?.targetLevel === 5 &&
      repositoryInput?.abilities.length === 1,
    "Valid level-ups must call the repository with the normalized progression.",
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
