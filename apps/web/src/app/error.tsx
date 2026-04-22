"use client";

import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f1e5] p-6 text-[#17161f]">
      <section className="w-full max-w-md rounded-lg border border-[#17161f]/15 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
          Something went wrong
        </p>
        <h1 className="mt-3 text-2xl font-semibold">The campaign table failed to load.</h1>
        <p className="mt-3 text-sm text-[#4b4657]">
          Try again, and keep the error state visible for debugging during bootstrap work.
        </p>
        <button
          className="mt-5 rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
          onClick={reset}
          type="button"
        >
          Retry
        </button>
      </section>
    </main>
  );
}

