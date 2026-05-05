import type { Campaign, RuleSnippet, SessionSummary } from "@dnd/types";
import { EmptyState, StatusPill, Surface } from "@dnd/ui";

type CampaignShellProps = {
  campaign: Campaign;
  dmBrief?: string | null;
  latestSession: SessionSummary | null;
  rules: RuleSnippet[];
};

const tableUtilities = ["Initiative", "Conditions", "Shared loot"];

export function CampaignShell({
  campaign,
  dmBrief,
  latestSession,
  rules,
}: CampaignShellProps) {
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
                    Current session
                  </p>
                  <h2 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
                    {latestSession.title}
                  </h2>
                  <p className="max-w-3xl text-base leading-7 text-[#4b4657]">
                    {latestSession.recap}
                  </p>
                </div>

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
              </>
            ) : (
              <EmptyState
                body="This campaign is ready for its first session. Once sessions are added, the dashboard will surface the latest recap and unresolved hooks here."
                title="No sessions yet"
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
          </div>
        </Surface>

        <div className="grid gap-5">
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

          <Surface className="p-5">
            <h2 className="text-lg font-semibold">Table utilities</h2>
            <div className="mt-4 grid gap-2">
              {tableUtilities.map((utility) => (
                <button
                  className="flex items-center justify-between rounded-md border border-[#17161f]/10 bg-white px-3 py-2 text-left text-sm font-medium transition hover:border-[#1f6f78] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
                  key={utility}
                  type="button"
                >
                  <span>{utility}</span>
                  <span aria-hidden="true" className="text-[#8b2f39]">
                    +
                  </span>
                </button>
              ))}
            </div>
          </Surface>
        </div>
      </section>
    </div>
  );
}

