import { SignIn } from "@clerk/nextjs";
import { signInAction } from "@/auth/actions";
import { arcaneClerkAppearance } from "@/auth/appearance";
import {
  getAuthAppBaseUrl,
  getAuthProvider,
  isClerkAuthConfigured,
} from "@/auth/config";
import { redirectToProtectedPath } from "@/auth/redirect";
import {
  canCreateAuthSessionToken,
  getSafeReturnPath,
} from "@/auth/session";
import { getAuthSession } from "@/auth/server";
import { AuthPageFrame } from "@/components/auth-page-frame";

type SignInPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  configuration:
    "Sign-in is temporarily unavailable while deployment configuration is completed.",
  "local-disabled":
    "Local sign-in is unavailable because AUTH_SESSION_SECRET is not configured for this environment.",
} as const;

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const nextPath = getSafeReturnPath(params?.next);
  const authProvider = getAuthProvider();
  const isManagedAuth = authProvider === "clerk";
  const canAuthenticate = isManagedAuth
    ? isClerkAuthConfigured()
    : canCreateAuthSessionToken();
  const session = await getAuthSession();

  if (session) {
    redirectToProtectedPath(nextPath);
  }

  const errorMessage = isManagedAuth
    ? (params?.error && errorMessages[params.error]) ||
      (!canAuthenticate ? errorMessages.configuration : null)
    : (params?.error && errorMessages[params.error]) ||
      (!canAuthenticate ? errorMessages["local-disabled"] : null);
  const signUpUrl = `/sign-up?${new URLSearchParams({ next: nextPath })}`;
  const appBaseUrl = getAuthAppBaseUrl();

  return (
    <AuthPageFrame
      lead="Create a secure account, follow campaign invites, and return to the right table surface without losing context."
      title="Sign in to your campaign table"
    >
      {errorMessage ? <AuthAlert message={errorMessage} /> : null}
      {isManagedAuth ? (
        canAuthenticate ? (
          <div data-auth-provider="clerk">
            <SignIn
              appearance={arcaneClerkAppearance}
              fallbackRedirectUrl={nextPath}
              forceRedirectUrl={nextPath}
              path="/sign-in"
              routing="path"
              signUpFallbackRedirectUrl={nextPath}
              signUpForceRedirectUrl={nextPath}
              signUpUrl={signUpUrl}
            />
          </div>
        ) : (
          <ConfigurationCard appBaseUrl={appBaseUrl} />
        )
      ) : (
        <LocalSignInForm canAuthenticate={canAuthenticate} nextPath={nextPath} />
      )}
    </AuthPageFrame>
  );
}

function LocalSignInForm({
  canAuthenticate,
  nextPath,
}: {
  canAuthenticate: boolean;
  nextPath: ReturnType<typeof getSafeReturnPath>;
}) {
  return (
    <form
      action={signInAction}
      className="w-full rounded-xl border border-[#4d4635] bg-[#1e2022] p-5 shadow-[0_28px_80px_rgba(10,11,15,0.38)] sm:p-6"
    >
      <input name="next" type="hidden" value={nextPath} />
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="font-[family-name:var(--font-auth-display)] text-2xl font-semibold text-[#f2e0c3]">
            Local contributor sign-in
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#d0c5af]">
            Use dm@local.test for the DM view or player@local.test for the
            player-safe view.
          </p>
        </div>

        <div>
          <label className="text-sm font-semibold text-[#e2e2e5]" htmlFor="displayName">
            Display name
          </label>
          <input
            autoComplete="name"
            className="mt-2 min-h-11 w-full rounded-md border border-[#4d4635] bg-[#0c0e10] px-3 text-base text-[#e2e2e5] outline-none transition placeholder:text-[#d0c5af]/50 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/25"
            defaultValue="Local DM"
            disabled={!canAuthenticate}
            id="displayName"
            name="displayName"
            required
            type="text"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-[#e2e2e5]" htmlFor="email">
            Email
          </label>
          <input
            autoComplete="email"
            className="mt-2 min-h-11 w-full rounded-md border border-[#4d4635] bg-[#0c0e10] px-3 text-base text-[#e2e2e5] outline-none transition placeholder:text-[#d0c5af]/50 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/25"
            defaultValue="dm@local.test"
            disabled={!canAuthenticate}
            id="email"
            name="email"
            required
            type="email"
          />
        </div>

        <button
          className="min-h-11 rounded-md bg-[#d4af37] px-4 py-2 text-sm font-bold text-[#3c2f00] transition hover:bg-[#e9c349] focus:outline-none focus:ring-2 focus:ring-[#e9c349] focus:ring-offset-2 focus:ring-offset-[#1e2022] disabled:cursor-not-allowed disabled:bg-[#534832] disabled:text-[#c6b69b]"
          disabled={!canAuthenticate}
          type="submit"
        >
          Sign in
        </button>
      </div>
    </form>
  );
}

function ConfigurationCard({ appBaseUrl }: { appBaseUrl: string | null }) {
  return (
    <section className="rounded-xl border border-[#4d4635] bg-[#1e2022] p-5 text-sm leading-6 text-[#d0c5af] shadow-[0_28px_80px_rgba(10,11,15,0.38)] sm:p-6">
      <h2 className="font-[family-name:var(--font-auth-display)] text-2xl font-semibold text-[#f2e0c3]">
        Clerk is not configured yet
      </h2>
      <p className="mt-3">
        Set AUTH_PROVIDER=clerk, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        CLERK_SECRET_KEY, and APP_BASE_URL before enabling real account access.
      </p>
      <p className="mt-3">
        Current app base URL:{" "}
        <span className="font-semibold text-[#e2e2e5]">
          {appBaseUrl ?? "missing"}
        </span>
      </p>
    </section>
  );
}

function AuthAlert({ message }: { message: string }) {
  return (
    <div
      className="rounded-md border border-[#ffb4ab]/30 bg-[#2a1719] p-3 text-sm leading-6 text-[#ffdad6]"
      role="alert"
    >
      {message}
    </div>
  );
}
