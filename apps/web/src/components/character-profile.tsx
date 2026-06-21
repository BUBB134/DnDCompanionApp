import type {
  Campaign,
  CampaignCharacterView,
} from "@dnd/types";
import type { Route } from "next";
import Link from "next/link";
import { EmptyState, StatusPill, Surface } from "@dnd/ui";
import type { CharacterActionHotbarModel } from "@/characters/action-hotbar";
import { CharacterActionHotbar } from "@/components/character-action-hotbar";
import { CharacterEditForm } from "@/components/character-edit-form";

type CharacterProfileProps = {
  campaign: Campaign;
  character: CampaignCharacterView;
  hotbar: CharacterActionHotbarModel | null;
  hotbarLoadNotice: string | null;
};

export function CharacterProfile({
  campaign,
  character,
  hotbar,
  hotbarLoadNotice,
}: CharacterProfileProps) {
  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#17161f]/10 bg-white/85 p-4 shadow-sm sm:p-5">
        <Link
          className="text-sm font-semibold text-[#164f56] underline decoration-[#1f6f78]/45 underline-offset-4"
          href={`/campaigns/${campaign.id}/characters` as Route}
        >
          Back to characters
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
              {campaign.name}
            </p>
            <h2 className="mt-1 text-3xl font-semibold leading-tight">
              {character.name}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4b4657]">
              {character.summary || "No short profile yet."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="teal">Level {character.level}</StatusPill>
            {character.className ? (
              <StatusPill tone="gold">{character.className}</StatusPill>
            ) : null}
            <StatusPill
              tone={character.accessLevel === "full" ? "red" : "teal"}
            >
              {character.accessLevel === "full"
                ? "Full profile"
                : "Player-safe summary"}
            </StatusPill>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
        <div className="grid gap-5">
          <Surface className="p-5">
            <h2 className="text-lg font-semibold">Identity</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <Detail label="Class" value={character.className} />
              <Detail label="Ancestry / species" value={character.ancestry} />
              <Detail label="Background" value={character.background} />
            </dl>
          </Surface>

          {character.accessLevel === "summary" ? (
            <Surface className="p-5">
              <EmptyState
                body="Only this character's player and campaign DMs can open backstory, goals, relationships, inventory, abilities, and personal notes."
                title="Private character details"
              />
            </Surface>
          ) : (
            <>
              {hotbar ? (
                <CharacterActionHotbar
                  campaignId={campaign.id}
                  characterId={character.id}
                  hotbar={hotbar}
                  loadNotice={hotbarLoadNotice}
                />
              ) : null}

              <Surface className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
                      Character progression
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                      Level-up history
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#4b4657]">
                      Record meaningful changes and add the new reminders that
                      should appear in the live action bar.
                    </p>
                  </div>
                  {character.canEdit && character.level < 20 ? (
                    <Link
                      className="inline-flex min-h-11 shrink-0 items-center rounded-md bg-[#8b2f39] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6f2430] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
                      href={
                        `/campaigns/${campaign.id}/characters/${character.id}/level-up` as Route
                      }
                    >
                      Start level-up
                    </Link>
                  ) : (
                    <StatusPill tone="gold">
                      {character.level >= 20
                        ? "Level 20 reached"
                        : "View only"}
                    </StatusPill>
                  )}
                </div>
                <div className="mt-4 grid gap-3">
                  {(character.progressions ?? []).length === 0 ? (
                    <EmptyState
                      body="The first guided level-up will add a milestone here with its new feature reminders."
                      title="No level-ups recorded yet"
                    />
                  ) : (
                    (character.progressions ?? []).map((progression) => (
                      <article
                        className="rounded-lg border border-[#c3943e]/25 bg-[#fff7df] p-4"
                        key={progression.id}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-semibold">
                            Level {progression.fromLevel} →{" "}
                            {progression.toLevel}
                          </h3>
                          <StatusPill tone="gold">
                            {progression.features.length} new
                          </StatusPill>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#4b4657]">
                          {progression.summary}
                        </p>
                        <p className="mt-3 text-xs font-medium text-[#6d6578]">
                          {progression.features
                            .map((feature) => feature.name)
                            .join(" · ")}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </Surface>

              <Surface className="p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
                  Spellbook setup
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  Manage spells and slots
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#4b4657]">
                  Configure the spells and slot pools that feed the live action
                  bar above.
                </p>
                <Link
                  className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
                  href={
                    `/campaigns/${campaign.id}/characters/${character.id}/spellbook` as Route
                  }
                >
                  Open spellbook
                </Link>
              </Surface>

              <Surface className="p-5">
                <h2 className="text-lg font-semibold">Character story</h2>
                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <LongDetail label="Backstory" value={character.backstory} />
                  <LongDetail label="Goals" value={character.goals} />
                  <LongDetail
                    label="Relationships"
                    value={character.relationships}
                  />
                  <LongDetail
                    label="Inventory notes"
                    value={character.inventoryNotes}
                  />
                </div>
              </Surface>

              <Surface className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Ability summaries</h2>
                  <StatusPill tone="gold">
                    {character.abilities.length} ready
                  </StatusPill>
                </div>
                <div className="mt-4 grid gap-3">
                  {character.abilities.length === 0 ? (
                    <EmptyState
                      body="Add short reminders for the actions, features, or reactions this character uses at the table."
                      title="No abilities yet"
                    />
                  ) : (
                    character.abilities.map((ability) => (
                      <article
                        className="rounded-lg border border-[#1f6f78]/20 bg-[#e7f5f6] p-4"
                        key={ability.id}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-semibold">{ability.name}</h3>
                          {ability.trigger ? (
                            <StatusPill tone="teal">{ability.trigger}</StatusPill>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#4b4657]">
                          {ability.summary}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </Surface>
            </>
          )}
        </div>

        <div className="grid content-start gap-5">
          <Surface className="p-5">
            <h2 className="text-lg font-semibold">Player</h2>
            <p className="mt-2 text-sm leading-6 text-[#4b4657]">
              {character.ownerName || "No player name available"}
            </p>
            {character.isOwnedByCurrentUser ? (
              <div className="mt-3">
                <StatusPill tone="red">Your character</StatusPill>
              </div>
            ) : null}
          </Surface>

          {character.accessLevel === "full" ? (
            <>
              <Surface className="p-5">
                <LongDetail
                  label="Personal notes"
                  value={character.personalNotes}
                />
                <p className="mt-3 text-xs leading-5 text-[#6d6578]">
                  Personal notes are visible only to the character owner and DMs.
                </p>
              </Surface>

              {character.canEdit ? (
                <Surface className="p-5">
                  <CharacterEditForm
                    campaign={campaign}
                    character={character}
                  />
                </Surface>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#1f6f78]">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-6 text-[#17161f]">
        {value || "Not set yet"}
      </dd>
    </div>
  );
}

function LongDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#1f6f78]">
        {label}
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4b4657]">
        {value || "Not set yet."}
      </p>
    </div>
  );
}
