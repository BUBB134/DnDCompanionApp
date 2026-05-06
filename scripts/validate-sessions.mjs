import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/app/(protected)/sessions/page.tsx",
  "apps/web/src/app/(protected)/sessions/loading.tsx",
  "apps/web/src/components/session-editor.tsx",
  "apps/web/src/sessions/actions.ts",
  "apps/web/src/sessions/manage-session.ts",
  "apps/web/src/sessions/repository.ts",
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
  "CampaignAccessState",
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
  "campaign_memberships",
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
  const manageSessionModule = await import(
    await transpileModuleToDataUrl("apps/web/src/sessions/manage-session.ts", [
      ["@dnd/types", campaignTypesUrl],
      ["@/campaigns/database-id", databaseIdUrl],
    ]),
  );

  const savedCampaign = {
    id: "11111111-1111-5111-8111-111111111111",
    name: "Saved Ashen Coast",
    role: "player",
  };
  const validValues = {
    campaignId: savedCampaign.id,
    notes: "  The party found the tide key.  ",
    sessionId: "",
    title: "  The drowned door  ",
    unresolvedHooks: " - Tell Captain Thorn\n\nFind the second lantern ",
  };

  const valid = manageSessionModule.validateSessionValues(
    validValues,
    savedCampaign,
  );
  expect(
    Object.keys(valid.fieldErrors).length === 0 &&
      valid.input.title === "The drowned door" &&
      valid.input.notes === "The party found the tide key." &&
      valid.input.unresolvedHooks.length === 2,
    "Session validation must trim title, notes, and multiline hooks.",
  );

  const missingTitle = manageSessionModule.validateSessionValues(
    {
      ...validValues,
      title: "   ",
    },
    savedCampaign,
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
          recap: "",
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
  );
  expect(
    createResult.ok &&
      capturedCreateInput?.campaignId === savedCampaign.id &&
      createResult.state.savedSessionId === "session-1",
    "Session creation submission must persist normalized values and reset after save.",
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
          recap: "",
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
  );
  expect(
    updateResult.ok &&
      capturedUpdateId === "session-1" &&
      updateResult.state.successMessage === "Session saved.",
    "Session update submission must persist the selected session.",
  );

  const dbStubModuleUrl = moduleDataUrl(`
    export const queries = [];

    export async function queryDatabase(text, values = []) {
      queries.push({ text, values });

      return {
        rows: [
          {
            created_at: "2026-05-06T00:00:00.000Z",
            id: "session-1",
            notes: "The party found the tide key.",
            recap: "",
            title: "The drowned door",
            unresolved_hooks: ["Tell Captain Thorn"],
            updated_at: "2026-05-06T00:00:00.000Z"
          }
        ]
      };
    }
  `);
  const dbStubModule = await import(dbStubModuleUrl);
  const repositoryModule = await import(
    await transpileModuleToDataUrl("apps/web/src/sessions/repository.ts", [
      ["@dnd/db", dbStubModuleUrl],
      ["@dnd/types", campaignTypesUrl],
      ["@/sessions/manage-session", moduleDataUrl("export {};")],
    ]),
  );

  const listedSessions = await repositoryModule.listSessionsForUser(
    "user-1",
    savedCampaign.id,
  );
  expect(
    listedSessions[0]?.notes === "The party found the tide key." &&
      listedSessions[0]?.recap === "The party found the tide key.",
    "Session repository must map persisted notes and provide a dashboard preview.",
  );

  await repositoryModule.getLatestSessionForUser("user-1", savedCampaign.id);
  await repositoryModule.createSessionForUser("user-1", valid.input);
  await repositoryModule.updateSessionForUser("user-1", "session-1", valid.input);

  const queryTexts = dbStubModule.queries.map((query) => query.text).join("\n");
  expect(
    queryTexts.includes("campaign_memberships.user_id = $1") &&
      queryTexts.includes("$5::jsonb") &&
      queryTexts.includes("$6::jsonb"),
    "Session repository queries must gate by membership and store hooks as jsonb.",
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
