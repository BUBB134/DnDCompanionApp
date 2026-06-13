const defaultTimeoutMs = 15_000;
const validAppEnvironments = new Set(["local", "preview", "production"]);

const options = parseOptions(process.argv.slice(2));
const deploymentUrl = options.url ?? process.env.DEPLOYMENT_URL;
const expectedOrigin =
  options.expectedOrigin ?? process.env.EXPECTED_DEPLOYMENT_ORIGIN;
const expectedRevision =
  options.expectedRevision ?? process.env.EXPECTED_DEPLOYMENT_REVISION;
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

if (expectedOrigin && !resolveOrigin(expectedOrigin)) {
  fail(`Invalid expected deployment origin: ${expectedOrigin}`);
}

if (expectedRevision && !/^[0-9a-f]{40}$/iu.test(expectedRevision)) {
  fail("--expect-revision must be a full 40-character Git commit hash.");
}

if (failures.length === 0) {
  await checkDeployment(deploymentUrl, {
    ...options,
    expectedOrigin,
    expectedRevision,
  });
}

if (failures.length > 0) {
  console.error("Deployment check failed:");
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
    expectedOrigin: readOption(args, "--expect-origin"),
    expectedRevision: readOption(args, "--expect-revision"),
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
  const healthUrl = resolveDeploymentUrl(url, "/api/health");
  const signInUrl = resolveDeploymentUrl(url, "/sign-in?next=%2F");
  const deploymentOrigin = resolveOrigin(url);

  if (!healthUrl || !signInUrl || !deploymentOrigin) {
    fail(`Invalid deployment URL: ${url}`);
    return;
  }

  if (
    checkOptions.expectedOrigin &&
    deploymentOrigin !== resolveOrigin(checkOptions.expectedOrigin)
  ) {
    fail(
      `Deployment origin ${deploymentOrigin} does not match configured origin ${resolveOrigin(
        checkOptions.expectedOrigin,
      )}.`,
    );
    return;
  }

  if (
    checkOptions.expectedOrigin &&
    normalizeDeploymentUrl(url) !== resolveOrigin(checkOptions.expectedOrigin)
  ) {
    fail("Deployment URL must be the configured application origin.");
    return;
  }

  const payload = await checkHealthEndpoint(healthUrl, checkOptions);
  await checkSignInRoute(signInUrl, checkOptions);

  if (failures.length === 0 && payload) {
    console.log(
      `Deployment checks passed for ${new URL("/", healthUrl).origin} (${payload.environment}).`,
    );
  }
}

async function checkHealthEndpoint(healthUrl, checkOptions) {
  const response = await requestUrl(healthUrl, checkOptions, {
    accept: "application/json",
  });

  if (!response) {
    return null;
  }

  const payload = await readJson(response);

  if (!response.ok) {
    fail(`Health endpoint returned HTTP ${response.status}.`);
  }

  if (!payload || typeof payload !== "object") {
    fail("Health endpoint did not return a JSON object.");
    return null;
  }

  validatePayload(payload, checkOptions);

  return payload;
}

async function checkSignInRoute(signInUrl, checkOptions) {
  const response = await requestUrl(
    signInUrl,
    checkOptions,
    {
      accept: "text/html",
    },
    {
      redirect: "manual",
    },
  );

  if (!response) {
    return;
  }

  const body = await response.text();

  if (response.redirected || isRedirectStatus(response.status)) {
    fail("Sign-in route redirected instead of rendering directly.");
  }

  if (!response.ok) {
    fail(`Sign-in route returned HTTP ${response.status}.`);
  }

  if (!body.includes("<form") || !body.includes('name="email"')) {
    fail("Sign-in route did not render the expected sign-in form.");
    return;
  }

  const submitButton = [...body.matchAll(/<button\b[^>]*>/gu)]
    .map(([tag]) => tag)
    .find((tag) => /\btype="submit"/u.test(tag));

  if (!submitButton) {
    fail("Sign-in route did not render a submit button.");
    return;
  }

  if (/\bdisabled(?:=""|(?=[\s>]))/u.test(submitButton)) {
    fail("Sign-in is unavailable because the submit button is disabled.");
  }

  if (
    body.includes(
      "Sign-in is temporarily unavailable while deployment configuration is completed.",
    )
  ) {
    fail("Sign-in route reported incomplete deployment configuration.");
  }
}

async function requestUrl(url, checkOptions, headers, requestOptions = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), checkOptions.timeoutMs);

  let response;

  try {
    response = await fetch(url, {
      headers,
      redirect: requestOptions.redirect ?? "follow",
      signal: controller.signal,
    });
  } catch (error) {
    fail(
      error instanceof Error && error.name === "AbortError"
        ? `Timed out after ${checkOptions.timeoutMs}ms requesting ${url}.`
        : `Unable to request ${url}.`,
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }

  return response;
}

function isRedirectStatus(status) {
  return status >= 300 && status < 400;
}

function resolveDeploymentUrl(url, path) {
  const normalizedUrl = /^https?:\/\//u.test(url) ? url : `https://${url}`;

  try {
    return new URL(path, normalizedUrl).toString();
  } catch {
    return null;
  }
}

function resolveOrigin(url) {
  const normalizedUrl = /^https?:\/\//u.test(url) ? url : `https://${url}`;

  try {
    return new URL(normalizedUrl).origin;
  } catch {
    return null;
  }
}

function normalizeDeploymentUrl(url) {
  const normalizedUrl = /^https?:\/\//u.test(url) ? url : `https://${url}`;

  try {
    const parsedUrl = new URL(normalizedUrl);

    if (
      parsedUrl.username ||
      parsedUrl.password ||
      parsedUrl.search ||
      parsedUrl.hash
    ) {
      return null;
    }

    const pathname = parsedUrl.pathname.replace(/\/+$/u, "");
    return `${parsedUrl.origin}${pathname}`;
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

  if (
    checkOptions.expectedRevision &&
    payload.revision !== checkOptions.expectedRevision
  ) {
    fail(
      `Expected deployed revision ${checkOptions.expectedRevision}, got ${readString(
        payload.revision,
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
