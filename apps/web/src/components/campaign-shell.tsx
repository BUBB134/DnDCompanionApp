import type {
  Campaign,
  CampaignEntitySummary,
  CampaignInviteSummary,
  RuleSnippet,
  SessionSummary,
} from "@dnd/types";
import { isDungeonMaster } from "@dnd/types";
import { EmptyState, SectionHeading, StatusPill, Surface } from "@dnd/ui";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { openCampaignAction } from "@/campaigns/actions";
import { CampaignInvitePanel } from "@/components/campaign-invite-panel";
import { RuleCard } from "@/components/rule-card";

type CampaignShellProps = {
  campaign: Campaign;
  dmBrief?: string | null;
  entities: CampaignEntitySummary[];
  invite: CampaignInviteSummary | null;
  latestSession: SessionSummary | null;
  rules: RuleSnippet[];
};

type CampaignActionBase = {
  body: string;
  label: string;
  title: string;
};

type CampaignAction = CampaignActionBase &
  (
    | {
        destination: Route;
        href?: never;
      }
    | {
        destination?: never;
        href: Route;
      }
  );

const entityTypeLabels: Record<CampaignEntitySummary["type"], string> = {
  faction: "Faction",
  item: "Item",
  location: "Location",
  npc: "NPC",
  quest: "Quest",
};

