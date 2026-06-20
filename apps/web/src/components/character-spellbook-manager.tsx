"use client";

import type {
  CharacterSpell,
  CharacterSpellbook,
  SpellDefinition,
} from "@dnd/types";
import { EmptyState, StatusPill, Surface } from "@dnd/ui";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateCharacterSpellAction,
  updateCharacterSpellSlotAction,
} from "@/spells/actions";
import { initialSpellbookActionState } from "@/spells/manage-spellbook";

type CharacterSpellbookManagerProps = {
  campaignId: string;
  spellbook: CharacterSpellbook;
};

const inputClassName =
  "min-h-11 rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25";

export function CharacterSpellbookManager({
  campaignId,
  spellbook,
}: CharacterSpellbookManagerProps) {
  const [spellState, spellAction] = useActionState(
    updateCharacterSpellAction,
    initialSpellbookActionState,
  );
  const [slotState, slotAction] = useActionState(
    updateCharacterSpellSlotAction,
    initialSpellbookActionState,
  );
  const selectedSpells = new Map(
    spellbook.spells.map((spell) => [spell.id, spell]),
  );

  if (!spellbook.isMagicCapable) {
    return (
      <Surface className="p-5">
        <EmptyState
          body="Add a Spellcasting ability through the character profile or use a magic-capable guided class before configuring spells and slots."
          title="Spellbook not enabled"
        />
      </Surface>
    );
  }

  return (
    <div className="grid gap-5">
      <Surface className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
              Magical reserves
            </p>
            <h2 className="mt-1 text-xl font-semibold">Spell slots</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b4657]">
              Configure the slot pools this character currently has. Using or
              restoring a slot updates the state that DND-53 can later surface
              in the action hotbar.
            </p>
          </div>
          <StatusPill tone="gold">
            {spellbook.slots.reduce(
              (total, slot) => total + slot.total - slot.used,
              0,
            )}{" "}
            available
          </StatusPill>
        </div>

        <ActionNotice
          error={slotState.formError}
          success={slotState.successMessage}
        />

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {spellbook.slots.length === 0 ? (
            <EmptyState
              body="Add the slot levels shown on the character's current class progression. This MVP keeps that choice explicit instead of automating class rules."
              title="No slot pools configured"
            />
          ) : (
            spellbook.slots.map((slot) => (
              <article
                className="rounded-lg border border-[#c3943e]/30 bg-[#fff7de] p-4"
                key={slot.level}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">Level {slot.level}</p>
                    <p className="mt-1 text-sm text-[#5c4212]">
                      {slot.total - slot.used} available · {slot.used} used
                    </p>
                  </div>
                  <div
                    aria-label={`Level ${slot.level} slots`}
                    className="flex gap-1"
                  >
                    {Array.from({ length: slot.total }, (_, index) => (
                      <span
                        aria-label={
                          index < slot.used ? "Used slot" : "Available slot"
                        }
                        className={
                          index < slot.used
                            ? "h-4 w-4 rounded-full border border-[#8b2f39]/45 bg-[#f0b9bf]"
                            : "h-4 w-4 rounded-full border border-[#1f6f78]/45 bg-[#cce9eb]"
                        }
                        key={index}
                        role="img"
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <SlotAdjustmentForm
                    action={slotAction}
                    campaignId={campaignId}
                    characterId={spellbook.characterId}
                    disabled={slot.used >= slot.total}
                    label="Use slot"
                    operation="use"
                    spellLevel={slot.level}
                  />
                  <SlotAdjustmentForm
                    action={slotAction}
                    campaignId={campaignId}
                    characterId={spellbook.characterId}
                    disabled={slot.used === 0}
                    label="Restore slot"
                    operation="restore"
                    spellLevel={slot.level}
                  />
                </div>
              </article>
            ))
          )}
        </div>

        <form
          action={slotAction}
          className="mt-5 grid gap-3 rounded-lg border border-[#17161f]/10 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
        >
          <input name="campaignId" type="hidden" value={campaignId} />
          <input
            name="characterId"
            type="hidden"
            value={spellbook.characterId}
          />
          <input name="operation" type="hidden" value="configure" />
          <label className="grid gap-2 text-sm font-semibold">
            Spell level
            <select className={inputClassName} defaultValue="1" name="spellLevel">
              {Array.from({ length: 9 }, (_, index) => index + 1).map(
                (level) => (
                  <option key={level} value={level}>
                    Level {level}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Total slots
            <input
              className={inputClassName}
              defaultValue="1"
              inputMode="numeric"
              max="9"
              min="0"
              name="totalSlots"
              type="number"
            />
          </label>
          <SubmitButton label="Save pool" pendingLabel="Saving..." />
          <p className="text-xs leading-5 text-[#6d6578] sm:col-span-3">
            Setting a level to 0 removes that slot pool. Existing used slots are
            kept when possible and clamped if the total is reduced.
          </p>
        </form>
      </Surface>

      <Surface className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#1f6f78]">
              At-table reference
            </p>
            <h2 className="mt-1 text-xl font-semibold">Current spellbook</h2>
          </div>
          <StatusPill tone="teal">
            {
              spellbook.spells.filter(
                (spell) => spell.preparation === "prepared",
              ).length
            }{" "}
            prepared
          </StatusPill>
        </div>

        <ActionNotice
          error={spellState.formError}
          success={spellState.successMessage}
        />

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {spellbook.spells.length === 0 ? (
            <EmptyState
              body="Choose spells from the class catalog below and mark each one as known or prepared."
              title="No spells selected"
            />
          ) : (
            spellbook.spells.map((spell) => (
              <SpellCard
                campaignId={campaignId}
                characterId={spellbook.characterId}
                formAction={spellAction}
                key={spell.id}
                selectedSpell={spell}
                spell={spell}
              />
            ))
          )}
        </div>
      </Surface>

      <Surface className="p-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#1f6f78]">
            Database-backed catalog
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            {spellbook.className || "Character"} spells
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b4657]">
            The MVP catalog is intentionally small. It stores concise casting
            metadata in Postgres so future content and hotbar work can extend the
            same source of truth.
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {spellbook.availableSpells.length === 0 ? (
            <EmptyState
              body="No database-backed spells currently match this character's class."
              title="No class spells available"
            />
          ) : (
            spellbook.availableSpells.map((spell) => (
              <SpellCard
                campaignId={campaignId}
                characterId={spellbook.characterId}
                formAction={spellAction}
                key={spell.id}
                selectedSpell={selectedSpells.get(spell.id)}
                spell={spell}
              />
            ))
          )}
        </div>
      </Surface>
    </div>
  );
}

function SpellCard({
  campaignId,
  characterId,
  formAction,
  selectedSpell,
  spell,
}: {
  campaignId: string;
  characterId: string;
  formAction: (payload: FormData) => void;
  selectedSpell?: CharacterSpell;
  spell: SpellDefinition;
}) {
  return (
    <article className="rounded-lg border border-[#1f6f78]/20 bg-[#e7f5f6] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{spell.name}</h3>
          <p className="mt-1 text-xs uppercase tracking-wide text-[#164f56]">
            {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`} ·{" "}
            {spell.school}
          </p>
        </div>
        {selectedSpell ? (
          <StatusPill
            tone={
              selectedSpell.preparation === "prepared" ? "gold" : "teal"
            }
          >
            {selectedSpell.preparation}
          </StatusPill>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-[#4b4657]">{spell.summary}</p>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-[#4b4657]">
        <SpellDetail label="Casting" value={spell.castingTime} />
        <SpellDetail label="Range" value={spell.range} />
        <SpellDetail label="Duration" value={spell.duration} />
        <SpellDetail
          label="Tags"
          value={
            [
              spell.concentration ? "Concentration" : "",
              spell.ritual ? "Ritual" : "",
            ]
              .filter(Boolean)
              .join(", ") || "Standard"
          }
        />
      </dl>
      <form
        action={formAction}
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <input name="campaignId" type="hidden" value={campaignId} />
        <input name="characterId" type="hidden" value={characterId} />
        <input name="spellId" type="hidden" value={spell.id} />
        <input name="operation" type="hidden" value="save" />
        <label className="grid flex-1 gap-2 text-xs font-semibold uppercase tracking-wide text-[#164f56]">
          Spell state
          <select
            className={inputClassName}
            defaultValue={selectedSpell?.preparation ?? "known"}
            name="preparation"
          >
            <option value="known">Known</option>
            <option value="prepared">Prepared</option>
          </select>
        </label>
        <SubmitButton
          label={selectedSpell ? "Update" : "Add spell"}
          pendingLabel="Saving..."
        />
      </form>
      {selectedSpell ? (
        <form action={formAction} className="mt-2">
          <input name="campaignId" type="hidden" value={campaignId} />
          <input name="characterId" type="hidden" value={characterId} />
          <input name="spellId" type="hidden" value={spell.id} />
          <input name="operation" type="hidden" value="remove" />
          <button
            className="min-h-10 text-sm font-semibold text-[#8b2f39] underline decoration-[#8b2f39]/35 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
            type="submit"
          >
            Remove from spellbook
          </button>
        </form>
      ) : null}
    </article>
  );
}

function SpellDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-[#164f56]">{label}</dt>
      <dd className="mt-1 leading-5">{value}</dd>
    </div>
  );
}

function SlotAdjustmentForm({
  action,
  campaignId,
  characterId,
  disabled,
  label,
  operation,
  spellLevel,
}: {
  action: (payload: FormData) => void;
  campaignId: string;
  characterId: string;
  disabled: boolean;
  label: string;
  operation: "restore" | "use";
  spellLevel: number;
}) {
  return (
    <form action={action}>
      <input name="campaignId" type="hidden" value={campaignId} />
      <input name="characterId" type="hidden" value={characterId} />
      <input name="operation" type="hidden" value={operation} />
      <input name="spellLevel" type="hidden" value={spellLevel} />
      <button
        className="min-h-10 rounded-md border border-[#17161f]/15 bg-white px-3 py-2 text-sm font-semibold transition hover:border-[#1f6f78] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-11 rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function ActionNotice({
  error,
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  if (!error && !success) {
    return null;
  }

  return (
    <p
      className={
        error
          ? "mt-4 rounded-md border border-[#8b2f39]/25 bg-[#f9e8ea] px-3 py-2 text-sm text-[#6f2430]"
          : "mt-4 rounded-md border border-[#1f6f78]/25 bg-[#e7f5f6] px-3 py-2 text-sm text-[#164f56]"
      }
      role={error ? "alert" : "status"}
    >
      {error || success}
    </p>
  );
}
