import type { RuleSnippet } from "@dnd/types";
import { splitRuleLinkedText } from "@/rules/matching";
import { createRuleHref } from "@/rules/routing";

type RuleLinkedTextProps = {
  as?: "p" | "span";
  className?: string;
  rules: readonly RuleSnippet[];
  text: string;
};

export function RuleLinkedText({
  as = "p",
  className,
  rules,
  text,
}: RuleLinkedTextProps) {
  const parts = splitRuleLinkedText(text, rules);
  const Component = as;

  return (
    <Component className={className}>
      {parts.map((part, index) =>
        part.rule ? (
          <a
            className="rounded-sm bg-[#e7f5f6] px-1 font-semibold text-[#164f56] underline decoration-[#1f6f78]/50 underline-offset-2 transition hover:bg-[#d4ecef] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
            href={createRuleHref(part.rule.slug)}
            key={`${part.rule.slug}-${index}`}
          >
            {part.text}
          </a>
        ) : (
          <span key={`text-${index}`}>{part.text}</span>
        ),
      )}
    </Component>
  );
}
