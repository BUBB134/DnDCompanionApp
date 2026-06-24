"use client";

import { SignOutButton, UserButton } from "@clerk/nextjs";
import { arcaneClerkAppearance } from "@/auth/appearance";

export function ClerkAccountControls() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:flex-col xl:items-end">
      <UserButton
        appearance={arcaneClerkAppearance}
        showName
      />
      <SignOutButton redirectUrl="/sign-in">
        <button
          className="min-h-10 w-full rounded-md border border-[#17161f]/15 bg-white px-3 py-2 text-sm font-semibold transition hover:border-[#8b2f39] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2 sm:w-auto"
          type="button"
        >
          Sign out
        </button>
      </SignOutButton>
    </div>
  );
}
