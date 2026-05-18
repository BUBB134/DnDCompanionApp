import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/app/(protected)/entities/page.tsx",
  "apps/web/src/app/(protected)/sessions/page.tsx",
  "apps/web/src/entities/repository.ts",
  "apps/web/src/sessions/actions.ts",
  "apps/web/src/memory/repository.ts",
  "apps/web/src/memory/retrieval.ts",
  "docs/engineering/entity-backlinks.md",
  "packages/types/src/campaign.ts",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing entity backlink file: ${file}`);
}

const campaignTypesText = readText("packages/types/src/campaign.ts");
for (const expectedText of [
  "CampaignEntityBacklinks",
  "CampaignEntityBacklinkSession",
  "CampaignEntityMentionReference",
  "CampaignEntityWithBacklinks",
]) {
  expect(
    campaignTypesText.includes(expectedText),
    `Shared types must expose backlink shape: ${expectedText}`,
  );
}

const repositoryText = readText("apps/web/src/entities/repository.ts");
for (const expectedText of [
  "listEntitiesWithBacklinksForUser",
  "listEntityBacklinksForUser",
  "session_entity_tags",
  "jsonb_array_elements",
  "notes_document",
  "entities.visibility = 'player-safe'",
]) {
  expect(
    repositoryText.includes(expectedText),
    `Entity repository must derive visibility-scoped backlinks: ${expectedText}`,
  );
}

const entitiesPageText = readText("apps/web/src/app/(protected)/entities/page.tsx");
for (const expectedText of [
  "listEntitiesWithBacklinksForUser",
  "EntityBacklinksPanel",
  "/sessions#session-",
  "Inbound references",
  "No session mentions yet.",
]) {
  expect(
    entitiesPageText.includes(expectedText),
    `Entity page must render navigable backlink context: ${expectedText}`,
  );
}

expect(
  readText("apps/web/src/app/(protected)/sessions/page.tsx").includes(
    "id={`session-${campaignSession.id}`}",
  ),
  "Sessions page must expose stable anchors for backlink navigation.",
);
expect(
  readText("apps/web/src/sessions/actions.ts").includes(
    'revalidatePath("/entities")',
  ),
  "Session saves must revalidate entity backlinks.",
);

const memoryRepositoryText = readText("apps/web/src/memory/repository.ts");
expect(
  memoryRepositoryText.includes("listEntitiesWithBacklinksForUser"),
  "Campaign memory repository must load entity backlink context.",
);

const memoryRetrievalText = readText("apps/web/src/memory/retrieval.ts");
for (const expectedText of [
  "createEntityBacklinkSummary",
  "linkedSessionCount",
  "mentionReferenceCount",
]) {
  expect(
    memoryRetrievalText.includes(expectedText),
    `Campaign memory retrieval must expose backlink data: ${expectedText}`,
  );
}

const backlinksDocText = readText("docs/engineering/entity-backlinks.md");
for (const expectedText of [
  "session_entity_tags",
  "sessions.notes_document",
  "CampaignEntityBacklinks",
  "visibility",
  "AI Retrieval",
]) {
  expect(
    backlinksDocText.includes(expectedText),
    `Entity backlink docs must cover ${expectedText}.`,
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
  const campaignTypesUrl = await transpileModuleToDataUrl(
    "packages/types/src/campaign.ts",
  );
  const typesIndexUrl = await transpileModuleToDataUrl(
    "packages/types/src/index.ts",
    [["./campaign", campaignTypesUrl]],
  );
  const dbStubModuleUrl = moduleDataUrl(`
    export async function queryDatabase(text) {
      if (text.includes("from session_entity_tags")) {
        return {
          rows: [
            {
              entity_id: "22222222-2222-5222-8222-222222222222",
              occurred_at: "2026-05-06T00:00:00.000Z",
              session_id: "33333333-3333-5333-8333-333333333333",
              session_recap: "The party made a bargain.",
              session_title: "The drowned door",
              updated_at: "2026-05-06T01:00:00.000Z",
            },
          ],
        };
      }

      if (text.includes("jsonb_array_elements")) {
        return {
          rows: [
            {
              block_id: "block-1",
              block_text: "Met [[Captain Thorn]] near the salt-stained map.",
              entity_id: "22222222-2222-5222-8222-222222222222",
              label: "Captain Thorn",
              occurred_at: "2026-05-06T00:00:00.000Z",
              session_id: "33333333-3333-5333-8333-333333333333",
              session_title: "The drowned door",
            },
          ],
        };
      }

      return {
        rows: [
          {
            description: "Keeps a tide chart.",
            id: "22222222-2222-5222-8222-222222222222",
            name: "Captain Thorn",
            summary: "A privateer with a useful chart.",
            type: "npc",
            visibility: "player-safe",
          },
        ],
      };
    }
  `);
  const wikiLinksStubModuleUrl = moduleDataUrl(`
    export function replaceWikiLinksWithLabels(text) {
      return text.replace(/\\[\\[([^|\\]]+\\|)?([^\\]]+)\\]\\]/g, (_match, _target, label) => label);
    }
  `);
  const repositoryModule = await import(
    await transpileModuleToDataUrl("apps/web/src/entities/repository.ts", [
      ["@dnd/db", dbStubModuleUrl],
      ["@dnd/types", typesIndexUrl],
      ["@/sessions/wiki-links", wikiLinksStubModuleUrl],
    ]),
  );
  const backlinks = await repositoryModule.listEntityBacklinksForUser(
    "user-1",
    "11111111-1111-5111-8111-111111111111",
  );
  expect(
    backlinks[0]?.linkedSessions[0]?.title === "The drowned door" &&
      backlinks[0]?.mentionReferences[0]?.excerpt.includes("Captain Thorn"),
    "Entity repository must map linked sessions and mention references.",
  );

  const entities = await repositoryModule.listEntitiesWithBacklinksForUser(
    "user-1",
    "11111111-1111-5111-8111-111111111111",
  );
  expect(
    entities[0]?.backlinks.linkedSessions.length === 1 &&
      entities[0]?.backlinks.mentionReferences.length === 1,
    "Entity listing must attach backlinks to visible entity rows.",
  );

  const retrievalUrl = await transpileModuleToDataUrl(
    "apps/web/src/memory/retrieval.ts",
    [["@dnd/types", typesIndexUrl]],
  );
  const retrievalModule = await import(retrievalUrl);
  const documents = retrievalModule.createCampaignMemoryDocuments({
    campaign: {
      id: "11111111-1111-5111-8111-111111111111",
      name: "Ashen Coast",
      role: "player",
    },
    entities,
  });
  const entityDocument = documents.find(
    (document) => document.sourceType === "entity",
  );

  expect(
    entityDocument?.body.includes("The drowned door") &&
      entityDocument?.metadata.linkedSessionCount === 1 &&
      retrievalModule.retrieveCampaignMemory("salt-stained map", documents)
        .length === 1,
    "Entity memory documents must include backlink context for retrieval.",
  );
}

if (failures.length > 0) {
  console.error("Entity backlink validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Entity backlink validation passed.");

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
      jsx: typescript.JsxEmit.ReactJSX,
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
