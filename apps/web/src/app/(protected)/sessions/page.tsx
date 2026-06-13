import type {
  CampaignCharacterSummary,
  CampaignEntitySummary,
  CampaignSession,
  RuleSnippet,
} from "@dnd/types";
import { formatDatabaseError } from "@dnd/db";
import { StatusPill, EmptyState, Surface } from "@dnd/ui";
import { requireAuthSession } from "@/auth/server";
import {
  buildCampaignDashboardData,
  getCurrentCampaignAccess,
} from "@/campaigns/bootstrap";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import { listCharacterSummariesForUser } from "@/characters/repository";
import { CampaignAccessState } from "@/components/campaign-access-state";
import { SessionRecapGenerator } from "@/components/session-recap-generator";
import { SessionNoteDocumentView } from "@/components/session-note-document-view";
import {
  SessionCreateForm,
  SessionEditForm,
} from "@/components/session-editor";
import { listEntitySummariesForUser } from "@/entities/repository";
import { listRuleSnippetsForUser } from "@/rules/repository";
import { createSessionNoteDocumentFromPlainText } from "@/sessions/note-document";
import { listSessionsForUser } from "@/sessions/repository";

const entityTypeLabels: Record<CampaignEntitySummary["type"], string> = {
  faction: "Faction",
  item: "Item",
  location: "Location",
  npc: "NPC",
  quest: "Quest",
};

export default async function SessionsPage() {
  const session = await requireAuthSession();
  const campaign = await getCurrentCampaignAccess(session);
  const canManageSessions = isDatabaseCampaignId(campaign?.id ?? "");
  let characters: CampaignCharacterSummary[] = [];
  let taggableEntities: CampaignEntitySummary[] = [];
  let rules: RuleSnippet[] = [];
  let sessions: CampaignSession[] = [];
  let loadError: string | null = null;

  if (!campaign) {
    return <CampaignAccessState />;
  }

  if (canManageSessions) {
    try {
      [sessions, taggableEntities, rules, characters] = await Promise.all([
        listSessionsForUser(session.user.id, campaign.id),
        listEntitySummariesForUser(session.user.id, campaign.id),
        listRuleSnippetsForUser(session.user.id, campaign.id),
        listCharacterSummariesForUser(session.user.id, campaign.id),
      ]);
    } catch (error) {
      loadError = formatDatabaseError(error);
    }
  } else {
    const dashboardData = buildCampaignDashboardData(campaign);
    const latestSession = dashboardData.latestSession;

    sessions = latestSession
      ? [
          {
            ...latestSession,
            createdAt: "",
            notes: latestSession.recap,
            notesDocument: createSessionNoteDocumentFromPlainText(
              latestSession.recap,
            ),
            updatedAt: "",
          },
        ]
      : [];
    taggableEntities = dashboardData.entities;
    rules = dashboardData.rules;
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
              <SessionCreateForm
                availableCharacters={characters}
                availableEntities={taggableEntities}
                availableRules={rules}
                campaign={campaign}
                userId={session.user.id}
              />
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

            {sessions.length > 0 ? (
              <nav
                aria-label="Session navigation"
                className="mt-4 rounded-lg border border-[#17161f]/10 bg-white p-3"
                id="session-log-navigation"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8b2f39]">
                  Jump to a session
                </p>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {sessions.map((campaignSession, index) => (
                    <a
                      className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-[#1f6f78]/20 bg-[#e7f5f6] px-3 text-sm font-semibold text-[#164f56] transition hover:border-[#1f6f78]/45 hover:bg-[#d4ecef] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
                      href={`#session-${campaignSession.id}`}
                      key={`session-navigation-${campaignSession.id}`}
                    >
                      {campaignSession.title}
                      {index === 0 ? " (latest)" : ""}
                    </a>
                  ))}
                </div>
              </nav>
            ) : null}

            <div className="mt-5 grid gap-4">
              {sessions.length === 0 ? (
                <EmptyState
                  body="Create the first session to start capturing notes, table decisions, and unresolved hooks."
                  title="No sessions yet"
                />
              ) : (
                sessions.map((campaignSession, index) => (
                  <article
                    className="scroll-mt-24 rounded-lg border border-[#17161f]/10 bg-[#fffaf0] p-4"
                    id={`session-${campaignSession.id}`}
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

                    <div className="mt-4 rounded-lg border border-[#1f6f78]/20 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#1f6f78]">
                        Previously on
                      </p>
                      {campaignSession.recap ? (
                        <p className="mt-2 text-sm leading-6 text-[#4b4657]">
                          {campaignSession.recap}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-[#4b4657]">
                          No recap has been generated yet.
                        </p>
                      )}

                      {campaignSession.recapGrounding.length > 0 ? (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-semibold text-[#17161f]">
                            Sources ({campaignSession.recapGrounding.length})
                          </summary>
                          <ul className="mt-3 grid gap-2">
                            {campaignSession.recapGrounding.map(
                              (grounding) => (
                                <li
                                  className="rounded-md border border-[#17161f]/10 bg-[#fffaf0] px-3 py-2 text-sm leading-6 text-[#4b4657]"
                                  key={`${campaignSession.id}-recap-source-${grounding.sourceType}-${grounding.sourceId}`}
                                >
                                  <span className="font-semibold text-[#17161f]">
                                    {grounding.label}
                                  </span>
                                  <span className="mt-1 block">
                                    {grounding.excerpt}
                                  </span>
                                </li>
                              ),
                            )}
                          </ul>
                        </details>
                      ) : null}

                      {canManageSessions ? (
                        <SessionRecapGenerator
                          campaignId={campaign.id}
                          hasNotes={Boolean(campaignSession.notes.trim())}
                          hasRecap={Boolean(campaignSession.recap.trim())}
                          sessionId={campaignSession.id}
                        />
                      ) : null}
                    </div>

                    {campaignSession.notes ? (
                      <SessionNoteDocumentView
                        characters={characters}
                        document={campaignSession.notesDocument}
                        entities={taggableEntities}
                        fallbackText={campaignSession.notes}
                        rules={rules}
                      />
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
                          {campaignSession.unresolvedHooks.map((hook, hookIndex) => (
                            <li key={`${campaignSession.id}-hook-${hookIndex}`}>
                              {hook}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {campaignSession.taggedEntities.length > 0 ? (
                      <div className="mt-4 rounded-lg border border-[#1f6f78]/20 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#1f6f78]">
                          Tagged entities
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {campaignSession.taggedEntities.map((entity) => (
                            <StatusPill
                              key={`${campaignSession.id}-entity-${entity.id}`}
                              tone={entity.visibility === "dm-only" ? "red" : "teal"}
                            >
                              {entity.name} - {entityTypeLabels[entity.type]}
                            </StatusPill>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {canManageSessions ? (
                      <SessionEditForm
                        availableCharacters={characters}
                        availableEntities={taggableEntities}
                        availableRules={rules}
                        campaign={campaign}
                        session={campaignSession}
                        userId={session.user.id}
                      />
                    ) : null}

                    {sessions.length > 1 ? (
                      <a
                        className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#164f56] underline decoration-[#1f6f78]/45 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
                        href="#session-log-navigation"
                      >
                        Back to session list
                      </a>
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
