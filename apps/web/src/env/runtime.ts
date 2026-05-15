import {
  assertValidRuntimeEnv,
  formatRuntimeEnvValidationIssues,
  validateRuntimeEnv,
} from "@dnd/env";

let hasValidatedRuntimeEnv = false;
let hasReportedRuntimeEnvIssues = false;

export function reportRuntimeEnvironmentIssues() {
  if (hasValidatedRuntimeEnv || hasReportedRuntimeEnvIssues) {
    return;
  }

  const issues = validateRuntimeEnv(process.env);

  if (issues.length === 0) {
    hasValidatedRuntimeEnv = true;
    return;
  }

  console.error(formatRuntimeEnvValidationIssues(issues));
  hasReportedRuntimeEnvIssues = true;
}

export function validateRuntimeEnvironment() {
  if (hasValidatedRuntimeEnv) {
    return;
  }

  assertValidRuntimeEnv(process.env);
  hasValidatedRuntimeEnv = true;
}
