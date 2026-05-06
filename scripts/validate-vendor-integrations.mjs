import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  ".github/workflows/integration-smoke.yml",
  "docs/engineering/production-integrations.md",
  "scripts/check-production-env.mjs",
  "vercel.json",
];

const requiredEnvKeys = [
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_SENTRY_DSN",
  "AUTH_PROVIDER",
  "AUTH_SESSION_SECRET",
  "DATABASE_URL",
  "AI_GROUNDING_MODE",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OBSERVABILITY_PROVIDER",
  "SENTRY_DSN",
  "LOG_LEVEL",
  "STORAGE_PROVIDER",
  "BLOB_READ_WRITE_TOKEN",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing vendor integration file: ${file}`);
}

const rootPackage = readJson("package.json");
expect(
  rootPackage.scripts?.["env:check"] === "node scripts/check-production-env.mjs",
  "Missing env:check root script.",
);
expect(
  rootPackage.scripts?.test?.includes("node scripts/validate-vendor-integrations.mjs"),
  "npm test must include vendor integration validation.",
);

const envExample = readText(".env.example");
for (const envKey of requiredEnvKeys) {
  expect(envExample.includes(`${envKey}=`), `Missing env example key: ${envKey}`);
}

const envPackage = readText("packages/env/src/index.ts");
for (const snippet of [
  "assertValidRuntimeEnv",
  "validateRuntimeEnv",
  "AUTH_SESSION_SECRET",
  "OBSERVABILITY_PROVIDER",
  "STORAGE_PROVIDER",
  "BLOB_READ_WRITE_TOKEN",
]) {
  expect(envPackage.includes(snippet), `Env package is missing runtime support: ${snippet}`);
}

const runtimeEnv = readText("apps/web/src/env/runtime.ts");
expect(
  runtimeEnv.includes("assertValidRuntimeEnv(process.env)"),
  "Web runtime must validate process.env at startup.",
);

const authSession = readText("apps/web/src/auth/session.ts");
for (const snippet of [
  "SIGNED_SESSION_TOKEN_PREFIX",
  "AUTH_SESSION_SECRET",
  "crypto.subtle",
]) {
  expect(authSession.includes(snippet), `Auth sessions are missing production signing: ${snippet}`);
}

const smokeWorkflow = readText(".github/workflows/integration-smoke.yml");
for (const snippet of [
  "workflow_dispatch:",
  "environment: ${{ inputs.target }}",
  "run: npm run env:check -- --strict",
  "run: npm run db:check",
]) {
  expect(
    smokeWorkflow.includes(snippet),
    `Integration smoke workflow is missing expected configuration: ${snippet}`,
  );
}

const productionDocs = readText("docs/engineering/production-integrations.md");
for (const snippet of [
  "Vercel",
  "Postgres",
  "OpenAI",
  "Sentry",
  "`npm run env:check -- --env=production --strict`",
  "`npm run db:migrate`",
]) {
  expect(
    productionDocs.includes(snippet),
    `Production integration docs are missing expected content: ${snippet}`,
  );
}

if (failures.length > 0) {
  console.error("Vendor integration validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vendor integration validation passed.");

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
