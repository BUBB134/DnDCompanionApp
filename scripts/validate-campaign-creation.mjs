import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "apps/web/src/app/(protected)/campaigns/[campaignId]/page.tsx",
  "apps/web/src/app/(protected)/campaigns/page.tsx",
  "apps/web/src/campaigns/actions.ts",
  "apps/web/src/campaigns/active-campaign.ts",
  "apps/web/src/campaigns/create-campaign.ts",
  "apps/web/src/campaigns/repository.ts",
  "apps/web/src/components/campaign-create-form.tsx",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing campaign creation file: ${file}`);
}

const typescriptPath = resolveTypeScriptRuntimePath();
const hasTypeScriptRuntime = typescriptPath !== null;

expect(hasTypeScriptRuntime, "TypeScript runtime is required for campaign creation validation.");

if (hasTypeScriptRuntime) {
  const typescriptRuntime = await import(pathToFileURL(typescriptPath).href);
  const typescript = typescriptRuntime.default ?? typescriptRuntime;
  const typesStubModuleUrl = moduleTextToDataUrl(`
    export const AuthUser = undefined;
    export const Campaign = undefined;
    export const CampaignRole = undefined;
  `);

  const createCampaignModule = await import(
    await transpileModuleToDataUrl(typescript, "apps/web/src/campaigns/create-campaign.ts", [
      ["@dnd/types", typesStubModuleUrl],
    ]),
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
    await transpileModuleToDataUrl(typescript, "apps/web/src/campaigns/repository.ts", [
      ["@dnd/db", dbStubModuleUrl],
      ["@dnd/types", typesStubModuleUrl],
    ]),
  );

  const user = {
    email: "dm@local.test",
    id: "local:dm@local.test",
    name: "Local DM",
  };

  const missingName = createCampaignModule.validateCreateCampaignValues({
    name: "   ",
    summary: "",
  });
  expect(
    missingName.fieldErrors.name === "Campaign name is required.",
    "Campaign validation must require a non-empty name.",
  );

  let capturedInput = null;
  const successResult = await createCampaignModule.createCampaignSubmission(
    {
      async createCampaignForUser(_user, input) {
        capturedInput = input;

        return {
          id: "campaign-ashen-coast",
          name: input.name,
          role: "dm",
          summary: input.summary,
        };
      },
    },
    user,
    {
      name: "  Ashen Coast  ",
      summary: "  Storm-lashed mysteries  ",
    },
    () => "Unexpected failure",
  );

  expect(successResult.ok, "Campaign submission should succeed with valid values.");
  expect(
    capturedInput?.name === "Ashen Coast" &&
      capturedInput?.summary === "Storm-lashed mysteries",
    "Campaign submission must trim and normalize values before persistence.",
  );

  const failureResult = await createCampaignModule.createCampaignSubmission(
    {
      async createCampaignForUser() {
        throw new Error("database offline");
      },
    },
    user,
    {
      name: "Ashen Coast",
      summary: "",
    },
    (error) => `Failed: ${error instanceof Error ? error.message : "unknown"}`,
  );

  expect(
    !failureResult.ok &&
      failureResult.state.formError === "Failed: database offline",
    "Campaign submission must surface a stable failure state when persistence fails.",
  );

  const queries = [];
  const createdCampaign = await repositoryModule.createCampaignInTransaction(
    {
      async query(text, values = []) {
        queries.push({ text, values });

        if (text.includes("returning id, name, summary")) {
          return {
            rows: [
              {
                id: "campaign-ashen-coast",
                name: "Ashen Coast",
                summary: "Storm-lashed mysteries",
              },
            ],
          };
        }

        return { rows: [] };
      },
    },
    user,
    {
      name: "Ashen Coast",
      summary: "Storm-lashed mysteries",
    },
  );

  expect(
    createdCampaign.role === "dm",
    "Campaign creation must return the creator with DM access.",
  );
  expect(
    queries.length === 3 &&
      queries[2]?.text.includes("campaign_memberships") &&
      queries[2]?.text.includes("'dm'"),
    "Campaign creation must persist a DM membership for the creator.",
  );
}

if (failures.length > 0) {
  console.error("Campaign creation validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Campaign creation validation passed.");

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
