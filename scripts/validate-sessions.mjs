import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/app/(protected)/sessions/page.tsx",
  "apps/web/src/app/(protected)/sessions/loading.tsx",
  "apps/web/src/components/session-note-document-view.tsx",
  "apps/web/src/components/session-editor.tsx",
  "apps/web/src/sessions/actions.ts",
  "apps/web/src/sessions/manage-session.ts",
  "apps/web/src/sessions/note-document.ts",
  "apps/web/src/sessions/repository.ts",
  "packages/db/migrations/0002_session_entity_tags.sql",
  "packages/db/migrations/0004_session_note_document.sql",
  "packages/types/src/campaign.ts",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing session workflow file: ${file}`);
}

const sessionsPage = readText("apps/web/src/app/(protected)/sessions/page.tsx");
for (const expectedText of [
  "listSessionsForUser",
  "SessionCreateForm",
  "SessionEditForm",
  "SessionNoteDocumentView",
  "CampaignAccessState",
  "taggedEntities",
  "isDatabaseCampaignId",
  "No sessions yet",
]) {
  expect(
    sessionsPage.includes(expectedText),
    `Sessions page must include ${expectedText}.`,
  );
}

const repositoryText = readText("apps/web/src/sessions/repository.ts");
for (const expectedSql of [
  "from sessions",
  "insert into sessions",
  "update sessions",
  "notes_document",
  "session_entity_tags",
  "campaign_memberships",
  "entities.visibility = 'player-safe'",
  "unresolved_hooks",
  "updated_at = now()",
]) {
  expect(
    repositoryText.includes(expectedSql),
    `Session repository must enforce persistence/access SQL: ${expectedSql}`,
  );
}

const bootstrapText = readText("apps/web/src/campaigns/bootstrap.ts");
expect(
  bootstrapText.includes("getLatestSessionForUser"),
  "Dashboard data must resolve the latest persisted session for saved campaigns.",
);
expect(
  bootstrapText.includes("latestSessionOverride"),
  "Dashboard builder must distinguish persisted empty state from bootstrap sessions.",
);

expect(
  readText("apps/web/src/components/campaign-shell.tsx").includes(
    "Open session editor",
  ),
  "Campaign shell should route users into the session editor.",
);

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
  const noteDocumentModule = await import(noteDocumentUrl);
  const manageSessionUrl = await transpileModuleToDataUrl(
    "apps/web/src/sessions/manage-session.ts",
    [
      ["@dnd/types", campaignTypesUrl],
      ["@/campaigns/database-id", databaseIdUrl],
      ["@/sessions/note-document", noteDocumentUrl],
      ["@/sessions/wiki-links", wikiLinksUrl],
    ],
  );
  const manageSessionModule = await import(manageSessionUrl);

  const savedCampaign = {
    id: "11111111-1111-5111-8111-111111111111",
    name: "Saved Ashen Coast",
    role: "player",
  };
  const visibleEntities = [
    {
      id: "22222222-2222-5222-8222-222222222222",
      name: "Captain Thorn",
      summary: "A privateer with a tide chart.",
      type: "npc",
      visibility: "player-safe",
    },
  ];
  const validValues = {
    campaignId: savedCampaign.id,
    notes: "  The party found the tide key.  ",
    notesDocument: noteDocumentModule.serializeSessionNoteDocument(
      noteDocumentModule.createSessionNoteDocumentFromPlainText(
        "  The party found the tide key.  ",
      ),
    ),
    sessionId: "",
    taggedEntityIds: [visibleEntities[0].id, visibleEntities[0].id, ""],
    title: "  The drowned door  ",
    unresolvedHooks: " - Tell Captain Thorn\n\nFind the second lantern ",
  };

  const valid = manageSessionModule.validateSessionValues(
    validValues,
    savedCampaign,
    visibleEntities,
  );
  expect(
    Object.keys(valid.fieldErrors).length === 0 &&
      valid.input.title === "The drowned door" &&
      valid.input.notes === "The party found the tide key." &&
      valid.input.notesDocument.blocks[0]?.type === "paragraph" &&
      valid.input.unresolvedHooks.length === 2 &&
      valid.input.taggedEntityIds.length === 1,
    "Session validation must trim note blocks and hooks while deduplicating visible tags.",
  );

  const structuredNotes = manageSessionModule.validateSessionValues(
    {
      ...validValues,
      notes: "",
      notesDocument: JSON.stringify({
        version: 1,
        blocks: [
          {
            id: "block-heading",
            references: [],
            text: "  A tide key turns  ",
            type: "heading",
          },
          {
            id: "block-callout",
            references: [
              {
                endOffset: 13,
                label: "Captain Thorn",
                startOffset: 0,
                targetId: visibleEntities[0].id,
                targetType: "entity",
              },
            ],
            text: "Captain Thorn waits.",
            type: "callout",
          },
        ],
      }),
    },
    savedCampaign,
    visibleEntities,
  );
  expect(
    structuredNotes.input.notes === "A tide key turns\n\nCaptain Thorn waits." &&
      structuredNotes.input.notesDocument.blocks[1]?.references[0]?.targetType ===
        "entity",
    "Session validation must preserve structured note blocks and reference metadata.",
  );

  const unavailableTag = manageSessionModule.validateSessionValues(
    {
      ...validValues,
      taggedEntityIds: ["33333333-3333-5333-8333-333333333333"],
    },
    savedCampaign,
    visibleEntities,
  );
  expect(
    unavailableTag.fieldErrors.taggedEntityIds ===
      "Choose only visible entities from this campaign.",
    "Session validation must reject unavailable entity tags.",
  );

  const missingTitle = manageSessionModule.validateSessionValues(
    {
      ...validValues,
      title: "   ",
    },
    savedCampaign,
    visibleEntities,
  );
  expect(
    missingTitle.fieldErrors.title === "Session title is required.",
    "Session validation must require a title.",
  );

  const bootstrapValidation = manageSessionModule.validateSessionValues(
    {
      ...validValues,
      campaignId: "campaign-ashen-coast",
    },
    {
      id: "campaign-ashen-coast",
      name: "Ashen Coast",
      role: "dm",
    },
    visibleEntities,
  );
  expect(
    bootstrapValidation.fieldErrors.campaignId ===
      "Create or open a saved campaign before managing sessions.",
    "Session validation must prevent writes for non-database bootstrap campaign ids.",
  );

  let capturedCreateInput = null;
  const createResult = await manageSessionModule.createSessionSubmission(
    {
      async createSessionForUser(_userId, input) {
        capturedCreateInput = input;

        return {
          createdAt: "2026-05-06T00:00:00.000Z",
          id: "session-1",
          notes: input.notes,
          notesDocument: input.notesDocument,
          recap: "",
          taggedEntities: visibleEntities,
          title: input.title,
          unresolvedHooks: input.unresolvedHooks,
          updatedAt: "2026-05-06T00:00:00.000Z",
        };
      },
    },
    "user-1",
    savedCampaign,
    validValues,
    () => "Unexpected failure",
    visibleEntities,
  );
  expect(
    createResult.ok &&
      capturedCreateInput?.campaignId === savedCampaign.id &&
      capturedCreateInput?.taggedEntityIds[0] === visibleEntities[0].id &&
      createResult.state.savedSessionId === "session-1",
    "Session creation submission must persist normalized tag values and reset after save.",
  );

  const missingUpdateId = await manageSessionModule.updateSessionSubmission(
    {
      async updateSessionForUser() {
        throw new Error("should not persist without a session id");
      },
    },
    "user-1",
    savedCampaign,
    validValues,
    () => "Unexpected failure",
    visibleEntities,
  );
  expect(
    !missingUpdateId.ok &&
      missingUpdateId.state.fieldErrors.sessionId === "Session id is required.",
    "Session update submission must require a session id.",
  );

  let capturedUpdateId = null;
  const updateResult = await manageSessionModule.updateSessionSubmission(
    {
      async updateSessionForUser(_userId, sessionId, input) {
        capturedUpdateId = sessionId;

        return {
          createdAt: "2026-05-06T00:00:00.000Z",
          id: sessionId,
          notes: input.notes,
          notesDocument: input.notesDocument,
          recap: "",
          taggedEntities: visibleEntities,
          title: input.title,
          unresolvedHooks: input.unresolvedHooks,
          updatedAt: "2026-05-06T00:00:00.000Z",
        };
      },
    },
    "user-1",
    savedCampaign,
    {
      ...validValues,
      sessionId: "session-1",
    },
    () => "Unexpected failure",
    visibleEntities,
  );
  expect(
    updateResult.ok &&
      capturedUpdateId === "session-1" &&
      updateResult.state.successMessage === "Session saved.",
    "Session update submission must persist the selected session.",
  );

  const dbStubModuleUrl = moduleDataUrl(`
    export const queries = [];

    function sessionRow() {
      return {
        created_at: "2026-05-06T00:00:00.000Z",
        id: "session-1",
        notes: "The party found the tide key.",
        notes_document: {
          version: 1,
          blocks: [
            {
              id: "legacy-block-1",
              references: [],
              text: "The party found the tide key.",
              type: "paragraph"
            }
          ]
        },
        recap: "",
        tagged_entities: [
          {
            id: "22222222-2222-5222-8222-222222222222",
            name: "Captain Thorn",
            summary: "A privateer with a tide chart.",
            type: "npc",
            visibility: "player-safe",
          },
        ],
        title: "The drowned door",
        unresolved_hooks: ["Tell Captain Thorn"],
        updated_at: "2026-05-06T00:00:00.000Z"
      };
    }

    export async function queryDatabase(text, values = []) {
      queries.push({ text, values });

      return {
        rows: [sessionRow()]
      };
    }

    export async function withDatabaseTransaction(callback) {
      return callback({
        async query(text, values = []) {
          queries.push({ text, values });

          if (text.includes("returning sessions.id") || text.includes("returning id")) {
            return { rows: [{ id: "session-1" }], rowCount: 1 };
          }

          if (text.includes("insert into session_entity_tags")) {
            return {
              rows: values[3].map((id) => ({ entity_id: id })),
              rowCount: values[3].length,
            };
          }

          if (text.includes("delete from session_entity_tags")) {
            return { rows: [], rowCount: 1 };
          }

          return {
            rows: [sessionRow()],
            rowCount: 1,
          };
        }
      });
    }
  `);
  const dbStubModule = await import(dbStubModuleUrl);
  const repositoryModule = await import(
    await transpileModuleToDataUrl("apps/web/src/sessions/repository.ts", [
      ["@dnd/db", dbStubModuleUrl],
      ["@dnd/types", campaignTypesUrl],
      ["@/sessions/manage-session", moduleDataUrl("export {};")],
      ["@/sessions/note-document", noteDocumentUrl],
    ]),
  );

  const listedSessions = await repositoryModule.listSessionsForUser(
    "user-1",
    savedCampaign.id,
  );
  expect(
    listedSessions[0]?.notes === "The party found the tide key." &&
      listedSessions[0]?.notesDocument.blocks[0]?.text ===
        "The party found the tide key." &&
      listedSessions[0]?.recap === "The party found the tide key." &&
      listedSessions[0]?.taggedEntities[0]?.name === "Captain Thorn",
    "Session repository must map persisted note documents and visible entity tags.",
  );

  await repositoryModule.getLatestSessionForUser("user-1", savedCampaign.id);
  await repositoryModule.createSessionForUser("user-1", valid.input);
  await repositoryModule.updateSessionForUser("user-1", "session-1", valid.input);

  const queryTexts = dbStubModule.queries.map((query) => query.text).join("\n");
  expect(
      queryTexts.includes("campaign_memberships.user_id = $1") &&
      queryTexts.includes("$5::jsonb") &&
      queryTexts.includes("$6::jsonb") &&
      queryTexts.includes("$7::jsonb") &&
      queryTexts.includes("$4::uuid[]"),
    "Session repository queries must gate by membership, store note documents/hooks, and tag visible entities.",
  );

  const sessionActionsText = readText("apps/web/src/sessions/actions.ts");
  for (const expectedText of [
    "withDatabaseTransaction",
    "prepareInlineWikiEntities",
    "createEntityForUser(",
    "updateSessionForUser(",
    "client",
  ]) {
    expect(
      sessionActionsText.includes(expectedText),
      `Session actions must keep inline entity preparation and session writes transaction-scoped: ${expectedText}`,
    );
  }

  const transactionalDbStubUrl = moduleDataUrl(`
    export const events = [];
    export const committedEntities = [];

    export function formatDatabaseError(error) {
      return error instanceof Error ? error.message : "Unexpected failure";
    }

    export async function withDatabaseTransaction(callback) {
      const client = {
        pendingEntities: [],
        async query() {
          throw new Error("Unexpected raw query in action transaction stub.");
        }
      };

      events.push("begin");

      try {
        const result = await callback(client);
        committedEntities.push(...client.pendingEntities);
        events.push("commit");
        return result;
      } catch (error) {
        client.pendingEntities = [];
        events.push("rollback");
        throw error;
      }
    }
  `);
  const transactionalDbStub = await import(transactionalDbStubUrl);
  const entityRepositoryStubUrl = moduleDataUrl(`
    export const committedEntities = [];

    export async function listEntitySummariesForUser(_userId, _campaignId, client) {
      return [...committedEntities, ...(client?.pendingEntities ?? [])];
    }

    export async function createEntityForUser(_userId, input, client) {
      const entity = {
        id: input.name === "Blackwater" ?
          "66666666-6666-5666-8666-666666666666" :
          "55555555-5555-5555-8555-555555555555",
        name: input.name,
        summary: input.summary,
        type: input.type,
        visibility: input.visibility
      };

      if (client) {
        client.pendingEntities.push(entity);
      } else {
        committedEntities.push(entity);
      }

      return {
        ...entity,
        description: input.description
      };
    }
  `);
  const entityRepositoryStub = await import(entityRepositoryStubUrl);
  const authServerStubUrl = moduleDataUrl(`
    export async function requireAuthSession() {
      return {
        user: {
          email: "dm@local.test",
          id: "user-1"
        }
      };
    }
  `);
  const campaignBootstrapStubUrl = moduleDataUrl(`
    export async function getCurrentCampaignAccess(_session, campaignId) {
      if (campaignId !== "11111111-1111-5111-8111-111111111111") {
        return null;
      }

      return {
        id: campaignId,
        name: "Saved Ashen Coast",
        role: "dm"
      };
    }
  `);
  const characterRepositoryStubUrl = moduleDataUrl(`
    export async function listCharacterSummariesForUser() {
      return [];
    }
  `);
  const rulesRepositoryStubUrl = moduleDataUrl(`
    export async function listRuleSnippetsForUser() {
      return [];
    }
  `);
  const sessionRepositoryStubUrl = moduleDataUrl(`
    export async function createSessionForUser() {
      throw new Error("Create should not run in update regression.");
    }

    export async function updateSessionForUser(_userId, sessionId) {
      if (sessionId === "stale-session") {
        throw new Error("You do not have access to update this session.");
      }

      if (sessionId === "unauthorized-session") {
        throw new Error("You do not have access to update this session.");
      }

      throw new Error("Unexpected session id in update regression.");
    }
  `);
  const nextCacheStubUrl = moduleDataUrl(`
    export function revalidatePath() {}
  `);
  const sessionActionsModule = await import(
    await transpileModuleToDataUrl("apps/web/src/sessions/actions.ts", [
      ["@dnd/types", campaignTypesUrl],
      ["@dnd/db", transactionalDbStubUrl],
      ["next/cache", nextCacheStubUrl],
      ["@/auth/server", authServerStubUrl],
      ["@/campaigns/bootstrap", campaignBootstrapStubUrl],
      ["@/campaigns/database-id", databaseIdUrl],
      ["@/characters/repository", characterRepositoryStubUrl],
      ["@/entities/repository", entityRepositoryStubUrl],
      ["@/sessions/manage-session", manageSessionUrl],
      ["@/sessions/repository", sessionRepositoryStubUrl],
      ["@/rules/repository", rulesRepositoryStubUrl],
      ["@/sessions/wiki-links", wikiLinksUrl],
    ]),
  );
  const createUpdateFormData = (sessionId, noteText) => {
    const formData = new FormData();

    formData.set("campaignId", savedCampaign.id);
    formData.set("notes", "");
    formData.set(
      "notesDocument",
      noteDocumentModule.serializeSessionNoteDocument(
        noteDocumentModule.createSessionNoteDocumentFromPlainText(noteText),
      ),
    );
    formData.set("sessionId", sessionId);
    formData.set("title", "The drowned door");
    formData.set("unresolvedHooks", "");

    return formData;
  };
  const staleUpdateState = await sessionActionsModule.updateSessionAction(
    manageSessionModule.createSessionActionState(),
    createUpdateFormData("stale-session", "Met [[npc: Captain Thorn]]."),
  );
  const unauthorizedUpdateState = await sessionActionsModule.updateSessionAction(
    manageSessionModule.createSessionActionState(),
    createUpdateFormData("unauthorized-session", "Reached [[location: Blackwater]]."),
  );

  expect(
    staleUpdateState.formError === "You do not have access to update this session." &&
      unauthorizedUpdateState.formError ===
        "You do not have access to update this session.",
    "Invalid and unauthorized session updates must surface update access failures.",
  );
  expect(
    transactionalDbStub.events.filter((event) => event === "rollback").length ===
      2 &&
      transactionalDbStub.events.every((event) => event !== "commit"),
    "Invalid and unauthorized session updates must roll back the action transaction.",
  );
  expect(
    entityRepositoryStub.committedEntities.length === 0,
    "Inline wiki entity creation must not persist when the session update rolls back.",
  );
}

if (failures.length > 0) {
  console.error("Session validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Session validation passed.");

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
