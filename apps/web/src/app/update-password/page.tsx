import Image from "next/image";
import { redirect } from "next/navigation";
import { updatePasswordAction } from "@/auth/actions";
import { getAuthProvider, isSupabaseAuthConfigured } from "@/auth/config";
import { requireAuthSession } from "@/auth/server";

type UpdatePasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  if (getAuthProvider() !== "supabase" || !isSupabaseAuthConfigured()) {
    redirect("/");
  }

  await requireAuthSession();
  const params = await searchParams;

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
        <h1 className="mt-5 text-3xl font-semibold">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-[#4b4657]">
          Use at least 8 characters. After the update, sign in again with the new
          password.
        </p>

        {params?.error ? (
          <div
            className="mt-5 rounded-md border border-[#8b2f39]/25 bg-[#fff4f2] p-3 text-sm leading-6 text-[#6f1f29]"
            role="alert"
          >
            The password could not be updated. Check that both values match and
            try the recovery link again if it has expired.
          </div>
        ) : null}

        <form action={updatePasswordAction} className="mt-6 flex flex-col gap-5">
          <div>
            <label className="text-sm font-semibold" htmlFor="newPassword">
              New password
            </label>
            <input
              autoComplete="new-password"
              className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
              id="newPassword"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </div>
          <div>
            <label
              className="text-sm font-semibold"
              htmlFor="passwordConfirmation"
            >
              Confirm new password
            </label>
            <input
              autoComplete="new-password"
              className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
              id="passwordConfirmation"
              minLength={8}
              name="passwordConfirmation"
              required
              type="password"
            />
          </div>
          <button
            className="min-h-11 rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
            type="submit"
          >
            Update password
          </button>
        </form>
      </section>
    </main>
  );
}
