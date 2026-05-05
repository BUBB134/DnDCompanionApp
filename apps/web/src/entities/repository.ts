import type {
  CampaignEntity,
  CampaignEntitySummary,
  EntityType,
  Visibility,
} from "@dnd/types";
import { queryDatabase } from "@dnd/db";
import type { EntityMutationInput } from "@/entities/manage-entity";

type EntityRow = {
  description: string;
  id: string;
  name: string;
  summary: string;
  type: EntityType;
  visibility: Visibility;
};

export async function listEntitiesForUser(userId: string, campaignId: string) {
  const result = await queryDatabase<EntityRow>(
    `
      select
        entities.id,
        entities.name,
        entities.type,
        entities.summary,
        entities.description,
        entities.visibility
      from entities
      inner join campaign_memberships
        on campaign_memberships.campaign_id = entities.campaign_id
      where campaign_memberships.user_id = $1
        and entities.campaign_id = $2
        and (
          campaign_memberships.role = 'dm'
          or entities.visibility = 'player-safe'
        )
      order by entities.updated_at desc, entities.name asc
    `,
    [userId, campaignId],
  );

  return result.rows.map(mapEntityRow);
}

export async function listEntitySummariesForUser(
  userId: string,
  campaignId: string,
): Promise<CampaignEntitySummary[]> {
  const entities = await listEntitiesForUser(userId, campaignId);

  return entities.map((entity) => ({
    id: entity.id,
    name: entity.name,
    summary: entity.summary,
    type: entity.type,
    visibility: entity.visibility,
  }));
}

export async function createEntityForUser(
  userId: string,
  input: EntityMutationInput,
) {
  const result = await queryDatabase<EntityRow>(
    `
      insert into entities (
        campaign_id,
        type,
        name,
        summary,
        description,
        visibility
      )
      select
        campaign_memberships.campaign_id,
        $3,
        $4,
        $5,
        $6,
        $7
      from campaign_memberships
      where campaign_memberships.user_id = $1
        and campaign_memberships.campaign_id = $2
        and (
          campaign_memberships.role = 'dm'
          or $7 = 'player-safe'
        )
      returning id, name, type, summary, description, visibility
    `,
    [
      userId,
      input.campaignId,
      input.type,
      input.name,
      input.summary,
      input.description,
      input.visibility,
    ],
  );

  return requireEntityRow(
    result.rows[0],
    "You do not have access to create this entity.",
  );
}

export async function updateEntityForUser(
  userId: string,
  entityId: string,
  input: EntityMutationInput,
) {
  const result = await queryDatabase<EntityRow>(
    `
      update entities
      set
        type = $4,
        name = $5,
        summary = $6,
        description = $7,
        visibility = $8,
        updated_at = now()
      from campaign_memberships
      where entities.id = $3
        and entities.campaign_id = $2
        and campaign_memberships.campaign_id = entities.campaign_id
        and campaign_memberships.user_id = $1
        and (
          campaign_memberships.role = 'dm'
          or entities.visibility = 'player-safe'
        )
        and (
          campaign_memberships.role = 'dm'
          or $8 = 'player-safe'
        )
      returning
        entities.id,
        entities.name,
        entities.type,
        entities.summary,
        entities.description,
        entities.visibility
    `,
    [
      userId,
      input.campaignId,
      entityId,
      input.type,
      input.name,
      input.summary,
      input.description,
      input.visibility,
    ],
  );

  return requireEntityRow(
    result.rows[0],
    "You do not have access to update this entity.",
  );
}

export async function deleteEntityForUser(
  userId: string,
  campaignId: string,
  entityId: string,
) {
  const result = await queryDatabase<Pick<EntityRow, "id">>(
    `
      delete from entities
      using campaign_memberships
      where entities.id = $3
        and entities.campaign_id = $2
        and campaign_memberships.campaign_id = entities.campaign_id
        and campaign_memberships.user_id = $1
        and (
          campaign_memberships.role = 'dm'
          or entities.visibility = 'player-safe'
        )
      returning entities.id
    `,
    [userId, campaignId, entityId],
  );

  if (!result.rows[0]) {
    throw new Error("You do not have access to delete this entity.");
  }
}

function mapEntityRow(row: EntityRow): CampaignEntity {
  return {
    description: row.description,
    id: row.id,
    name: row.name,
    summary: row.summary,
    type: row.type,
    visibility: row.visibility,
  };
}

function requireEntityRow(row: EntityRow | undefined, errorMessage: string) {
  if (!row) {
    throw new Error(errorMessage);
  }

  return mapEntityRow(row);
}
