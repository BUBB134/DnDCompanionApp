import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/characters/repository.ts",
  "apps/web/src/sessions/inline-suggestions.ts",
  "apps/web/src/sessions/wiki-links.ts",
  "apps/web/src/sessions/actions.ts",
  "apps/web/src/sessions/manage-session.ts",
  "apps/web/src/components/session-editor.tsx",
  "apps/web/src/components/session-note-document-view.tsx",
  "packages/types/src/campaign.ts",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing wiki-link workflow file: ${file}`);
}

const campaignTypesText = readText("packages/types/src/campaign.ts");
for (const expectedText of [
  '"character"',
  "CampaignCharacterSummary",
  "SessionNoteReferenceType",
]) {
  expect(
    campaignTypesText.includes(expectedText),
    `Shared types must support wiki references: ${expectedText}`,
  );
}

const sessionActionsText = readText("apps/web/src/sessions/actions.ts");
for (const expectedText of [
  "collectWikiEntityCreationRequests",
  "createEntityForUser",
  "listCharacterSummariesForUser",
  "validateSessionValues",
]) {
  expect(
    sessionActionsText.includes(expectedText),
    `Session actions must wire wiki link persistence: ${expectedText}`,
  );
}

const sessionEditorText = readText("apps/web/src/components/session-editor.tsx");
for (const expectedText of [
  "createSessionNoteSuggestions",
  "aria-autocomplete=\"list\"",
  "role=\"listbox\"",
  "onKeyDown",
]) {
  expect(
    sessionEditorText.includes(expectedText),
    `Session editor must expose inline note suggestions: ${expectedText}`,
  );
}

const noteViewText = readText("apps/web/src/components/session-note-document-view.tsx");
for (const expectedText of [
  "createRuleHref",
  "/entities#entity-",
  "targetType === \"character\"",
  "replaceWikiLinksWithLabels",
]) {
  expect(
    noteViewText.includes(expectedText),
    `Session note view must render wiki references: ${expectedText}`,
  );
}

const characterRepositoryText = readText("apps/web/src/characters/repository.ts");
for (const expectedSql of [
  "from characters",
  "campaign_memberships",
  "characters.visibility = 'player-safe'",
]) {
  expect(
    characterRepositoryText.includes(expectedSql),
    `Character summaries must be visibility-scoped: ${expectedSql}`,
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
  const databaseIdUrl = await transpileModuleToDataUrl(
    "apps/web/src/campaigns/database-id.ts",
  );
  const noteDocumentUrl = await transpileModuleToDataUrl(
    "apps/web/src/sessions/note-document.ts",
    [["@dnd/types", campaignTypesUrl]],
  );
  const wikiLinksUrl = await transpileModuleToDataUrl(
    "apps/web/src/sessions/wiki-links.ts",
    [
      ["@dnd/types", campaignTypesUrl],
      ["@/sessions/note-document", noteDocumentUrl],
    ],
  );
  const inlineSuggestionsUrl = await transpileModuleToDataUrl(
    "apps/web/src/sessions/inline-suggestions.ts",
    [
      ["@dnd/types", campaignTypesUrl],
      ["@/sessions/note-document", noteDocumentUrl],
      ["@/sessions/wiki-links", wikiLinksUrl],
    ],
  );
  const wikiLinksModule = await import(wikiLinksUrl);
  const inlineSuggestionsModule = await import(inlineSuggestionsUrl);
  const noteDocumentModule = await import(noteDocumentUrl);
  const manageSessionModule = await import(
    await transpileModuleToDataUrl("apps/web/src/sessions/manage-session.ts", [
      ["@dnd/types", campaignTypesUrl],
      ["@/campaigns/database-id", databaseIdUrl],
      ["@/sessions/note-document", noteDocumentUrl],
      ["@/sessions/wiki-links", wikiLinksUrl],
    ]),
  );

  const campaign = {
    id: "11111111-1111-5111-8111-111111111111",
    name: "Saved Ashen Coast",
    role: "dm",
  };
  const captainThorn = {
    id: "22222222-2222-5222-8222-222222222222",
    name: "Captain Thorn",
    summary: "A privateer with a tide chart.",
    type: "npc",
    visibility: "player-safe",
  };
  const lighthouse = {
    id: "33333333-3333-5333-8333-333333333333",
    name: "Sunken Lighthouse",
    summary: "A drowned beacon.",
    type: "location",
    visibility: "player-safe",
  };
  const prone = {
    aliases: ["knocked down"],
    body: "A prone creature spends extra movement to stand.",
    category: "condition",
    id: "rule-prone",
    slug: "prone",
    summary: "Knocked down.",
    title: "Prone",
    visibility: "player-safe",
  };
  const mira = {
    className: "Wizard",
    id: "44444444-4444-5444-8444-444444444444",
    level: 3,
    name: "Mira",
    summary: "A careful abjurer.",
    visibility: "player-safe",
  };
  const noteDocument = noteDocumentModule.createSessionNoteDocumentFromPlainText(
    "Met [[Captain Thorn]] by [[location: Sunken Lighthouse]] while [[rule: prone]] and [[character: Mira|Mira]] mattered.",
  );

  const missingCreationRequests =
    wikiLinksModule.collectWikiEntityCreationRequests(noteDocument, [
      captainThorn,
    ]);
  expect(
    missingCreationRequests.length === 1 &&
      missingCreationRequests[0]?.type === "location" &&
      missingCreationRequests[0]?.name === "Sunken Lighthouse",
    "Wiki links must identify typed missing entities for inline creation.",
  );

  const resolvedDocument = wikiLinksModule.resolveSessionNoteWikiLinks(
    noteDocument,
    {
      characters: [mira],
      entities: [captainThorn, lighthouse],
      rules: [prone],
    },
  );
  const referenceTypes = resolvedDocument.blocks[0].references
    .map((reference) => reference.targetType)
    .join(",");
  expect(
    referenceTypes === "entity,entity,rule,character",
    "Wiki links must resolve entities, rules, and characters into note metadata.",
  );

  const validation = manageSessionModule.validateSessionValues(
    {
      campaignId: campaign.id,
      notes: "",
      notesDocument: noteDocumentModule.serializeSessionNoteDocument(
        noteDocument,
      ),
      sessionId: "",
      taggedEntityIds: [],
      title: "The drowned door",
      unresolvedHooks: "",
    },
    campaign,
    [captainThorn, lighthouse],
    [prone],
    [mira],
  );
  expect(
    Object.keys(validation.fieldErrors).length === 0 &&
      validation.input.taggedEntityIds.join(",") ===
        `${captainThorn.id},${lighthouse.id}` &&
      validation.input.notes.includes("Captain Thorn") &&
      !validation.input.notes.includes("[["),
    "Session validation must persist wiki references, strip brackets, and tag linked entities.",
  );

  const summaryItems = wikiLinksModule.createWikiLinkSummaryItems(noteDocument, {
    characters: [mira],
    entities: [captainThorn],
    rules: [prone],
  });
  expect(
    summaryItems.some(
      (item) => item.tone === "create" && item.label === "Sunken Lighthouse",
    ) &&
      summaryItems.some(
        (item) => item.tone === "resolved" && item.label === "Captain Thorn",
      ),
    "Editor wiki summary must distinguish resolved links from inline entity creation.",
  );

  const entityTrigger = inlineSuggestionsModule.getActiveWikiLinkTrigger(
    "Met [[cap",
    "Met [[cap".length,
  );
  const entitySuggestions =
    inlineSuggestionsModule.createSessionNoteSuggestions(entityTrigger, {
      characters: [mira],
      document: noteDocument,
      entities: [captainThorn, lighthouse],
      rules: [prone],
    });
  expect(
    entitySuggestions[0]?.label === "Captain Thorn" &&
      entitySuggestions[0]?.metadata.targetType === "entity",
    "Inline suggestions must rank matching campaign entities with metadata first.",
  );

  const ruleTrigger = inlineSuggestionsModule.getActiveWikiLinkTrigger(
    "Rules: [[rule: pro",
    "Rules: [[rule: pro".length,
  );
  const ruleSuggestions =
    inlineSuggestionsModule.createSessionNoteSuggestions(ruleTrigger, {
      characters: [mira],
      document: noteDocument,
      entities: [captainThorn, lighthouse],
      rules: [prone],
    });
  expect(
    ruleSuggestions[0]?.replacement === "[[rule: Prone]]" &&
      ruleSuggestions[0]?.metadata.targetType === "rule",
    "Inline suggestions must complete rule references with rule metadata.",
  );

  const createTrigger = inlineSuggestionsModule.getActiveWikiLinkTrigger(
    "Found [[npc: Blackwater Jack",
    "Found [[npc: Blackwater Jack".length,
  );
  const createSuggestions =
    inlineSuggestionsModule.createSessionNoteSuggestions(createTrigger, {
      characters: [mira],
      document: noteDocument,
      entities: [captainThorn, lighthouse],
      rules: [prone],
    });
  expect(
    createSuggestions.some(
      (suggestion) =>
        suggestion.kind === "create-entity" &&
        suggestion.replacement === "[[npc: Blackwater Jack]]" &&
        suggestion.metadata.source === "inline-create",
    ),
    "Inline suggestions must offer typed entity creation through wiki syntax.",
  );
}

if (failures.length > 0) {
  console.error("Wiki link validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Wiki link validation passed.");

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
