import Image from "next/image";
import { redirect } from "next/navigation";
import { signInAction } from "@/auth/actions";
import { getSafeReturnPath } from "@/auth/session";
import { getAuthSession } from "@/auth/server";

type SignInPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const nextPath = getSafeReturnPath(params?.next);
  const session = await getAuthSession();

  if (session) {
    redirect(nextPath);
  }

  return (
    <main className="grid min-h-screen bg-[#f7f1e5] px-4 py-6 text-[#17161f] sm:px-6">
      <section className="mx-auto flex w-full max-w-5xl flex-col justify-center gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:items-center">
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
        </div>

        <form
          action={signInAction}
          className="w-full rounded-lg border border-[#17161f]/10 bg-white p-5 shadow-sm sm:p-6"
        >
          <input name="next" type="hidden" value={nextPath} />
          <div className="flex flex-col gap-5">
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
                id="displayName"
                name="displayName"
                required
                type="text"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#17161f]" htmlFor="email">
                Email
              </label>
              <input
                autoComplete="email"
                className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
                defaultValue="dm@local.test"
                id="email"
                name="email"
                required
                type="email"
              />
            </div>

            <button
              className="min-h-11 rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
              type="submit"
            >
              Sign in
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
