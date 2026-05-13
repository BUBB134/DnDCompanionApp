"use client";

import type { CampaignInviteSummary } from "@dnd/types";
import { useActionState } from "react";
import {
  generateCampaignInviteAction,
  revokeCampaignInviteAction,
} from "@/campaigns/actions";

type CampaignInvitePanelProps = {
  activeInvite: CampaignInviteSummary | null;
  campaignId: string;
};

const initialInviteState = {
  expiresAt: null,
  formError: null,
  inviteId: null,
  inviteUrl: null,
};

const initialRevokeInviteState = {
  formError: null,
  revokedInviteId: null,
};

export function CampaignInvitePanel({
  activeInvite,
  campaignId,
}: CampaignInvitePanelProps) {
  const [state, formAction, isPending] = useActionState(
    generateCampaignInviteAction,
    initialInviteState,
  );
  const [revokeState, revokeAction, isRevokePending] = useActionState(
    revokeCampaignInviteAction,
    initialRevokeInviteState,
  );
  const generatedInviteId =
    state.inviteId === revokeState.revokedInviteId ? null : state.inviteId;
  const currentActiveInvite =
    activeInvite?.id === revokeState.revokedInviteId ? null : activeInvite;
  const displayedInviteId = generatedInviteId ?? currentActiveInvite?.id ?? null;
  const displayedExpiresAt =
    generatedInviteId && state.expiresAt
      ? state.expiresAt
      : currentActiveInvite?.expiresAt ?? null;
  const displayedInviteUrl =
    generatedInviteId && state.inviteUrl ? state.inviteUrl : null;
  const formError = state.formError ?? revokeState.formError;

  return (
    <article className="rounded-lg border border-[#17161f]/10 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold">Invite players</h3>
          <p className="mt-2 text-sm leading-6 text-[#4b4657]">
            Generate a secure player invite link. Creating a new link rotates the
            current active link.
          </p>
        </div>
        <span className="inline-flex min-h-7 items-center rounded-md border border-[#8b2f39]/25 bg-[#f9e8ea] px-2.5 py-1 text-xs font-semibold text-[#6f2430]">
          DM only
        </span>
      </div>

      {formError ? (
        <div
          className="mt-3 rounded-md border border-[#8b2f39]/25 bg-[#f9e8ea] px-3 py-2 text-sm text-[#6f2430]"
          role="alert"
        >
          {formError}
        </div>
      ) : null}

      <div className="mt-3 grid gap-3">
        {displayedInviteUrl ? (
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase text-[#1f6f78]">
              Generated invite link
            </span>
            <input
              className="min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-sm outline-none focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              value={displayedInviteUrl}
            />
          </label>
        ) : currentActiveInvite ? (
          <div className="rounded-md border border-[#1f6f78]/25 bg-[#e7f5f6] px-3 py-2">
            <p className="text-sm font-semibold text-[#164f56]">
              Active invite link exists
            </p>
            <p className="mt-1 text-sm leading-6 text-[#4b4657]">
              Generate a new link when you need to copy it again or rotate access.
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[#17161f]/20 bg-[#fffaf0] px-3 py-2">
            <p className="text-sm font-semibold">No active invite link</p>
            <p className="mt-1 text-sm leading-6 text-[#4b4657]">
              Create one when the table is ready for players to join.
            </p>
          </div>
        )}

        {displayedExpiresAt ? (
          <p className="text-xs font-semibold uppercase text-[#4b4657]">
            Expires {formatInviteDate(displayedExpiresAt)}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <form action={formAction}>
          <input name="campaignId" type="hidden" value={campaignId} />
          <button
            className="min-h-10 w-full rounded-md bg-[#17161f] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            disabled={isPending}
            type="submit"
          >
            {isPending
              ? "Generating..."
              : currentActiveInvite || displayedInviteUrl
                ? "Rotate invite link"
                : "Generate invite link"}
          </button>
        </form>

        {displayedInviteId ? (
          <form action={revokeAction}>
            <input name="campaignId" type="hidden" value={campaignId} />
            <input name="inviteId" type="hidden" value={displayedInviteId} />
            <button
              className="min-h-10 w-full rounded-md border border-[#17161f]/15 bg-white px-3 py-2 text-sm font-semibold transition hover:border-[#8b2f39] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2 sm:w-auto"
              disabled={isRevokePending}
              type="submit"
            >
              {isRevokePending ? "Revoking..." : "Revoke active link"}
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

function formatInviteDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
