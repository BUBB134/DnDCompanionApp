import type { Route } from "next";
import { redirect } from "next/navigation";
import type { ProtectedReturnPath } from "@/auth/session";

export function redirectToProtectedPath(path: ProtectedReturnPath): never {
  redirect(path as Route);
}
