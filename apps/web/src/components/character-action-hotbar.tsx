"use client";

import type { Route } from "next";
import Link from "next/link";
import { EmptyState, StatusPill, Surface } from "@dnd/ui";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type {
  ActionHotbarCategory,
  CharacterActionHotbarItem,
  CharacterActionHotbarModel,
} from "@/characters/action-hotbar";
import { updateCharacterSpellSlotAction } from "@/spells/actions";
import { initialSpellbookActionState } from "@/spells/manage-spellbook";

type CharacterActionHotbarProps = {
  campaignId: string;
  characterId: string;
  hotbar: CharacterActionHotbarModel;
  loadNotice: string | null;
};

type HotbarFilter = "all" | ActionHotbarCategory;

const filters: Array<{ id: HotbarFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "actions", label: "Actions" },
  { id: "bonus-actions", label: "Bonus" },
  { id: "reactions", label: "Reactions" },
  { id: "spells", label: "Spells" },
  { id: "features", label: "Features" },
];

const categoryLabels: Record<ActionHotbarCategory, string> = {
  actions: "Action",
  "bonus-actions": "Bonus action",
  features: "Feature",
  reactions: "Reaction",
  spells: "Spell",
};

const categoryMarks: Record<ActionHotbarCategory, string> = {
  actions: "A",
  "bonus-actions": "B",
  features: "F",
  reactions: "R",
  spells: "S",
};

export function CharacterActionHotbar({
  campaignId,
  characterId,
  hotbar,
  loadNotice,
}: CharacterActionHotbarProps) {
  const [activeFilter, setActiveFilter] = useState<HotbarFilter>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    hotbar.items.find((item) => item.available)?.id ??
      hotbar.items[0]?.id ??
      null,
  );
  const [slotState, slotAction] = useActionState(
    updateCharacterSpellSlotAction,
    initialSpellbookActionState,
  );
  const visibleItems =
    activeFilter === "all"
      ? hotbar.items
      : hotbar.items.filter(
          (item) =>
            item.category === activeFilter ||
            item.actionCategory === activeFilter,
        );
  const selectedItem =
    visibleItems.find((item) => item.id === selectedItemId) ??
    visibleItems[0] ??
    null;

  return (
    <Surface className="overflow-hidden border-[#17161f]/20 bg-[#17161f] text-white">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(195,148,62,0.2),transparent_42%)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e1bd72]">
              Live action bar
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              What can I do right now?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
              Tap an action for the useful details. Prepared spells respond to
              the slot state below without turning the companion into a combat
              automation engine.
            </p>
          </div>
          <StatusPill tone="gold">
            {hotbar.items.filter((item) => item.available).length} ready
          </StatusPill>
        </div>

        {loadNotice ? (
          <p
            className="mt-4 rounded-md border border-[#e1bd72]/25 bg-[#e1bd72]/10 px-3 py-2 text-sm text-[#ffe6a8]"
            role="status"
          >
            {loadNotice}
          </p>
        ) : null}

        <SlotStrip
          action={slotAction}
          campaignId={campaignId}
          characterId={characterId}
          isMagicCapable={hotbar.isMagicCapable}
          slots={hotbar.slots}
        />

        <ActionNotice
          error={slotState.formError}
          success={slotState.successMessage}
        />
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        <div
          aria-label="Action bar filters"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          role="toolbar"
        >
          {filters.map((filter) => (
            <button
              aria-pressed={activeFilter === filter.id}
              className={
                activeFilter === filter.id
                  ? "min-h-10 shrink-0 rounded-md border border-[#e1bd72] bg-[#e1bd72] px-3 py-2 text-sm font-semibold text-[#17161f]"
                  : "min-h-10 shrink-0 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/75 transition hover:border-white/35 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#e1bd72]"
              }
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        {visibleItems.length === 0 ? (
          <EmptyState
            body="This character does not have anything in this group yet. Add character abilities or configure the spellbook to expand the bar."
            title="No actions in this group"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visibleItems.map((item) => (
              <HotbarButton
                item={item}
                key={item.id}
                onSelect={() => setSelectedItemId(item.id)}
                selected={selectedItem?.id === item.id}
              />
            ))}
          </div>
        )}

        {selectedItem ? (
          <ActionDetail
            action={slotAction}
            campaignId={campaignId}
            characterId={characterId}
            item={selectedItem}
          />
        ) : null}

        {hotbar.isMagicCapable ? (
          <Link
            className="justify-self-start text-sm font-semibold text-[#e1bd72] underline decoration-[#e1bd72]/45 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#e1bd72]"
            href={
              `/campaigns/${campaignId}/characters/${characterId}/spellbook` as Route
            }
          >
            Manage prepared spells and slot pools
          </Link>
        ) : null}
      </div>
    </Surface>
  );
}

