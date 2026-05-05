"use client";

import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProtectedError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="rounded-2xl border border-[#17161f]/15 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
        Something went wrong
      </p>
      <h2 className="mt-3 text-2xl font-semibold leading-tight">
        The campaign table could not finish loading.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4b4657]">
        Try again to reload the current screen while keeping the protected shell and
        navigation available.
      </p>
      <button
        className="mt-5 rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </section>
  );
}
