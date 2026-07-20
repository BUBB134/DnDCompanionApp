"use client";

import type { SessionRecapFormat } from "@dnd/types";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { initialSessionRecapActionState } from "@/recaps/action-state";
import { generateSessionRecapAction } from "@/recaps/actions";

const recapOptions: ReadonlyArray<{
  body: string;
  label: string;
  value: SessionRecapFormat;
}> = [
  {
    body: "A fast 50-80 word table refresher.",
    label: "Quick",
    value: "quick",
  },
  {
    body: "A 140-220 word continuity recap with more consequences and context.",
    label: "Detailed",
    value: "detailed",
  },
];

export function SessionRecapGenerator({
  campaignId,
  hasNotes,
  hasRecap,
  recapFormat = "quick",
  sessionId,
}: {
  campaignId: string;
  hasNotes: boolean;
  hasRecap: boolean;
  recapFormat?: SessionRecapFormat;
  sessionId: string;
}) {
  const [state, formAction] = useActionState(
    generateSessionRecapAction,
    initialSessionRecapActionState,
  );

  return (
    <form
      action={formAction}
      className="mt-4 rounded-xl border border-arcane-gold/25 bg-arcane-parchment/70 p-4"
    >
      <input name="campaignId" type="hidden" value={campaignId} />
      <input name="sessionId" type="hidden" value={sessionId} />
      <fieldset>
        <legend className="font-brand-display text-base font-semibold text-arcane-ink">
          Choose a recap style
        </legend>
        <p className="mt-1 text-sm leading-6 text-arcane-muted">
          Both formats use player-safe campaign memory and refresh open hooks.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {recapOptions.map((option) => (
            <label
              className="flex min-h-20 cursor-pointer gap-3 rounded-lg border border-arcane-ink/15 bg-arcane-surface p-3 transition has-[:checked]:border-arcane-teal has-[:checked]:bg-arcane-teal-soft focus-within:ring-2 focus-within:ring-arcane-teal focus-within:ring-offset-2"
              key={option.value}
            >
              <input
                className="mt-1 size-4 accent-arcane-teal"
                defaultChecked={recapFormat === option.value}
                name="recapFormat"
                type="radio"
                value={option.value}
              />
              <span>
                <span className="block text-sm font-semibold text-arcane-ink">
                  {option.label}
                </span>
                <span className="mt-1 block text-sm leading-5 text-arcane-muted">
                  {option.body}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <RecapSubmitButton disabled={!hasNotes} hasRecap={hasRecap} />
      {!hasNotes ? (
        <p className="mt-2 text-sm text-arcane-muted">
          Add session notes before generating a recap.
        </p>
      ) : null}
      {state.error ? (
        <p
          className="mt-3 rounded-lg border border-arcane-oxblood/25 bg-arcane-oxblood-soft px-3 py-2 text-sm text-arcane-oxblood-deep"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p
          className="mt-3 rounded-lg border border-arcane-teal/25 bg-arcane-teal-soft px-3 py-2 text-sm text-arcane-teal-deep"
          role="status"
        >
          {state.success}
        </p>
      ) : null}
    </form>
  );
}

function RecapSubmitButton({
  disabled,
  hasRecap,
}: {
  disabled: boolean;
  hasRecap: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="mt-4 min-h-11 rounded-md bg-arcane-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-arcane-ink-soft focus:outline-none focus:ring-2 focus:ring-arcane-oxblood focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled || pending}
      type="submit"
    >
      {pending
        ? "Generating continuity recap..."
        : hasRecap
          ? "Regenerate recap and hooks"
          : "Generate recap and hooks"}
    </button>
  );
}
