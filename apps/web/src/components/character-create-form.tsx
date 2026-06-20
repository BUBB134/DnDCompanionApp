"use client";

import type {
  Campaign,
  CharacterCreationOption,
  CharacterCreationOptionCategory,
} from "@dnd/types";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createCharacterAction } from "@/characters/actions";
import {
  validateCharacterCreationStep,
  type CharacterCreationStepId,
} from "@/characters/creation-profile";
import {
  createCharacterActionState,
  type CharacterFormValues,
} from "@/characters/manage-character";
import { CharacterFormNotice } from "@/components/character-form-fields";

type CharacterCreateFormProps = {
  campaign: Campaign;
  draftOwnerId: string;
  loadNotice?: string | null;
  options: CharacterCreationOption[];
};

type CreationStep = {
  body: string;
  id: CharacterCreationStepId;
  title: string;
};

type StoredDraft = {
  currentStepIndex: number;
  values: CharacterFormValues;
};

const creationSteps: readonly CreationStep[] = [
  {
    body: "Give the table a clear first impression of who is arriving.",
    id: "identity",
    title: "Identity",
  },
  {
    body: "Choose the play style and signature actions you want close at hand.",
    id: "class",
    title: "Class",
  },
  {
    body: "Add inherited perspective and the life your character lived before adventuring.",
    id: "roots",
    title: "Roots",
  },
  {
    body: "Choose a roleplay direction, then make it personal in a few lines.",
    id: "roleplay",
    title: "Roleplay",
  },
  {
    body: "Review the companion profile that will be created for this campaign.",
    id: "review",
    title: "Review",
  },
] as const;

const inputClassName =
  "mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25";
const textareaClassName =
  "mt-2 min-h-28 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 py-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25";

