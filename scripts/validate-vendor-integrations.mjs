import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  ".github/workflows/ci.yml",
  ".github/workflows/deployment-smoke.yml",
  ".github/workflows/integration-smoke.yml",
  "apps/web/src/app/api/health/route.ts",
  "docs/engineering/production-integrations.md",
  "scripts/check-deployment.mjs",
  "scripts/check-production-env.mjs",
  "vercel.json",
];

const requiredEnvKeys = [
  "NEXT_PUBLIC_APP_ENV",
  "APP_BASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SENTRY_DSN",
  "AUTH_PROVIDER",
  "AUTH_SESSION_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_CONNECTION_TIMEOUT_MS",
  "DATABASE_IDLE_TIMEOUT_MS",
  "DATABASE_POOL_MAX",
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
  rootPackage.scripts?.["env:check:supabase"]?.includes("--require-supabase") &&
    rootPackage.scripts?.["env:check:supabase"]?.includes(
      "--supabase-project=egrmvhfroiumcodkotjv",
    ),
  "Missing env:check:supabase root script.",
);
expect(
  rootPackage.scripts?.["deploy:check"] === "node scripts/check-deployment.mjs",
  "Missing deploy:check root script.",
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
  "APP_BASE_URL",
  "AUTH_SESSION_SECRET",
  "DATABASE_POOL_MAX",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "sb_publishable_",
  "safeDecodeURIComponent",
  "OBSERVABILITY_PROVIDER",
  "STORAGE_PROVIDER",
  "BLOB_READ_WRITE_TOKEN",
]) {
  expect(envPackage.includes(snippet), `Env package is missing runtime support: ${snippet}`);
}

const runtimeEnv = readText("apps/web/src/env/runtime.ts");
expect(
  runtimeEnv.includes("assertValidRuntimeEnv(process.env)"),
  "Web runtime must keep a protected-route process.env validation guard.",
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
  "APP_BASE_URL: ${{ vars.APP_BASE_URL }}",
  "SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}",
  "run: npm run env:check -- --strict",
  "run: npm run db:check:supabase",
]) {
  expect(
    smokeWorkflow.includes(snippet),
    `Integration smoke workflow is missing expected configuration: ${snippet}`,
  );
}

const ciWorkflow = readText(".github/workflows/ci.yml");
for (const snippet of [
  "deploy_supabase:",
  "needs: ci",
  "if: github.event_name == 'push' && github.ref == 'refs/heads/main'",
  "environment: production",
  "group: supabase-production",
  "DATABASE_URL: ${{ secrets.DATABASE_URL }}",
  "SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}",
  "SUPABASE_PROJECT_ID: ${{ secrets.PRODUCTION_PROJECT_ID }}",
  "run: npm run db:migrate:supabase",
  "supabase functions deploy --project-ref \"$SUPABASE_PROJECT_ID\"",
]) {
  expect(ciWorkflow.includes(snippet), `CI workflow is missing Supabase deploy guard: ${snippet}`);
}
expect(
  !ciWorkflow.includes("supabase db push"),
  "CI workflow must use repository migrations instead of supabase db push.",
);
expect(
  !ciWorkflow.includes("supabase link"),
  "CI workflow must not require interactive supabase link setup.",
);

const deploymentSmokeWorkflow = readText(".github/workflows/deployment-smoke.yml");
for (const snippet of [
  "deployment_status:",
  "workflow_dispatch:",
  "deployment_url:",
  "github.event.deployment_status.state == 'success'",
  "github.event.deployment.environment == 'Production'",
  "github.event.deployment_status.environment_url",
  "npm run deploy:check -- --url=\"$DEPLOYMENT_URL\" --expect-env=\"$expected_environment\"",
]) {
  expect(
    deploymentSmokeWorkflow.includes(snippet),
    `Deployment smoke workflow is missing expected configuration: ${snippet}`,
  );
}

const healthRoute = readText("apps/web/src/app/api/health/route.ts");
for (const snippet of [
  "export const runtime = \"nodejs\"",
  "validateRuntimeEnv(process.env)",
  "await queryDatabase(\"select 1\")",
  "VERCEL_GIT_COMMIT_SHA",
  "deployment-revision",
  "Enable system environment variables.",
  "revision:",
  "\"cache-control\": \"no-store\"",
]) {
  expect(
    healthRoute.includes(snippet),
    `Deployment health route is missing expected behavior: ${snippet}`,
  );
}

const deploymentCheck = readText("scripts/check-deployment.mjs");
for (const snippet of [
  "DEPLOYMENT_URL",
  "--expect-env",
  "--expect-revision",
  "/api/health",
  "/sign-in?next=%2F",
  'redirect: "manual"',
  "Database connectivity check did not pass.",
  "Sign-in route returned HTTP",
  "Sign-in route redirected instead of rendering directly.",
  "Sign-in is unavailable because the submit button is disabled.",
  "Sign-in route reported incomplete deployment configuration.",
  "Deployment URL must be the configured application origin.",
  "Deployment revision metadata is unavailable.",
  "Expected deployed revision",
]) {
  expect(
    deploymentCheck.includes(snippet),
    `Deployment check script is missing expected behavior: ${snippet}`,
  );
}

const productionEnvCheck = readText("scripts/check-production-env.mjs");
for (const snippet of [
  "DATABASE_POOL_MAX",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "sb_publishable_",
  "safeDecodeURIComponent",
  "sslmode=require",
  "must replace the placeholder database password",
]) {
  expect(
    productionEnvCheck.includes(snippet),
    `Production env check is missing Supabase validation: ${snippet}`,
  );
}

const vercelConfig = readJson("vercel.json");
expect(
  vercelConfig.buildCommand === "npm --prefix ../.. run env:check && npm run build",
  "Vercel builds must validate runtime environment configuration before building.",
);

const productionDocs = readText("docs/engineering/production-integrations.md");
for (const snippet of [
  "/api/health",
  "/sign-in?next=%2F",
  "`npm run deploy:check -- --url=<deployment-url> --expect-env=preview`",
  "Vercel",
  "Supabase Postgres",
  "OpenAI",
  "Sentry",
  "`npm run env:check -- --env=production --strict`",
  "`npm run env:check:supabase -- --env=preview`",
  "`npm run db:migrate:supabase`",
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
