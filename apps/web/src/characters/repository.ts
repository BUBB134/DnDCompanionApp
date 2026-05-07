import type { CampaignCharacterSummary, Visibility } from "@dnd/types";
import { queryDatabase } from "@dnd/db";

type CharacterSummaryRow = {
  class_name: string | null;
  id: string;
  level: number;
  name: string;
  summary: string;
  visibility: Visibility;
};

export async function listCharacterSummariesForUser(
  userId: string,
  campaignId: string,
): Promise<CampaignCharacterSummary[]> {
  const result = await queryDatabase<CharacterSummaryRow>(
    `
      select
        characters.id,
        characters.name,
        characters.summary,
        characters.class_name,
        characters.level,
        characters.visibility
      from characters
      inner join campaign_memberships
        on campaign_memberships.campaign_id = characters.campaign_id
      where campaign_memberships.user_id = $1
        and characters.campaign_id = $2
        and (
          campaign_memberships.role = 'dm'
          or characters.visibility = 'player-safe'
        )
      order by characters.updated_at desc, characters.name asc
    `,
    [userId, campaignId],
  );

  return result.rows.map(mapCharacterSummaryRow);
}

function mapCharacterSummaryRow(
  row: CharacterSummaryRow,
): CampaignCharacterSummary {
  return {
    className: row.class_name,
    id: row.id,
    level: row.level,
    name: row.name,
    summary: row.summary,
    visibility: row.visibility,
  };
}
