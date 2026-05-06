export function createRuleCardId(slug: string) {
  return `rule-${slug}`;
}

export function createRuleHref(slug: string) {
  return `/rules?rule=${encodeURIComponent(slug)}#${createRuleCardId(slug)}`;
}
