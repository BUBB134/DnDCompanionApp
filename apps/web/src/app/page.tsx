import { readPublicEnv } from "@dnd/env";
import type { Campaign, RuleSnippet, SessionSummary } from "@dnd/types";
import { CampaignShell } from "@/components/campaign-shell";

const campaign: Campaign = {
  id: "campaign-demo",
  name: "Ashen Coast",
  role: "dm",
  activeSessionId: "session-12",
};

const latestSession: SessionSummary = {
  id: "session-12",
  title: "The lighthouse beneath the tide",
  recap:
    "The party recovered the drowned keeper's journal, named Captain Thorn as a likely ally, and left one sealed vault unopened.",
  unresolvedHooks: ["Decode the salt-stained map", "Decide what to tell Captain Thorn"],
};

const rules: RuleSnippet[] = [
  {
    id: "condition-prone",
    title: "Prone",
    category: "condition",
    summary: "A quick reminder for movement cost and attack roll implications.",
    visibility: "player-safe",
  },
  {
    id: "mechanic-concentration",
    title: "Concentration",
    category: "core-mechanic",
    summary: "Track when damage or spell conflicts should trigger a check.",
    visibility: "player-safe",
  },
];

export default function Home() {
  const env = readPublicEnv(process.env);

  return (
    <CampaignShell
      appEnv={env.NEXT_PUBLIC_APP_ENV}
      campaign={campaign}
      latestSession={latestSession}
      rules={rules}
    />
  );
}

