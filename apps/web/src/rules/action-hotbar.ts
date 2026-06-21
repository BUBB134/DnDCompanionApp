import { coreRuleSnippets } from "@dnd/db/domain-content";
import type { RuleSnippet } from "@dnd/types";
import { listRuleSnippetsForUser } from "@/rules/repository";

const commonActionTag = "common-action";
const requiredCommonActionSlugs = [
  "action-dash",
  "action-disengage",
  "action-dodge",
  "action-help",
  "action-hide",
] as const;

export async function loadCommonActionRulesForUser(
  userId: string,
  campaignId: string,
) {
  try {
    const storedRules = filterCommonActionRules(
      await listRuleSnippetsForUser(
        userId,
        campaignId,
        "",
        "core-mechanic",
      ),
    );

    if (hasCompleteCommonActionCatalog(storedRules)) {
      return {
        loadNotice: null,
        rules: storedRules,
      };
    }

    return {
      loadNotice:
        "The saved common-action library is incomplete, so the hotbar is using the bundled MVP actions.",
      rules: filterCommonActionRules(coreRuleSnippets),
    };
  } catch {
    return {
      loadNotice:
        "Common actions could not be refreshed, so the hotbar is using the bundled MVP actions.",
      rules: filterCommonActionRules(coreRuleSnippets),
    };
  }
}

export function filterCommonActionRules(rules: RuleSnippet[]) {
  return rules.filter((rule) => rule.tags?.includes(commonActionTag));
}

export function hasCompleteCommonActionCatalog(rules: RuleSnippet[]) {
  const storedSlugs = new Set(rules.map((rule) => rule.slug));

  return requiredCommonActionSlugs.every((slug) => storedSlugs.has(slug));
}
