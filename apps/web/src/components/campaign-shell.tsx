import type {
  Campaign,
  CampaignEntitySummary,
  RuleSnippet,
  SessionSummary,
  Visibility,
} from "@dnd/types";
import { canAccessVisibility, isDungeonMaster } from "@dnd/types";
import { EmptyState, StatusPill, Surface } from "@dnd/ui";
import Link from "next/link";

type CampaignShellProps = {
  campaign: Campaign;
  dmBrief?: string | null;
  entities: CampaignEntitySummary[];
  latestSession: SessionSummary | null;
  rules: RuleSnippet[];
};

type CampaignAction = {
  body: string;
  title: string;
  visibility: Visibility;
};

const entityTypeLabels: Record<CampaignEntitySummary["type"], string> = {
  faction: "Faction",
  item: "Item",
  location: "Location",
  npc: "NPC",
  quest: "Quest",
};

const campaignActions: readonly CampaignAction[] = [
  {
    body: "Capture notes and unresolved hooks when the session workflow is ready.",
    title: "Log latest session",
    visibility: "player-safe",
  },
  {
    body: "Review known NPCs, locations, factions, quests, and items from campaign memory.",
    title: "Review entities",
    visibility: "player-safe",
  },
  {
    body: "Keep prep, secrets, and private recap notes separated from the player-safe view.",
    title: "Prepare DM notes",
    visibility: "dm-only",
  },
] as const;

export function CampaignShell({
  campaign,
  dmBrief,
  entities,
  latestSession,
  rules,
}: CampaignShellProps) {
  const isDm = isDungeonMaster(campaign.role);
  const visibleActions = campaignActions.filter((action) =>
    canAccessVisibility(campaign.role, action.visibility),
  );

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-4 rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
            Active campaign
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight">{campaign.name}</h2>
          {campaign.summary ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b4657]">
              {campaign.summary}
            </p>
          ) : null}
        </div>
        <StatusPill tone="teal">Role: {campaign.role.toUpperCase()}</StatusPill>
      </section>

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
                  <p className="max-w-3xl text-base leading-7 text-[#4b4657]">
                    {latestSession.recap}
                  </p>
                </div>

                {latestSession.unresolvedHooks.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {latestSession.unresolvedHooks.map((hook) => (
                      <div
                        className="rounded-lg border border-[#c3943e]/45 bg-[#fffaf0] p-4"
                        key={hook}
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
              </>
            ) : (
              <EmptyState
                body="This campaign is ready for its first session. Once sessions are added, the dashboard will surface the latest recap and unresolved hooks here."
                title="No latest session yet"
              />
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
          </div>
        </Surface>

        <div className="grid gap-5">
          <Surface className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Entities</h2>
              <StatusPill tone="gold">{entities.length} visible</StatusPill>
            </div>
            <div className="mt-4 grid gap-3">
              {entities.length === 0 ? (
                <EmptyState
                  body="NPCs, locations, factions, quests, and items will appear here once entity memory is added for this campaign."
                  title="No entities yet"
                />
              ) : (
                entities.map((entity) => (
                  <article
                    className="rounded-lg border border-[#17161f]/10 bg-[#fffaf0] p-4"
                    key={entity.id}
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
                ))
              )}
            </div>
          </Surface>

          <Surface className="p-5">
            <h2 className="text-lg font-semibold">Key actions</h2>
            <div className="mt-4 grid gap-3">
                {visibleActions.map((action) => (
                  <article
                    className="rounded-lg border border-[#17161f]/10 bg-white p-4"
                    key={action.title}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{action.title}</h3>
                    <StatusPill tone={action.visibility === "dm-only" ? "red" : "teal"}>
                      Placeholder
                    </StatusPill>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#4b4657]">{action.body}</p>
                  {action.title === "Log latest session" ? (
                    <Link
                      className="mt-3 inline-flex min-h-10 items-center rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 py-2 text-sm font-semibold transition hover:border-[#1f6f78] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
                      href="/sessions"
                    >
                      Open session editor
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </Surface>

          <Surface className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Rules surfaced</h2>
              <StatusPill tone="red">{rules.length} ready</StatusPill>
            </div>
            <div className="mt-4 grid gap-3">
              {rules.length === 0 ? (
                <EmptyState
                  body="Rules and abilities will appear here once session context is indexed."
                  title="No rules surfaced"
                />
              ) : (
                rules.map((rule) => (
                  <article
                    className="rounded-lg border border-[#17161f]/10 bg-[#f7f1e5] p-4"
                    key={rule.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{rule.title}</h3>
                      <StatusPill tone="teal">{rule.visibility}</StatusPill>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#4b4657]">{rule.summary}</p>
                  </article>
                ))
              )}
            </div>
          </Surface>
        </div>
      </section>
    </div>
  );
}

