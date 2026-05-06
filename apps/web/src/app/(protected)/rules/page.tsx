import type { RuleSnippet, RuleSnippetCategory } from "@dnd/types";
import { filterByVisibility } from "@dnd/types";
import { formatDatabaseError } from "@dnd/db";
import { EmptyState, StatusPill, Surface } from "@dnd/ui";
import { requireAuthSession } from "@/auth/server";
import { getCurrentCampaignAccess } from "@/campaigns/bootstrap";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import { CampaignAccessState } from "@/components/campaign-access-state";
import { RuleCard } from "@/components/rule-card";
import { coreRuleSnippets } from "@/rules/core-rules";
import { filterRulesBySearch } from "@/rules/matching";
import { listRuleSnippetsForUser } from "@/rules/repository";

type RulesPageProps = {
  searchParams: Promise<{
    category?: string;
    q?: string;
    rule?: string;
  }>;
};

const categoryFilters = [
  { label: "All", value: "" },
  { label: "Conditions", value: "condition" },
  { label: "Core mechanics", value: "core-mechanic" },
] as const;

export default async function RulesPage({ searchParams }: RulesPageProps) {
  const session = await requireAuthSession();
  const campaign = await getCurrentCampaignAccess(session);
  const params = await searchParams;
  const query = normalizeSearchParam(params.q);
  const category = normalizeRuleCategory(params.category);
  const selectedRuleSlug = normalizeSearchParam(params.rule);
  let rules: RuleSnippet[] = [];
  let loadError: string | null = null;

  if (!campaign) {
    return <CampaignAccessState />;
  }

  if (isDatabaseCampaignId(campaign.id)) {
    try {
      rules = await listRuleSnippetsForUser(
        session.user.id,
        campaign.id,
        query,
        category ?? "",
      );
    } catch (error) {
      loadError = formatDatabaseError(error);
    }
  } else {
    rules = filterRulesBySearch(
      filterByVisibility(coreRuleSnippets, campaign.role),
      query,
      category ?? undefined,
    );
  }

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-4 rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
            Rules
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight">
            Contextual rules
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b4657]">
            {campaign.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone={campaign.role === "dm" ? "red" : "teal"}>
            {campaign.role === "dm" ? "DM access" : "Player access"}
          </StatusPill>
          <StatusPill tone="gold">{rules.length} matches</StatusPill>
        </div>
      </section>

      <Surface className="p-4 sm:p-5">
        <form action="/rules" className="grid gap-3 sm:grid-cols-[1fr_auto]">
          {category ? <input name="category" type="hidden" value={category} /> : null}
          <label className="sr-only" htmlFor="rules-search">
            Search rules
          </label>
          <input
            className="min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
            defaultValue={query}
            id="rules-search"
            name="q"
            placeholder="Search prone, grappled, concentration..."
            type="search"
          />
          <button
            className="min-h-11 rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
            type="submit"
          >
            Search
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {categoryFilters.map((filter) => {
            const isActive = (category ?? "") === filter.value;

            return (
              <a
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-md border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2 ${
                  isActive
                    ? "border-[#17161f] bg-[#17161f] text-white"
                    : "border-[#17161f]/15 bg-white hover:border-[#1f6f78]"
                }`}
                href={createCategoryFilterHref(filter.value, query)}
                key={filter.value || "all"}
              >
                {filter.label}
              </a>
            );
          })}
        </div>
      </Surface>

      {loadError ? (
        <Surface className="p-5">
          <EmptyState body={loadError} title="Rules are unavailable" />
        </Surface>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {rules.length === 0 ? (
            <Surface className="p-5 md:col-span-2">
              <EmptyState
                body="Try another condition, mechanic, or table term."
                title="No rules found"
              />
            </Surface>
          ) : (
            rules.map((rule) => (
              <RuleCard
                highlighted={rule.slug === selectedRuleSlug}
                key={rule.id}
                rule={rule}
              />
            ))
          )}
        </section>
      )}
    </div>
  );
}

function createCategoryFilterHref(category: string, query: string) {
  const params = new URLSearchParams();

  if (category) {
    params.set("category", category);
  }

  if (query) {
    params.set("q", query);
  }

  const queryString = params.toString();

  return queryString ? `/rules?${queryString}` : "/rules";
}

function normalizeSearchParam(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRuleCategory(
  value: string | undefined,
): RuleSnippetCategory | null {
  if (value === "condition" || value === "core-mechanic" || value === "ability") {
    return value;
  }

  return null;
}
