import { coreRuleSnippets } from "@dnd/db/domain-content";
import type { RuleSnippet } from "@dnd/types";
import { listRuleSnippetsForUser } from "@/rules/repository";

const commonActionTag = "common-action";

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

    if (storedRules.length > 0) {
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
