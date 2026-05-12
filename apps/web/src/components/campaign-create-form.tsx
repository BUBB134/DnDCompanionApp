"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createCampaignAction } from "@/campaigns/actions";
import {
  initialCreateCampaignActionState,
  type CreateCampaignActionState,
  type CreateCampaignValues,
} from "@/campaigns/create-campaign";

const DRAFT_STORAGE_KEY = "dnd-campaign-onboarding-draft-v1";

type StepId = "identity" | "feel" | "opening" | "launch";

type OnboardingStep = {
  body: string;
  id: StepId;
  title: string;
};

const onboardingSteps: readonly OnboardingStep[] = [
  {
    body: "Name the table and capture the shortest useful promise of the campaign.",
    id: "identity",
    title: "Campaign identity",
  },
  {
    body: "Set the table feel so the dashboard can carry the right context forward.",
    id: "feel",
    title: "Table feel",
  },
  {
    body: "Seed a first session so the campaign opens with momentum instead of blank space.",
    id: "opening",
    title: "Opening scene",
  },
  {
    body: "Review the setup and launch into the new campaign context.",
    id: "launch",
    title: "Launch",
  },
] as const;

const rulesetOptions = ["D&D 5e", "Tales of the Valiant", "Homebrew"] as const;
const toneOptions = [
  "Heroic fantasy",
  "Mystery and intrigue",
  "Dark survival",
  "Lighthearted adventure",
] as const;

