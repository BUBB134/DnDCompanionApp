import { readFileSync } from "node:fs";

const uxDirection = readFileSync(
  new URL("../docs/product/mvp-ux-direction.md", import.meta.url),
  "utf8",
);

const requiredSections = [
  "# MVP UX Direction",
  "## Player aha moments",
  "## DM aha moments",
  "## Primary journeys",
  "## Information architecture",
  "## Campaign home composition",
  "## Interaction patterns",
  "## Visual direction",
  "## Prominence and scope decisions",
  "## Follow-up implementation map",
  "## Handoff checklist",
  "## Success signals",
];

const requiredJourneys = [
  "### Before a session",
  "### During a session",
  "### After a session",
];

const requiredFollowUps = [
  "DND-62",
  "DND-68",
  "DND-15",
  "DND-69",
  "DND-70",
  "DND-65",
  "DND-63",
  "DND-66",
  "DND-16",
];

const missingRequirements = [
  ...requiredSections,
  ...requiredJourneys,
  ...requiredFollowUps,
].filter((requirement) => !uxDirection.includes(requirement));

if (missingRequirements.length > 0) {
  throw new Error(
    `MVP UX direction is missing required content: ${missingRequirements.join(", ")}`,
  );
}

console.log("MVP UX direction validation passed.");
