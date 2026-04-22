import { EmptyState, Surface } from "@dnd/ui";

type ProtectedScaffoldPageProps = {
  body: string;
  eyebrow: string;
  title: string;
};

export function ProtectedScaffoldPage({
  body,
  eyebrow,
  title,
}: ProtectedScaffoldPageProps) {
  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight">{title}</h2>
      </section>

      <Surface className="p-5">
        <EmptyState body={body} title={`${title} are not configured yet`} />
      </Surface>
    </div>
  );
}