export function CharacterCreateForm({
  campaign,
  draftOwnerId,
  loadNotice = null,
  options,
}: CharacterCreateFormProps) {
  const initialState = useMemo(
    () =>
      createCharacterActionState({
        campaignId: campaign.id,
        creationMode: "guided",
      }),
    [campaign.id],
  );
  const [state, formAction] = useActionState(
    createCharacterAction,
    initialState,
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [draft, setDraft] = useState<CharacterFormValues>(initialState.values);
  const [stepError, setStepError] = useState<string | null>(null);
  const hasLoadedStoredDraftRef = useRef(false);
  const currentStep = creationSteps[currentStepIndex] ?? creationSteps[0]!;
  const groupedOptions = useMemo(() => groupOptions(options), [options]);
  const selectedClass = findOption(
    groupedOptions.class,
    "slug",
    draft.classOptionSlug,
  );
  const selectedAncestry = findOption(
    groupedOptions.ancestry,
    "slug",
    draft.ancestryOptionSlug,
  );
  const selectedBackground = findOption(
    groupedOptions.background,
    "slug",
    draft.backgroundOptionSlug,
  );
  const selectedTrait = findOption(
    groupedOptions["roleplay-trait"],
    "slug",
    draft.roleplayTraitOptionSlug,
  );
  const draftStorageKey =
    `dnd-character-creation-draft-v1:${draftOwnerId}:${campaign.id}`;

  useEffect(() => {
    const storedDraft = readStoredDraft(draftStorageKey);

    if (storedDraft) {
      queueMicrotask(() => {
        setDraft({
          ...initialState.values,
          ...storedDraft.values,
          campaignId: campaign.id,
          creationMode: "guided",
        });
        setCurrentStepIndex(
          Math.min(
            Math.max(storedDraft.currentStepIndex, 0),
            creationSteps.length - 1,
          ),
        );
        hasLoadedStoredDraftRef.current = true;
      });
      return;
    }

    hasLoadedStoredDraftRef.current = true;
  }, [campaign.id, draftStorageKey, initialState.values]);

  useEffect(() => {
    if (!hasLoadedStoredDraftRef.current) {
      return;
    }

    writeStoredDraft(draftStorageKey, {
      currentStepIndex,
      values: draft,
    });
  }, [currentStepIndex, draft, draftStorageKey]);

  useEffect(() => {
    const errorStepIndex = findFirstErrorStepIndex(state);

    if (errorStepIndex !== null || state.formError) {
      queueMicrotask(() => {
        setDraft({
          ...state.values,
          campaignId: campaign.id,
          creationMode: "guided",
        });
      });
    }

    if (errorStepIndex !== null) {
      queueMicrotask(() => {
        setCurrentStepIndex(errorStepIndex);
      });
    }
  }, [campaign.id, state]);

  function updateDraft(field: keyof CharacterFormValues, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
    setStepError(null);
  }

  function selectOption(option: CharacterCreationOption) {
    if (option.category === "class") {
      setDraft((currentDraft) => ({
        ...currentDraft,
        className: option.name,
        classOptionSlug: option.slug,
      }));
      setStepError(null);
      return;
    }

    if (option.category === "ancestry") {
      setDraft((currentDraft) => ({
        ...currentDraft,
        ancestry: option.name,
        ancestryOptionSlug: option.slug,
      }));
      setStepError(null);
      return;
    }

    if (option.category === "background") {
      setDraft((currentDraft) => ({
        ...currentDraft,
        background: option.name,
        backgroundOptionSlug: option.slug,
      }));
      setStepError(null);
      return;
    }

    const previousTrait = findOption(
      groupedOptions["roleplay-trait"],
      "slug",
      draft.roleplayTraitOptionSlug,
    );

    setDraft((currentDraft) => ({
      ...currentDraft,
      roleplayTraitOptionSlug: option.slug,
      summary:
        !currentDraft.summary.trim() ||
        currentDraft.summary === previousTrait?.summary
          ? option.summary
          : currentDraft.summary,
    }));
    setStepError(null);
  }

  function goToNextStep() {
    const error = validateCharacterCreationStep(
      currentStep.id,
      draft,
      draft.roleplayTraitOptionSlug,
    );

    if (error) {
      setStepError(error);
      return;
    }

    setCurrentStepIndex((index) =>
      Math.min(index + 1, creationSteps.length - 1),
    );
    setStepError(null);
  }

  function goToPreviousStep() {
    setCurrentStepIndex((index) => Math.max(index - 1, 0));
    setStepError(null);
  }

  function goToStep(stepIndex: number) {
    if (stepIndex > currentStepIndex) {
      const error = validateCharacterCreationStep(
        currentStep.id,
        draft,
        draft.roleplayTraitOptionSlug,
      );

      if (error) {
        setStepError(error);
        return;
      }
    }

    setCurrentStepIndex(stepIndex);
    setStepError(null);
  }

  function clearStoredDraftOnSubmit() {
    removeStoredDraft(draftStorageKey);
  }

  return (
    <form
      action={formAction}
      className="grid gap-6"
      noValidate
      onSubmit={clearStoredDraftOnSubmit}
    >
      <input name="abilities" type="hidden" value="" />
      <input name="ancestry" type="hidden" value={draft.ancestry} />
      <input
        name="ancestryOptionSlug"
        type="hidden"
        value={draft.ancestryOptionSlug}
      />
      <input name="background" type="hidden" value={draft.background} />
      <input
        name="backgroundOptionSlug"
        type="hidden"
        value={draft.backgroundOptionSlug}
      />
      <input name="campaignId" type="hidden" value={campaign.id} />
      <input name="characterId" type="hidden" value="" />
      <input name="className" type="hidden" value={draft.className} />
      <input
        name="classOptionSlug"
        type="hidden"
        value={draft.classOptionSlug}
      />
      <input name="creationMode" type="hidden" value="guided" />
      <input name="inventoryNotes" type="hidden" value="" />
      <input name="revision" type="hidden" value="" />

      <div className="rounded-xl border border-[#17161f]/10 bg-[linear-gradient(135deg,#17161f,#2d2937)] p-5 text-white shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e4c57c]">
          Guided character creation
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">
          Bring someone memorable to {campaign.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">
          Make a few clear choices, understand what they mean at the table, and
          arrive at a lightweight companion profile ready for the first session.
        </p>
      </div>

      <div className="grid gap-3" aria-label="Character creation progress">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {creationSteps.map((step, stepIndex) => (
            <button
              aria-current={currentStep.id === step.id ? "step" : undefined}
              className={
                currentStep.id === step.id
                  ? "min-h-10 shrink-0 rounded-full border border-[#1f6f78] bg-[#e7f5f6] px-3 py-2 text-sm font-semibold text-[#164f56]"
                  : "min-h-10 shrink-0 rounded-full border border-[#17161f]/15 bg-white px-3 py-2 text-sm font-semibold text-[#4b4657] transition hover:border-[#1f6f78]"
              }
              key={step.id}
              onClick={() => goToStep(stepIndex)}
              type="button"
            >
              {stepIndex + 1}. {step.title}
            </button>
          ))}
        </div>
        <div
          aria-label={`Step ${currentStepIndex + 1} of ${creationSteps.length}`}
          aria-valuemax={creationSteps.length}
          aria-valuemin={1}
          aria-valuenow={currentStepIndex + 1}
          className="h-2 overflow-hidden rounded-full bg-[#17161f]/10"
          role="progressbar"
        >
          <div
            className="h-full bg-[#1f6f78] transition-all"
            style={{
              width: `${((currentStepIndex + 1) / creationSteps.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {loadNotice ? (
        <div
          className="rounded-lg border border-[#c3943e]/45 bg-[#fff7de] px-4 py-3 text-sm text-[#5c4212]"
          role="status"
        >
          {loadNotice}
        </div>
      ) : null}
      <CharacterFormNotice
        error={state.formError}
        success={state.successMessage}
      />
      {stepError ? (
        <div
          className="rounded-lg border border-[#8b2f39]/25 bg-[#f9e8ea] px-4 py-3 text-sm text-[#6f2430]"
          role="alert"
        >
          {stepError}
        </div>
      ) : null}

      <fieldset className="grid gap-5" hidden={currentStep.id !== "identity"}>
        <legend className="sr-only">Character identity</legend>
        <StepHeader step={creationSteps[0]!} />
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(8rem,0.6fr)]">
          <TextField
            error={state.fieldErrors.name}
            field="name"
            label="Character name"
            onChange={updateDraft}
            placeholder="Mira Voss"
            required
            value={draft.name}
          />
          <TextField
            error={state.fieldErrors.level}
            field="level"
            label="Starting level"
            max={20}
            min={1}
            onChange={updateDraft}
            required
            type="number"
            value={draft.level}
          />
        </div>
        <div className="rounded-lg border border-[#c3943e]/35 bg-[#fff7de] p-4">
          <p className="text-sm font-semibold text-[#5c4212]">
            Keep the first pass light
          </p>
          <p className="mt-2 text-sm leading-6 text-[#4b4657]">
            This creates an at-table companion, not a complete rules sheet.
            Exact statistics, equipment, and spell choices can stay in your
            usual character tool for now.
          </p>
        </div>
      </fieldset>

      <fieldset className="grid gap-5" hidden={currentStep.id !== "class"}>
        <legend className="sr-only">Choose a class</legend>
        <StepHeader step={creationSteps[1]!} />
        <OptionGrid
          label="Class choices"
          onSelect={selectOption}
          options={groupedOptions.class}
          selectedSlug={selectedClass?.slug ?? ""}
        />
        <FieldError error={state.fieldErrors.className} id="className-error" />
        {selectedClass?.magicCapable ? (
          <div className="rounded-lg border border-[#1f6f78]/25 bg-[#e7f5f6] p-4">
            <p className="text-sm font-semibold text-[#164f56]">
              Spellbook-ready foundation
            </p>
            <p className="mt-2 text-sm leading-6 text-[#4b4657]">
              This profile records spellcasting as an ability reminder. A later
              spellbook flow can attach prepared spells and slot state without
              replacing this character.
            </p>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="grid gap-6" hidden={currentStep.id !== "roots"}>
        <legend className="sr-only">Choose ancestry and background</legend>
        <StepHeader step={creationSteps[2]!} />
        <div>
          <h3 className="text-lg font-semibold">Ancestry or species</h3>
          <p className="mt-1 text-sm leading-6 text-[#4b4657]">
            Choose the perspective and inherited qualities that fit your idea.
          </p>
          <OptionGrid
            label="Ancestry choices"
            onSelect={selectOption}
            options={groupedOptions.ancestry}
            selectedSlug={selectedAncestry?.slug ?? ""}
          />
          <FieldError error={state.fieldErrors.ancestry} id="ancestry-error" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Background</h3>
          <p className="mt-1 text-sm leading-6 text-[#4b4657]">
            Pick the experience that gives your character contacts, habits, and
            a useful way into the campaign.
          </p>
          <OptionGrid
            label="Background choices"
            onSelect={selectOption}
            options={groupedOptions.background}
            selectedSlug={selectedBackground?.slug ?? ""}
          />
          <FieldError
            error={state.fieldErrors.background}
            id="background-error"
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-5" hidden={currentStep.id !== "roleplay"}>
        <legend className="sr-only">Choose a roleplay direction</legend>
        <StepHeader step={creationSteps[3]!} />
        <OptionGrid
          label="Roleplay directions"
          onSelect={selectOption}
          options={groupedOptions["roleplay-trait"]}
          selectedSlug={draft.roleplayTraitOptionSlug}
        />
        <FieldError
          error={state.fieldErrors.roleplayTraitOptionSlug}
          id="roleplayTraitOptionSlug-error"
        />
        <TextAreaField
          error={state.fieldErrors.summary}
          field="summary"
          help="This player-visible snapshot appears in campaign character lists."
          label="First impression"
          onChange={updateDraft}
          placeholder="What does the table understand about this character in one glance?"
          value={draft.summary}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <TextAreaField
            error={state.fieldErrors.backstory}
            field="backstory"
            label="One piece of backstory"
            onChange={updateDraft}
            placeholder="What happened before the campaign that still matters now?"
            value={draft.backstory}
          />
          <TextAreaField
            error={state.fieldErrors.goals}
            field="goals"
            label="What do they want?"
            onChange={updateDraft}
            placeholder="A goal the DM can put pressure on during play."
            value={draft.goals}
          />
          <TextAreaField
            error={state.fieldErrors.relationships}
            field="relationships"
            label="Who matters to them?"
            onChange={updateDraft}
            placeholder="A person, faction, debt, promise, or rivalry."
            value={draft.relationships}
          />
          <TextAreaField
            error={state.fieldErrors.personalNotes}
            field="personalNotes"
            help="Visible only to this character's owner and campaign DMs."
            label="Private player note"
            onChange={updateDraft}
            placeholder="A fear, secret, or question you want the DM to know."
            value={draft.personalNotes}
          />
        </div>
      </fieldset>

      <section className="grid gap-5" hidden={currentStep.id !== "review"}>
        <StepHeader step={creationSteps[4]!} />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="rounded-xl border border-[#17161f]/10 bg-[#fffaf0] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b2f39]">
              Ready for the campaign
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {draft.name.trim() || "Unnamed character"}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#164f56]">
              Level {draft.level || "1"} {draft.ancestry || "Unchosen ancestry"}{" "}
              {draft.className || "Unchosen class"}
            </p>
            <p className="mt-4 text-sm leading-6 text-[#4b4657]">
              {draft.summary.trim() || "Add a short first impression."}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ReviewItem
                label="Background"
                value={draft.background || "Not chosen"}
              />
              <ReviewItem
                label="Roleplay direction"
                value={selectedTrait?.name || "Custom"}
              />
              <ReviewItem
                label="Goal"
                value={draft.goals || "Discover it in play"}
              />
              <ReviewItem
                label="Relationship"
                value={draft.relationships || "Open for the first session"}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-xl border border-[#1f6f78]/20 bg-[#e7f5f6] p-4">
              <p className="text-sm font-semibold text-[#164f56]">
                Starting ability reminders
              </p>
              {selectedClass?.abilities.length ? (
                <ul className="mt-3 grid gap-3">
                  {selectedClass.abilities.map((ability) => (
                    <li
                      className="rounded-lg border border-[#1f6f78]/15 bg-white/75 p-3"
                      key={ability.name}
                    >
                      <p className="text-sm font-semibold">{ability.name}</p>
                      <p className="mt-1 text-sm leading-6 text-[#4b4657]">
                        {ability.summary}
                      </p>
                      {ability.trigger ? (
                        <p className="mt-2 text-xs font-semibold text-[#164f56]">
                          {ability.trigger}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm leading-6 text-[#4b4657]">
                  Choose a class to add concise ability reminders.
                </p>
              )}
            </div>

            {campaign.role === "dm" ? (
              <div>
                <label
                  className="text-sm font-semibold text-[#17161f]"
                  htmlFor="guided-character-visibility"
                >
                  Character visibility
                </label>
                <select
                  className={inputClassName}
                  id="guided-character-visibility"
                  name="visibility"
                  onChange={(event) =>
                    updateDraft("visibility", event.target.value)
                  }
                  value={draft.visibility}
                >
                  <option value="player-safe">Player-safe summary</option>
                  <option value="dm-only">DM and owner only</option>
                </select>
                <FieldError
                  error={state.fieldErrors.visibility}
                  id="visibility-error"
                />
              </div>
            ) : (
              <input name="visibility" type="hidden" value="player-safe" />
            )}
          </div>
        </div>
      </section>

      <input name="backstory" type="hidden" value={draft.backstory} />
      <input name="goals" type="hidden" value={draft.goals} />
      <input name="level" type="hidden" value={draft.level} />
      <input name="name" type="hidden" value={draft.name} />
      <input name="personalNotes" type="hidden" value={draft.personalNotes} />
      <input name="relationships" type="hidden" value={draft.relationships} />
      <input
        name="roleplayTraitOptionSlug"
        type="hidden"
        value={draft.roleplayTraitOptionSlug}
      />
      <input name="summary" type="hidden" value={draft.summary} />

      <div className="flex flex-col-reverse gap-3 border-t border-[#17161f]/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="min-h-11 rounded-md border border-[#17161f]/15 bg-white px-4 py-2 text-sm font-semibold transition hover:border-[#1f6f78] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentStepIndex === 0}
          onClick={goToPreviousStep}
          type="button"
        >
          Back
        </button>

        {currentStep.id === "review" ? (
          <SubmitButton />
        ) : (
          <button
            className="min-h-11 rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
            onClick={goToNextStep}
            type="button"
          >
            Continue
          </button>
        )}
      </div>
    </form>
  );
}

function StepHeader({ step }: { step: CreationStep }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b2f39]">
        Step {creationSteps.findIndex((item) => item.id === step.id) + 1}
      </p>
      <h2 className="mt-1 text-2xl font-semibold">{step.title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4b4657]">
        {step.body}
      </p>
    </div>
  );
}

function OptionGrid({
  label,
  onSelect,
  options,
  selectedSlug,
}: {
  label: string;
  onSelect: (option: CharacterCreationOption) => void;
  options: CharacterCreationOption[];
  selectedSlug: string;
}) {
  return (
    <div
      aria-label={label}
      className="mt-3 grid gap-3 md:grid-cols-2"
      role="radiogroup"
    >
      {options.map((option) => {
        const isSelected = option.slug === selectedSlug;

        return (
          <div
            className={
              isSelected
                ? "rounded-xl border border-[#1f6f78] bg-[#e7f5f6] p-4 shadow-sm ring-2 ring-[#1f6f78]/15"
                : "rounded-xl border border-[#17161f]/12 bg-white p-4 shadow-sm transition hover:border-[#1f6f78]/55 hover:bg-[#fffaf0]"
            }
            key={option.id}
          >
            <label className="block cursor-pointer">
              <input
                checked={isSelected}
                className="sr-only"
                name={`guided-${option.category}`}
                onChange={() => onSelect(option)}
                type="radio"
                value={option.slug}
              />
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-lg font-semibold">
                    {option.name}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[#4b4657]">
                    {option.summary}
                  </span>
                </span>
                <span
                  className={
                    isSelected
                      ? "rounded-full bg-[#1f6f78] px-2.5 py-1 text-xs font-semibold text-white"
                      : "rounded-full border border-[#17161f]/15 px-2.5 py-1 text-xs font-semibold text-[#6d6578]"
                  }
                >
                  {isSelected ? "Chosen" : "Choose"}
                </span>
              </span>
              <span className="mt-3 block text-sm font-medium text-[#17161f]">
                {option.gameplay}
              </span>
              <span className="mt-3 flex flex-wrap gap-2">
                {option.traits.map((trait) => (
                  <span
                    className="rounded-full border border-[#c3943e]/35 bg-[#fff7de] px-2.5 py-1 text-xs font-semibold text-[#5c4212]"
                    key={trait}
                  >
                    {trait}
                  </span>
                ))}
              </span>
            </label>
            <details className="mt-4 border-t border-[#17161f]/10 pt-3">
              <summary className="cursor-pointer text-sm font-semibold text-[#164f56]">
                Actions, proficiencies, and quirks
              </summary>
              <div className="mt-3 grid gap-3 text-sm leading-6 text-[#4b4657]">
                <OptionDetail label="At the table" values={option.actions} />
                <OptionDetail
                  label="Proficiencies"
                  values={option.proficiencies}
                />
                <OptionDetail label="Quirks" values={option.quirks} />
                <p className="italic">{option.flavour}</p>
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );
}

function OptionDetail({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="font-semibold text-[#17161f]">{label}</p>
      <p>{values.join(" / ")}</p>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#17161f]/10 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8b2f39]">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 text-[#4b4657]">{value}</p>
    </div>
  );
}

function TextField({
  error,
  field,
  label,
  max,
  min,
  onChange,
  placeholder,
  required,
  type = "text",
  value,
}: {
  error?: string;
  field: keyof CharacterFormValues;
  label: string;
  max?: number;
  min?: number;
  onChange: (field: keyof CharacterFormValues, value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "number" | "text";
  value: string;
}) {
  const errorId = error ? `${field}-error` : undefined;

  return (
    <div>
      <label className="text-sm font-semibold text-[#17161f]" htmlFor={field}>
        {label}
      </label>
      <input
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className={inputClassName}
        id={field}
        max={max}
        min={min}
        onChange={(event) => onChange(field, event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
      <FieldError error={error} id={errorId} />
    </div>
  );
}

function TextAreaField({
  error,
  field,
  help,
  label,
  onChange,
  placeholder,
  value,
}: {
  error?: string;
  field: keyof CharacterFormValues;
  help?: string;
  label: string;
  onChange: (field: keyof CharacterFormValues, value: string) => void;
  placeholder: string;
  value: string;
}) {
  const errorId = error ? `${field}-error` : undefined;
  const helpId = help ? `${field}-help` : undefined;

  return (
    <div>
      <label className="text-sm font-semibold text-[#17161f]" htmlFor={field}>
        {label}
      </label>
      {help ? (
        <p className="mt-1 text-xs leading-5 text-[#6d6578]" id={helpId}>
          {help}
        </p>
      ) : null}
      <textarea
        aria-describedby={
          [helpId, errorId].filter(Boolean).join(" ") || undefined
        }
        aria-invalid={error ? true : undefined}
        className={textareaClassName}
        id={field}
        onChange={(event) => onChange(field, event.target.value)}
        placeholder={placeholder}
        rows={4}
        value={value}
      />
      <FieldError error={error} id={errorId} />
    </div>
  );
}

function FieldError({ error, id }: { error?: string; id?: string }) {
  if (!error || !id) {
    return null;
  }

  return (
    <p className="mt-2 text-sm text-[#8b2f39]" id={id}>
      {error}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-11 rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Creating character..." : "Create character"}
    </button>
  );
}

function groupOptions(options: CharacterCreationOption[]) {
  const grouped: Record<
    CharacterCreationOptionCategory,
    CharacterCreationOption[]
  > = {
    ancestry: [],
    background: [],
    class: [],
    "roleplay-trait": [],
  };

  for (const option of options) {
    grouped[option.category].push(option);
  }

  return grouped;
}

function findOption(
  options: CharacterCreationOption[],
  field: "name" | "slug",
  value: string,
) {
  return options.find((option) => option[field] === value) ?? null;
}

function findFirstErrorStepIndex(
  state: ReturnType<typeof createCharacterActionState>,
) {
  if (state.fieldErrors.name || state.fieldErrors.level) {
    return 0;
  }

  if (state.fieldErrors.className || state.fieldErrors.abilities) {
    return 1;
  }

  if (state.fieldErrors.ancestry || state.fieldErrors.background) {
    return 2;
  }

  if (
    state.fieldErrors.summary ||
    state.fieldErrors.backstory ||
    state.fieldErrors.goals ||
    state.fieldErrors.relationships ||
    state.fieldErrors.personalNotes ||
    state.fieldErrors.roleplayTraitOptionSlug
  ) {
    return 3;
  }

  if (state.fieldErrors.visibility) {
    return 4;
  }

  return null;
}

function readStoredDraft(storageKey: string): StoredDraft | null {
  try {
    const storedValue = window.localStorage.getItem(storageKey);

    if (!storedValue) {
      return null;
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (!parsedValue || typeof parsedValue !== "object") {
      return null;
    }

    const draft = parsedValue as Partial<StoredDraft>;

    if (
      typeof draft.currentStepIndex !== "number" ||
      !draft.values ||
      typeof draft.values !== "object"
    ) {
      return null;
    }

    return {
      currentStepIndex: draft.currentStepIndex,
      values: Object.fromEntries(
        Object.entries(draft.values).filter(
          ([, value]) => typeof value === "string",
        ),
      ) as CharacterFormValues,
    };
  } catch {
    return null;
  }
}

function writeStoredDraft(storageKey: string, draft: StoredDraft) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Server persistence remains available when browser draft storage is blocked.
  }
}

function removeStoredDraft(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // A successful server submission should not depend on browser storage.
  }
}
