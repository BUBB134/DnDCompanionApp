import type { ReactNode } from "react";

type Tone = "gold" | "red" | "teal";
type SurfaceTone = "panel" | "paper" | "private" | "shared";

type SurfaceProps = {
  children: ReactNode;
  className?: string;
  tone?: SurfaceTone;
};

type StatusPillProps = {
  children: ReactNode;
  tone?: Tone;
};

type EmptyStateProps = {
  body: string;
  children?: ReactNode;
  title: string;
};

type SectionHeadingProps = {
  body?: string;
  children?: ReactNode;
  eyebrow?: string;
  title: string;
};

const toneClasses: Record<Tone, string> = {
  gold: "border-arcane-gold/45 bg-arcane-gold-soft text-arcane-gold-deep",
  red: "border-arcane-oxblood/25 bg-arcane-oxblood-soft text-arcane-oxblood-deep",
  teal: "border-arcane-teal/25 bg-arcane-teal-soft text-arcane-teal-deep",
};

const surfaceClasses: Record<SurfaceTone, string> = {
  panel: "border-arcane-ink/10 bg-arcane-surface/92",
  paper: "border-arcane-gold/20 bg-arcane-parchment/92",
  private: "border-arcane-oxblood/25 bg-arcane-oxblood-soft",
  shared: "border-arcane-teal/25 bg-arcane-teal-soft",
};

export function Surface({ children, className, tone = "panel" }: SurfaceProps) {
  return (
    <section
      className={joinClasses(
        "rounded-xl border shadow-[var(--arcane-shadow-panel)]",
        surfaceClasses[tone],
        className,
      )}
    >
      {children}
    </section>
  );
}

export function StatusPill({ children, tone = "teal" }: StatusPillProps) {
  return (
    <span
      className={joinClasses(
        "inline-flex min-h-7 items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ body, children, title }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-arcane-ink/20 bg-arcane-parchment/70 p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-arcane-gold/35 bg-arcane-surface text-sm font-bold text-arcane-oxblood"
        >
          ✦
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-arcane-muted">{body}</p>
        </div>
      </div>
      {children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function SectionHeading({
  body,
  children,
  eyebrow,
  title,
}: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-arcane-oxblood">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-brand-display mt-1 text-2xl font-semibold leading-tight text-arcane-ink">
          {title}
        </h2>
        {body ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-arcane-muted">
            {body}
          </p>
        ) : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
