import type {
  CampaignEntity,
  CampaignEntityBacklinks,
  CampaignEntityWithBacklinks,
} from "@dnd/types";
import { formatDatabaseError } from "@dnd/db";
import { isDungeonMaster } from "@dnd/types";
import { EmptyState, StatusPill, Surface } from "@dnd/ui";
import { requireAuthSession } from "@/auth/server";
import {
  buildCampaignDashboardData,
  getCurrentCampaignAccess,
} from "@/campaigns/bootstrap";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import { CampaignAccessState } from "@/components/campaign-access-state";
import { EntityCreateForm } from "@/components/entity-create-form";
import {
  EntityDeleteForm,
  EntityEditForm,
} from "@/components/entity-edit-form";
import { listEntitiesWithBacklinksForUser } from "@/entities/repository";

const entityTypeLabels: Record<CampaignEntity["type"], string> = {
  faction: "Faction",
  item: "Item",
  location: "Location",
  npc: "NPC",
  quest: "Quest",
};

export default async function EntitiesPage() {
  const session = await requireAuthSession();
  const campaign = await getCurrentCampaignAccess(session);
  let entities: CampaignEntityWithBacklinks[] = [];
  let loadError: string | null = null;
  const canManageEntities = isDatabaseCampaignId(campaign?.id ?? "");

  if (!campaign) {
    return <CampaignAccessState />;
  }

  if (canManageEntities) {
    try {
      entities = await listEntitiesWithBacklinksForUser(
        session.user.id,
        campaign.id,
      );
    } catch (error) {
      loadError = formatDatabaseError(error);
    }
  } else {
    entities = buildCampaignDashboardData(campaign).entities.map((entity) => ({
      ...entity,
      backlinks: createEmptyBacklinks(entity.id),
      description: "",
    }));
  }

  const typeCounts = countEntitiesByType(entities);

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-4 rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
            Campaign wiki
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight">Entities</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b4657]">
            {campaign.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone={isDungeonMaster(campaign.role) ? "red" : "teal"}>
            {isDungeonMaster(campaign.role) ? "DM access" : "Player access"}
          </StatusPill>
          <StatusPill tone="gold">{entities.length} visible</StatusPill>
          {!canManageEntities ? (
            <StatusPill tone="red">Read only</StatusPill>
          ) : null}
        </div>
      </section>

      {loadError ? (
        <Surface className="p-5">
          <EmptyState body={loadError} title="Entities are unavailable" />
        </Surface>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.4fr)]">
          {canManageEntities ? (
            <Surface className="p-5">
              <EntityCreateForm campaign={campaign} />
            </Surface>
          ) : (
            <Surface className="p-5">
              <EmptyState
                body="Open or create a saved campaign to add, edit, and delete persisted wiki entities. The local bootstrap campaign stays read-only so it can be used without a Postgres record."
                title="Saved campaign required"
              />
            </Surface>
          )}

          <Surface className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Campaign entities</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(typeCounts).map(([type, count]) => (
                    <StatusPill key={type} tone="teal">
                      {entityTypeLabels[type as CampaignEntity["type"]]}: {count}
                    </StatusPill>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {entities.length === 0 ? (
                <EmptyState
                  body="Create an NPC, location, faction, quest, or item to start building the campaign wiki."
                  title="No entities yet"
                />
              ) : (
                entities.map((entity) => (
                  <article
                    className="rounded-lg border border-[#17161f]/10 bg-[#fffaf0] p-4"
                    id={`entity-${entity.id}`}
                    key={entity.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{entity.name}</h3>
                      <StatusPill tone="teal">
                        {entityTypeLabels[entity.type]}
                      </StatusPill>
                      <StatusPill
                        tone={entity.visibility === "dm-only" ? "red" : "gold"}
                      >
                        {entity.visibility === "dm-only" ? "DM only" : "Player safe"}
                      </StatusPill>
                      <StatusPill tone="gold">
                        {entity.backlinks.linkedSessions.length}{" "}
                        {pluralize(
                          entity.backlinks.linkedSessions.length,
                          "session",
                          "sessions",
                        )}
                      </StatusPill>
                      <StatusPill tone="teal">
                        {entity.backlinks.mentionReferences.length}{" "}
                        {pluralize(
                          entity.backlinks.mentionReferences.length,
                          "reference",
                          "references",
                        )}
                      </StatusPill>
                    </div>
                    {entity.summary ? (
                      <p className="mt-3 text-sm leading-6 text-[#4b4657]">
                        {entity.summary}
                      </p>
                    ) : null}
                    {entity.description ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#17161f]">
                        {entity.description}
                      </p>
                    ) : null}
                    {!entity.summary && !entity.description ? (
                      <p className="mt-3 text-sm leading-6 text-[#4b4657]">
                        No description yet.
                      </p>
                    ) : null}

                    <EntityBacklinksPanel backlinks={entity.backlinks} />

                    {canManageEntities ? (
                      <>
                        <EntityEditForm campaign={campaign} entity={entity} />
                        <EntityDeleteForm campaign={campaign} entity={entity} />
                      </>
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

function EntityBacklinksPanel({
  backlinks,
}: {
  backlinks: CampaignEntityBacklinks;
}) {
  const hasBacklinks =
    backlinks.linkedSessions.length > 0 ||
    backlinks.mentionReferences.length > 0;

  return (
    <div className="mt-4 border-t border-[#17161f]/10 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#1f6f78]">
        Backlinks
      </p>

      {!hasBacklinks ? (
        <p className="mt-2 text-sm leading-6 text-[#4b4657]">
          No session mentions yet.
        </p>
      ) : null}

      {backlinks.linkedSessions.length > 0 ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-[#17161f]">
            Linked sessions
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {backlinks.linkedSessions.map((session) => (
              <a
                className="inline-flex min-h-8 items-center rounded-md border border-[#1f6f78]/25 bg-white px-2.5 py-1 text-xs font-semibold text-[#164f56] transition hover:bg-[#e7f5f6] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
                href={`/sessions#session-${session.id}`}
                key={session.id}
              >
                {session.title}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {backlinks.mentionReferences.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-[#17161f]">
            Inbound references
          </p>
          <ul className="mt-2 grid gap-3 text-sm leading-6 text-[#4b4657]">
            {backlinks.mentionReferences.map((reference) => (
              <li
                className="border-l-2 border-[#c3943e]/55 pl-3"
                key={[
                  reference.sessionId,
                  reference.blockId,
                  reference.label,
                  reference.excerpt,
                ].join(":")}
              >
                <a
                  className="font-semibold text-[#164f56] underline decoration-[#1f6f78]/45 underline-offset-2 transition hover:text-[#1f6f78] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
                  href={`/sessions#session-${reference.sessionId}`}
                >
                  {reference.sessionTitle}
                </a>
                <span className="text-[#6d6578]">
                  {" "}
                  - {formatBacklinkDate(reference.occurredAt)}
                </span>
                <p className="mt-1">{reference.excerpt}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function countEntitiesByType(entities: CampaignEntity[]) {
  return entities.reduce<Record<CampaignEntity["type"], number>>(
    (counts, entity) => ({
      ...counts,
      [entity.type]: counts[entity.type] + 1,
    }),
    {
      faction: 0,
      item: 0,
      location: 0,
      npc: 0,
      quest: 0,
    },
  );
}

function createEmptyBacklinks(entityId: string): CampaignEntityBacklinks {
  return {
    entityId,
    linkedSessions: [],
    mentionReferences: [],
  };
}

function formatBacklinkDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}
