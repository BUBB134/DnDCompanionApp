import { NextResponse } from "next/server";
import { queryDatabase } from "@dnd/db";
import {
  isNonLocalAppEnvironment,
  readPublicEnv,
  validateRuntimeEnv,
} from "@dnd/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HealthCheck = {
  name: "database" | "deployment-revision" | "runtime-env";
  status: "error" | "ok" | "skipped";
  message?: string;
};

export async function GET() {
  const checkedAt = new Date().toISOString();
  const publicEnv = readPublicEnv(process.env);
  const checks: HealthCheck[] = [];
  const runtimeIssues = validateRuntimeEnv(process.env);
  const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? null;

  if (runtimeIssues.length > 0) {
    checks.push({
      name: "runtime-env",
      status: "error",
      message: runtimeIssues.map((issue) => issue.key).join(", "),
    });
  } else {
    checks.push({ name: "runtime-env", status: "ok" });
  }

  checks.push(checkDeploymentRevision(publicEnv.NEXT_PUBLIC_APP_ENV, revision));

  if (runtimeIssues.length === 0) {
    checks.push(await checkDatabase(publicEnv.NEXT_PUBLIC_APP_ENV));
  }

  const status = checks.some((check) => check.status === "error") ? "error" : "ok";

  return NextResponse.json(
    {
      checkedAt,
      checks,
      environment: publicEnv.NEXT_PUBLIC_APP_ENV,
      revision,
      status,
      vercelEnvironment: process.env.VERCEL_ENV ?? null,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
      status: status === "ok" ? 200 : 503,
    },
  );
}

function checkDeploymentRevision(
  appEnvironment: ReturnType<typeof readPublicEnv>["NEXT_PUBLIC_APP_ENV"],
  revision: string | null,
): HealthCheck {
  if (revision) {
    return { name: "deployment-revision", status: "ok" };
  }

  if (isNonLocalAppEnvironment(appEnvironment)) {
    return {
      name: "deployment-revision",
      status: "error",
      message:
        "Vercel Git metadata is unavailable. Enable system environment variables.",
    };
  }

  return {
    name: "deployment-revision",
    status: "skipped",
    message: "Git revision metadata is not required for local development.",
  };
}

async function checkDatabase(
  appEnvironment: ReturnType<typeof readPublicEnv>["NEXT_PUBLIC_APP_ENV"],
): Promise<HealthCheck> {
  if (!process.env.DATABASE_URL && !isNonLocalAppEnvironment(appEnvironment)) {
    return {
      name: "database",
      status: "skipped",
      message: "DATABASE_URL is not configured for local development.",
    };
  }

  try {
    await queryDatabase("select 1");

    return { name: "database", status: "ok" };
  } catch (error) {
    console.error("Deployment health database check failed.", error);

    return {
      name: "database",
      status: "error",
      message: "Database connectivity check failed.",
    };
  }
}
