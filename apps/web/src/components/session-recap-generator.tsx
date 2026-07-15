"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { initialSessionRecapActionState } from "@/recaps/action-state";
import { generateSessionRecapAction } from "@/recaps/actions";

export function SessionRecapGenerator({
  campaignId,
  hasNotes,
  hasRecap,
  sessionId,
}: {
  campaignId: string;
  hasNotes: boolean;
  hasRecap: boolean;
  sessionId: string;
}) {
  const [state, formAction] = useActionState(
    generateSessionRecapAction,
    initialSessionRecapActionState,
  );

  return (
    <form action={formAction} className="mt-4">
      <input name="campaignId" type="hidden" value={campaignId} />
      <input name="sessionId" type="hidden" value={sessionId} />
      <RecapSubmitButton disabled={!hasNotes} hasRecap={hasRecap} />
      {!hasNotes ? (
        <p className="mt-2 text-sm text-[#4b4657]">
          Add session notes before generating a recap.
        </p>
      ) : null}
      {state.error ? (
        <p
          className="mt-3 rounded-lg border border-[#8b2f39]/25 bg-[#f9e8ea] px-3 py-2 text-sm text-[#6f2430]"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p
          className="mt-3 rounded-lg border border-[#1f6f78]/25 bg-[#e7f5f6] px-3 py-2 text-sm text-[#164f56]"
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
      className="min-h-10 rounded-md border border-[#1f6f78]/35 bg-[#e7f5f6] px-3 py-2 text-sm font-semibold text-[#164f56] transition hover:border-[#1f6f78] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled || pending}
      type="submit"
    >
      {pending
        ? "Generating recap..."
        : hasRecap
          ? "Regenerate recap"
          : "Generate recap"}
    </button>
  );
}
