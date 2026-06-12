import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getAuthProvider,
  getSupabaseAuthConfig,
} from "@/auth/config";
import { getSafeReturnPath } from "@/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeReturnPath(
    request.nextUrl.searchParams.get("next"),
  );
  const config = getSupabaseAuthConfig();

  if (getAuthProvider() !== "supabase" || !config || !code) {
    return createCallbackErrorResponse(request, nextPath);
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url));
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, options, value } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.warn("Supabase auth callback failed.", { code: error.code });
    return createCallbackErrorResponse(request, nextPath);
  }

  return response;
}

function createCallbackErrorResponse(
  request: NextRequest,
  nextPath: ReturnType<typeof getSafeReturnPath>,
) {
  const errorReturnPath = nextPath === "/update-password" ? "/" : nextPath;
  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("error", "callback");
  signInUrl.searchParams.set("next", errorReturnPath);

  return NextResponse.redirect(signInUrl);
}
