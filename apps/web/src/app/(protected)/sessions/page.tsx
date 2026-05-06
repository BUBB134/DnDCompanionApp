import type { CampaignSession } from "@dnd/types";
import { formatDatabaseError } from "@dnd/db";
import { StatusPill, EmptyState, Surface } from "@dnd/ui";
import { requireAuthSession } from "@/auth/server";
import {
  buildCampaignDashboardData,
  getCurrentCampaignAccess,
} from "@/campaigns/bootstrap";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import { CampaignAccessState } from "@/components/campaign-access-state";
import {
  SessionCreateForm,
  SessionEditForm,
} from "@/components/session-editor";
import { listSessionsForUser } from "@/sessions/repository";

export default async function SessionsPage() {
  const session = await requireAuthSession();
  const campaign = await getCurrentCampaignAccess(session);
  const canManageSessions = isDatabaseCampaignId(campaign?.id ?? "");
  let sessions: CampaignSession[] = [];
  let loadError: string | null = null;

  if (!campaign) {
    return <CampaignAccessState />;
  }

  if (canManageSessions) {
    try {
      sessions = await listSessionsForUser(session.user.id, campaign.id);
    } catch (error) {
      loadError = formatDatabaseError(error);
    }
  } else {
    const latestSession = buildCampaignDashboardData(campaign).latestSession;

    sessions = latestSession
      ? [
          {
            ...latestSession,
            createdAt: "",
            notes: latestSession.recap,
            updatedAt: "",
          },
        ]
      : [];
  }

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-4 rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
            Sessions
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight">
            Session notes
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b4657]">
            {campaign.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone={campaign.role === "dm" ? "red" : "teal"}>
            {campaign.role === "dm" ? "DM access" : "Player access"}
          </StatusPill>
          <StatusPill tone="gold">{sessions.length} sessions</StatusPill>
          {!canManageSessions ? (
            <StatusPill tone="red">Read only</StatusPill>
          ) : null}
        </div>
      </section>

      {loadError ? (
        <Surface className="p-5">
          <EmptyState body={loadError} title="Sessions are unavailable" />
        </Surface>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.4fr)]">
          {canManageSessions ? (
            <Surface className="p-5 sm:p-6">
              <SessionCreateForm campaign={campaign} />
            </Surface>
          ) : (
            <Surface className="p-5">
              <EmptyState
                body="Open or create a saved campaign to add and edit persisted session notes. The local bootstrap campaign stays read-only so it can be used without a Postgres record."
                title="Saved campaign required"
              />
            </Surface>
          )}

          <Surface className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Campaign session log</h2>
                <p className="mt-1 text-sm leading-6 text-[#4b4657]">
                  Notes and open hooks are visible to campaign members.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {sessions.length === 0 ? (
                <EmptyState
                  body="Create the first session to start capturing notes, table decisions, and unresolved hooks."
                  title="No sessions yet"
                />
              ) : (
                sessions.map((campaignSession, index) => (
                  <article
                    className="rounded-lg border border-[#17161f]/10 bg-[#fffaf0] p-4"
                    key={campaignSession.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {campaignSession.title}
                      </h3>
                      {index === 0 ? (
                        <StatusPill tone="teal">Latest</StatusPill>
                      ) : null}
                      <StatusPill tone="gold">
                        Hooks: {campaignSession.unresolvedHooks.length}
                      </StatusPill>
                    </div>

                    {campaignSession.notes ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#17161f]">
                        {campaignSession.notes}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-[#4b4657]">
                        No notes captured yet.
                      </p>
                    )}

                    {campaignSession.unresolvedHooks.length > 0 ? (
                      <div className="mt-4 rounded-lg border border-[#c3943e]/45 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#8b2f39]">
                          Unresolved hooks
                        </p>
                        <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#4b4657]">
                          {campaignSession.unresolvedHooks.map((hook) => (
                            <li key={hook}>{hook}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {canManageSessions ? (
                      <SessionEditForm
                        campaign={campaign}
                        session={campaignSession}
                      />
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </Surface>
        </section>
      )}
    </div>
  );
}
