import Image from "next/image";
import Link from "next/link";
import { requestPasswordResetAction } from "@/auth/actions";
import {
  getAuthProvider,
  isSupabaseAuthConfigured,
} from "@/auth/config";

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;
  const canRecover =
    getAuthProvider() === "supabase" && isSupabaseAuthConfigured();
  const showError = params?.error || !canRecover;
  const showSuccess = params?.message === "recovery-sent";

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f1e5] px-4 py-6 text-[#17161f] sm:px-6">
      <section className="w-full max-w-md rounded-lg border border-[#17161f]/10 bg-white p-5 shadow-sm sm:p-6">
        <Image
          alt=""
          className="h-12 w-12 rounded-lg"
          height={96}
          priority
          src="/brand-mark.svg"
          width={96}
        />
        <h1 className="mt-5 text-3xl font-semibold">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-[#4b4657]">
          Enter the account email. For privacy, the response is the same whether
          or not the address is registered.
        </p>

        {showError ? (
          <div
            className="mt-5 rounded-md border border-[#8b2f39]/25 bg-[#fff4f2] p-3 text-sm leading-6 text-[#6f1f29]"
            role="alert"
          >
            {canRecover
              ? "The recovery request could not be completed. Check the email and try again."
              : "Password recovery is unavailable in the current auth configuration."}
          </div>
        ) : null}
        {showSuccess ? (
          <div
            className="mt-5 rounded-md border border-[#1f6f78]/25 bg-[#edf9f8] p-3 text-sm leading-6 text-[#14545b]"
            role="status"
          >
            If the account exists, a password reset link is on its way.
          </div>
        ) : null}

        <form action={requestPasswordResetAction} className="mt-6">
          <label className="text-sm font-semibold" htmlFor="recoveryEmail">
            Email
          </label>
          <input
            autoComplete="email"
            className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
            disabled={!canRecover}
            id="recoveryEmail"
            name="email"
            required
            type="email"
          />
          <button
            className="mt-5 min-h-11 w-full rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#6d6878]"
            disabled={!canRecover}
            type="submit"
          >
            Send reset link
          </button>
        </form>

        <Link
          className="mt-5 inline-flex text-sm font-semibold text-[#8b2f39] underline-offset-4 hover:underline"
          href="/sign-in"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
