import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/app/(protected)/entities/page.tsx",
  "apps/web/src/components/entity-create-form.tsx",
  "apps/web/src/components/entity-edit-form.tsx",
  "apps/web/src/entities/actions.ts",
  "apps/web/src/entities/manage-entity.ts",
  "apps/web/src/entities/repository.ts",
  "packages/types/src/campaign.ts",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing entity CRUD file: ${file}`);
}

const campaignTypes = readText("packages/types/src/campaign.ts");
for (const entityType of ["npc", "location", "faction", "quest", "item"]) {
  expect(
    campaignTypes.includes(`"${entityType}"`),
    `Shared entity types must include ${entityType}.`,
  );
}
expect(
  campaignTypes.includes("CampaignEntity = CampaignEntitySummary"),
  "Shared types must expose a generic CampaignEntity model.",
);
expect(
  readText("packages/types/src/index.ts").includes("CampaignEntity"),
  "Generic CampaignEntity must be exported from @dnd/types.",
);

const entitiesPage = readText("apps/web/src/app/(protected)/entities/page.tsx");
for (const expectedText of [
  "listEntitiesForUser",
  "EntityCreateForm",
  "EntityEditForm",
  "EntityDeleteForm",
  "Player safe",
  "DM only",
]) {
  expect(
    entitiesPage.includes(expectedText),
    `Entities page must include ${expectedText}.`,
  );
}

const repositoryText = readText("apps/web/src/entities/repository.ts");
for (const expectedSql of [
  "from entities",
  "insert into entities",
  "update entities",
  "delete from entities",
  "campaign_memberships",
  "entities.visibility = 'player-safe'",
]) {
  expect(
    repositoryText.includes(expectedSql),
    `Entity repository must enforce generic CRUD/access SQL: ${expectedSql}`,
  );
}

const typescriptPath = resolveTypeScriptRuntimePath();
const hasTypeScriptRuntime = typescriptPath !== null;
const typescriptRuntime = hasTypeScriptRuntime
  ? await import(pathToFileURL(typescriptPath).href)
  : null;
const typescript = hasTypeScriptRuntime
  ? (typescriptRuntime.default ?? typescriptRuntime)
  : null;

if (hasTypeScriptRuntime) {
  const campaignTypesUrl = await transpileModuleToDataUrl("packages/types/src/campaign.ts");
  const manageEntityModule = await import(
    await transpileModuleToDataUrl("apps/web/src/entities/manage-entity.ts", [
      ["@dnd/types", campaignTypesUrl],
    ]),
  );

  const dmCampaign = {
    id: "campaign-1",
    name: "Ashen Coast",
    role: "dm",
  };
  const playerCampaign = {
    id: "campaign-1",
    name: "Ashen Coast",
    role: "player",
  };
  const validValues = {
    campaignId: "campaign-1",
    description: "  Keeps the harbor keys.  ",
    entityId: "",
    name: "  Captain Thorn  ",
    summary: "  A privateer with a tide chart.  ",
    type: "npc",
    visibility: "dm-only",
  };

  const valid = manageEntityModule.validateEntityValues(validValues, dmCampaign);
  expect(
    Object.keys(valid.fieldErrors).length === 0 &&
      valid.input.name === "Captain Thorn" &&
      valid.input.type === "npc" &&
      valid.input.visibility === "dm-only",
    "Entity validation must trim and accept supported DM entity input.",
  );

  const invalidType = manageEntityModule.validateEntityValues(
    {
      ...validValues,
      type: "monster",
    },
    dmCampaign,
  );
  expect(
    invalidType.fieldErrors.type === "Choose a supported entity type.",
    "Entity validation must reject unsupported entity types.",
  );

  const playerDmOnly = manageEntityModule.validateEntityValues(
    validValues,
    playerCampaign,
  );
  expect(
    playerDmOnly.fieldErrors.visibility === "Only DMs can mark entities as DM only.",
    "Entity validation must prevent players from selecting DM-only visibility.",
  );

  let capturedCreateInput = null;
  const createResult = await manageEntityModule.createEntitySubmission(
    {
      async createEntityForUser(_userId, input) {
        capturedCreateInput = input;

        return {
          description: input.description,
          id: "entity-1",
          name: input.name,
          summary: input.summary,
          type: input.type,
          visibility: input.visibility,
        };
      },
    },
    "user-1",
    dmCampaign,
    validValues,
    () => "Unexpected failure",
  );
  expect(
    createResult.ok &&
      capturedCreateInput?.campaignId === "campaign-1" &&
      capturedCreateInput?.summary === "A privateer with a tide chart.",
    "Entity creation submission must normalize values before persistence.",
  );

  let capturedUpdateId = null;
  const updateResult = await manageEntityModule.updateEntitySubmission(
    {
      async updateEntityForUser(_userId, entityId, input) {
        capturedUpdateId = entityId;

        return {
          description: input.description,
          id: entityId,
          name: input.name,
          summary: input.summary,
          type: input.type,
          visibility: input.visibility,
        };
      },
    },
    "user-1",
    dmCampaign,
    {
      ...validValues,
      entityId: "entity-1",
      visibility: "player-safe",
    },
    () => "Unexpected failure",
  );
  expect(
    updateResult.ok &&
      capturedUpdateId === "entity-1" &&
      updateResult.state.successMessage === "Entity saved.",
    "Entity update submission must persist the selected generic entity.",
  );

  const dbStubModuleUrl = moduleDataUrl(`
    export const queries = [];

    export async function queryDatabase(text, values = []) {
      queries.push({ text, values });

      if (text.includes("delete from entities")) {
        return { rows: [{ id: "entity-1" }] };
      }

      return {
        rows: [
          {
            description: "Description",
            id: "entity-1",
            name: "Captain Thorn",
            summary: "Summary",
            type: "npc",
            visibility: "player-safe",
          },
        ],
      };
    }
  `);
  const dbStubModule = await import(dbStubModuleUrl);
  const repositoryModule = await import(
    await transpileModuleToDataUrl("apps/web/src/entities/repository.ts", [
      ["@dnd/db", dbStubModuleUrl],
      ["@dnd/types", campaignTypesUrl],
    ]),
  );

  const listedEntities = await repositoryModule.listEntitiesForUser(
    "user-1",
    "campaign-1",
  );
  expect(
    listedEntities[0]?.description === "Description",
    "Entity repository must map generic entity rows.",
  );

  await repositoryModule.createEntityForUser("user-1", valid.input);
  await repositoryModule.updateEntityForUser("user-1", "entity-1", {
    ...valid.input,
    visibility: "player-safe",
  });
  await repositoryModule.deleteEntityForUser("user-1", "campaign-1", "entity-1");

  const queryTexts = dbStubModule.queries.map((query) => query.text).join("\n");
  expect(
    queryTexts.includes("$7 = 'player-safe'") &&
      queryTexts.includes("$8 = 'player-safe'") &&
      queryTexts.includes("updated_at = now()"),
    "Entity write queries must preserve player-safe write gates and update timestamps.",
  );
}

if (failures.length > 0) {
  console.error("Entity validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Entity validation passed.");

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
  if (!typescript) {
    throw new Error("TypeScript runtime is not available for validation.");
  }

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
