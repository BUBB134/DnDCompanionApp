import type { ReactNode } from "react";

type Tone = "gold" | "red" | "teal";

type SurfaceProps = {
  children: ReactNode;
  className?: string;
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

const toneClasses: Record<Tone, string> = {
  gold: "border-[#c3943e]/45 bg-[#fff7de] text-[#5c4212]",
  red: "border-[#8b2f39]/25 bg-[#f9e8ea] text-[#6f2430]",
  teal: "border-[#1f6f78]/25 bg-[#e7f5f6] text-[#164f56]",
};

export function Surface({ children, className }: SurfaceProps) {
  return (
    <section
      className={joinClasses(
        "rounded-lg border border-[#17161f]/10 bg-white/90 shadow-sm",
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
    <div className="rounded-xl border border-dashed border-[#17161f]/20 bg-[#fffaf0]/70 p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c3943e]/35 bg-white text-sm font-bold text-[#8b2f39]"
        >
          ✦
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[#4b4657]">{body}</p>
        </div>
      </div>
      {children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

