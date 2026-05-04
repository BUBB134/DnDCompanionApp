import { EmptyState, Surface } from "@dnd/ui";

export function CampaignAccessState() {
  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
          Campaign access
        </p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight">
          You are signed in, but this user is not a campaign member.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4b4657]">
          Campaign-scoped screens stay locked until the signed-in user has a local
          campaign membership with either DM or player access.
        </p>
      </section>

      <Surface className="p-5">
        <EmptyState
          body="Use dm@local.test for DM access, player@local.test for player-safe access, or update the local bootstrap membership data to exercise a different user."
          title="No campaign membership"
        />
      </Surface>
    </div>
  );
}
