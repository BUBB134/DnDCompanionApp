import { assertValidRuntimeEnv } from "@dnd/env";

let hasValidatedRuntimeEnv = false;

export function validateRuntimeEnvironment() {
  if (hasValidatedRuntimeEnv) {
    return;
  }

  assertValidRuntimeEnv(process.env);
  hasValidatedRuntimeEnv = true;
}
