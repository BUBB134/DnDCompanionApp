import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/app/(protected)/campaigns/[campaignId]/page.tsx",
  "apps/web/src/app/(protected)/campaigns/[campaignId]/loading.tsx",
  "apps/web/src/campaigns/bootstrap.ts",
  "apps/web/src/components/campaign-shell.tsx",
  "packages/types/src/index.ts",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing campaign dashboard file: ${file}`);
}

const routePage = readText("apps/web/src/app/(protected)/campaigns/[campaignId]/page.tsx");
expect(
  routePage.includes("getSelectedCampaignDashboardData"),
  "Selected campaign route must resolve dashboard data through the membership-backed helper.",
);
expect(
  routePage.includes("formatDatabaseError"),
  "Selected campaign route must render a database error state.",
);
expect(
  routePage.includes("notFound()"),
  "Selected campaign route must return not-found for missing or unauthorized campaigns.",
);

const campaignShell = readText("apps/web/src/components/campaign-shell.tsx");
for (const expectedText of [
  "Latest session",
  "The first session is ready when you are",
  "Entities",
  "No entities yet",
  "Table shortcuts",
  "Open latest session",
  "Start first session",
  "Browse campaign memory",
  "Player-safe dashboard",
  "DM brief",
]) {
  expect(
    campaignShell.includes(expectedText),
    `Campaign shell must render expected dashboard state: ${expectedText}`,
  );
}
expect(
  campaignShell.includes("canAccessVisibility"),
  "Campaign shell actions must respect DM-only versus player-safe visibility.",
);
expect(
  !campaignShell.includes("Placeholder"),
  "Campaign dashboard shortcuts must be real actions rather than placeholder cards.",
);

expect(
  readText("packages/types/src/index.ts").includes("CampaignEntitySummary"),
  "Shared campaign entity summary type must be exported from @dnd/types.",
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
  const localUserUrl = await transpileModuleToDataUrl("apps/web/src/auth/local-user.ts");
  const databaseIdUrl = await transpileModuleToDataUrl(
    "apps/web/src/campaigns/database-id.ts",
  );
  const activeCampaignUrl = moduleDataUrl("export async function getActiveCampaignId() { return null; }");
  const repositoryUrl = moduleDataUrl(`
    export async function getDatabaseCampaignAccessForUser() { return null; }
    export async function listDatabaseCampaignsForUser() { return []; }
  `);
  const entitiesRepositoryUrl = moduleDataUrl(`
    export async function listEntitySummariesForUser() { return []; }
  `);
  const sessionsRepositoryUrl = moduleDataUrl(`
    export async function getLatestSessionForUser() { return null; }
  `);
  const domainContentUrl = await transpileModuleToDataUrl(
    "packages/db/src/domain-content.ts",
    [["@dnd/types", campaignTypesUrl]],
  );
  const coreRulesUrl = await transpileModuleToDataUrl(
    "apps/web/src/rules/core-rules.ts",
    [["@dnd/db/domain-content", domainContentUrl]],
  );
  const matchingUrl = await transpileModuleToDataUrl(
    "apps/web/src/rules/matching.ts",
    [["@dnd/types", campaignTypesUrl]],
  );
  const rulesRepositoryUrl = moduleDataUrl(`
    export async function listRuleSnippetsForUser() { return []; }
  `);
  const campaignInvitesUrl = moduleDataUrl(`
    export async function getActiveCampaignInviteForUser() { return null; }
  `);
  const bootstrapUrl = await transpileModuleToDataUrl(
    "apps/web/src/campaigns/bootstrap.ts",
    [
      ["@dnd/types", campaignTypesUrl],
      ["@/auth/local-user", localUserUrl],
      ["@/campaigns/active-campaign", activeCampaignUrl],
      ["@/campaigns/database-id", databaseIdUrl],
      ["@/campaigns/repository", repositoryUrl],
      ["@/entities/repository", entitiesRepositoryUrl],
      ["@/sessions/repository", sessionsRepositoryUrl],
      ["@/rules/core-rules", coreRulesUrl],
      ["@/rules/matching", matchingUrl],
      ["@/rules/repository", rulesRepositoryUrl],
      ["@/campaigns/invites", campaignInvitesUrl],
    ],
  );
  const bootstrapModule = await import(bootstrapUrl);
  const coreRulesModule = await import(coreRulesUrl);

  const dmDashboard = bootstrapModule.buildCampaignDashboardData({
    id: "campaign-ashen-coast",
    name: "Ashen Coast",
    role: "dm",
  });
  expect(
    dmDashboard.dmBrief && dmDashboard.entities.some((entity) => entity.visibility === "dm-only"),
    "DM dashboard data should include DM-only brief and entity placeholders.",
  );

  const playerDashboard = bootstrapModule.buildCampaignDashboardData({
    id: "campaign-ashen-coast",
    name: "Ashen Coast",
    role: "player",
  });
  expect(
    !playerDashboard.dmBrief &&
      playerDashboard.entities.length > 0 &&
      playerDashboard.entities.every((entity) => entity.visibility === "player-safe"),
    "Player dashboard data should exclude DM-only brief and entities.",
  );

  const emptyDashboard = bootstrapModule.buildCampaignDashboardData({
    id: "campaign-without-memory",
    name: "Empty Campaign",
    role: "dm",
  });
  expect(
    !emptyDashboard.latestSession &&
      emptyDashboard.entities.length === 0 &&
      emptyDashboard.rules.length === 0,
    "Campaigns without memory should produce empty dashboard sections.",
  );

  const longNotesDashboard = bootstrapModule.buildCampaignDashboardData(
    {
      id: "11111111-1111-5111-8111-111111111111",
      name: "Saved Ashen Coast",
      role: "player",
    },
    [],
    {
      id: "session-long-notes",
      notes: `${"quiet notes ".repeat(30)} stunned`,
      recap: "Short visible summary without tracked rules.",
      recapGrounding: [],
      taggedEntities: [],
      title: "Long notes",
      unresolvedHooks: [],
    },
    coreRulesModule.coreRuleSnippets,
  );
  expect(
    longNotesDashboard.rules.some((rule) => rule.slug === "stunned"),
    "Campaign dashboard rule matching should use full session notes when available.",
  );
}

if (failures.length > 0) {
  console.error("Campaign dashboard validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Campaign dashboard validation passed.");

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
