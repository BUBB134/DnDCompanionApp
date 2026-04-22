import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getSafeReturnPath,
  hasAuthSessionCookie,
} from "@/auth/session";

const PROTECTED_ROUTE_PREFIXES = ["/", "/campaigns", "/entities", "/rules", "/sessions"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAuthenticated = hasAuthSessionCookie(
    request.cookies.get(AUTH_COOKIE_NAME)?.value,
  );

  if (pathname === "/sign-in") {
    if (!isAuthenticated) {
      return NextResponse.next();
    }

    return NextResponse.redirect(
      new URL(getSafeReturnPath(request.nextUrl.searchParams.get("next")), request.url),
    );
  }

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  if (isAuthenticated) {
    return NextResponse.next();
  }

  const signInUrl = request.nextUrl.clone();
  signInUrl.pathname = "/sign-in";
  signInUrl.search = "";
  signInUrl.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/auth/session|brand-mark.svg|favicon.ico).*)"],
};

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
