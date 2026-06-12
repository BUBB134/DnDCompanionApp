import { NextResponse, type NextRequest } from "next/server";
import { getAuthProvider } from "@/auth/config";
import {
  AUTH_COOKIE_NAME,
  getSafeReturnPath,
  hasAuthSessionCookie,
} from "@/auth/session";
import {
  copySupabaseAuthCookies,
  resolveSupabaseMiddlewareAuth,
} from "@/auth/supabase/middleware";

const PROTECTED_ROUTE_PREFIXES = [
  "/",
  "/campaigns",
  "/entities",
  "/rules",
  "/sessions",
  "/update-password",
];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authResult =
    getAuthProvider() === "supabase"
      ? await resolveSupabaseMiddlewareAuth(request)
      : {
          isAuthenticated: await hasAuthSessionCookie(
            request.cookies.get(AUTH_COOKIE_NAME)?.value,
          ),
          response: NextResponse.next({ request }),
        };

  if (pathname === "/sign-in") {
    if (!authResult.isAuthenticated) {
      return authResult.response;
    }

    return copySupabaseAuthCookies(
      authResult.response,
      NextResponse.redirect(
        new URL(
          getSafeReturnPath(request.nextUrl.searchParams.get("next")),
          request.url,
        ),
      ),
    );
  }

  if (!isProtectedRoute(pathname)) {
    return authResult.response;
  }

  if (authResult.isAuthenticated) {
    return authResult.response;
  }

  const signInUrl = request.nextUrl.clone();
  signInUrl.pathname = "/sign-in";
  signInUrl.search = "";
  signInUrl.searchParams.set("next", `${pathname}${search}`);

  return copySupabaseAuthCookies(
    authResult.response,
    NextResponse.redirect(signInUrl),
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/auth/session|apple-icon|brand-mark.svg|favicon.ico|icon|manifest.webmanifest).*)",
  ],
};

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
