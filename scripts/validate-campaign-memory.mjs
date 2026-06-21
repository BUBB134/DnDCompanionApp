import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/memory/repository.ts",
  "apps/web/src/memory/retrieval.ts",
  "docs/engineering/campaign-memory-retrieval.md",
  "docs/engineering/architecture.md",
  "packages/types/src/campaign.ts",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing campaign memory file: ${file}`);
}

const campaignTypesText = readText("packages/types/src/campaign.ts");
for (const expectedText of [
  "campaignMemorySourceTypes",
  '"session-notes"',
  '"session-recap"',
  '"session-hook"',
  "CampaignMemoryGrounding",
  "CampaignMemoryDocument",
  "CampaignMemoryResult",
]) {
  expect(
    campaignTypesText.includes(expectedText),
    `Campaign memory shared types must include ${expectedText}.`,
  );
}

const typesIndexText = readText("packages/types/src/index.ts");
for (const expectedText of [
  "campaignMemorySourceTypes",
  "CampaignMemoryDocument",
  "CampaignMemoryResult",
  "CampaignMemorySourceType",
]) {
  expect(
    typesIndexText.includes(expectedText),
    `@dnd/types must export ${expectedText}.`,
  );
}

const repositoryText = readText("apps/web/src/memory/repository.ts");
for (const expectedText of [
  "getDatabaseCampaignAccessForUser",
  "listSessionsForUser",
  "listEntitiesWithBacklinksForUser",
  "listRuleSnippetsForUser",
  "listCharacterSummariesForUser",
  "createCampaignMemoryDocuments",
  "retrieveCampaignMemory",
]) {
  expect(
    repositoryText.includes(expectedText),
    `Campaign memory repository must compose ${expectedText}.`,
  );
}

const retrievalText = readText("apps/web/src/memory/retrieval.ts");
for (const expectedText of [
  "canAccessVisibility",
  "createCampaignMemoryDocuments",
  "retrieveCampaignMemory",
  "sourcePath",
  "matchedTerms",
  "sourceTypeWeight",
]) {
  expect(
    retrievalText.includes(expectedText),
    `Campaign memory retrieval must include ${expectedText}.`,
  );
}

const architectureText = readText("docs/engineering/architecture.md");
expect(
  architectureText.includes("docs/engineering/campaign-memory-retrieval.md") &&
    architectureText.includes("apps/web/src/memory"),
  "Architecture docs must point to the campaign memory retrieval contract.",
);

const memoryDocText = readText("docs/engineering/campaign-memory-retrieval.md");
for (const expectedText of [
  "session notes",
  "session recaps",
  "campaign entities",
  "rule snippets",
  "character summaries",
  "canAccessVisibility()",
  "CampaignMemoryDocument",
]) {
  expect(
    memoryDocText.includes(expectedText),
    `Campaign memory docs must cover ${expectedText}.`,
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
  const retrievalUrl = await transpileModuleToDataUrl(
    "apps/web/src/memory/retrieval.ts",
    [["@dnd/types", typesIndexUrl]],
  );
  const retrievalModule = await import(retrievalUrl);
  const campaign = {
    id: "11111111-1111-5111-8111-111111111111",
    name: "Ashen Coast",
    role: "player",
  };
  const sessions = [
    {
      createdAt: "2026-05-06T00:00:00.000Z",
      id: "session-1",
      notes:
        "Captain Thorn watched Mira hold concentration while the ogre fell prone.",
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
            text:
              "Captain Thorn watched Mira hold concentration while the ogre fell prone.",
            type: "paragraph",
          },
        ],
        version: 1,
      },
      recap: "Mira kept concentration and the vault clue stayed unresolved.",
      recapGrounding: [],
      taggedEntities: [
        {
          id: "entity-1",
          name: "Captain Thorn",
          summary: "Privateer with a tide chart.",
          type: "npc",
          visibility: "player-safe",
        },
      ],
      title: "The drowned door",
      unresolvedHooks: ["Ask Captain Thorn about the salt-stained map."],
      updatedAt: "2026-05-06T01:00:00.000Z",
    },
  ];
  const entities = [
    {
      description: "Keeps a tide chart and knows the Sunken Lighthouse.",
      id: "entity-1",
      name: "Captain Thorn",
      summary: "Privateer with a tide chart.",
      type: "npc",
      visibility: "player-safe",
    },
    {
      description: "This should never be visible to players.",
      id: "entity-secret",
      name: "Lantern ward",
      summary: "DM-only ambush clue.",
      type: "quest",
      visibility: "dm-only",
    },
  ];
  const rules = [
    {
      aliases: ["knocked down"],
      body: "A prone creature spends extra movement to stand.",
      category: "condition",
      id: "rule-prone",
      slug: "prone",
      summary: "Use when a creature is knocked down.",
      title: "Prone",
      visibility: "player-safe",
    },
    {
      aliases: ["hidden clue"],
      body: "This should never be visible to players.",
      category: "core-mechanic",
      id: "rule-secret",
      slug: "secret",
      summary: "DM-only rule.",
      title: "Secret rule",
      visibility: "dm-only",
    },
  ];
  const characters = [
    {
      className: "Wizard",
      id: "character-1",
      isOwnedByCurrentUser: true,
      level: 3,
      name: "Mira",
      progressions: [
        {
          characterId: "character-1",
          createdAt: "2026-05-07T00:00:00.000Z",
          createdByName: "Mira Player",
          features: [
            {
              name: "Arcane Recovery",
              summary: "Recover a small amount of spell-slot power.",
              trigger: "Short rest",
            },
          ],
          fromLevel: 2,
          id: "progression-1",
          summary: "Mira learned to recover magical focus between encounters.",
          toLevel: 3,
        },
      ],
      summary: "Keeps concentration under pressure.",
      visibility: "player-safe",
    },
    {
      className: "Rogue",
      id: "character-owned-private",
      isOwnedByCurrentUser: true,
      level: 2,
      name: "Nyx",
      progressions: [],
      summary: "Keeps a hidden pact.",
      visibility: "dm-only",
    },
    {
      className: "Warlock",
      id: "character-hidden",
      isOwnedByCurrentUser: false,
      level: 2,
      name: "Hidden rival",
      progressions: [],
      summary: "Should remain hidden from this player.",
      visibility: "dm-only",
    },
  ];
  const documents = retrievalModule.createCampaignMemoryDocuments({
    campaign,
    characters,
    entities,
    rules,
    sessions,
  });
  const sourceTypes = new Set(documents.map((document) => document.sourceType));

  for (const sourceType of [
    "character",
    "entity",
    "rule",
    "session-hook",
    "session-notes",
    "session-recap",
  ]) {
    expect(
      sourceTypes.has(sourceType),
      `Campaign memory corpus must include ${sourceType}.`,
    );
  }

  expect(
    !documents.some((document) => document.title.includes("Lantern ward")) &&
      !documents.some((document) => document.title.includes("Secret rule")) &&
      documents.some((document) => document.title === "Nyx") &&
      !documents.some((document) => document.title === "Hidden rival"),
    "Campaign memory corpus must keep owner-authorized characters while filtering unrelated DM-only context.",
  );

  const results = retrievalModule.retrieveCampaignMemory(
    "Captain Thorn prone concentration Mira",
    documents,
    { limit: 10 },
  );
  expect(
    results.length >= 4 &&
      results.every((result) => result.grounding.sourcePath) &&
      results.some((result) => result.sourceType === "session-notes") &&
      results.some((result) => result.sourceType === "rule") &&
      results.some((result) => result.sourceType === "character"),
    "Campaign memory retrieval must return cited notes, rules, and character context.",
  );
  expect(
    results[0]?.matchedTerms.length > 0 && results[0]?.excerpt.length > 0,
    "Campaign memory retrieval must expose matched terms and excerpts.",
  );
  expect(
    retrievalModule.retrieveCampaignMemory("a", documents).length === 0 &&
      retrievalModule.retrieveCampaignMemory("???", documents).length === 0,
    "Campaign memory retrieval must return no results for tokenless queries.",
  );
  const bodyOnlyExcerpt = retrievalModule.retrieveCampaignMemory(
    "ogre",
    documents,
  )[0]?.excerpt ?? "";
  expect(
    bodyOnlyExcerpt.includes("ogre") &&
      bodyOnlyExcerpt.includes("fell prone") &&
      !bodyOnlyExcerpt.includes("vault clue stayed unresolved"),
    "Campaign memory excerpts must come from matched source text, not an unrelated summary.",
  );

  const entityOnlyResults = retrievalModule.retrieveCampaignMemory(
    "Captain",
    documents,
    { sourceTypes: ["entity"] },
  );
  expect(
    entityOnlyResults.length === 1 && entityOnlyResults[0].sourceType === "entity",
    "Campaign memory retrieval must support source-type filtering.",
  );
  expect(
    retrievalModule.retrieveCampaignMemory("Lantern ward secret", documents)
      .length === 0,
    "Campaign memory retrieval must not return filtered DM-only content.",
  );
  const progressionResult = retrievalModule.retrieveCampaignMemory(
    "Arcane Recovery",
    documents,
  )[0];
  expect(
    progressionResult?.title === "Mira reached level 3" &&
      progressionResult.grounding.sourcePath ===
        "character_level_progressions",
    "Campaign memory retrieval must ground character progression features in their history rows.",
  );

  const campaignRepositoryStubUrl = moduleDataUrl(`
    export const calls = [];

    export async function getDatabaseCampaignAccessForUser(userId, campaignId) {
      calls.push({ campaignId, userId });

      if (campaignId !== "11111111-1111-5111-8111-111111111111") {
        return null;
      }

      return {
        id: campaignId,
        name: "Ashen Coast",
        role: "player"
      };
    }
  `);
  const sessionsRepositoryStubUrl = moduleDataUrl(`
    export async function listSessionsForUser() {
      return ${JSON.stringify(sessions)};
    }
  `);
  const entitiesRepositoryStubUrl = moduleDataUrl(`
    export async function listEntitiesWithBacklinksForUser() {
      return ${JSON.stringify(entities)};
    }
  `);
  const rulesRepositoryStubUrl = moduleDataUrl(`
    export async function listRuleSnippetsForUser() {
      return ${JSON.stringify(rules)};
    }
  `);
  const charactersRepositoryStubUrl = moduleDataUrl(`
    export async function listCharacterSummariesForUser() {
      return ${JSON.stringify(characters)};
    }
  `);
  const repositoryModule = await import(
    await transpileModuleToDataUrl("apps/web/src/memory/repository.ts", [
      ["@dnd/types", typesIndexUrl],
      ["@/campaigns/repository", campaignRepositoryStubUrl],
      ["@/characters/repository", charactersRepositoryStubUrl],
      ["@/entities/repository", entitiesRepositoryStubUrl],
      ["@/memory/retrieval", retrievalUrl],
      ["@/rules/repository", rulesRepositoryStubUrl],
      ["@/sessions/repository", sessionsRepositoryStubUrl],
    ]),
  );
  const repositoryResult =
    await repositoryModule.retrieveCampaignMemoryForUser(
      "user-1",
      campaign.id,
      "prone Captain",
      { limit: 4 },
    );
  expect(
    repositoryResult?.campaign.id === campaign.id &&
      repositoryResult.documents.length === documents.length &&
      repositoryResult.results.some((result) => result.sourceType === "rule"),
    "Campaign memory repository must resolve access, build documents, and return retrieval results.",
  );
  expect(
    (await repositoryModule.retrieveCampaignMemoryForUser(
      "user-1",
      "22222222-2222-5222-8222-222222222222",
      "Captain",
    )) === null,
    "Campaign memory repository must return null when campaign access is missing.",
  );
}

if (failures.length > 0) {
  console.error("Campaign memory validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Campaign memory validation passed.");

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
