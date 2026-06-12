import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAuthConfig } from "@/auth/config";

export async function resolveSupabaseMiddlewareAuth(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getSupabaseAuthConfig();

  if (!config) {
    return {
      isAuthenticated: false,
      response,
    };
  }

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, options, value } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });
  const { data, error } = await supabase.auth.getClaims();

  return {
    isAuthenticated: !error && Boolean(data?.claims),
    response,
  };
}

export function copySupabaseAuthCookies(
  source: NextResponse,
  target: NextResponse,
) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }

  for (const headerName of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(headerName);

    if (value) {
      target.headers.set(headerName, value);
    }
  }

  return target;
}
