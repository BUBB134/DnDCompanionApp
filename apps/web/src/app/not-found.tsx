import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f1e5] p-6 text-[#17161f]">
      <section className="w-full max-w-md rounded-lg border border-[#17161f]/15 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#1f6f78]">
          Not found
        </p>
        <h1 className="mt-3 text-2xl font-semibold">This campaign page is not available.</h1>
        <p className="mt-3 text-sm text-[#4b4657]">
          The route exists as a bootstrap fallback until campaign routing lands.
        </p>
        <Link
          className="mt-5 inline-flex rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
          href="/"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}

