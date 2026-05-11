import type { RuleSnippet, RuleSnippetCategory, Visibility } from "@dnd/types";
import { queryDatabase, type DatabaseQueryable } from "@dnd/db";

type RuleSnippetRow = {
  aliases: unknown;
  body: string;
  category: RuleSnippetCategory;
  id: string;
  slug: string;
  summary: string;
  title: string;
  visibility: Visibility;
};

export async function listRuleSnippetsForUser(
  userId: string,
  campaignId: string,
  query = "",
  category = "",
  client: DatabaseQueryable = defaultDatabaseClient,
): Promise<RuleSnippet[]> {
  const normalizedQuery = query.trim();
  const normalizedCategory = category.trim();
  const result = await client.query<RuleSnippetRow>(
    `
      select
        rule_snippets.id,
        rule_snippets.slug,
        rule_snippets.category,
        rule_snippets.title,
        rule_snippets.summary,
        rule_snippets.body,
        rule_snippets.aliases,
        rule_snippets.visibility
      from rule_snippets
      inner join campaign_memberships
        on campaign_memberships.user_id = $1
        and campaign_memberships.campaign_id = $2
      where (
          campaign_memberships.role = 'dm'
          or rule_snippets.visibility = 'player-safe'
        )
        and (
          $3 = ''
          or rule_snippets.category::text = $3
        )
        and (
          $4 = ''
          or rule_snippets.title ilike '%' || $4 || '%'
          or rule_snippets.summary ilike '%' || $4 || '%'
          or rule_snippets.body ilike '%' || $4 || '%'
          or rule_snippets.slug ilike '%' || $4 || '%'
          or exists (
            select 1
            from unnest(rule_snippets.aliases) as alias(value)
            where alias.value ilike '%' || $4 || '%'
          )
        )
      order by
        case rule_snippets.category
          when 'condition' then 1
          when 'core-mechanic' then 2
          else 3
        end,
        rule_snippets.title asc
    `,
    [userId, campaignId, normalizedCategory, normalizedQuery],
  );

  return result.rows.map(mapRuleSnippetRow);
}

const defaultDatabaseClient: DatabaseQueryable = {
  query: queryDatabase,
};

function mapRuleSnippetRow(row: RuleSnippetRow): RuleSnippet {
  return {
    aliases: mapAliases(row.aliases),
    body: row.body,
    category: row.category,
    id: row.id,
    slug: row.slug,
    summary: row.summary,
    title: row.title,
    visibility: row.visibility,
  };
}

function mapAliases(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((alias): alias is string => typeof alias === "string");
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .replace(/^{|}$/g, "")
    .split(",")
    .map((alias) => alias.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}
