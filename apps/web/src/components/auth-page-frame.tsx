import Image from "next/image";
import type { ReactNode } from "react";
import { PRODUCT_MARK_PATH, PRODUCT_NAME } from "@/brand";

const firstCampaignSteps = [
  {
    body: "Use a real account on any device and follow campaign invite links safely.",
    title: "Join the table",
  },
  {
    body: "Create a campaign as DM or step into the one your group already shares.",
    title: "Choose the campaign",
  },
  {
    body: "Open the latest session, capture notes, and recover the context you need.",
    title: "Keep the story moving",
  },
] as const;

type AuthPageFrameProps = {
  children: ReactNode;
  eyebrow?: string;
  lead: string;
  title: string;
};

export function AuthPageFrame({
  children,
  eyebrow = PRODUCT_NAME,
  lead,
  title,
}: AuthPageFrameProps) {
  return (
    <main
      className="grid min-h-screen bg-[#121416] px-4 py-6 text-[#e2e2e5] sm:px-6"
    >
      <section className="mx-auto flex w-full max-w-6xl flex-col justify-center gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] lg:items-center">
        <div className="max-w-2xl">
          <Image
            alt=""
            className="h-16 w-16 rounded-lg border border-[#4d4635] bg-[#1e2022] p-2"
            height={128}
            priority
            src={PRODUCT_MARK_PATH}
            width={128}
          />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#d4af37]">
            {eyebrow}
          </p>
          <h1 className="font-brand-display mt-3 text-4xl font-semibold leading-tight tracking-[-0.02em] text-[#f2e0c3] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#d0c5af]">
            {lead}
          </p>

          <div className="mt-7 rounded-xl border border-[#4d4635] bg-[#1a1c1e]/90 p-4 shadow-[0_28px_80px_rgba(10,11,15,0.38)] backdrop-blur sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d4af37]">
              First campaign path
            </p>
            <ol className="mt-4 grid gap-4">
              {firstCampaignSteps.map((step, index) => (
                <li className="flex gap-3" key={step.title}>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d4af37] text-sm font-bold text-[#3c2f00]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-[#e2e2e5]">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[#d0c5af]">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4">{children}</div>
      </section>
    </main>
  );
}
