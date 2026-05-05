"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { createCampaignAction } from "@/campaigns/actions";
import { initialCreateCampaignActionState } from "@/campaigns/create-campaign";

export function CampaignCreateForm() {
  const [state, formAction] = useActionState(
    createCampaignAction,
    initialCreateCampaignActionState,
  );
  const [name, setName] = useState(state.values.name);
  const [summary, setSummary] = useState(state.values.summary);

  useEffect(() => {
    setName(state.values.name);
    setSummary(state.values.summary);
  }, [state.values.name, state.values.summary]);

  return (
    <form action={formAction} className="grid gap-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
          New campaign
        </p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight">Create a campaign</h2>
        <p className="mt-2 text-sm leading-6 text-[#4b4657]">
          Saved campaigns are stored in Postgres and assign the creator as the DM.
        </p>
      </div>

      {state.formError ? (
        <div
          className="rounded-lg border border-[#8b2f39]/25 bg-[#f9e8ea] px-4 py-3 text-sm text-[#6f2430]"
          role="alert"
        >
          {state.formError}
        </div>
      ) : null}

      <div>
        <label className="text-sm font-semibold text-[#17161f]" htmlFor="campaign-name">
          Campaign name
        </label>
        <input
          aria-describedby={state.fieldErrors.name ? "campaign-name-error" : undefined}
          aria-invalid={state.fieldErrors.name ? true : undefined}
          className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
          id="campaign-name"
          name="name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Ashen Coast"
          required
          type="text"
          value={name}
        />
        {state.fieldErrors.name ? (
          <p className="mt-2 text-sm text-[#8b2f39]" id="campaign-name-error">
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div>
        <label className="text-sm font-semibold text-[#17161f]" htmlFor="campaign-summary">
          Summary
        </label>
        <textarea
          aria-describedby={state.fieldErrors.summary ? "campaign-summary-error" : undefined}
          aria-invalid={state.fieldErrors.summary ? true : undefined}
          className="mt-2 min-h-32 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 py-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
          id="campaign-summary"
          name="summary"
          onChange={(event) => setSummary(event.target.value)}
          placeholder="A salt-bitten coast, haunted lighthouses, and too many bargains with the tide."
          rows={5}
          value={summary}
        />
        {state.fieldErrors.summary ? (
          <p className="mt-2 text-sm text-[#8b2f39]" id="campaign-summary-error">
            {state.fieldErrors.summary}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[#4b4657]">
            Keep it lightweight for now. You can flesh the rest of the campaign out later.
          </p>
        )}
      </div>

      <SubmitButton />
    </form>
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
