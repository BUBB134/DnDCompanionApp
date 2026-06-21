import { EmptyState, Surface } from "@dnd/ui";
import Link from "next/link";

export function CampaignAccessState() {
  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
          Welcome to the table
        </p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight">
          Choose a campaign to begin your first session.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4b4657]">
          DMs can create a new campaign in a few guided steps. Players can open the
          secure invite link shared by their DM, then return here with the right
          campaign context already selected.
        </p>
      </section>

      <Surface className="p-5">
        <EmptyState
          body="Create or open a campaign to unlock sessions, notes, characters, rules, and campaign memory."
          title="Your next adventure starts with a campaign"
        >
          <Link
            className="inline-flex min-h-11 items-center rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
            href="/campaigns"
          >
            Create or open a campaign
          </Link>
          <p className="self-center text-sm leading-6 text-[#625d6d]">
            Joining as a player? Open the invite link from your DM.
          </p>
        </EmptyState>
      </Surface>
    </div>
  );
}
