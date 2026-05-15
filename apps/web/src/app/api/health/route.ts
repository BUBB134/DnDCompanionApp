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
  name: "database" | "runtime-env";
  status: "error" | "ok" | "skipped";
  message?: string;
};

export async function GET() {
  const checkedAt = new Date().toISOString();
  const publicEnv = readPublicEnv(process.env);
  const checks: HealthCheck[] = [];
  const runtimeIssues = validateRuntimeEnv(process.env);

  if (runtimeIssues.length > 0) {
    checks.push({
      name: "runtime-env",
      status: "error",
      message: runtimeIssues.map((issue) => issue.key).join(", "),
    });
  } else {
    checks.push({ name: "runtime-env", status: "ok" });
  }

  if (runtimeIssues.length === 0) {
    checks.push(await checkDatabase(publicEnv.NEXT_PUBLIC_APP_ENV));
  }

  const status = checks.some((check) => check.status === "error") ? "error" : "ok";

  return NextResponse.json(
    {
      checkedAt,
      checks,
      environment: publicEnv.NEXT_PUBLIC_APP_ENV,
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
