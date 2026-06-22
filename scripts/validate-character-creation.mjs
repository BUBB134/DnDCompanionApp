import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/app/(protected)/campaigns/[campaignId]/characters/new/page.tsx",
  "apps/web/src/app/(protected)/campaigns/[campaignId]/characters/new/loading.tsx",
  "apps/web/src/characters/creation-options.ts",
  "apps/web/src/characters/creation-profile.ts",
  "apps/web/src/components/character-create-form.tsx",
  "docs/engineering/guided-character-creation.md",
  "packages/db/migrations/0010_guided_character_creation_options.sql",
  "packages/db/src/character-creation-content.ts",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing guided creation file: ${file}`);
}

const schemaText = readText("packages/db/src/schema.ts");
for (const expectedText of [
  '"character_creation_options"',
  "category in ('class', 'ancestry', 'background', 'roleplay-trait')",
  "ability_summaries jsonb",
  "magic_capable boolean",
]) {
  expect(
    schemaText.includes(expectedText),
    `Character creation schema must include ${expectedText}.`,
  );
}

const migrationText = readText(
  "packages/db/migrations/0010_guided_character_creation_options.sql",
);
for (const expectedText of [
  "create table if not exists character_creation_options",
  "'fighter'",
  "'wizard'",
  "'halfling'",
  "'soldier'",
  "'steadfast-guardian'",
  "on conflict (slug) do update",
]) {
  expect(
    migrationText.includes(expectedText),
    `Character creation migration must include ${expectedText}.`,
  );
}

const routeText = readText(
  "apps/web/src/app/(protected)/campaigns/[campaignId]/characters/new/page.tsx",
);
for (const expectedText of [
  "getDatabaseCampaignAccessForUser",
  "loadCharacterCreationCatalogForUser",
  "draftOwnerId={session.user.id}",
  "CharacterCreateForm",
]) {
  expect(
    routeText.includes(expectedText),
    `Guided creation route must include ${expectedText}.`,
  );
}

const wizardText = readText("apps/web/src/components/character-create-form.tsx");
for (const expectedText of [
  "dnd-character-creation-draft-v1",
  "draftOwnerId",
  "Guided character creation",
  "noValidate",
  "Roleplay directions",
  "Spellbook-ready foundation",
  'name="creationMode"',
  'value="guided"',
  "validateCharacterCreationStep",
]) {
  expect(
    wizardText.includes(expectedText),
    `Guided creation wizard must include ${expectedText}.`,
  );
}

const listText = readText("apps/web/src/components/character-list-view.tsx");
expect(
  listText.includes("/characters/new") &&
    listText.includes("Start guided creation"),
  "Character list must link to guided creation.",
);

const manageCharacterText = readText(
  "apps/web/src/characters/manage-character.ts",
);
expect(
  manageCharacterText.includes('creationMode === "guided"') &&
    manageCharacterText.includes("Choose a class before creating this character.") &&
    manageCharacterText.includes(
      "Choose an ancestry or species before creating this character.",
    ),
  "Guided submissions must enforce the required creation choices on the server.",
);

expect(
  readText("apps/web/src/characters/actions.ts").includes(
    'creationMode: "guided"',
  ) &&
    readText("apps/web/src/characters/actions.ts").includes(
      "resolveGuidedCharacterSelection",
    ) &&
    readText("apps/web/src/characters/actions.ts").includes(
      "formatCharacterCreationAbilities",
    ) &&
    readText("apps/web/src/characters/actions.ts").includes(
      'console.error("Character persistence failed.", error)',
    ) &&
    readText("apps/web/src/characters/actions.ts").includes(
      "error instanceof CharacterPersistenceError",
    ) &&
    readText("apps/web/src/characters/actions.ts").includes(
      "Unable to save this character right now. Please try again.",
    ),
  "Character creation action must canonicalize guided choices and keep persistence diagnostics out of user-facing errors.",
);

const repositoryText = readText(
  "apps/web/src/characters/creation-options.ts",
);
for (const expectedText of [
  "from character_creation_options",
  "campaign_memberships.user_id = $1",
  "campaign_memberships.campaign_id = $2",
]) {
  expect(
    repositoryText.includes(expectedText),
    `Character option repository must include ${expectedText}.`,
  );
}

const typescriptPath = resolveTypeScriptRuntimePath();
const typescriptRuntime = typescriptPath
  ? await import(pathToFileURL(typescriptPath).href)
  : null;
const typescript = typescriptRuntime
  ? (typescriptRuntime.default ?? typescriptRuntime)
  : null;

if (typescript) {
  const contentModuleUrl = await transpileModuleToDataUrl(
    "packages/db/src/character-creation-content.ts",
  );
  const contentModule = await import(contentModuleUrl);
  const creationProfileModuleUrl = await transpileModuleToDataUrl(
    "apps/web/src/characters/creation-profile.ts",
  );
  const creationProfileModule = await import(creationProfileModuleUrl);
  const options = contentModule.coreCharacterCreationOptions;

  expect(
    creationProfileModule.resolveOptionalRoleplayTraitSlug(
      options,
      "steadfast-guardian",
    ) === "steadfast-guardian",
    "Current optional roleplay choices must survive draft hydration.",
  );
  expect(
    creationProfileModule.resolveOptionalRoleplayTraitSlug(
      options,
      "retired-roleplay-option",
    ) === "",
    "Stale optional roleplay choices must be cleared during draft hydration.",
  );

  for (const invalidLevel of ["", "0", "2.5", "21"]) {
    const invalidLevelError =
      creationProfileModule.validateCharacterCreationStep(
        "identity",
        {
          ancestry: "",
          background: "",
          className: "",
          level: invalidLevel,
          name: "Mira Voss",
          summary: "",
        },
        "",
      );
    expect(
      invalidLevelError ===
        "Starting level must be a whole number from 1 to 20.",
      `Identity step must reject invalid level value: ${invalidLevel || "empty"}.`,
    );
  }

  for (const category of [
    "class",
    "ancestry",
    "background",
    "roleplay-trait",
  ]) {
    expect(
      options.filter((option) => option.category === category).length >= 4,
      `Baseline character creation content must include four ${category} choices.`,
    );
  }

  const wizard = options.find((option) => option.slug === "wizard");
  expect(
    wizard?.magicCapable === true &&
      wizard.abilities.some((ability) => ability.name === "Spellcasting"),
    "Magic-capable class content must expose a spellbook-ready ability summary.",
  );

  const dbStubModuleUrl = moduleDataUrl(`
    export const queries = [];

    export async function queryDatabase(text, values = []) {
      queries.push({ text, values });
      return {
        rows: [{
          ability_summaries: [{
            name: "Spellcasting",
            summary: "Prepare arcane magic.",
            trigger: "Uses spell slots"
          }],
          actions: ["Recall hidden lore"],
          category: "class",
          flavour: "Every spell begins as a question.",
          gameplay: "A prepared arcane spellcaster.",
          id: "option-1",
          magic_capable: true,
          name: "Wizard",
          proficiencies: ["Arcane lore"],
          quirks: ["Annotates everything"],
          slug: "wizard",
          source: "dnd-companion-mvp",
          source_version: "2026-06-mvp",
          summary: "A studied spellcaster.",
          traits: ["Curious"]
        }]
      };
    }
  `);
  const dbStubModule = await import(dbStubModuleUrl);
  const creationOptionsModule = await import(
    await transpileModuleToDataUrl(
      "apps/web/src/characters/creation-options.ts",
      [
        ["@dnd/db/character-creation-content", contentModuleUrl],
        ["@dnd/db", dbStubModuleUrl],
        ["@/characters/creation-profile", creationProfileModuleUrl],
      ],
    ),
  );
  const listedOptions =
    await creationOptionsModule.listCharacterCreationOptionsForUser(
      "user-1",
      "campaign-1",
    );

  expect(
    listedOptions[0]?.slug === "wizard" &&
      listedOptions[0]?.abilities[0]?.name === "Spellcasting",
    "Character option repository must map persisted option metadata.",
  );
  expect(
    dbStubModule.queries[0]?.values.join(",") === "user-1,campaign-1",
    "Character option retrieval must carry user and campaign membership scope.",
  );
  const fallbackCatalog =
    await creationOptionsModule.loadCharacterCreationCatalogForUser(
      "user-1",
      "campaign-1",
    );
  expect(
    fallbackCatalog.loadNotice?.includes("incomplete") &&
      fallbackCatalog.options.length === options.length,
    "Incomplete persisted catalogs must use the complete bundled catalog for rendering and submission validation.",
  );

  const abilityText =
    creationProfileModule.formatCharacterCreationAbilities(listedOptions);
  expect(
    abilityText ===
      "Spellcasting | Prepare arcane magic. | Uses spell slots",
    "Character option abilities must serialize into the existing character form contract.",
  );
  expect(
    !creationProfileModule.hasCompleteCharacterCreationCatalog(listedOptions) &&
      creationProfileModule.hasCompleteCharacterCreationCatalog(options),
    "Character creation must fall back when persisted catalog categories are incomplete.",
  );

  const typesStubModuleUrl = moduleDataUrl("");
  const manageCharacterStubModuleUrl = moduleDataUrl(`
    export const CHARACTER_ABILITY_MAX_COUNT = 12;
  `);
  const characterRepositoryDbStubModuleUrl = moduleDataUrl(`
    export async function queryDatabase() {
      throw new Error("queryDatabase should not be called in this validation.");
    }

    export async function withDatabaseTransaction() {
      throw new Error("withDatabaseTransaction should not be called in this validation.");
    }
  `);
  const characterRepositoryModule = await import(
    await transpileModuleToDataUrl(
      "apps/web/src/characters/repository.ts",
      [
        ["@dnd/types", typesStubModuleUrl],
        ["@dnd/db", characterRepositoryDbStubModuleUrl],
        ["@/characters/manage-character", manageCharacterStubModuleUrl],
      ],
    ),
  );
  const minimalCharacterInput = {
    abilities: [],
    ancestry: null,
    background: null,
    backstory: "",
    campaignId: "11111111-1111-5111-8111-111111111111",
    className: null,
    goals: "",
    inventoryNotes: "",
    level: 1,
    name: "Mira Voss",
    personalNotes: "",
    relationships: "",
    summary: "",
    visibility: "player-safe",
  };
  const minimalPersistence = createCharacterPersistenceStub(
    minimalCharacterInput,
  );
  const minimalCharacter =
    await characterRepositoryModule.createCharacterInTransaction(
      minimalPersistence.client,
      "22222222-2222-5222-8222-222222222222",
      minimalCharacterInput,
    );
  const minimalInsert = minimalPersistence.queries.find(({ text }) =>
    text.includes("insert into characters"),
  );

  expect(
    minimalCharacter.className === null &&
      minimalCharacter.ancestry === null &&
      minimalCharacter.background === null,
    "Minimal character submissions must persist and reload nullable profile fields.",
  );
  expect(
    minimalInsert?.text.includes("$5::text") &&
      minimalInsert.text.includes("$7::text") &&
      minimalInsert.text.includes("$8::text") &&
      minimalInsert.text.includes("$14::visibility") &&
      minimalInsert.text.includes(
        "$14::visibility = 'player-safe'::visibility",
      ),
    "Character creation must give optional fields and visibility explicit Postgres types.",
  );
  expect(
    minimalInsert?.values[4] === null &&
      minimalInsert.values[6] === null &&
      minimalInsert.values[7] === null &&
      minimalInsert.values[13] === "player-safe",
    "Minimal character persistence must preserve nullable values and player-safe visibility.",
  );

  const fullCharacterInput = {
    ...minimalCharacterInput,
    abilities: [
      {
        name: "Second Wind",
        summary: "Regain a small pool of hit points.",
        trigger: "Bonus action",
      },
    ],
    ancestry: "Human",
    background: "Sailor",
    backstory: "Raised among the Ashen Coast privateers.",
    className: "Fighter",
    goals: "Open the drowned vault.",
    inventoryNotes: "Tide key, rope, lantern.",
    level: 3,
    personalNotes: "Captain Thorn knows too much.",
    relationships: "Owes Captain Thorn a favour.",
    summary: "A practical fighter who reads the tides.",
    visibility: "dm-only",
  };
  const fullPersistence = createCharacterPersistenceStub(fullCharacterInput);
  const fullCharacter =
    await characterRepositoryModule.createCharacterInTransaction(
      fullPersistence.client,
      "22222222-2222-5222-8222-222222222222",
      fullCharacterInput,
    );
  const fullInsert = fullPersistence.queries.find(({ text }) =>
    text.includes("insert into characters"),
  );

  expect(
    fullCharacter.className === "Fighter" &&
      fullCharacter.ancestry === "Human" &&
      fullCharacter.background === "Sailor" &&
      fullCharacter.abilities[0]?.name === "Second Wind",
    "Fully populated character submissions must persist and reload profile details and abilities.",
  );
  expect(
    fullInsert?.values[4] === "Fighter" &&
      fullInsert.values[6] === "Human" &&
      fullInsert.values[7] === "Sailor" &&
      fullInsert.values[13] === "dm-only",
    "Fully populated character persistence must retain every typed insert value.",
  );

  let duplicateNameError = null;

  try {
    await characterRepositoryModule.createCharacterInTransaction(
      {
        async query(text) {
          if (
            text.includes("select characters.id") &&
            text.includes("regexp_replace")
          ) {
            return {
              rows: [
                {
                  id: "33333333-3333-5333-8333-333333333333",
                },
              ],
            };
          }

          return { rows: [] };
        },
      },
      "22222222-2222-5222-8222-222222222222",
      minimalCharacterInput,
    );
  } catch (error) {
    duplicateNameError = error;
  }

  expect(
    duplicateNameError instanceof
      characterRepositoryModule.CharacterPersistenceError &&
      duplicateNameError.message.includes("already exists"),
    "Expected character persistence conflicts must retain safe, actionable messages.",
  );

  const validSelection =
    creationProfileModule.resolveGuidedCharacterSelection(options, {
      ancestryOptionSlug: "human",
      backgroundOptionSlug: "soldier",
      classOptionSlug: "fighter",
      roleplayTraitOptionSlug: "steadfast-guardian",
    });
  expect(
    validSelection.ok &&
      validSelection.classOption.name === "Fighter" &&
      validSelection.ancestryOption.name === "Human" &&
      validSelection.backgroundOption.name === "Soldier",
    "Guided selection must resolve canonical profile values from stable catalog slugs.",
  );

  const staleSelection =
    creationProfileModule.resolveGuidedCharacterSelection(options, {
      ancestryOptionSlug: "human",
      backgroundOptionSlug: "retired-option",
      classOptionSlug: "fighter",
      roleplayTraitOptionSlug: "",
    });
  expect(
    !staleSelection.ok &&
      staleSelection.fieldErrors.background?.includes("current background"),
    "Guided selection must reject stale or tampered catalog slugs.",
  );
}

if (failures.length > 0) {
  console.error("Guided character creation validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Guided character creation validation passed.");

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

function createCharacterPersistenceStub(input) {
  const characterId = "33333333-3333-5333-8333-333333333333";
  const queries = [];

  return {
    client: {
      async query(text, values = []) {
        queries.push({ text, values });

        if (
          text.includes("select characters.id") &&
          text.includes("regexp_replace")
        ) {
          return { rows: [] };
        }

        if (text.includes("insert into characters")) {
          return { rows: [{ id: characterId }] };
        }

        if (text.includes("group by") && text.includes("access_level")) {
          return {
            rows: [
              {
                abilities: input.abilities.map((ability, index) => ({
                  characterId,
                  id: `ability-${index + 1}`,
                  name: ability.name,
                  summary: ability.summary,
                  trigger: ability.trigger || null,
                  visibility: "player-safe",
                })),
                access_level: "full",
                ancestry: input.ancestry,
                background: input.background,
                backstory: input.backstory,
                class_name: input.className,
                goals: input.goals,
                id: characterId,
                inventory_notes: input.inventoryNotes,
                is_owned_by_current_user: true,
                level: input.level,
                name: input.name,
                owner_name: "Test User",
                personal_notes: input.personalNotes,
                progressions: [],
                relationships: input.relationships,
                role: "dm",
                summary: input.summary,
                updated_at: "2026-06-22T12:00:00.000Z",
                visibility: input.visibility,
              },
            ],
          };
        }

        return { rows: [] };
      },
    },
    queries,
  };
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
