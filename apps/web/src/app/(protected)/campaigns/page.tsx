import type { Campaign } from "@dnd/types";
import { formatDatabaseError } from "@dnd/db";
import { EmptyState, StatusPill, Surface } from "@dnd/ui";
import { requireAuthSession } from "@/auth/server";
import { getActiveCampaignId } from "@/campaigns/active-campaign";
import { openCampaignAction } from "@/campaigns/actions";
import { listDatabaseCampaignsForUser } from "@/campaigns/repository";
import { CampaignCreateForm } from "@/components/campaign-create-form";

export default async function CampaignsPage() {
  const session = await requireAuthSession();
  const activeCampaignId = await getActiveCampaignId();
  let campaigns: Campaign[] = [];
  let loadError: string | null = null;

  try {
    campaigns = await listDatabaseCampaignsForUser(session.user.id);
  } catch (error) {
    loadError = formatDatabaseError(error);
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
          Campaigns
        </p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight">
          Create and open your campaigns
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4b4657]">
          This flow now uses the authenticated user plus Postgres-backed campaign and
          membership records. Creating a campaign makes you the DM and drops you into
          that campaign context right away.
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.95fr)]">
        <Surface className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Saved campaigns</h2>
              <p className="mt-1 text-sm leading-6 text-[#4b4657]">
                Campaigns you can open from the current signed-in user.
              </p>
            </div>
            <StatusPill tone="gold">{campaigns.length} total</StatusPill>
          </div>

          {loadError ? (
            <div className="mt-4 rounded-lg border border-[#8b2f39]/25 bg-[#f9e8ea] px-4 py-3 text-sm text-[#6f2430]">
              {loadError}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4">
            {campaigns.length === 0 ? (
              <EmptyState
                body="Create your first campaign to start storing real campaign records for this account."
                title="No saved campaigns yet"
              />
            ) : (
              campaigns.map((campaign) => (
                <article
                  className="rounded-lg border border-[#17161f]/10 bg-[#fffaf0] p-4"
                  key={campaign.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{campaign.name}</h3>
                        {activeCampaignId === campaign.id ? (
                          <StatusPill tone="teal">Current context</StatusPill>
                        ) : null}
                        <StatusPill tone={campaign.role === "dm" ? "red" : "gold"}>
                          {campaign.role.toUpperCase()}
                        </StatusPill>
                      </div>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b4657]">
                        {campaign.summary ||
                          "No summary yet. Start light and build the campaign in play."}
                      </p>
                    </div>

                    <form action={openCampaignAction} className="sm:shrink-0">
                      <input name="campaignId" type="hidden" value={campaign.id} />
                      <button
                        className="min-h-10 rounded-md border border-[#17161f]/15 bg-white px-3 py-2 text-sm font-semibold transition hover:border-[#1f6f78] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
                        type="submit"
                      >
                        Open campaign
                      </button>
                    </form>
                  </div>
                </article>
              ))
            )}
          </div>
        </Surface>

        <Surface className="p-5 sm:p-6">
          <CampaignCreateForm />
        </Surface>
      </div>
    </div>
  );
}
