import type { Route } from "next";
import { redirect } from "next/navigation";
import type { ProtectedReturnPath } from "@/auth/session";

export function redirectToProtectedPath(path: ProtectedReturnPath): never {
  redirect(path as Route);
}

export function redirectToSignIn(
  state: {
    error?: string;
    message?: string;
    next?: ProtectedReturnPath;
  } = {},
): never {
  const searchParams = new URLSearchParams();

  if (state.error) {
    searchParams.set("error", state.error);
  }

  if (state.message) {
    searchParams.set("message", state.message);
  }

  if (state.next) {
    searchParams.set("next", state.next);
  }

  const queryString = searchParams.toString();

  redirect((queryString ? `/sign-in?${queryString}` : "/sign-in") as Route);
}
