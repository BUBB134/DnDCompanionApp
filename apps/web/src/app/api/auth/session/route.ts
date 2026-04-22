import { NextResponse } from "next/server";
import { getAuthSession } from "@/auth/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAuthSession();

    return NextResponse.json({
      authenticated: session !== null,
      session,
    });
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        error: "Unable to resolve the current session.",
        session: null,
      },
      { status: 500 },
    );
  }
}
