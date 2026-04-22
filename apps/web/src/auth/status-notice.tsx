"use client";

import { useAuth } from "@/auth/provider";

export function AuthStatusNotice() {
  const { error, refreshSession, status } = useAuth();

  if (status === "loading") {
    return (
      <p
        className="rounded-md border border-[#1f6f78]/25 bg-[#e7f5f6] px-3 py-2 text-sm font-semibold text-[#164f56]"
        role="status"
      >
        Checking session
      </p>
    );
  }

  if (status === "error") {
    return (
      <div
        className="flex flex-col gap-2 rounded-md border border-[#8b2f39]/25 bg-[#f9e8ea] px-3 py-2 text-sm text-[#6f2430] sm:flex-row sm:items-center"
        role="alert"
      >
        <span className="font-semibold">{error}</span>
        <button
          className="rounded-md border border-[#8b2f39]/35 bg-white px-2.5 py-1 font-semibold transition hover:border-[#8b2f39] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
          onClick={() => {
            void refreshSession();
          }}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}
