import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  ".env.example",
  ".github/workflows/ci.yml",
  "Agents.md",
  "apps/web/src/app/(protected)/page.tsx",
  "apps/web/next.config.mjs",
  "apps/web/package.json",
  "apps/web/postcss.config.mjs",
  "packages/env/package.json",
  "packages/env/src/index.ts",
  "packages/types/package.json",
  "packages/types/src/index.ts",
  "packages/ui/package.json",
  "packages/ui/src/index.tsx",
  "tsconfig.base.json",
];

const requiredRootScripts = ["install", "dev", "build", "lint", "test", "typecheck"];
const requiredEnvKeys = [
  "NEXT_PUBLIC_APP_ENV",
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "AI_GROUNDING_MODE",
];
const expectedWorkspaces = ["apps/*", "packages/*"];
const expectedPackages = ["@dnd/env", "@dnd/types", "@dnd/ui", "@dnd/web"];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing required file: ${file}`);
}

const rootEntries = new Set(readdirSync(rootDir));
const agentInstructionFiles = ["Agents.md", "AGENTS.md"].filter((file) =>
  rootEntries.has(file),
);
expect(
  agentInstructionFiles.length === 1 && agentInstructionFiles[0] === "Agents.md",
  "Use only Agents.md for repository instructions to avoid case-colliding filenames.",
);

const rootPackage = readJson("package.json");
const webPackage = readJson("apps/web/package.json");
for (const script of requiredRootScripts) {
  expect(
    typeof rootPackage.scripts?.[script] === "string",
    `Missing root script: ${script}`,
  );
}

for (const workspace of expectedWorkspaces) {
  expect(
    rootPackage.workspaces?.includes(workspace),
    `Missing workspace pattern: ${workspace}`,
  );
}

const workspacePackageNames = [
  "apps/web/package.json",
  "packages/env/package.json",
  "packages/types/package.json",
  "packages/ui/package.json",
].map((path) => readJson(path).name);

for (const packageName of expectedPackages) {
  expect(
    workspacePackageNames.includes(packageName),
    `Missing workspace package: ${packageName}`,
  );
}

for (const [dependencyName, dependencyRange] of Object.entries(webPackage.dependencies ?? {})) {
  expect(
    !dependencyRange.startsWith("workspace:"),
    `${dependencyName} uses unsupported npm workspace protocol: ${dependencyRange}`,
  );
}

const tsconfig = readJson("tsconfig.base.json");
for (const packageName of ["@dnd/env", "@dnd/types", "@dnd/ui"]) {
  expect(
    packageName in (tsconfig.compilerOptions?.paths ?? {}),
    `Missing TypeScript path alias: ${packageName}`,
  );
}

const nextConfig = readText("apps/web/next.config.mjs");
for (const packageName of ["@dnd/env", "@dnd/types", "@dnd/ui"]) {
  expect(
    nextConfig.includes(packageName),
    `Next.js is not configured to transpile ${packageName}`,
  );
}

const envExample = readText(".env.example");
for (const envKey of requiredEnvKeys) {
  expect(envExample.includes(`${envKey}=`), `Missing env example key: ${envKey}`);
}

if (failures.length > 0) {
  console.error("Workspace validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Workspace validation passed.");

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function readText(path) {
  return readFileSync(resolve(path), "utf8");
}

function resolve(path) {
  return join(rootDir, path);
}
