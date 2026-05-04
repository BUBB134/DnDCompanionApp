import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/auth/local-user.ts",
  "apps/web/src/campaigns/bootstrap.ts",
  "apps/web/src/components/campaign-access-state.tsx",
  "packages/types/src/campaign.ts",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing campaign access file: ${file}`);
}

const typescriptPath = resolve("node_modules/typescript/lib/typescript.js");
const hasTypeScriptRuntime = existsSync(typescriptPath);
const typescriptRuntime = hasTypeScriptRuntime
  ? await import(pathToFileURL(typescriptPath).href)
  : null;
const typescript = hasTypeScriptRuntime
  ? (typescriptRuntime.default ?? typescriptRuntime)
  : null;

const localUserModuleUrl = hasTypeScriptRuntime
  ? await transpileModuleToDataUrl("apps/web/src/auth/local-user.ts")
  : null;
const campaignModule = hasTypeScriptRuntime
  ? await import(
      await transpileModuleToDataUrl("packages/types/src/campaign.ts"),
    )
  : null;
const sessionModule = hasTypeScriptRuntime && localUserModuleUrl
  ? await import(
      await transpileModuleToDataUrl("apps/web/src/auth/session.ts", [
        ["@/auth/local-user", localUserModuleUrl],
      ]),
    )
  : null;

const campaigns = [
  {
    activeSessionId: "session-12",
    id: "campaign-1",
    name: "Ashen Coast",
  },
];
const memberships = [
  {
    campaignId: "campaign-1",
    role: "dm",
    userId: "local:dm@local.test",
  },
  {
    campaignId: "campaign-1",
    role: "player",
    userId: "local:player@local.test",
  },
];

if (campaignModule) {
  const dmAccess = campaignModule.resolveCampaignAccess({
    campaigns,
    memberships,
    userId: "local:dm@local.test",
  });
  expect(dmAccess?.role === "dm", "DM membership should resolve campaign access.");

  const playerAccess = campaignModule.resolveCampaignAccess({
    campaigns,
    memberships,
    userId: "local:player@local.test",
  });
  expect(
    playerAccess?.role === "player",
    "Player membership should resolve campaign access.",
  );

  const nonMemberAccess = campaignModule.resolveCampaignAccess({
    campaigns,
    memberships,
    userId: "local:outsider@local.test",
  });
  expect(nonMemberAccess === null, "Non-members must not resolve campaign access.");

  expect(
    campaignModule.canAccessVisibility("dm", "dm-only"),
    "DM access should include dm-only visibility.",
  );
  expect(
    campaignModule.canAccessVisibility("player", "player-safe"),
    "Player access should include player-safe visibility.",
  );
  expect(
    !campaignModule.canAccessVisibility("player", "dm-only"),
    "Player access must exclude dm-only visibility.",
  );
  expect(
    campaignModule.isDungeonMaster("dm") && !campaignModule.isDungeonMaster("player"),
    "Role helper should distinguish DM from player access.",
  );

  const filteredRules = campaignModule.filterByVisibility(
    [
      { id: "rule-player", visibility: "player-safe" },
      { id: "rule-dm", visibility: "dm-only" },
    ],
    "player",
  );
  expect(
    filteredRules.length === 1 && filteredRules[0]?.id === "rule-player",
    "Visibility filtering should keep only player-safe content for players.",
  );
}

if (sessionModule && localUserModuleUrl) {
  const legacyCookie = sessionModule.encodeAuthSession({
    expiresAt: "2099-01-01T00:00:00.000Z",
    user: {
      email: "dm@local.test",
      id: "local-dm",
      name: "Local DM",
    },
  });
  const decodedLegacySession = sessionModule.decodeAuthSession(
    legacyCookie,
    new Date("2026-05-04T00:00:00.000Z"),
  );
  const localUserModule = await import(localUserModuleUrl);

  expect(
    decodedLegacySession?.user.id === localUserModule.createLocalUserId("dm@local.test"),
    "Legacy local auth cookies should normalize to the membership-backed user id.",
  );
}

const dashboardPage = readText("apps/web/src/app/(protected)/page.tsx");
expect(
  dashboardPage.includes("getCampaignHomeData"),
  "Dashboard must resolve its campaign view from membership-backed data.",
);

for (const protectedPage of [
  "apps/web/src/app/(protected)/campaigns/page.tsx",
  "apps/web/src/app/(protected)/entities/page.tsx",
  "apps/web/src/app/(protected)/rules/page.tsx",
  "apps/web/src/app/(protected)/sessions/page.tsx",
]) {
  expect(
    readText(protectedPage).includes("CampaignAccessState"),
    `Protected page must gate non-members with CampaignAccessState: ${protectedPage}`,
  );
}

expect(
  readText("apps/web/src/components/campaign-shell.tsx").includes("DM brief"),
  "Campaign shell should expose a DM-only section for role-based visibility behavior.",
);
expect(
  readText("apps/web/src/app/sign-in/page.tsx").includes("player-safe view"),
  "Sign-in page should document how to exercise the local membership bootstrap.",
);
expect(
  readText("apps/web/src/auth/session.ts").includes("normalizeLocalAuthUserId"),
  "Session decoding should normalize legacy local auth user ids.",
);
expect(
  readText("scripts/validate-campaign-access.mjs").includes("transpileModuleToDataUrl"),
  "Campaign access validation should transpile TypeScript sources instead of importing them directly.",
);

if (failures.length > 0) {
  console.error("Campaign access validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Campaign access validation passed.");

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

  return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
}
