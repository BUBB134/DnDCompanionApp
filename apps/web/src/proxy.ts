import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import {
  getAuthProvider,
  isClerkAuthConfigured,
} from "@/auth/config";
import {
  AUTH_COOKIE_NAME,
  getSafeReturnPath,
  hasAuthSessionCookie,
} from "@/auth/session";

const PROTECTED_ROUTE_PREFIXES = ["/", "/campaigns", "/entities", "/rules", "/sessions"];

const managedAuthProxy = clerkMiddleware(async (auth, request) => {
  const { pathname, search } = request.nextUrl;
  const { userId } = await auth();
  const isAuthenticated = Boolean(userId);

  if (isAuthRoute(pathname)) {
    if (!isAuthenticated) {
      return NextResponse.next();
    }

    return NextResponse.redirect(
      new URL(
        getSafeReturnPath(request.nextUrl.searchParams.get("next")),
        request.url,
      ),
    );
  }

  if (!isProtectedRoute(pathname) || isAuthenticated) {
    return NextResponse.next();
  }

  return NextResponse.redirect(createSignInUrl(request, `${pathname}${search}`));
});

export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent,
) {
  if (getAuthProvider() === "clerk" && isClerkAuthConfigured()) {
    return managedAuthProxy(request, event);
  }

  return localAuthProxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/health|apple-icon|brand-mark.svg|favicon.ico|icon|manifest.webmanifest).*)",
  ],
};

async function localAuthProxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAuthenticated = await hasAuthSessionCookie(
    request.cookies.get(AUTH_COOKIE_NAME)?.value,
  );

  if (isAuthRoute(pathname)) {
    if (!isAuthenticated) {
      return NextResponse.next();
    }

    return NextResponse.redirect(
      new URL(
        getSafeReturnPath(request.nextUrl.searchParams.get("next")),
        request.url,
      ),
    );
  }

  if (!isProtectedRoute(pathname) || isAuthenticated) {
    return NextResponse.next();
  }

  return NextResponse.redirect(createSignInUrl(request, `${pathname}${search}`));
}

function createSignInUrl(request: NextRequest, nextPath: string) {
  const signInUrl = request.nextUrl.clone();
  signInUrl.pathname = "/sign-in";
  signInUrl.search = "";
  signInUrl.searchParams.set("next", nextPath);

  return signInUrl;
}

function isAuthRoute(pathname: string) {
  return (
    pathname === "/sign-in" ||
    pathname.startsWith("/sign-in/") ||
    pathname === "/sign-up" ||
    pathname.startsWith("/sign-up/")
  );
}

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
