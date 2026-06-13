import type { Campaign, CampaignCharacterSummary } from "@dnd/types";
import type { Route } from "next";
import Link from "next/link";
import { EmptyState, StatusPill, Surface } from "@dnd/ui";
import { CharacterCreateForm } from "@/components/character-create-form";

type CharacterListViewProps = {
  campaign: Campaign;
  characters: CampaignCharacterSummary[];
  loadError: string | null;
};

export function CharacterListView({
  campaign,
  characters,
  loadError,
}: CharacterListViewProps) {
  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-4 rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
            {campaign.name}
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight">
            Character companions
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b4657]">
            Keep identity, goals, relationships, ability reminders, and personal
            notes close without replacing the full character sheet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="gold">{characters.length} visible</StatusPill>
          <StatusPill tone={campaign.role === "dm" ? "red" : "teal"}>
            {campaign.role === "dm" ? "DM access" : "Player access"}
          </StatusPill>
        </div>
      </section>

      {loadError ? (
        <Surface className="p-5">
          <EmptyState body={loadError} title="Characters are unavailable" />
        </Surface>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.15fr)]">
          <Surface className="p-5">
            <CharacterCreateForm campaign={campaign} />
          </Surface>

          <Surface className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Campaign characters</h2>
              <Link
                className="text-sm font-semibold text-[#164f56] underline decoration-[#1f6f78]/45 underline-offset-4"
                href={`/campaigns/${campaign.id}` as Route}
              >
                Back to campaign
              </Link>
            </div>

            <div className="mt-5 grid gap-4">
              {characters.length === 0 ? (
                <EmptyState
                  body="Create the first lightweight character profile for this campaign."
                  title="No characters yet"
                />
              ) : (
                characters.map((character) => (
                  <article
                    className="rounded-lg border border-[#17161f]/10 bg-[#fffaf0] p-4"
                    key={character.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{character.name}</h3>
                      <StatusPill tone="teal">Level {character.level}</StatusPill>
                      {character.className ? (
                        <StatusPill tone="gold">
                          {character.className}
                        </StatusPill>
                      ) : null}
                      {character.isOwnedByCurrentUser ? (
                        <StatusPill tone="red">Your character</StatusPill>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#4b4657]">
                      {character.summary || "No short profile yet."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#6d6578]">
                      {character.ancestry ? (
                        <span>{character.ancestry}</span>
                      ) : null}
                      {character.background ? (
                        <span>{character.background}</span>
                      ) : null}
                      {character.ownerName ? (
                        <span>Player: {character.ownerName}</span>
                      ) : null}
                    </div>
                    <Link
                      className="mt-4 inline-flex min-h-10 items-center rounded-md border border-[#17161f]/15 bg-white px-3 py-2 text-sm font-semibold transition hover:border-[#1f6f78] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
                      href={
                        `/campaigns/${campaign.id}/characters/${character.id}` as Route
                      }
                    >
                      Open character
                    </Link>
                  </article>
                ))
              )}
            </div>
          </Surface>
        </section>
      )}
    </div>
  );
}
