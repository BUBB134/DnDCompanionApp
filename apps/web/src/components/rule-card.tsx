import type { RuleSnippet } from "@dnd/types";
import { StatusPill } from "@dnd/ui";
import { createRuleCardId } from "@/rules/routing";

type RuleCardProps = {
  highlighted?: boolean;
  rule: RuleSnippet;
};

const ruleCategoryLabels: Record<RuleSnippet["category"], string> = {
  ability: "Ability",
  condition: "Condition",
  "core-mechanic": "Core mechanic",
};

export function RuleCard({ highlighted = false, rule }: RuleCardProps) {
  return (
    <article
      className={`scroll-mt-5 rounded-lg border p-4 transition ${
        highlighted
          ? "border-[#8b2f39]/45 bg-[#f9e8ea]"
          : "border-[#17161f]/10 bg-[#fffaf0]"
      }`}
      id={createRuleCardId(rule.slug)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold leading-tight">{rule.title}</h3>
        <StatusPill tone="teal">{ruleCategoryLabels[rule.category]}</StatusPill>
        <StatusPill tone={rule.visibility === "dm-only" ? "red" : "gold"}>
          {rule.visibility === "dm-only" ? "DM only" : "Player safe"}
        </StatusPill>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#17161f]">
        {rule.summary}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#4b4657]">{rule.body}</p>
      {rule.aliases.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {rule.aliases.slice(0, 5).map((alias) => (
            <span
              className="rounded-md border border-[#17161f]/10 bg-white px-2 py-1 text-xs font-semibold text-[#4b4657]"
              key={`${rule.slug}-${alias}`}
            >
              {alias}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
