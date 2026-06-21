import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const requiredFiles = [
  "apps/web/src/characters/action-hotbar.ts",
  "apps/web/src/rules/action-hotbar.ts",
  "apps/web/src/components/character-action-hotbar.tsx",
  "docs/engineering/character-action-hotbar.md",
  "packages/db/migrations/0012_character_action_hotbar.sql",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing action hotbar file: ${file}`);
}

const migrationText = readText(
  "packages/db/migrations/0012_character_action_hotbar.sql",
);
for (const snippet of [
  "'action-dash'",
  "'action-disengage'",
  "'action-dodge'",
  "'action-help'",
  "'action-hide'",
  "'common-action'",
  "on conflict (slug) where campaign_id is null",
]) {
  expect(
    migrationText.includes(snippet),
    `Action hotbar migration is missing: ${snippet}`,
  );
}

const routeText = readText(
  "apps/web/src/app/(protected)/campaigns/[campaignId]/characters/[characterId]/page.tsx",
);
for (const snippet of [
  "getCharacterSpellbookForUser",
  "loadCharacterCreationCatalogForUser",
  "loadCommonActionRulesForUser",
  "buildCharacterActionHotbar",
]) {
  expect(
    routeText.includes(snippet),
    `Character route must load hotbar source: ${snippet}`,
  );
}

const componentText = readText(
  "apps/web/src/components/character-action-hotbar.tsx",
);
for (const snippet of [
  "What can I do right now?",
  'aria-pressed={activeFilter === filter.id}',
  "Use slot",
  "Restore slot",
  "Manage prepared spells and slot pools",
  "updateCharacterSpellSlotAction",
]) {
  expect(
    componentText.includes(snippet),
    `Action hotbar UI is missing: ${snippet}`,
  );
}

const profileText = readText(
  "apps/web/src/components/character-profile.tsx",
);
expect(
  profileText.includes("CharacterActionHotbar") &&
    profileText.includes("hotbarLoadNotice"),
  "Full character profiles must render the action hotbar and load notices.",
);

const ruleLoaderText = readText("apps/web/src/rules/action-hotbar.ts");
expect(
  ruleLoaderText.includes("listRuleSnippetsForUser") &&
    ruleLoaderText.includes("coreRuleSnippets") &&
    ruleLoaderText.includes("common-action") &&
    ruleLoaderText.includes("hasCompleteCommonActionCatalog"),
  "Common actions must prefer membership-scoped DB content with a bundled fallback.",
);

await validateHotbarModel();

if (failures.length > 0) {
  console.error("Character action hotbar validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Character action hotbar validation passed.");

async function validateHotbarModel() {
  const typescriptPath = resolveTypeScriptRuntimePath();

  if (!typescriptPath) {
    failures.push(
      "TypeScript is required to validate action hotbar model helpers.",
    );
    return;
  }

  const typescriptRuntime = await import(pathToFileURL(typescriptPath).href);
  const typescript = typescriptRuntime.default ?? typescriptRuntime;
  const source = readText("apps/web/src/characters/action-hotbar.ts");
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ES2022,
      target: typescript.ScriptTarget.ES2022,
    },
    fileName: "apps/web/src/characters/action-hotbar.ts",
  }).outputText;
  const hotbarModule = await import(moduleDataUrl(compiled));
  const character = {
    abilities: [
      {
        characterId: "character-1",
        id: "ability-shove",
        name: "Shove",
        summary: "Push a nearby creature.",
        trigger: "1 action",
        visibility: "player-safe",
      },
      {
        characterId: "character-1",
        id: "ability-cunning-action",
        name: "Cunning Action",
        summary: "Move with unusual speed.",
        trigger: "Bonus action",
        visibility: "player-safe",
      },
    ],
    accessLevel: "full",
    ancestry: "Elf",
    background: "Sage",
    backstory: "",
    canEdit: true,
    className: "Wizard",
    goals: "",
    id: "character-1",
    inventoryNotes: "",
    isOwnedByCurrentUser: true,
    level: 3,
    name: "Mira",
    ownerName: "Player",
    personalNotes: "",
    relationships: "",
    summary: "A careful wizard.",
    updatedAt: "2026-06-21T00:00:00.000Z",
    visibility: "player-safe",
  };
  const options = [
    {
      abilities: [],
      actions: ["Recall hidden lore"],
      category: "class",
      flavour: "Every spell begins as a question.",
      gameplay: "A prepared arcane spellcaster.",
      id: "wizard-option",
      magicCapable: true,
      name: "Wizard",
      proficiencies: ["Arcane lore"],
      quirks: ["Annotates everything"],
      slug: "wizard",
      source: "test",
      sourceVersion: "test",
      summary: "A studied spellcaster.",
      traits: ["Curious"],
    },
  ];
  const commonActions = [
    {
      aliases: ["dash"],
      body: "Move farther this turn.",
      category: "core-mechanic",
      id: "rule-dash",
      slug: "action-dash",
      summary: "Trade an action for movement.",
      tags: ["common-action", "action"],
      title: "Dash",
      visibility: "player-safe",
    },
  ];
  const spellbook = {
    availableSpells: [],
    canManage: true,
    characterId: "character-1",
    characterName: "Mira",
    className: "Wizard",
    isMagicCapable: true,
    slots: [
      {
        level: 1,
        total: 1,
        used: 1,
      },
      {
        level: 2,
        total: 1,
        used: 0,
      },
    ],
    spells: [
      {
        campaignId: null,
        castingTime: "1 action",
        classNames: ["wizard"],
        concentration: false,
        duration: "Instantaneous",
        id: "spell-fire-bolt",
        level: 0,
        name: "Fire Bolt",
        preparation: "known",
        range: "120 feet",
        ritual: false,
        school: "Evocation",
        slug: "fire-bolt",
        source: "test",
        sourceVersion: "test",
        summary: "Hurl a mote of fire.",
        visibility: "player-safe",
      },
      {
        campaignId: null,
        castingTime: "1 action",
        classNames: ["wizard"],
        concentration: false,
        duration: "Instantaneous",
        id: "spell-magic-missile",
        level: 1,
        name: "Magic Missile",
        preparation: "prepared",
        range: "120 feet",
        ritual: false,
        school: "Evocation",
        slug: "magic-missile",
        source: "test",
        sourceVersion: "test",
        summary: "Send several darts of force.",
        visibility: "player-safe",
      },
      {
        campaignId: null,
        castingTime: "1 bonus action",
        classNames: ["wizard"],
        concentration: false,
        duration: "Instantaneous",
        id: "spell-misty-step",
        level: 2,
        name: "Misty Step",
        preparation: "prepared",
        range: "Self",
        ritual: false,
        school: "Conjuration",
        slug: "misty-step",
        source: "test",
        sourceVersion: "test",
        summary: "Teleport to a nearby place.",
        visibility: "player-safe",
      },
      {
        campaignId: null,
        castingTime: "1 reaction",
        classNames: ["wizard"],
        concentration: false,
        duration: "1 round",
        id: "spell-shield",
        level: 1,
        name: "Shield",
        preparation: "known",
        range: "Self",
        ritual: false,
        school: "Abjuration",
        slug: "shield",
        source: "test",
        sourceVersion: "test",
        summary: "Raise a sudden magical barrier.",
        visibility: "player-safe",
      },
    ],
  };
  const model = hotbarModule.buildCharacterActionHotbar(
    character,
    spellbook,
    options,
    commonActions,
  );
  const fireBolt = model.items.find((item) => item.name === "Fire Bolt");
  const magicMissile = model.items.find(
    (item) => item.name === "Magic Missile",
  );
  const shield = model.items.find((item) => item.name === "Shield");
  const mistyStep = model.items.find((item) => item.name === "Misty Step");

  expect(
    model.items.some(
      (item) =>
        item.name === "Cunning Action" && item.category === "bonus-actions",
    ),
    "Ability triggers must place bonus actions in the correct filter.",
  );
  expect(
    model.items.some(
      (item) => item.name === "Shove" && item.category === "actions",
    ),
    "Action-cost ability triggers must appear in the Actions filter.",
  );
  expect(
    model.items.some((item) => item.name === "Recall hidden lore") &&
      model.items.some((item) => item.name === "Wizard traits") &&
      model.items.some((item) => item.name === "Wizard quirks"),
    "Matched creation choices must surface actions, traits, and quirks.",
  );
  expect(
    model.items.some(
      (item) => item.name === "Dash" && item.source === "Common action",
    ),
    "DB-backed common actions must appear in the hotbar.",
  );
  expect(
    fireBolt?.available === true && fireBolt.resource === "At will",
    "Cantrips must remain available without spell slots.",
  );
  expect(
    magicMissile?.available === true &&
      magicMissile.slotLevel === 2 &&
      magicMissile.resource?.includes("level 2"),
    "Prepared lower-level spells must use the lowest available higher-level slot.",
  );
  expect(
    shield?.available === false &&
      shield.unavailableReason === "This spell is known but not prepared.",
    "Known but unprepared spells must be visibly unavailable.",
  );
  expect(
    mistyStep?.category === "spells" &&
      mistyStep.actionCategory === "bonus-actions",
    "Bonus-action spells must remain spells and also appear in the Bonus filter.",
  );

  const ruleLoaderSource = readText("apps/web/src/rules/action-hotbar.ts");
  const ruleLoaderCompiled = typescript.transpileModule(ruleLoaderSource, {
    compilerOptions: {
      module: typescript.ModuleKind.ES2022,
      target: typescript.ScriptTarget.ES2022,
    },
    fileName: "apps/web/src/rules/action-hotbar.ts",
  }).outputText;
  expect(
    ruleLoaderCompiled.includes("requiredCommonActionSlugs.every"),
    "Common-action completeness must require every baseline action slug.",
  );
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function readText(path) {
  return readFileSync(resolve(path), "utf8");
}

function resolve(path) {
  return join(rootDir, path);
}

function moduleDataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

function resolveTypeScriptRuntimePath() {
  const localPath = resolve("node_modules/typescript/lib/typescript.js");

  if (existsSync(localPath)) {
    return localPath;
  }

  const vscodeBasePath = join(
    process.env.LOCALAPPDATA ?? "",
    "Programs",
    "Microsoft VS Code",
  );

  if (!existsSync(vscodeBasePath)) {
    return null;
  }

  for (const entry of readdirSync(vscodeBasePath, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidatePath = join(
      vscodeBasePath,
      entry.name,
      "resources",
      "app",
      "extensions",
      "node_modules",
      "typescript",
      "lib",
      "typescript.js",
    );

    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}
