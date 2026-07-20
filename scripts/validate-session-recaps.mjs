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
  "packages/db/migrations/0015_session_recap_continuity.sql",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing session recap file: ${file}`);
}

const campaignTypesText = readText("packages/types/src/campaign.ts");
for (const expectedText of [
  "SessionRecapGrounding",
  "recapGrounding",
  "CampaignMemoryGrounding",
  "SessionRecapFormat",
  "sessionRecapFormats",
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

const continuityMigrationText = readText(
  "packages/db/migrations/0015_session_recap_continuity.sql",
);
expect(
  continuityMigrationText.includes("recap_format text") &&
    continuityMigrationText.includes("sessions_recap_format_check") &&
    continuityMigrationText.includes("'quick', 'detailed'"),
  "Session continuity recaps must persist and constrain the selected format.",
);

const repositoryText = readText("apps/web/src/sessions/repository.ts");
for (const expectedText of [
  "getSessionForUserById",
  "updateSessionRecapForUser",
  "campaign_memberships.user_id = $1",
  "recap_format = $5",
  "recap_grounding = $6::jsonb",
  "unresolved_hooks = $7::jsonb",
  "sessions.updated_at = $8::timestamptz",
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
  "mergeUnresolvedHooks",
  `"session-recap"`,
  `"session-hook"`,
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
  "max_output_tokens",
  'effort: "low"',
  'verbosity: "low"',
  "supportsGpt5RequestControls",
  "SESSION_RECAP_MAX_NOTES_LENGTH",
  "sessions.notes",
  `"json_schema"`,
  "unresolvedHooks",
  "recapFormat",
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
  "recapFormat",
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
  "recapFormat",
  "Detailed recap",
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
      body:
        "A privateer with a tide chart.\n\nLinked sessions: A later voyage.\nA later voyage: Captain Thorn betrayed the party.",
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
  const detailedLocalRecap = generation.createLocalSessionRecap(
    session,
    "detailed",
  );
  expect(
    localRecap.recap.includes("recovered the tide key") &&
      localRecap.grounding[0]?.sourcePath === "sessions.notes" &&
      localRecap.recapFormat === "quick" &&
      detailedLocalRecap.recapFormat === "detailed" &&
      detailedLocalRecap.recap.length >= localRecap.recap.length,
    "Local recap generation must summarize and cite saved notes in quick and detailed formats.",
  );

  const priorContinuity = [
    {
      ...documents[0],
      body: "The salt-stained map still points beneath the harbor.",
      grounding: {
        label: "The harbor bargain",
        sourceId: "session-prior",
        sourcePath: "sessions.recap",
        sourceType: "session-recap",
      },
      id: "session-recap:session-prior",
      sourceId: "session-prior",
      sourceType: "session-recap",
      title: "The harbor bargain recap",
      updatedAt: "2026-06-09T20:00:00.000Z",
    },
    {
      ...documents[0],
      body: "Decode the salt-stained map.",
      grounding: {
        label: "The harbor bargain",
        sourceId: "session-prior",
        sourcePath: "sessions.unresolved_hooks[0]",
        sourceType: "session-hook",
      },
      id: "session-hook:session-prior:0",
      sourceId: "session-prior",
      sourceType: "session-hook",
      title: "The harbor bargain unresolved hook",
      updatedAt: "2026-06-09T20:00:00.000Z",
    },
    {
      ...documents[0],
      body: "The hidden saboteur is the harbor master.",
      id: "session-hook:session-secret:0",
      sourceId: "session-secret",
      sourceType: "session-hook",
      title: "Secret hook",
      visibility: "dm-only",
    },
  ];
  const continuitySources = generation.selectSessionRecapSources(
    session,
    [...documents, ...priorContinuity],
    "detailed",
  );
  const mergedHooks = generation.mergeUnresolvedHooks(
    ["Decode the salt-stained map"],
    ["decode the salt-stained map", "Ask Captain Thorn about the vault"],
  );

  expect(
    continuitySources.some((source) => source.sourceType === "session-recap") &&
      continuitySources.some((source) => source.sourceType === "session-hook") &&
      continuitySources.every((source) => source.visibility === "player-safe") &&
      !continuitySources.some((source) => source.sourceId === "session-secret") &&
      mergedHooks.length === 2,
    "Continuity recaps must include relevant prior context, exclude DM-only memory, and deduplicate hooks.",
  );

  let requestBody = null;
  const longSession = {
    ...session,
    notes: `${session.notes}\n${"The party crossed the flooded causeway. ".repeat(120)}The lighthouse beacon was restored.`,
  };
  const remoteRecap = await generation.requestOpenAIRecap(
    longSession,
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
                      text: JSON.stringify({
                        recap: "The party recovered the tide key and returned to the lighthouse after Captain Thorn refused to open the drowned door.",
                        unresolvedHooks: ["Ask Captain Thorn why he refused."],
                      }),
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
      model: "gpt-5.5",
    },
  );
  const requestSources = JSON.parse(requestBody.input).sources;
  const requestNoteSource = requestSources.find(
    (source) => source.sourceType === "session-notes",
  );
  const requestEntitySource = requestSources.find(
    (source) => source.sourceType === "entity",
  );

  expect(
    requestBody?.model === "gpt-5.5" &&
      requestBody?.store === false &&
      requestBody?.max_output_tokens === 512 &&
      requestBody?.reasoning?.effort === "low" &&
      requestNoteSource?.body.includes("lighthouse beacon was restored") &&
      requestEntitySource?.body === "A privateer with a tide chart." &&
      !remoteRecap.grounding.some((source) =>
        source.excerpt.includes("later voyage"),
      ) &&
      remoteRecap.grounding.length === 2 &&
      remoteRecap.recap.includes("tide key") &&
      remoteRecap.recapFormat === "quick" &&
      remoteRecap.unresolvedHooks[0]?.includes("Captain Thorn"),
    "OpenAI recap generation must cap output, preserve complete notes, and exclude backlink context.",
  );

  let overrideRequestBody = null;
  await generation.requestOpenAIRecap(session, selectedSources, {
    apiKey: "test-key",
    fetchImpl: async (_url, init) => {
      overrideRequestBody = JSON.parse(init.body);

      return {
        ok: true,
        async json() {
          return {
            output_text: JSON.stringify({
              recap: "The party returned safely to the lighthouse.",
              unresolvedHooks: [],
            }),
          };
        },
        status: 200,
      };
    },
    model: "gpt-4.1-mini",
  });

  expect(
    overrideRequestBody?.model === "gpt-4.1-mini" &&
      overrideRequestBody?.reasoning === undefined &&
      overrideRequestBody?.text?.format?.type === "json_schema" &&
      overrideRequestBody?.text?.verbosity === undefined,
    "Non-GPT-5 model overrides must omit GPT-5-specific request controls.",
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
