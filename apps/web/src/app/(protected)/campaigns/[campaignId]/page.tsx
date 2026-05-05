import Link from "next/link";
import { formatDatabaseError } from "@dnd/db";
import { EmptyState, StatusPill, Surface } from "@dnd/ui";
import { notFound } from "next/navigation";
import { requireAuthSession } from "@/auth/server";
import { getDatabaseCampaignAccessForUser } from "@/campaigns/repository";

type CampaignDetailPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const session = await requireAuthSession();
  const { campaignId } = await params;
  let campaign: Awaited<ReturnType<typeof getDatabaseCampaignAccessForUser>> = null;
  let loadError: string | null = null;

  try {
    campaign = await getDatabaseCampaignAccessForUser(
      session.user.id,
      campaignId,
    );
  } catch (error) {
    loadError = formatDatabaseError(error);
  }

  if (loadError) {
    return (
      <Surface className="p-5">
        <EmptyState body={loadError} title="Campaign details are unavailable" />
      </Surface>
    );
  }

  if (!campaign) {
    notFound();
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
              Active campaign
            </p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight">{campaign.name}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b4657]">
              {campaign.summary ||
                "This campaign has been created and is ready for its first session, rules context, and wiki entities."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="teal">Current context</StatusPill>
            <StatusPill tone={campaign.role === "dm" ? "red" : "gold"}>
              {campaign.role.toUpperCase()}
            </StatusPill>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Surface className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Campaign status</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[#17161f]/10 bg-[#fffaf0] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1f6f78]">
                Membership
              </p>
              <p className="mt-2 text-sm leading-6 text-[#4b4657]">
                You are stored as the DM for this campaign and can now build on it from
                the rest of the protected app.
              </p>
            </div>
            <div className="rounded-lg border border-[#17161f]/10 bg-[#fffaf0] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1f6f78]">
                Persistence
              </p>
              <p className="mt-2 text-sm leading-6 text-[#4b4657]">
                This record lives in Postgres, so it is no longer limited to the local
                bootstrap demo state.
              </p>
            </div>
          </div>
        </Surface>

        <div className="grid gap-5">
          <Surface className="p-5">
            <h2 className="text-lg font-semibold">What&apos;s next</h2>
            <div className="mt-4 grid gap-3">
              <Link
                className="rounded-md border border-[#17161f]/10 bg-white px-3 py-2 text-sm font-semibold transition hover:border-[#1f6f78] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
                href="/"
              >
                Open dashboard
              </Link>
              <Link
                className="rounded-md border border-[#17161f]/10 bg-white px-3 py-2 text-sm font-semibold transition hover:border-[#1f6f78] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
                href="/sessions"
              >
                Visit sessions
              </Link>
              <Link
                className="rounded-md border border-[#17161f]/10 bg-white px-3 py-2 text-sm font-semibold transition hover:border-[#1f6f78] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
                href="/entities"
              >
                Visit entities
              </Link>
            </div>
          </Surface>

          <Surface className="p-5">
            <EmptyState
              body="Advanced setup, invitations, and the first-session flow stay intentionally out of scope for this ticket."
              title="Next steps stay narrow"
            />
          </Surface>
        </div>
      </div>
    </div>
  );
}
