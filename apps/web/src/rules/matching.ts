import type { RuleSnippet } from "@dnd/types";

export type RuleLinkedTextPart =
  | {
      rule: RuleSnippet;
      text: string;
    }
  | {
      rule?: undefined;
      text: string;
    };

type RuleTerm = {
  rule: RuleSnippet;
  term: string;
};

export function findReferencedRules(
  text: string,
  rules: readonly RuleSnippet[],
) {
  const referencedRules = new Map<string, RuleSnippet>();

  for (const part of splitRuleLinkedText(text, rules)) {
    if (part.rule) {
      referencedRules.set(part.rule.slug, part.rule);
    }
  }

  return [...referencedRules.values()];
}

export function splitRuleLinkedText(
  text: string,
  rules: readonly RuleSnippet[],
): RuleLinkedTextPart[] {
  const terms = createRuleTerms(rules);

  if (!text || terms.length === 0) {
    return [{ text }];
  }

  const matcher = new RegExp(
    `\\b(${terms.map((entry) => escapeRegExp(entry.term)).join("|")})\\b`,
    "gi",
  );
  const parts: RuleLinkedTextPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(matcher)) {
    const matchedText = match[0];
    const index = match.index;

    if (index === undefined) {
      continue;
    }

    const rule = terms.find(
      (entry) => entry.term.toLowerCase() === matchedText.toLowerCase(),
    )?.rule;

    if (!rule) {
      continue;
    }

    if (index > cursor) {
      parts.push({ text: text.slice(cursor, index) });
    }

    parts.push({
      rule,
      text: matchedText,
    });
    cursor = index + matchedText.length;
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor) });
  }

  return parts.length > 0 ? parts : [{ text }];
}

export function filterRulesBySearch(
  rules: readonly RuleSnippet[],
  query: string,
  category?: string,
) {
  const normalizedQuery = normalizeSearch(query);
  const normalizedCategory = category?.trim();

  return rules.filter((rule) => {
    if (normalizedCategory && rule.category !== normalizedCategory) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      rule.title,
      rule.summary,
      rule.body,
      rule.slug,
      ...rule.aliases,
    ].some((value) => normalizeSearch(value).includes(normalizedQuery));
  });
}

function createRuleTerms(rules: readonly RuleSnippet[]) {
  const termsByText = new Map<string, RuleTerm>();

  for (const rule of rules) {
    for (const term of [rule.title, rule.slug.replaceAll("-", " "), ...rule.aliases]) {
      const normalizedTerm = term.trim().toLowerCase();

      if (!normalizedTerm || termsByText.has(normalizedTerm)) {
        continue;
      }

      termsByText.set(normalizedTerm, {
        rule,
        term: normalizedTerm,
      });
    }
  }

  return [...termsByText.values()].sort((left, right) => {
    if (right.term.length !== left.term.length) {
      return right.term.length - left.term.length;
    }

    return left.term.localeCompare(right.term);
  });
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