export function CampaignCreateForm() {
  const [state, formAction] = useActionState(
    createCampaignAction,
    initialCreateCampaignActionState,
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [draft, setDraft] = useState<CreateCampaignValues>(state.values);
  const hasLoadedStoredDraftRef = useRef(false);
  const skipNextDraftPersistRef = useRef(false);
  const currentStep = onboardingSteps[currentStepIndex] ?? onboardingSteps[0]!;
  const progressValue = currentStepIndex + 1;
  const completionSummary = useMemo(() => createCompletionSummary(draft), [draft]);

  useEffect(() => {
    const storedDraft = readStoredDraft();

    if (storedDraft) {
      skipNextDraftPersistRef.current = true;
      queueMicrotask(() => {
        setDraft((currentDraft) => ({
          ...currentDraft,
          ...storedDraft,
        }));
      });
    }

    hasLoadedStoredDraftRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredDraftRef.current) {
      return;
    }

    if (skipNextDraftPersistRef.current) {
      skipNextDraftPersistRef.current = false;
      return;
    }

    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    const errorStepIndex = findFirstErrorStepIndex(state);

    if (errorStepIndex !== null || state.formError) {
      queueMicrotask(() => {
        setDraft(state.values);
      });
    }

    if (errorStepIndex !== null) {
      queueMicrotask(() => {
        setCurrentStepIndex(errorStepIndex);
      });
    }
  }, [state]);

  function updateDraft(field: keyof CreateCampaignValues, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  function goToNextStep() {
    setCurrentStepIndex((index) =>
      Math.min(index + 1, onboardingSteps.length - 1),
    );
  }

  function goToPreviousStep() {
    setCurrentStepIndex((index) => Math.max(index - 1, 0));
  }

  function clearStoredDraftOnSubmit() {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  }

  return (
    <form
      action={formAction}
      className="grid gap-5"
      onSubmit={clearStoredDraftOnSubmit}
    >
      <div>
        <p className="text-sm font-semibold uppercase text-[#8b2f39]">
          Guided setup
        </p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight">
          Start a campaign
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#4b4657]">
          Shape the first useful campaign record, then jump straight into the
          campaign dashboard.
        </p>
      </div>

      <div className="grid gap-2" aria-label="Campaign setup progress">
        <div className="flex flex-wrap gap-2">
          {onboardingSteps.map((step, stepIndex) => (
            <button
              aria-current={currentStep.id === step.id ? "step" : undefined}
              className={
                currentStep.id === step.id
                  ? "min-h-10 rounded-md border border-[#1f6f78] bg-[#e7f5f6] px-3 py-2 text-sm font-semibold text-[#164f56]"
                  : "min-h-10 rounded-md border border-[#17161f]/15 bg-white px-3 py-2 text-sm font-semibold text-[#4b4657] transition hover:border-[#1f6f78]"
              }
              key={step.id}
              onClick={() => setCurrentStepIndex(stepIndex)}
              type="button"
            >
              {stepIndex + 1}. {step.title}
            </button>
          ))}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#17161f]/10">
          <div
            className="h-full bg-[#1f6f78] transition-all"
            style={{ width: `${(progressValue / onboardingSteps.length) * 100}%` }}
          />
        </div>
      </div>

      {state.formError ? (
        <div
          className="rounded-lg border border-[#8b2f39]/25 bg-[#f9e8ea] px-4 py-3 text-sm text-[#6f2430]"
          role="alert"
        >
          {state.formError}
        </div>
      ) : null}

      <fieldset className="grid gap-4" hidden={currentStep.id !== "identity"}>
        <legend className="sr-only">Campaign identity</legend>
        <StepHeader step={onboardingSteps[0]!} />
        <TextField
          autoComplete="off"
          error={state.fieldErrors.name}
          field="name"
          label="Campaign name"
          onChange={updateDraft}
          placeholder="Ashen Coast"
          value={draft.name}
        />
        <TextAreaField
          error={state.fieldErrors.summary}
          field="summary"
          label="Campaign promise"
          onChange={updateDraft}
          placeholder="A salt-bitten coast, haunted lighthouses, and too many bargains with the tide."
          value={draft.summary}
        />
      </fieldset>

      <fieldset className="grid gap-4" hidden={currentStep.id !== "feel"}>
        <legend className="sr-only">Table feel</legend>
        <StepHeader step={onboardingSteps[1]!} />
        <ChoiceGroup
          error={state.fieldErrors.ruleset}
          field="ruleset"
          label="Ruleset"
          onChange={updateDraft}
          options={rulesetOptions}
          value={draft.ruleset}
        />
        <ChoiceGroup
          error={state.fieldErrors.tone}
          field="tone"
          label="Tone"
          onChange={updateDraft}
          options={toneOptions}
          value={draft.tone}
        />
      </fieldset>

      <fieldset className="grid gap-4" hidden={currentStep.id !== "opening"}>
        <legend className="sr-only">Opening scene</legend>
        <StepHeader step={onboardingSteps[2]!} />
        <TextField
          error={state.fieldErrors.startingLocation}
          field="startingLocation"
          label="Starting location"
          onChange={updateDraft}
          placeholder="The drowned lighthouse"
          value={draft.startingLocation}
        />
        <TextField
          error={state.fieldErrors.firstSessionTitle}
          field="firstSessionTitle"
          label="First session title"
          onChange={updateDraft}
          placeholder="Session zero"
          value={draft.firstSessionTitle}
        />
        <TextAreaField
          error={state.fieldErrors.openingHook}
          field="openingHook"
          label="Opening hook"
          onChange={updateDraft}
          placeholder="Decode the salt-stained map before Captain Thorn sells it to someone worse."
          rows={4}
          value={draft.openingHook}
        />
      </fieldset>

      <section className="grid gap-4" hidden={currentStep.id !== "launch"}>
        <StepHeader step={onboardingSteps[3]!} />
        <div className="grid gap-3 rounded-lg border border-[#17161f]/10 bg-[#fffaf0] p-4">
          {completionSummary.map((item) => (
            <div className="grid gap-1" key={item.label}>
              <p className="text-xs font-semibold uppercase text-[#8b2f39]">
                {item.label}
              </p>
              <p className="text-sm leading-6 text-[#17161f]">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-[#1f6f78]/25 bg-[#e7f5f6] p-4">
          <p className="text-sm font-semibold text-[#164f56]">Invite-ready</p>
          <p className="mt-2 text-sm leading-6 text-[#4b4657]">
            The campaign dashboard will keep player onboarding visible as the
            next DM action while secure invite links are handled by the invite
            flow.
          </p>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="min-h-11 rounded-md border border-[#17161f]/15 bg-white px-4 py-2 text-sm font-semibold transition hover:border-[#1f6f78] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentStepIndex === 0}
          onClick={goToPreviousStep}
          type="button"
        >
          Back
        </button>

        {currentStep.id === "launch" ? (
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

function StepHeader({ step }: { step: OnboardingStep }) {
  return (
    <div>
      <h3 className="text-lg font-semibold">{step.title}</h3>
      <p className="mt-1 text-sm leading-6 text-[#4b4657]">{step.body}</p>
    </div>
  );
}

type TextFieldProps = {
  autoComplete?: string;
  error?: string;
  field: keyof CreateCampaignValues;
  label: string;
  onChange: (field: keyof CreateCampaignValues, value: string) => void;
  placeholder: string;
  required?: boolean;
  value: string;
};

function TextField({
  autoComplete,
  error,
  field,
  label,
  onChange,
  placeholder,
  required,
  value,
}: TextFieldProps) {
  const errorId = error ? `${field}-error` : undefined;

  return (
    <div>
      <label className="text-sm font-semibold text-[#17161f]" htmlFor={field}>
        {label}
      </label>
      <input
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        autoComplete={autoComplete}
        className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
        id={field}
        name={field}
        onChange={(event) => onChange(field, event.target.value)}
        placeholder={placeholder}
        required={required}
        type="text"
        value={value}
      />
      <FieldError error={error} id={errorId} />
    </div>
  );
}

type TextAreaFieldProps = Omit<TextFieldProps, "autoComplete" | "required"> & {
  rows?: number;
};

function TextAreaField({
  error,
  field,
  label,
  onChange,
  placeholder,
  rows = 5,
  value,
}: TextAreaFieldProps) {
  const errorId = error ? `${field}-error` : undefined;

  return (
    <div>
      <label className="text-sm font-semibold text-[#17161f]" htmlFor={field}>
        {label}
      </label>
      <textarea
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className="mt-2 min-h-28 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 py-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
        id={field}
        name={field}
        onChange={(event) => onChange(field, event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
      <FieldError error={error} id={errorId} />
    </div>
  );
}

type ChoiceGroupProps = {
  error?: string;
  field: keyof CreateCampaignValues;
  label: string;
  onChange: (field: keyof CreateCampaignValues, value: string) => void;
  options: readonly string[];
  value: string;
};

function ChoiceGroup({
  error,
  field,
  label,
  onChange,
  options,
  value,
}: ChoiceGroupProps) {
  const errorId = error ? `${field}-error` : undefined;

  return (
    <div>
      <p className="text-sm font-semibold text-[#17161f]">{label}</p>
      <div
        aria-describedby={errorId}
        aria-label={label}
        className="mt-2 grid gap-2 sm:grid-cols-2"
        role="radiogroup"
      >
        {options.map((option) => (
          <label
            className={
              value === option
                ? "min-h-12 rounded-md border border-[#1f6f78] bg-[#e7f5f6] px-3 py-3 text-sm font-semibold text-[#164f56]"
                : "min-h-12 rounded-md border border-[#17161f]/15 bg-white px-3 py-3 text-sm font-semibold text-[#4b4657] transition hover:border-[#1f6f78]"
            }
            key={option}
          >
            <input
              checked={value === option}
              className="sr-only"
              name={field}
              onChange={() => onChange(field, option)}
              type="radio"
              value={option}
            />
            {option}
          </label>
        ))}
      </div>
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
      {pending ? "Creating campaign..." : "Create campaign"}
    </button>
  );
}

function createCompletionSummary(values: CreateCampaignValues) {
  return [
    {
      label: "Campaign",
      value: values.name.trim() || "Untitled campaign",
    },
    {
      label: "Promise",
      value: values.summary.trim() || "Build the campaign in play.",
    },
    {
      label: "Table feel",
      value: [values.ruleset, values.tone].filter(Boolean).join(" / "),
    },
    {
      label: "Opening",
      value:
        values.openingHook.trim() ||
        values.startingLocation.trim() ||
        "Start with a clean first session.",
    },
  ];
}

function findFirstErrorStepIndex(state: CreateCampaignActionState) {
  const fieldErrors = state.fieldErrors;

  if (fieldErrors.name || fieldErrors.summary) {
    return 0;
  }

  if (fieldErrors.ruleset || fieldErrors.tone) {
    return 1;
  }

  if (
    fieldErrors.startingLocation ||
    fieldErrors.firstSessionTitle ||
    fieldErrors.openingHook
  ) {
    return 2;
  }

  return null;
}

function readStoredDraft(): Partial<CreateCampaignValues> | null {
  const storedValue = window.localStorage.getItem(DRAFT_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);

    if (!parsedValue || typeof parsedValue !== "object") {
      return null;
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter(
        ([, value]) => typeof value === "string",
      ),
    ) as Partial<CreateCampaignValues>;
  } catch {
    return null;
  }
}
