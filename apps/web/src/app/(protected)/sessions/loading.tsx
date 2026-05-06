import { EmptyState, Surface } from "@dnd/ui";

export default function SessionsLoading() {
  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
          Sessions
        </p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight">
          Loading session notes
        </h2>
      </section>

      <Surface className="p-5">
        <EmptyState
          body="The current campaign session log is loading."
          title="Loading sessions"
        />
      </Surface>
    </div>
  );
}
