import type { Route } from "next";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { arcaneClerkAppearance } from "@/auth/appearance";
import {
  getAuthAppBaseUrl,
  getAuthProvider,
  isClerkAuthConfigured,
} from "@/auth/config";
import { redirectToProtectedPath } from "@/auth/redirect";
import { getSafeReturnPath } from "@/auth/session";
import { getAuthSession } from "@/auth/server";
import { AuthPageFrame } from "@/components/auth-page-frame";

type SignUpPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const nextPath = getSafeReturnPath(params?.next);
  const session = await getAuthSession();

  if (session) {
    redirectToProtectedPath(nextPath);
  }

  const signInHref = `/sign-in?${new URLSearchParams({
    next: nextPath,
  })}` as Route;

  if (getAuthProvider() !== "clerk") {
    return (
      <AuthPageFrame
        lead="Local contributor mode does not create external accounts."
        title="Create an account"
      >
        <section className="rounded-xl border border-[#4d4635] bg-[#1e2022] p-5 text-sm leading-6 text-[#d0c5af] shadow-[0_28px_80px_rgba(10,11,15,0.38)] sm:p-6">
          <h2 className="font-brand-display text-2xl font-semibold text-[#f2e0c3]">
            Account creation uses Clerk
          </h2>
          <p className="mt-3">
            Switch AUTH_PROVIDER to clerk when testing real sign-up. For local
            contributor access, use the deterministic sign-in identities.
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center rounded-md bg-[#d4af37] px-4 py-2 text-sm font-bold text-[#3c2f00] transition hover:bg-[#e9c349] focus:outline-none focus:ring-2 focus:ring-[#e9c349] focus:ring-offset-2 focus:ring-offset-[#1e2022]"
            href={signInHref}
          >
            Back to sign in
          </Link>
        </section>
      </AuthPageFrame>
    );
  }

  const signInUrl = signInHref;
  const appBaseUrl = getAuthAppBaseUrl();

  return (
    <AuthPageFrame
      lead="Create a secure campaign identity for invites, shared notes, and first-session readiness."
      title="Create your campaign account"
    >
      {!isClerkAuthConfigured() ? (
        <div
          className="rounded-md border border-[#ffb4ab]/30 bg-[#2a1719] p-3 text-sm leading-6 text-[#ffdad6]"
          role="alert"
        >
          Account creation is unavailable until Clerk is configured. Current app
          base URL: {appBaseUrl ?? "missing"}.
        </div>
      ) : (
        <div data-auth-provider="clerk">
          <SignUp
            appearance={arcaneClerkAppearance}
            fallbackRedirectUrl={nextPath}
            forceRedirectUrl={nextPath}
            path="/sign-up"
            routing="path"
            signInFallbackRedirectUrl={nextPath}
            signInForceRedirectUrl={nextPath}
            signInUrl={signInUrl}
          />
        </div>
      )}
    </AuthPageFrame>
  );
}