function HotbarButton({
  item,
  onSelect,
  selected,
}: {
  item: CharacterActionHotbarItem;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-label={`${item.name}, ${item.available ? "available" : item.unavailableReason}`}
      aria-pressed={selected}
      className={[
        "group relative min-h-28 rounded-lg border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#e1bd72] focus:ring-offset-2 focus:ring-offset-[#17161f]",
        selected
          ? "border-[#e1bd72] bg-[#e1bd72]/15"
          : "border-white/10 bg-white/[0.06] hover:border-white/30 hover:bg-white/10",
        item.available ? "" : "opacity-55",
      ].join(" ")}
      onClick={onSelect}
      type="button"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-md border border-white/15 bg-black/20 text-xs font-bold text-[#e1bd72]">
          {categoryMarks[item.category]}
        </span>
        <span
          aria-hidden="true"
          className={
            item.available
              ? "mt-1 h-2.5 w-2.5 rounded-full bg-[#77d7c9] shadow-[0_0_12px_rgba(119,215,201,0.65)]"
              : "mt-1 h-2.5 w-2.5 rounded-full bg-[#c67a82]"
          }
        />
      </span>
      <span className="mt-3 block text-sm font-semibold leading-5">
        {item.name}
      </span>
      <span className="mt-1 block text-xs leading-5 text-white/55">
        {item.cost || categoryLabels[item.category]}
      </span>
    </button>
  );
}

function ActionDetail({
  action,
  campaignId,
  characterId,
  item,
}: {
  action: (payload: FormData) => void;
  campaignId: string;
  characterId: string;
  item: CharacterActionHotbarItem;
}) {
  const details = [
    ["Cost", item.cost],
    ["Resource", item.resource],
    ["Range", item.range],
    ["Duration", item.duration],
    ["Source", item.source],
  ].filter((detail): detail is [string, string] => Boolean(detail[1]));

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.07] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e1bd72]">
            {categoryLabels[item.category]}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{item.name}</h3>
        </div>
        <StatusPill tone={item.available ? "teal" : "red"}>
          {item.available ? "Available" : "Unavailable"}
        </StatusPill>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/75">{item.summary}</p>
      {item.unavailableReason ? (
        <p className="mt-3 rounded-md border border-[#c67a82]/35 bg-[#c67a82]/10 px-3 py-2 text-sm text-[#ffc8ce]">
          {item.unavailableReason}
        </p>
      ) : null}
      {details.length > 0 ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="font-semibold uppercase tracking-wide text-white/45">
                {label}
              </dt>
              <dd className="mt-1 leading-5 text-white/80">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {item.slotLevel ? (
        <form action={action} className="mt-4">
          <input name="campaignId" type="hidden" value={campaignId} />
          <input name="characterId" type="hidden" value={characterId} />
          <input name="operation" type="hidden" value="use" />
          <input name="spellLevel" type="hidden" value={item.slotLevel} />
          <SlotActionButton
            disabled={!item.available}
            label={`Use level ${item.slotLevel} slot`}
          />
        </form>
      ) : null}
    </article>
  );
}

function SlotStrip({
  action,
  campaignId,
  characterId,
  isMagicCapable,
  slots,
}: {
  action: (payload: FormData) => void;
  campaignId: string;
  characterId: string;
  isMagicCapable: boolean;
  slots: CharacterActionHotbarModel["slots"];
}) {
  if (!isMagicCapable) {
    return null;
  }

  if (slots.length === 0) {
    return (
      <p className="mt-4 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/65">
        No spell slot pools are configured yet. Cantrips remain available.
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {slots.map((slot) => (
        <div
          className="rounded-lg border border-white/10 bg-black/15 p-3"
          key={slot.level}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Level {slot.level} slots
              </p>
              <p className="mt-1 text-sm font-semibold">
                {slot.total - slot.used} of {slot.total} ready
              </p>
            </div>
            <div
              aria-label={`Level ${slot.level}: ${slot.total - slot.used} of ${slot.total} slots ready`}
              className="flex gap-1"
              role="img"
            >
              {Array.from({ length: slot.total }, (_, index) => (
                <span
                  className={
                    index < slot.used
                      ? "h-3.5 w-3.5 rounded-full border border-[#c67a82]/50 bg-[#6a3a43]"
                      : "h-3.5 w-3.5 rounded-full border border-[#77d7c9]/60 bg-[#2d8d82]"
                  }
                  key={index}
                />
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <SlotForm
              action={action}
              campaignId={campaignId}
              characterId={characterId}
              disabled={slot.used >= slot.total}
              label="Use slot"
              operation="use"
              spellLevel={slot.level}
            />
            <SlotForm
              action={action}
              campaignId={campaignId}
              characterId={characterId}
              disabled={slot.used === 0}
              label="Restore slot"
              operation="restore"
              spellLevel={slot.level}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SlotForm({
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
      <SlotActionButton disabled={disabled} label={label} />
    </form>
  );
}

function SlotActionButton({
  disabled,
  label,
}: {
  disabled: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-9 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-[#e1bd72]/70 hover:text-[#ffe6a8] focus:outline-none focus:ring-2 focus:ring-[#e1bd72] disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Updating..." : label}
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
          ? "mt-3 rounded-md border border-[#c67a82]/35 bg-[#c67a82]/10 px-3 py-2 text-sm text-[#ffc8ce]"
          : "mt-3 rounded-md border border-[#77d7c9]/30 bg-[#77d7c9]/10 px-3 py-2 text-sm text-[#bff8ef]"
      }
      role={error ? "alert" : "status"}
    >
      {error || success}
    </p>
  );
}
