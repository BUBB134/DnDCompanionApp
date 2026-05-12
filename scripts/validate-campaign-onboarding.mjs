import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/components/campaign-create-form.tsx",
  "apps/web/src/campaigns/create-campaign.ts",
  "apps/web/src/campaigns/repository.ts",
  "docs/engineering/campaign-onboarding.md",
  "packages/db/migrations/0005_campaign_onboarding.sql",
  "packages/db/src/schema.ts",
  "packages/types/src/campaign.ts",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing campaign onboarding file: ${file}`);
}

const formText = readText("apps/web/src/components/campaign-create-form.tsx");
for (const snippet of [
  "DRAFT_STORAGE_KEY",
  "useActionState",
  "window.localStorage",
  "onboardingSteps",
  "Invite-ready",
]) {
  expect(formText.includes(snippet), `Guided onboarding form is missing: ${snippet}`);
}

const repositoryText = readText("apps/web/src/campaigns/repository.ts");
for (const snippet of [
  "ruleset",
  "starting_location",
  "onboarding_completed_at",
  "createInitialSessionIfNeeded",
  "insert into sessions",
]) {
  expect(
    repositoryText.includes(snippet),
    `Campaign repository is missing onboarding persistence: ${snippet}`,
  );
}

const migrationText = readText("packages/db/migrations/0005_campaign_onboarding.sql");
const schemaText = readText("packages/db/src/schema.ts");
for (const snippet of [
  "ruleset text not null default 'D&D 5e'",
  "tone text",
  "starting_location text",
  "onboarding_completed_at timestamptz",
]) {
  expect(migrationText.includes(snippet), `Migration is missing: ${snippet}`);
  expect(schemaText.includes(snippet), `Baseline schema is missing: ${snippet}`);
}

const typescriptPath = resolveTypeScriptRuntimePath();
const hasTypeScriptRuntime = typescriptPath !== null;

expect(hasTypeScriptRuntime, "TypeScript runtime is required for onboarding validation.");

if (hasTypeScriptRuntime) {
  const typescriptRuntime = await import(pathToFileURL(typescriptPath).href);
  const typescript = typescriptRuntime.default ?? typescriptRuntime;
  const typesStubModuleUrl = moduleTextToDataUrl("export {};");
  const createCampaignUrl = await transpileModuleToDataUrl(
    typescript,
    "apps/web/src/campaigns/create-campaign.ts",
    [["@dnd/types", typesStubModuleUrl]],
  );
  const createCampaignModule = await import(createCampaignUrl);

  expect(
    createCampaignModule.initialCreateCampaignActionState.values.ruleset ===
      "D&D 5e" &&
      createCampaignModule.initialCreateCampaignActionState.values.firstSessionTitle ===
        "Session zero",
    "Initial onboarding state should include safe setup defaults.",
  );

  const validation = createCampaignModule.validateCreateCampaignValues({
    firstSessionTitle: "  First tide  ",
    name: "  Ashen Coast  ",
    openingHook: "  Find the drowned bell  ",
    ruleset: "  Homebrew  ",
    startingLocation: "  Saltmarsh docks  ",
    summary: "  Haunted shores  ",
    tone: "  Mystery and intrigue  ",
  });

  expect(
    Object.keys(validation.fieldErrors).length === 0 &&
      validation.input.name === "Ashen Coast" &&
      validation.input.ruleset === "Homebrew" &&
      validation.input.tone === "Mystery and intrigue" &&
      validation.input.startingLocation === "Saltmarsh docks" &&
      validation.input.openingHook === "Find the drowned bell" &&
      validation.input.firstSessionTitle === "First tide",
    "Campaign onboarding validation must normalize setup metadata.",
  );

  const fallbackRuleset = createCampaignModule.validateCreateCampaignValues({
    firstSessionTitle: "",
    name: "Ashen Coast",
    openingHook: "",
    ruleset: "   ",
    startingLocation: "",
    summary: "",
    tone: "",
  });

  expect(
    fallbackRuleset.input.ruleset === "D&D 5e",
    "Blank ruleset should fall back to the default.",
  );

  const longHook = createCampaignModule.validateCreateCampaignValues({
    firstSessionTitle: "",
    name: "Ashen Coast",
    openingHook: "x".repeat(181),
    ruleset: "D&D 5e",
    startingLocation: "",
    summary: "",
    tone: "",
  });

  expect(
    longHook.fieldErrors.openingHook ===
      "Opening hook must be 180 characters or fewer.",
    "Opening hook validation should enforce the MVP hook limit.",
  );

  const dbStubModuleUrl = moduleTextToDataUrl(`
    export async function queryDatabase() {
      throw new Error("queryDatabase should not be called in this validation.");
    }

    export async function withDatabaseTransaction() {
      throw new Error("withDatabaseTransaction should not be called in this validation.");
    }
  `);
  const repositoryModule = await import(
    await transpileModuleToDataUrl(
      typescript,
      "apps/web/src/campaigns/repository.ts",
      [
        ["@dnd/db", dbStubModuleUrl],
        ["@dnd/types", typesStubModuleUrl],
        ["@/campaigns/create-campaign", createCampaignUrl],
      ],
    ),
  );
  const queries = [];
  const createdCampaign = await repositoryModule.createCampaignInTransaction(
    {
      async query(text, values = []) {
        queries.push({ text, values });

        if (text.includes("insert into campaigns")) {
          return {
            rows: [
              {
                id: "campaign-ashen-coast",
                name: "Ashen Coast",
                onboarding_completed_at: "2026-05-12T20:00:00.000Z",
                ruleset: values[3],
                starting_location: values[5],
                summary: values[1],
                tone: values[4],
              },
            ],
          };
        }

        return { rows: [], rowCount: 1 };
      },
    },
    {
      email: "dm@local.test",
      id: "11111111-1111-5111-8111-111111111111",
      name: "Local DM",
    },
    validation.input,
  );

  const queryText = queries.map((query) => query.text).join("\n");
  expect(
    createdCampaign.role === "dm" &&
      createdCampaign.setup?.ruleset === "Homebrew" &&
      createdCampaign.setup?.startingLocation === "Saltmarsh docks",
    "Created campaign should return onboarding setup metadata.",
  );
  expect(
    queryText.includes("insert into sessions") &&
      queries.some((query) => query.values.includes("First tide")) &&
      queries.some((query) =>
        query.values.some(
          (value) =>
            typeof value === "string" && value.includes("Find the drowned bell"),
        ),
      ),
    "Campaign onboarding should seed the first session when opening details exist.",
  );
}

if (failures.length > 0) {
  console.error("Campaign onboarding validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Campaign onboarding validation passed.");

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

async function transpileModuleToDataUrl(typescript, path, replacements = []) {
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

  return moduleTextToDataUrl(compiled);
}

function moduleTextToDataUrl(text) {
  return `data:text/javascript;base64,${Buffer.from(text).toString("base64")}`;
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
