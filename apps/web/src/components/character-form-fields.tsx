"use client";

import { isDungeonMaster, type Campaign } from "@dnd/types";
import { useFormStatus } from "react-dom";
import type { CharacterActionState } from "@/characters/manage-character";

type CharacterFormFieldsProps = {
  campaign: Campaign;
  compact?: boolean;
  state: CharacterActionState;
};

const inputClassName =
  "mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25";
const textareaClassName =
  "mt-2 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 py-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25";

export function CharacterFormFields({
  campaign,
  compact = false,
  state,
}: CharacterFormFieldsProps) {
  const fieldPrefix = state.values.characterId || "new";
  const canUseDmOnlyVisibility = isDungeonMaster(campaign.role);

  return (
    <div className={compact ? "grid gap-4" : "grid gap-5"}>
      <input
        name="creationMode"
        type="hidden"
        value={state.values.creationMode}
      />
      <input name="revision" type="hidden" value={state.values.revision} />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(8rem,0.6fr)]">
        <TextField
          error={state.fieldErrors.name}
          fieldPrefix={fieldPrefix}
          label="Character name"
          name="name"
          required
          value={state.values.name}
        />
        <TextField
          error={state.fieldErrors.level}
          fieldPrefix={fieldPrefix}
          label="Level"
          max={20}
          min={1}
          name="level"
          required
          type="number"
          value={state.values.level}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          error={state.fieldErrors.className}
          fieldPrefix={fieldPrefix}
          label="Class"
          name="className"
          placeholder="Fighter"
          value={state.values.className}
        />
        <TextField
          error={state.fieldErrors.ancestry}
          fieldPrefix={fieldPrefix}
          label="Ancestry / species"
          name="ancestry"
          placeholder="Human"
          value={state.values.ancestry}
        />
        <TextField
          error={state.fieldErrors.background}
          fieldPrefix={fieldPrefix}
          label="Background"
          name="background"
          placeholder="Sailor"
          value={state.values.background}
        />
      </div>

      <TextareaField
        error={state.fieldErrors.summary}
        fieldPrefix={fieldPrefix}
        help="This is the player-visible snapshot shown in campaign lists."
        label="Short profile"
        name="summary"
        rows={3}
        value={state.values.summary}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TextareaField
          error={state.fieldErrors.backstory}
          fieldPrefix={fieldPrefix}
          label="Backstory"
          name="backstory"
          rows={5}
          value={state.values.backstory}
        />
        <TextareaField
          error={state.fieldErrors.goals}
          fieldPrefix={fieldPrefix}
          label="Goals"
          name="goals"
          rows={5}
          value={state.values.goals}
        />
        <TextareaField
          error={state.fieldErrors.relationships}
          fieldPrefix={fieldPrefix}
          label="Relationships"
          name="relationships"
          rows={5}
          value={state.values.relationships}
        />
        <TextareaField
          error={state.fieldErrors.inventoryNotes}
          fieldPrefix={fieldPrefix}
          label="Inventory notes"
          name="inventoryNotes"
          rows={5}
          value={state.values.inventoryNotes}
        />
      </div>

      <TextareaField
        error={state.fieldErrors.abilities}
        fieldPrefix={fieldPrefix}
        help="One per line: Name | Short summary | Optional trigger. Add up to 12."
        label="Ability summaries"
        name="abilities"
        placeholder="Second Wind | Regain hit points equal to 1d10 + fighter level. | Bonus action"
        rows={5}
        value={state.values.abilities}
      />

      <TextareaField
        error={state.fieldErrors.personalNotes}
        fieldPrefix={fieldPrefix}
        help="Visible only to this character's owner and campaign DMs."
        label="Personal notes"
        name="personalNotes"
        rows={5}
        value={state.values.personalNotes}
      />

      {canUseDmOnlyVisibility ? (
        <div>
          <label
            className="text-sm font-semibold text-[#17161f]"
            htmlFor={`${fieldPrefix}-character-visibility`}
          >
            Character visibility
          </label>
          <select
            aria-describedby={
              state.fieldErrors.visibility
                ? `${fieldPrefix}-character-visibility-error`
                : undefined
            }
            aria-invalid={state.fieldErrors.visibility ? true : undefined}
            className={inputClassName}
            defaultValue={state.values.visibility}
            id={`${fieldPrefix}-character-visibility`}
            name="visibility"
          >
            <option value="player-safe">Player-safe summary</option>
            <option value="dm-only">DM and owner only</option>
          </select>
          <FieldError
            error={state.fieldErrors.visibility}
            id={`${fieldPrefix}-character-visibility-error`}
          />
        </div>
      ) : (
        <input
          name="visibility"
          type="hidden"
          value={
            state.values.visibility === "dm-only" ? "dm-only" : "player-safe"
          }
        />
      )}
    </div>
  );
}

export function CharacterFormNotice({
  error,
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  if (error) {
    return (
      <div
        className="rounded-lg border border-[#8b2f39]/25 bg-[#f9e8ea] px-4 py-3 text-sm text-[#6f2430]"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (success) {
    return (
      <div
        className="rounded-lg border border-[#1f6f78]/25 bg-[#e7f5f6] px-4 py-3 text-sm text-[#164f56]"
        role="status"
      >
        {success}
      </div>
    );
  }

  return null;
}

export function CharacterSubmitButton({
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

function TextField({
  error,
  fieldPrefix,
  label,
  max,
  min,
  name,
  placeholder,
  required = false,
  type = "text",
  value,
}: {
  error?: string;
  fieldPrefix: string;
  label: string;
  max?: number;
  min?: number;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: "number" | "text";
  value: string;
}) {
  const id = `${fieldPrefix}-character-${name}`;
  const errorId = `${id}-error`;

  return (
    <div>
      <label className="text-sm font-semibold text-[#17161f]" htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        className={inputClassName}
        defaultValue={value}
        id={id}
        max={max}
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
      <FieldError error={error} id={errorId} />
    </div>
  );
}

function TextareaField({
  error,
  fieldPrefix,
  help,
  label,
  name,
  placeholder,
  rows,
  value,
}: {
  error?: string;
  fieldPrefix: string;
  help?: string;
  label: string;
  name: string;
  placeholder?: string;
  rows: number;
  value: string;
}) {
  const id = `${fieldPrefix}-character-${name}`;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  return (
    <div>
      <label className="text-sm font-semibold text-[#17161f]" htmlFor={id}>
        {label}
      </label>
      {help ? (
        <p className="mt-1 text-xs leading-5 text-[#6d6578]" id={helpId}>
          {help}
        </p>
      ) : null}
      <textarea
        aria-describedby={
          [help ? helpId : null, error ? errorId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        aria-invalid={error ? true : undefined}
        className={`${textareaClassName} ${rows >= 5 ? "min-h-32" : "min-h-24"}`}
        defaultValue={value}
        id={id}
        name={name}
        placeholder={placeholder}
        rows={rows}
      />
      <FieldError error={error} id={errorId} />
    </div>
  );
}

function FieldError({ error, id }: { error?: string; id: string }) {
  return error ? (
    <p className="mt-2 text-sm text-[#8b2f39]" id={id}>
      {error}
    </p>
  ) : null;
}
