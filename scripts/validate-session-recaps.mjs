import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const requiredFiles = [
  "apps/web/src/components/session-recap-generator.tsx",
  "apps/web/src/recaps/actions.ts",
  "apps/web/src/recaps/generation.ts",
  "apps/web/src/recaps/service.ts",
  "docs/engineering/session-recap-generation.md",
  "packages/db/migrations/0008_session_recap_grounding.sql",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing session recap file: ${file}`);
}

const campaignTypesText = readText("packages/types/src/campaign.ts");
for (const expectedText of [
  "SessionRecapGrounding",
  "recapGrounding",
  "CampaignMemoryGrounding",
]) {
  expect(
    campaignTypesText.includes(expectedText),
    `Session recap types must include ${expectedText}.`,
  );
}

const migrationText = readText(
  "packages/db/migrations/0008_session_recap_grounding.sql",
);
expect(
  migrationText.includes("recap_grounding jsonb") &&
    migrationText.includes("default '[]'::jsonb"),
  "Session recaps must persist grounding metadata in Postgres.",
);

const repositoryText = readText("apps/web/src/sessions/repository.ts");
for (const expectedText of [
  "getSessionForUserById",
  "updateSessionRecapForUser",
  "campaign_memberships.user_id = $1",
  "recap_grounding = $5::jsonb",
  "mapRecapGrounding",
]) {
  expect(
    repositoryText.includes(expectedText),
    `Session recap repository must include ${expectedText}.`,
  );
}

const serviceText = readText("apps/web/src/recaps/service.ts");
for (const expectedText of [
  "retrieveCampaignMemoryForUser",
  "memory.results.map",
  "selectSessionRecapSources",
  'AI_GROUNDING_MODE === "retrieval"',
  'AI_GROUNDING_MODE === "local"',
  "updateSessionRecapForUser",
]) {
  expect(
    serviceText.includes(expectedText),
    `Session recap service must include ${expectedText}.`,
  );
}

const generationText = readText("apps/web/src/recaps/generation.ts");
for (const expectedText of [
  'document.visibility === "player-safe"',
  '"https://api.openai.com/v1/responses"',
  "store: false",
  'effort: "low"',
  'verbosity: "low"',
  "sessions.notes",
]) {
  expect(
    generationText.includes(expectedText),
    `Session recap generation must include ${expectedText}.`,
  );
}

const actionText = readText("apps/web/src/recaps/actions.ts");
for (const expectedText of [
  "requireAuthSession",
  "getCurrentCampaignAccess",
  "generateSessionRecapForUser",
  'revalidatePath("/sessions")',
]) {
  expect(
    actionText.includes(expectedText),
    `Session recap action must include ${expectedText}.`,
  );
}

const sessionsPageText = readText(
  "apps/web/src/app/(protected)/sessions/page.tsx",
);
for (const expectedText of [
  "SessionRecapGenerator",
  "Previously on",
  "recapGrounding",
  "Sources (",
]) {
  expect(
    sessionsPageText.includes(expectedText),
    `Session recap UI must include ${expectedText}.`,
  );
}

const recapDocsText = readText(
  "docs/engineering/session-recap-generation.md",
);
for (const expectedText of [
  "`disabled`",
  "`local`",
  "`retrieval`",
  "DM-only",
  "source citations",
]) {
  expect(
    recapDocsText.includes(expectedText),
    `Session recap docs must cover ${expectedText}.`,
  );
}

const typescriptPath = resolveTypeScriptRuntimePath();

if (typescriptPath) {
  const typescriptRuntime = await import(pathToFileURL(typescriptPath).href);
  const typescript = typescriptRuntime.default ?? typescriptRuntime;
  const campaignTypesUrl = await transpileModuleToDataUrl(
    typescript,
    "packages/types/src/campaign.ts",
  );
  const typesIndexUrl = await transpileModuleToDataUrl(
    typescript,
    "packages/types/src/index.ts",
    [["./campaign", campaignTypesUrl]],
  );
  const generationUrl = await transpileModuleToDataUrl(
    typescript,
    "apps/web/src/recaps/generation.ts",
    [["@dnd/types", typesIndexUrl]],
  );
  const generation = await import(generationUrl);
  const session = {
    createdAt: "2026-06-10T19:00:00.000Z",
    id: "session-1",
    notes:
      "The party recovered the tide key. Captain Thorn refused to open the drowned door. Mira kept watch while the group returned to the lighthouse.",
    notesDocument: {
      blocks: [
        {
          id: "block-1",
          references: [
            {
              endOffset: 13,
              label: "Captain Thorn",
              startOffset: 0,
              targetId: "entity-1",
              targetType: "entity",
            },
          ],
          text: "Captain Thorn refused to open the drowned door.",
          type: "paragraph",
        },
      ],
      version: 1,
    },
    recap: "",
    recapGrounding: [],
    taggedEntities: [
      {
        id: "entity-1",
        name: "Captain Thorn",
        summary: "A privateer with a tide chart.",
        type: "npc",
        visibility: "player-safe",
      },
      {
        id: "entity-secret",
        name: "Lantern ward",
        summary: "A hidden ambush.",
        type: "quest",
        visibility: "dm-only",
      },
    ],
    title: "The drowned door",
    unresolvedHooks: [],
    updatedAt: "2026-06-10T20:00:00.000Z",
  };
  const documents = [
    {
      body: session.notes,
      campaignId: "campaign-1",
      grounding: {
        label: session.title,
        sourceId: session.id,
        sourcePath: "sessions.notes",
        sourceType: "session-notes",
      },
      id: "session-notes:session-1",
      keywords: [session.title],
      metadata: {},
      sourceId: session.id,
      sourceType: "session-notes",
      summary: "",
      title: `${session.title} notes`,
      visibility: "player-safe",
    },
    {
      body: "A privateer with a tide chart.",
      campaignId: "campaign-1",
      grounding: {
        label: "Captain Thorn",
        sourceId: "entity-1",
        sourcePath: "entities",
        sourceType: "entity",
      },
      id: "entity:entity-1",
      keywords: ["Captain Thorn"],
      metadata: {},
      sourceId: "entity-1",
      sourceType: "entity",
      summary: "A privateer with a tide chart.",
      title: "Captain Thorn",
      visibility: "player-safe",
    },
    {
      body: "This hidden ambush must not enter a player recap.",
      campaignId: "campaign-1",
      grounding: {
        label: "Lantern ward",
        sourceId: "entity-secret",
        sourcePath: "entities",
        sourceType: "entity",
      },
      id: "entity:entity-secret",
      keywords: ["Lantern ward"],
      metadata: {},
      sourceId: "entity-secret",
      sourceType: "entity",
      summary: "A hidden ambush.",
      title: "Lantern ward",
      visibility: "dm-only",
    },
  ];
  const selectedSources = generation.selectSessionRecapSources(
    session,
    documents,
  );

  expect(
    selectedSources.length === 2 &&
      selectedSources[0]?.sourceType === "session-notes" &&
      selectedSources.every((source) => source.visibility === "player-safe"),
    "Session recap sources must keep the current notes first and exclude DM-only context.",
  );

  const localRecap = generation.createLocalSessionRecap(session);
  expect(
    localRecap.recap.includes("recovered the tide key") &&
      localRecap.grounding[0]?.sourcePath === "sessions.notes",
    "Local recap generation must summarize and cite saved session notes.",
  );

  let requestBody = null;
  const remoteRecap = await generation.requestOpenAIRecap(
    session,
    selectedSources,
    {
      apiKey: "test-key",
      fetchImpl: async (_url, init) => {
        requestBody = JSON.parse(init.body);

        return {
          ok: true,
          async json() {
            return {
              output: [
                {
                  content: [
                    {
                      text: "The party recovered the tide key and returned to the lighthouse after Captain Thorn refused to open the drowned door.",
                      type: "output_text",
                    },
                  ],
                  type: "message",
                },
              ],
            };
          },
          status: 200,
        };
      },
      model: "gpt-test",
    },
  );

  expect(
    requestBody?.model === "gpt-test" &&
      requestBody?.store === false &&
      requestBody?.reasoning?.effort === "low" &&
      remoteRecap.grounding.length === 2 &&
      remoteRecap.recap.includes("tide key"),
    "OpenAI recap generation must use the Responses API contract and preserve source grounding.",
  );
}

if (failures.length > 0) {
  console.error("Session recap validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Session recap validation passed.");

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

async function transpileModuleToDataUrl(
  typescript,
  path,
  replacements = [],
) {
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

  return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
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
