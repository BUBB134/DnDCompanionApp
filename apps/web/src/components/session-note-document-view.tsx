import type {
  RuleSnippet,
  SessionNoteBlock,
  SessionNoteDocument,
} from "@dnd/types";
import { RuleLinkedText } from "@/components/rule-linked-text";
import { normalizeSessionNoteDocument } from "@/sessions/note-document";

type SessionNoteDocumentViewProps = {
  document: SessionNoteDocument;
  fallbackText: string;
  rules: readonly RuleSnippet[];
};

const blockClasses: Record<SessionNoteBlock["type"], string> = {
  callout:
    "whitespace-pre-wrap border-l-4 border-[#c3943e] bg-white px-3 py-2 text-sm font-semibold leading-6 text-[#5c4212]",
  heading:
    "whitespace-pre-wrap text-base font-semibold leading-6 text-[#17161f]",
  paragraph: "whitespace-pre-wrap text-sm leading-6 text-[#17161f]",
  quote:
    "whitespace-pre-wrap border-l-4 border-[#1f6f78]/45 pl-3 text-sm italic leading-6 text-[#4b4657]",
};

export function SessionNoteDocumentView({
  document,
  fallbackText,
  rules,
}: SessionNoteDocumentViewProps) {
  const blocks = normalizeSessionNoteDocument(
    document,
    fallbackText,
  ).blocks.filter((block) => block.text.trim());

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-3">
      {blocks.map((block) => (
        <RuleLinkedText
          className={blockClasses[block.type]}
          key={block.id}
          rules={rules}
          text={block.text}
        />
      ))}
    </div>
  );
}
