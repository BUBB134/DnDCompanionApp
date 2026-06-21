"use client";

import type {
  Campaign,
  CampaignCharacterFullView,
} from "@dnd/types";
import { StatusPill, Surface } from "@dnd/ui";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { completeCharacterLevelUpAction } from "@/characters/level-up-actions";
import {
  createLevelUpActionState,
  parseLevelUpFeatures,
} from "@/characters/manage-level-up";

type CharacterLevelUpFormProps = {
  campaign: Campaign;
  character: CampaignCharacterFullView;
};

const stepLabels = ["Milestone", "New features", "Review"] as const;
const textareaClassName =
  "mt-2 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 py-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25";

export function CharacterLevelUpForm({
  campaign,
  character,
}: CharacterLevelUpFormProps) {
  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState("");
  const [abilities, setAbilities] = useState("");
  const [state, formAction] = useActionState(
    completeCharacterLevelUpAction,
    createLevelUpActionState({
      campaignId: campaign.id,
      characterId: character.id,
      currentLevel: String(character.level),
      revision: character.updatedAt,
    }),
  );
  const featurePreview = parseLevelUpFeatures(abilities).features;
  const targetLevel = character.level + 1;

  if (character.level >= 20) {
    return (
      <Surface className="p-5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
          Level cap reached
        </p>
        <h1 className="mt-1 text-3xl font-semibold">
          {character.name} is already level 20
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4b4657]">
          The MVP level-up flow stops at level 20 and does not add epic-level
          progression rules.
        </p>
      </Surface>
    );
  }

  return (
    <Surface className="overflow-hidden">
      <div className="border-b border-[#17161f]/10 bg-[radial-gradient(circle_at_top_right,rgba(195,148,62,0.22),transparent_44%)] p-4 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
          Guided character progression
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-tight">
              {character.name} reaches level {targetLevel}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b4657]">
              Capture the changes that matter at the table. This adds concise
              reminders to the action bar without trying to automate every
              class rule.
            </p>
          </div>
          <div className="flex gap-2">
            <StatusPill tone="teal">Level {character.level}</StatusPill>
            <span aria-hidden="true" className="self-center text-[#6d6578]">
              →
            </span>
            <StatusPill tone="gold">Level {targetLevel}</StatusPill>
          </div>
        </div>
      </div>

      <form action={formAction} className="grid gap-6 p-4 sm:p-6">
        <input name="campaignId" type="hidden" value={campaign.id} />
        <input name="characterId" type="hidden" value={character.id} />
        <input
          name="currentLevel"
          type="hidden"
          value={character.level}
        />
        <input name="revision" type="hidden" value={character.updatedAt} />
        <input name="summary" type="hidden" value={summary} />
        <input name="abilities" type="hidden" value={abilities} />

        <ol
          aria-label="Level-up progress"
          className="grid grid-cols-3 gap-2"
        >
          {stepLabels.map((label, index) => (
            <li
              className={
                index === step
                  ? "rounded-md border border-[#1f6f78] bg-[#e7f5f6] px-2 py-2 text-center text-xs font-semibold text-[#164f56]"
                  : "rounded-md border border-[#17161f]/10 bg-[#fffaf0] px-2 py-2 text-center text-xs font-semibold text-[#6d6578]"
              }
              key={label}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>

        <LevelUpNotice
          fieldErrors={state.fieldErrors}
          formError={state.formError}
        />

        {step === 0 ? (
          <section className="grid gap-4">
            <div className="rounded-lg border border-[#c3943e]/25 bg-[#fff7df] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8b6424]">
                Milestone
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                What becomes possible at level {targetLevel}?
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#4b4657]">
                Review the class rules with your table, then record only the
                new abilities, reactions, resources, or spell reminders that
                will be useful during play.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <ProgressionFact
                label="Class"
                value={character.className || "Not set"}
              />
              <ProgressionFact
                label="Current abilities"
                value={`${character.abilities.length} reminders`}
              />
              <ProgressionFact
                label="History"
                value={`${character.progressions?.length ?? 0} level-ups recorded`}
              />
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="grid gap-5">
            <div>
              <label
                className="text-sm font-semibold text-[#17161f]"
                htmlFor="level-up-summary"
              >
                Meaningful change
              </label>
              <p
                className="mt-1 text-xs leading-5 text-[#6d6578]"
                id="level-up-summary-help"
              >
                Explain how this level changes the character in play or story.
              </p>
              <textarea
                aria-describedby={[
                  "level-up-summary-help",
                  state.fieldErrors.summary
                    ? "level-up-summary-error"
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-invalid={state.fieldErrors.summary ? true : undefined}
                className={`${textareaClassName} min-h-28`}
                id="level-up-summary"
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Mira can now control the battlefield more confidently and protect allies under pressure."
                rows={4}
                value={summary}
              />
              <FieldError
                error={state.fieldErrors.summary}
                id="level-up-summary-error"
              />
            </div>

            <div>
              <label
                className="text-sm font-semibold text-[#17161f]"
                htmlFor="level-up-abilities"
              >
                New feature reminders
              </label>
              <p
                className="mt-1 text-xs leading-5 text-[#6d6578]"
                id="level-up-abilities-help"
              >
                One per line: Name | Concise impact | Optional trigger. Add up
                to 6.
              </p>
              <textarea
                aria-describedby={[
                  "level-up-abilities-help",
                  state.fieldErrors.abilities
                    ? "level-up-abilities-error"
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-invalid={state.fieldErrors.abilities ? true : undefined}
                className={`${textareaClassName} min-h-40`}
                id="level-up-abilities"
                onChange={(event) => setAbilities(event.target.value)}
                placeholder="Extra Attack | Attack twice instead of once when taking the Attack action. | 1 action"
                rows={6}
                value={abilities}
              />
              <FieldError
                error={state.fieldErrors.abilities}
                id="level-up-abilities-error"
              />
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="grid gap-5">
            <div className="rounded-lg border border-[#1f6f78]/20 bg-[#e7f5f6] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#164f56]">
                Level {targetLevel} impact
              </p>
              <p className="mt-2 text-sm leading-6 text-[#334f53]">
                {summary || "Add a meaningful change before completing."}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">New action reminders</h2>
                <StatusPill tone="gold">
                  {featurePreview.length} new
                </StatusPill>
              </div>
              <div className="mt-3 grid gap-3">
                {featurePreview.length > 0 ? (
                  featurePreview.map((feature) => (
                    <article
                      className="rounded-lg border border-[#17161f]/10 bg-[#fffaf0] p-4"
                      key={`${feature.name}-${feature.trigger ?? ""}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold">{feature.name}</h3>
                        {feature.trigger ? (
                          <StatusPill tone="teal">
                            {feature.trigger}
                          </StatusPill>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#4b4657]">
                        {feature.summary}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-lg border border-[#8b2f39]/20 bg-[#f9e8ea] p-4 text-sm text-[#6f2430]">
                    Add at least one valid feature reminder before completing
                    the level-up.
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-[#17161f]/10 pt-5 sm:flex-row sm:justify-between">
          <button
            className="min-h-11 rounded-md border border-[#17161f]/15 bg-white px-4 py-2 text-sm font-semibold transition hover:border-[#1f6f78] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={step === 0}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            type="button"
          >
            Back
          </button>
          {step < 2 ? (
            <button
              className="min-h-11 rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
              onClick={() => setStep((current) => Math.min(2, current + 1))}
              type="button"
            >
              Continue
            </button>
          ) : (
            <LevelUpSubmitButton
              disabled={!summary.trim() || featurePreview.length === 0}
              targetLevel={targetLevel}
            />
          )}
        </div>
      </form>
    </Surface>
  );
}

function ProgressionFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#17161f]/10 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#1f6f78]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function LevelUpSubmitButton({
  disabled,
  targetLevel,
}: {
  disabled: boolean;
  targetLevel: number;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-11 rounded-md bg-[#8b2f39] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6f2430] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Recording level-up..." : `Reach level ${targetLevel}`}
    </button>
  );
}

function LevelUpNotice({
  fieldErrors,
  formError,
}: {
  fieldErrors: Record<string, string | undefined>;
  formError: string | null;
}) {
  const errors = Object.values(fieldErrors).filter(
    (error): error is string => Boolean(error),
  );

  if (!formError && errors.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg border border-[#8b2f39]/25 bg-[#f9e8ea] px-4 py-3 text-sm text-[#6f2430]"
      role="alert"
    >
      <p className="font-semibold">
        {formError || "Review the level-up details."}
      </p>
      {errors.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {[...new Set(errors)].map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FieldError({
  error,
  id,
}: {
  error?: string;
  id: string;
}) {
  return error ? (
    <p className="mt-2 text-sm text-[#8b2f39]" id={id}>
      {error}
    </p>
  ) : null;
}