export function CampaignShell({
  campaign,
  dmBrief,
  entities,
  invite,
  latestSession,
  rules,
}: CampaignShellProps) {
  const isDm = isDungeonMaster(campaign.role);
  const sessionHref = latestSession
    ? (`/sessions#session-${latestSession.id}` as Route)
    : "/sessions";
  const activeQuests = entities
    .filter((entity) => entity.type === "quest")
    .slice(0, 3);
  const recentEntities = entities
    .filter((entity) => entity.type !== "quest")
    .slice(0, 4);
  const campaignActions: readonly CampaignAction[] = [
    {
      body: latestSession
        ? "Return to the latest notes, recap, and unresolved hooks."
        : "Create the first session and start capturing the story.",
      destination: sessionHref,
      label: latestSession ? "Open latest session" : "Start first session",
      title: latestSession ? "Continue the story" : "Begin the story",
    },
    {
      body: "Open character profiles, abilities, spells, and at-table actions.",
      href: `/campaigns/${campaign.id}/characters` as Route,
      label: "View characters",
      title: "Know what you can do",
    },
    {
      body: "Find conditions and mechanics without breaking the flow of play.",
      destination: "/rules",
      label: "Search rules",
      title: "Resolve a rule quickly",
    },
    {
      body: "Grounded Ask is tracked by DND-15. Until that lands, start from visible campaign memory and rules sources.",
      destination: "/entities",
      label: "Gather Ask context",
      title: "Ask campaign context",
    },
    {
      body: "Recall the people, places, quests, factions, and items in this campaign.",
      destination: "/entities",
      label: "Browse campaign memory",
      title: "Remember the world",
    },
  ];

  return (
    <div className="grid gap-5">
      <Surface className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" tone="paper">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-arcane-oxblood">
            Active campaign
          </p>
          <h2 className="font-brand-display mt-1 text-2xl font-semibold leading-tight">{campaign.name}</h2>
          {campaign.summary ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-arcane-muted">
              {campaign.summary}
            </p>
          ) : null}
          {campaign.setup ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill tone="teal">{campaign.setup.ruleset}</StatusPill>
              {campaign.setup.tone ? (
                <StatusPill tone="gold">{campaign.setup.tone}</StatusPill>
              ) : null}
              {campaign.setup.startingLocation ? (
                <StatusPill tone="red">{campaign.setup.startingLocation}</StatusPill>
              ) : null}
            </div>
          ) : null}
        </div>
        <StatusPill tone="teal">Role: {campaign.role.toUpperCase()}</StatusPill>
      </Surface>

      <Surface className="overflow-hidden p-5 sm:p-6">
        <SectionHeading
          body="Move from campaign context to notes, characters, rules, and memory in one tap."
          eyebrow="Table shortcuts"
          title="What do you need right now?"
        >
          <p className="text-sm font-medium text-arcane-subtle">
            Campaign → session → notes → memory
          </p>
        </SectionHeading>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {campaignActions.map((action) => (
            <CampaignShortcut
              action={action}
              campaignId={campaign.id}
              key={action.title}
            />
          ))}
        </div>
      </Surface>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <Surface className="min-h-[360px] p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            {latestSession ? (
              <>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#1f6f78]">
                    Latest session
                  </p>
                  <h2 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
                    {latestSession.title}
                  </h2>
                  {latestSession.recap ? (
                    <p className="max-w-3xl text-base leading-7 text-[#4b4657]">
                      {latestSession.recap}
                    </p>
                  ) : (
                    <div className="max-w-3xl">
                      <EmptyState
                        body="Open the session log to generate a player-safe recap from the saved notes."
                        title="No recap generated"
                      >
                        <CampaignContextButton
                          campaignId={campaign.id}
                          className="inline-flex min-h-10 items-center rounded-md bg-[#17161f] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
                          destination={sessionHref}
                        >
                          Open session notes
                        </CampaignContextButton>
                      </EmptyState>
                    </div>
                  )}
                  {latestSession.recapGrounding.length > 0 ? (
                    <p className="text-sm font-medium text-[#1f6f78]">
                      Grounded in {latestSession.recapGrounding.length} saved{" "}
                      {latestSession.recapGrounding.length === 1
                        ? "source"
                        : "sources"}
                      .
                    </p>
                  ) : null}
                </div>

                {latestSession.unresolvedHooks.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {latestSession.unresolvedHooks.map((hook, hookIndex) => (
                      <div
                        className="rounded-lg border border-[#c3943e]/45 bg-[#fffaf0] p-4"
                        key={`${latestSession.id}-hook-${hookIndex}`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#8b2f39]">
                          Open hook
                        </p>
                        <p className="mt-2 text-sm font-medium">{hook}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    body="The latest recap has no unresolved hooks yet."
                    title="No open hooks"
                  />
                )}

                {latestSession.taggedEntities.length > 0 ? (
                  <div className="rounded-lg border border-[#1f6f78]/20 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#1f6f78]">
                      Mentioned entities
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {latestSession.taggedEntities.map((entity) => (
                        <StatusPill
                          key={`${latestSession.id}-entity-${entity.id}`}
                          tone={entity.visibility === "dm-only" ? "red" : "teal"}
                        >
                          {entity.name}
                        </StatusPill>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState
                body="Create the first session to capture notes, decisions, and open hooks. The dashboard will bring the latest story back here automatically."
                title="The first session is ready when you are"
              >
                <CampaignContextButton
                  campaignId={campaign.id}
                  className="inline-flex min-h-11 items-center rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
                  destination="/sessions"
                >
                  Start first session
                </CampaignContextButton>
              </EmptyState>
            )}

            {dmBrief ? (
              <div className="rounded-lg border border-[#8b2f39]/25 bg-[#f9e8ea] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8b2f39]">
                  DM brief
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4b4657]">{dmBrief}</p>
              </div>
            ) : null}

            {!isDm ? (
              <div className="rounded-lg border border-[#1f6f78]/25 bg-[#e7f5f6] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#1f6f78]">
                  Player-safe dashboard
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4b4657]">
                  DM-only briefs, hidden entities, and private prep stay out of this
                  campaign view.
                </p>
              </div>
            ) : null}

            {isDm && campaign.setup ? (
              <div className="rounded-lg border border-[#1f6f78]/25 bg-[#e7f5f6] p-4">
                <p className="text-xs font-semibold uppercase text-[#1f6f78]">
                  Setup context
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <SetupDetail label="Ruleset" value={campaign.setup.ruleset} />
                  <SetupDetail label="Tone" value={campaign.setup.tone} />
                  <SetupDetail
                    label="Opening"
                    value={campaign.setup.startingLocation}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </Surface>

        <div className="grid gap-5">
          <Surface className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Active quests</h2>
              <StatusPill tone="gold">{activeQuests.length} visible</StatusPill>
            </div>
            <div className="mt-4 grid gap-3">
              {activeQuests.length === 0 ? (
                <EmptyState
                  body="Create quest entities or tag quest hooks in session notes so the dashboard can surface what the table is pursuing."
                  title="No active quests yet"
                >
                  <CampaignContextButton
                    campaignId={campaign.id}
                    className="inline-flex min-h-10 items-center rounded-md border border-[#1f6f78]/30 bg-white px-3 py-2 text-sm font-semibold text-[#164f56] transition hover:bg-[#e7f5f6] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
                    destination="/entities"
                  >
                    Add a quest
                  </CampaignContextButton>
                </EmptyState>
              ) : (
                activeQuests.map((quest) => (
                  <CampaignEntityCard entity={quest} key={quest.id} />
                ))
              )}
            </div>
          </Surface>

          <Surface className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Recent entities</h2>
              <StatusPill tone="teal">{recentEntities.length} visible</StatusPill>
            </div>
            <div className="mt-4 grid gap-3">
              {recentEntities.length === 0 ? (
                <EmptyState
                  body="NPCs, locations, factions, and items will appear here after campaign memory is added or linked from notes."
                  title="No recent entities yet"
                >
                  <CampaignContextButton
                    campaignId={campaign.id}
                    className="inline-flex min-h-10 items-center rounded-md border border-[#1f6f78]/30 bg-white px-3 py-2 text-sm font-semibold text-[#164f56] transition hover:bg-[#e7f5f6] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
                    destination="/entities"
                  >
                    Add campaign memory
                  </CampaignContextButton>
                </EmptyState>
              ) : (
                recentEntities.map((entity) => (
                  <CampaignEntityCard entity={entity} key={entity.id} />
                ))
              )}
            </div>
          </Surface>

          {isDm ? (
            <Surface className="p-5">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b2f39]">
                  Bring players in
                </p>
                <h2 className="mt-1 text-lg font-semibold">Campaign invite</h2>
              </div>
              <CampaignInvitePanel
                activeInvite={invite}
                campaignId={campaign.id}
              />
            </Surface>
          ) : null}

          <Surface className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Rules surfaced</h2>
              <StatusPill tone="red">{rules.length} ready</StatusPill>
            </div>
            <div className="mt-4 grid gap-3">
              {rules.length === 0 ? (
                <EmptyState
                  body="Rules and abilities will appear here once session notes mention tracked conditions or mechanics."
                  title="No rules surfaced"
                >
                  <CampaignContextButton
                    campaignId={campaign.id}
                    className="inline-flex min-h-10 items-center rounded-md border border-[#1f6f78]/30 bg-white px-3 py-2 text-sm font-semibold text-[#164f56] transition hover:bg-[#e7f5f6] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
                    destination="/rules"
                  >
                    Search rules
                  </CampaignContextButton>
                </EmptyState>
              ) : (
                rules.map((rule) => <RuleCard key={rule.id} rule={rule} />)
              )}
            </div>
          </Surface>
        </div>
      </section>
    </div>
  );
}

const campaignShortcutClasses =
  "group flex min-h-44 w-full flex-col rounded-xl border border-[#17161f]/10 bg-[#fffaf0] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#1f6f78]/45 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2";

function CampaignShortcut({
  action,
  campaignId,
}: {
  action: CampaignAction;
  campaignId: string;
}) {
  const content = <CampaignShortcutContent action={action} />;

  if (action.href) {
    return (
      <Link className={campaignShortcutClasses} href={action.href}>
        {content}
      </Link>
    );
  }

  return (
    <form action={openCampaignAction} className="h-full">
      <input name="campaignId" type="hidden" value={campaignId} />
      <input name="destination" type="hidden" value={action.destination} />
      <button className={campaignShortcutClasses} type="submit">
        {content}
      </button>
    </form>
  );
}

function CampaignShortcutContent({ action }: { action: CampaignAction }) {
  return (
    <>
      <span className="flex w-full items-start justify-between gap-3">
        <span className="font-semibold leading-6">{action.title}</span>
        <span
          aria-hidden="true"
          className="text-lg text-[#1f6f78] transition group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
      <span className="mt-2 flex-1 text-sm leading-6 text-[#4b4657]">
        {action.body}
      </span>
      <span className="mt-4 text-sm font-semibold text-[#164f56]">
        {action.label}
      </span>
    </>
  );
}

function CampaignEntityCard({ entity }: { entity: CampaignEntitySummary }) {
  return (
    <article
      className="rounded-lg border border-[#17161f]/10 bg-[#fffaf0] p-4"
      id={`entity-${entity.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{entity.name}</h3>
        <StatusPill tone="teal">{entityTypeLabels[entity.type]}</StatusPill>
        <StatusPill tone={entity.visibility === "dm-only" ? "red" : "gold"}>
          {entity.visibility === "dm-only" ? "DM only" : "Player safe"}
        </StatusPill>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#4b4657]">
        {entity.summary}
      </p>
    </article>
  );
}

function CampaignContextButton({
  campaignId,
  children,
  className,
  destination,
}: {
  campaignId: string;
  children: ReactNode;
  className: string;
  destination: Route;
}) {
  return (
    <form action={openCampaignAction}>
      <input name="campaignId" type="hidden" value={campaignId} />
      <input name="destination" type="hidden" value={destination} />
      <button className={className} type="submit">
        {children}
      </button>
    </form>
  );
}

function SetupDetail({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[#1f6f78]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[#17161f]">
        {value || "Not set yet"}
      </p>
    </div>
  );
}
