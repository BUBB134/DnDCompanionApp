import { EmptyState, StatusPill, Surface } from "@dnd/ui";
import type { Route } from "next";
import Link from "next/link";
import { getAuthSession } from "@/auth/server";
import { acceptCampaignInviteAction } from "@/campaigns/actions";
import { getCampaignInvite, type CampaignInviteLookup } from "@/campaigns/invites";

type CampaignInvitePageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    status?: string | string[];
  }>;
};

export default async function CampaignInvitePage({
  params,
  searchParams,
}: CampaignInvitePageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const forcedStatus = getForcedInviteStatus(query.status);
  let invite: CampaignInviteLookup | null = null;
  let loadError: string | null = null;

  if (forcedStatus) {
    return (
      <InvitePageFrame>
        <UnavailableInviteContent status={forcedStatus} />
      </InvitePageFrame>
    );
  }

  const session = await getAuthSession();

  try {
    invite = await getCampaignInvite(token);
  } catch (error) {
    console.error("Failed to load campaign invite.", error);
    loadError =
      "Invite details are temporarily unavailable. Try again shortly or ask the DM for a fresh link.";
  }

  if (loadError || !invite) {
    return (
      <InvitePageFrame>
        <EmptyState
          body={loadError ?? "The invite could not be loaded."}
          title="Invite details are unavailable"
        />
      </InvitePageFrame>
    );
  }

  return (
    <InvitePageFrame>
      {invite.status === "ready" ? (
        <ReadyInviteContent
          campaign={invite.campaign}
          invite={invite.invite}
          sessionName={session?.user.name}
          token={token}
        />
      ) : (
        <UnavailableInviteContent status={invite.status} />
      )}
    </InvitePageFrame>
  );
}

function ReadyInviteContent({
  campaign,
  invite,
  sessionName,
  token,
}: {
  campaign: {
    name: string;
    summary: string | null;
  };
  invite: {
    expiresAt: string;
  };
  sessionName?: string;
  token: string;
}) {
  return (
    <Surface className="p-5 sm:p-6">
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
            Campaign invite
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">
            Join {campaign.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4b4657]">
            {campaign.summary ||
              "Join this campaign table and start from the player-safe view."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusPill tone="teal">Player access</StatusPill>
          <StatusPill tone="gold">
            Expires {formatInviteDate(invite.expiresAt)}
          </StatusPill>
          {sessionName ? <StatusPill tone="red">{sessionName}</StatusPill> : null}
        </div>

        {sessionName ? (
          <form action={acceptCampaignInviteAction}>
            <input name="token" type="hidden" value={token} />
            <button
              className="min-h-11 rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
              type="submit"
            >
              Join campaign
            </button>
          </form>
        ) : (
          <Link
            className="inline-flex min-h-11 items-center rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
            href={getInviteSignInHref(token)}
          >
            Sign in to join
          </Link>
        )}
      </div>
    </Surface>
  );
}

function UnavailableInviteContent({
  status,
}: {
  status: "expired" | "invalid" | "revoked" | "unavailable";
}) {
  const copy = {
    expired: {
      body: "Ask the DM for a fresh invite link before joining this campaign.",
      title: "This invite link has expired",
    },
    invalid: {
      body: "The invite link does not match an active campaign invite.",
      title: "This invite link is not valid",
    },
    revoked: {
      body: "The DM has revoked this invite link. Ask for a new one to join.",
      title: "This invite link was revoked",
    },
    unavailable: {
      body: "The invite could not be processed right now. Try again shortly or ask the DM for a fresh link.",
      title: "Invite details are temporarily unavailable",
    },
  }[status];

  return (
    <Surface className="p-5 sm:p-6">
      <div className="grid gap-5">
        <EmptyState body={copy.body} title={copy.title} />
        <Link
          className="inline-flex min-h-11 w-fit items-center rounded-md border border-[#17161f]/15 bg-white px-4 py-2 text-sm font-semibold transition hover:border-[#1f6f78] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
          href="/campaigns"
        >
          Back to campaigns
        </Link>
      </div>
    </Surface>
  );
}

function InvitePageFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f1e5] p-4 text-[#17161f] sm:p-6">
      <div className="w-full max-w-2xl">{children}</div>
    </main>
  );
}

function formatInviteDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getInviteSignInHref(token: string): Route {
  return `/sign-in?next=${encodeURIComponent(`/invite/${token}`)}` as Route;
}

function getForcedInviteStatus(status: string | string[] | undefined) {
  return status === "unavailable" ? status : null;
}
