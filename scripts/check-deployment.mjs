const defaultTimeoutMs = 15_000;
const validAppEnvironments = new Set(["local", "preview", "production"]);

const options = parseOptions(process.argv.slice(2));
const deploymentUrl = options.url ?? process.env.DEPLOYMENT_URL;
const failures = [];

if (!deploymentUrl) {
  fail("Missing deployment URL. Pass --url=<deployment-url> or set DEPLOYMENT_URL.");
}

if (
  options.expectedEnvironment &&
  !validAppEnvironments.has(options.expectedEnvironment)
) {
  fail("--expect-env must be one of: local, preview, production.");
}

if (failures.length === 0) {
  await checkDeployment(deploymentUrl, options);
}

if (failures.length > 0) {
  console.error("Deployment health check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

function parseOptions(args) {
  const timeoutMs = Number(readOption(args, "--timeout-ms") ?? defaultTimeoutMs);

  return {
    allowSkippedDatabase: args.includes("--allow-skipped-database"),
    expectedEnvironment: readOption(args, "--expect-env"),
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : defaultTimeoutMs,
    url: readOption(args, "--url"),
  };
}

function readOption(args, name) {
  const assignment = args.find((arg) => arg.startsWith(`${name}=`));

  if (assignment) {
    return assignment.slice(name.length + 1);
  }

  const index = args.indexOf(name);

  if (index >= 0) {
    return args[index + 1];
  }

  return undefined;
}

async function checkDeployment(url, checkOptions) {
  const healthUrl = resolveHealthUrl(url);

  if (!healthUrl) {
    fail(`Invalid deployment URL: ${url}`);
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), checkOptions.timeoutMs);

  let response;

  try {
    response = await fetch(healthUrl, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
  } catch (error) {
    fail(
      error instanceof Error && error.name === "AbortError"
        ? `Timed out after ${checkOptions.timeoutMs}ms requesting ${healthUrl}.`
        : `Unable to request ${healthUrl}.`,
    );
    return;
  } finally {
    clearTimeout(timeout);
  }

  const payload = await readJson(response);

  if (!response.ok) {
    fail(`Health endpoint returned HTTP ${response.status}.`);
  }

  if (!payload || typeof payload !== "object") {
    fail("Health endpoint did not return a JSON object.");
    return;
  }

  validatePayload(payload, checkOptions);

  if (failures.length === 0) {
    console.log(
      `Deployment health check passed for ${healthUrl} (${payload.environment}).`,
    );
  }
}

function resolveHealthUrl(url) {
  const normalizedUrl = /^https?:\/\//u.test(url) ? url : `https://${url}`;

  try {
    return new URL("/api/health", normalizedUrl).toString();
  } catch {
    return null;
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function validatePayload(payload, checkOptions) {
  if (payload.status !== "ok") {
    fail(`Health endpoint status was ${readString(payload.status, "missing")}.`);
  }

  if (
    checkOptions.expectedEnvironment &&
    payload.environment !== checkOptions.expectedEnvironment
  ) {
    fail(
      `Expected environment ${checkOptions.expectedEnvironment}, got ${readString(
        payload.environment,
        "missing",
      )}.`,
    );
  }

  const checks = Array.isArray(payload.checks) ? payload.checks : [];
  const runtimeCheck = findCheck(checks, "runtime-env");
  const databaseCheck = findCheck(checks, "database");

  if (runtimeCheck?.status !== "ok") {
    fail("Runtime environment check did not pass.");
  }

  if (databaseCheck?.status !== "ok") {
    if (databaseCheck?.status === "skipped" && checkOptions.allowSkippedDatabase) {
      return;
    }

    fail("Database connectivity check did not pass.");
  }
}

function findCheck(checks, name) {
  return checks.find(
    (check) => check && typeof check === "object" && check.name === name,
  );
}

function readString(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function fail(message) {
  failures.push(message);
}
