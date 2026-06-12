import Image from "next/image";
import Link from "next/link";
import { signInAction, signUpAction } from "@/auth/actions";
import {
  getAuthProvider,
  isSupabaseAuthConfigured,
} from "@/auth/config";
import { redirectToProtectedPath } from "@/auth/redirect";
import {
  canCreateAuthSessionToken,
  getSafeReturnPath,
} from "@/auth/session";
import { getAuthSession } from "@/auth/server";

type SignInPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  callback: "That authentication link is invalid or has expired. Request a new one.",
  configuration:
    "Sign-in is temporarily unavailable while deployment configuration is completed.",
  "invalid-credentials": "The email or password was not accepted.",
  "sign-up":
    "The account could not be created. Check the details and use a password with at least 8 characters.",
};

const statusMessages: Record<string, string> = {
  "check-email":
    "Check your email to confirm the account, then return here to sign in.",
  "password-updated": "Password updated. Sign in with the new password.",
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const nextPath = getSafeReturnPath(params?.next);
  const authProvider = getAuthProvider();
  const isManagedAuth = authProvider === "supabase";
  const canAuthenticate = isManagedAuth
    ? isSupabaseAuthConfigured()
    : canCreateAuthSessionToken();
  const session = await getAuthSession();

  if (session) {
    redirectToProtectedPath(nextPath);
  }

  const errorMessage =
    (params?.error && errorMessages[params.error]) ||
    (!canAuthenticate ? errorMessages.configuration : null);
  const statusMessage =
    params?.message && statusMessages[params.message]
      ? statusMessages[params.message]
      : null;

  return (
    <main className="grid min-h-screen bg-[#f7f1e5] px-4 py-6 text-[#17161f] sm:px-6">
      <section className="mx-auto flex w-full max-w-5xl flex-col justify-center gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:items-center">
        <div className="max-w-2xl">
          <Image
            alt=""
            className="h-16 w-16 rounded-lg"
            height={128}
            priority
            src="/brand-mark.svg"
            width={128}
          />
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
            D&D Companion
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
            Sign in to your campaign table
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#4b4657]">
            Resume the shared notes, recaps, and table tools your group keeps close
            during play.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#4b4657]">
            {isManagedAuth
              ? "Create a real account for campaign invitations and access across devices."
              : "Local bootstrap mode: use dm@local.test for the DM view or player@local.test for the player-safe view."}
          </p>
        </div>

        <div className="flex w-full flex-col gap-4">
          {errorMessage ? (
            <div
              className="rounded-md border border-[#8b2f39]/25 bg-[#fff4f2] p-3 text-sm leading-6 text-[#6f1f29]"
              role="alert"
            >
              {errorMessage}
            </div>
          ) : null}
          {statusMessage ? (
            <div
              className="rounded-md border border-[#1f6f78]/25 bg-[#edf9f8] p-3 text-sm leading-6 text-[#14545b]"
              role="status"
            >
              {statusMessage}
            </div>
          ) : null}

          <form
            action={signInAction}
            className="w-full rounded-lg border border-[#17161f]/10 bg-white p-5 shadow-sm sm:p-6"
          >
            <input name="next" type="hidden" value={nextPath} />
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-semibold">Sign in</h2>
                <p className="mt-1 text-sm leading-6 text-[#4b4657]">
                  {isManagedAuth
                    ? "Use the email and password connected to your account."
                    : "Choose the local test identity to use for this browser."}
                </p>
              </div>

              {!isManagedAuth ? (
                <div>
                  <label
                    className="text-sm font-semibold text-[#17161f]"
                    htmlFor="displayName"
                  >
                    Display name
                  </label>
                  <input
                    autoComplete="name"
                    className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
                    defaultValue="Local DM"
                    disabled={!canAuthenticate}
                    id="displayName"
                    name="displayName"
                    required
                    type="text"
                  />
                </div>
              ) : null}

              <div>
                <label className="text-sm font-semibold text-[#17161f]" htmlFor="email">
                  Email
                </label>
                <input
                  autoComplete="email"
                  className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
                  defaultValue={isManagedAuth ? undefined : "dm@local.test"}
                  disabled={!canAuthenticate}
                  id="email"
                  name="email"
                  required
                  type="email"
                />
              </div>

              {isManagedAuth ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label
                      className="text-sm font-semibold text-[#17161f]"
                      htmlFor="password"
                    >
                      Password
                    </label>
                    <Link
                      className="text-sm font-semibold text-[#8b2f39] underline-offset-4 hover:underline"
                      href="/forgot-password"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    autoComplete="current-password"
                    className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
                    disabled={!canAuthenticate}
                    id="password"
                    name="password"
                    required
                    type="password"
                  />
                </div>
              ) : null}

              <button
                className="min-h-11 rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#6d6878]"
                disabled={!canAuthenticate}
                type="submit"
              >
                Sign in
              </button>
            </div>
          </form>

          {isManagedAuth ? (
            <form
              action={signUpAction}
              className="w-full rounded-lg border border-[#17161f]/10 bg-white p-5 shadow-sm sm:p-6"
            >
              <input name="next" type="hidden" value={nextPath} />
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-xl font-semibold">Create account</h2>
                  <p className="mt-1 text-sm leading-6 text-[#4b4657]">
                    New to the table? Create an account before opening an invite.
                  </p>
                </div>

                <div>
                  <label
                    className="text-sm font-semibold text-[#17161f]"
                    htmlFor="signUpDisplayName"
                  >
                    Display name
                  </label>
                  <input
                    autoComplete="name"
                    className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
                    disabled={!canAuthenticate}
                    id="signUpDisplayName"
                    maxLength={80}
                    name="displayName"
                    required
                    type="text"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-semibold text-[#17161f]"
                    htmlFor="signUpEmail"
                  >
                    Email
                  </label>
                  <input
                    autoComplete="email"
                    className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
                    disabled={!canAuthenticate}
                    id="signUpEmail"
                    name="email"
                    required
                    type="email"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-semibold text-[#17161f]"
                    htmlFor="signUpPassword"
                  >
                    Password
                  </label>
                  <input
                    autoComplete="new-password"
                    className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
                    disabled={!canAuthenticate}
                    id="signUpPassword"
                    minLength={8}
                    name="password"
                    required
                    type="password"
                  />
                </div>

                <button
                  className="min-h-11 rounded-md border border-[#17161f]/15 bg-white px-4 py-2 text-sm font-semibold text-[#17161f] transition hover:border-[#1f6f78] hover:bg-[#edf9f8] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2 disabled:cursor-not-allowed disabled:text-[#6d6878]"
                  disabled={!canAuthenticate}
                  type="submit"
                >
                  Create account
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
}
